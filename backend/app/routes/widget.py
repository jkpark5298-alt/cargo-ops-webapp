from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query

from app.services.incheon_api import get_flight_data

router = APIRouter()

MAX_WIDGET_ITEMS = 3
DEFAULT_REFRESH_INTERVAL_MINUTES = 10


def _normalize_date(value: Optional[str]) -> str:
    if not value:
        return ""

    value = value.strip()
    if not value:
        return ""

    if "T" in value:
        return value.split("T")[0]

    if " " in value:
        return value.split(" ")[0]

    return value


def _normalize_flights(raw_flights: str) -> List[str]:
    flights = raw_flights.replace("\n", ",").replace(" ", ",").split(",")

    normalized: List[str] = []

    for flight in flights:
        value = flight.strip().upper()
        if not value:
            continue

        if value.isdigit() and len(value) in {3, 4}:
            value = f"KJ{value}"

        normalized.append(value)

    seen = set()
    deduped: List[str] = []

    for value in normalized:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)

    return deduped


def _parse_compact_datetime(value: str) -> Optional[datetime]:
    digits = "".join(ch for ch in value if ch.isdigit())

    if len(digits) == 12:
        try:
            return datetime.strptime(digits, "%Y%m%d%H%M")
        except ValueError:
            return None

    return None


def _get_remark_status(row: Dict[str, Any]) -> str:
    status = str(row.get("status", "") or "").strip()
    remark = str(row.get("remark", "") or "").strip()
    return f"{status} {remark}".strip().upper()


def _get_computed_status(row: Dict[str, Any]) -> str:
    remark_status = _get_remark_status(row)

    if row.get("canceled") or "CANCEL" in remark_status:
        return "결항"

    if row.get("gateChanged"):
        return "게이트 변경"

    if row.get("delay") or "DELAY" in remark_status or "지연" in remark_status:
        if "ARRIV" in remark_status or "도착" in remark_status or row.get("status") == "도착":
            return "도착"
        if "DEPAR" in remark_status or "출발" in remark_status or row.get("status") == "출발":
            return "출발"
        return "지연"

    if (
        row.get("status") == "출발"
        or "DEPART" in remark_status
        or "DEP" in remark_status
        or "출발" in remark_status
    ):
        return "출발"

    if (
        row.get("status") == "도착"
        or "ARRIV" in remark_status
        or "ARR" in remark_status
        or "도착" in remark_status
    ):
        return "도착"

    estimated = str(row.get("estimatedDateTime", "") or "")
    schedule = str(row.get("scheduleDateTime", "") or "")
    dt = _parse_compact_datetime(estimated) or _parse_compact_datetime(schedule)

    if dt:
        now_kst = datetime.utcnow() + timedelta(hours=9)
        if dt <= now_kst:
            departure_code = str(row.get("departureCode", "") or "").upper()
            arrival_code = str(row.get("arrivalCode", "") or "").upper()

            if departure_code == "ICN":
                return "출발"
            if arrival_code == "ICN":
                return "도착"

    return "-"


def _extract_display_time(row: Dict[str, Any]) -> str:
    candidate = (
        row.get("formattedEstimatedTime")
        or row.get("formattedScheduleTime")
        or row.get("estimatedDateTime")
        or row.get("scheduleDateTime")
        or "-"
    )
    value = str(candidate).strip()

    if not value or value == "-":
        return "-"

    if len(value) >= 16:
        return value[-5:]

    parsed = _parse_compact_datetime(value)
    if parsed:
        return parsed.strftime("%H:%M")

    return value


def _get_sort_key(row: Dict[str, Any]) -> Tuple[int, datetime, str]:
    dt = _parse_compact_datetime(str(row.get("estimatedDateTime", "") or ""))
    if dt is None:
        dt = _parse_compact_datetime(str(row.get("scheduleDateTime", "") or ""))

    if dt is None:
        return (1, datetime.max, str(row.get("flightId", "") or ""))

    return (0, dt, str(row.get("flightId", "") or ""))


def _dedupe_key(row: Dict[str, Any]) -> Tuple[str, str, str]:
    flight = str(row.get("flightId") or row.get("flightNo") or "-").strip().upper()
    departure = str(row.get("departureCode") or "-").strip().upper()
    arrival = str(row.get("arrivalCode") or "-").strip().upper()
    return (flight, departure, arrival)


def _build_widget_items(rows: List[Dict[str, Any]], limit: int) -> List[Dict[str, str]]:
    sorted_rows = sorted(rows, key=_get_sort_key)

    items: List[Dict[str, str]] = []
    seen_keys = set()

    for row in sorted_rows:
        dedupe_key = _dedupe_key(row)

        if dedupe_key in seen_keys:
            continue

        seen_keys.add(dedupe_key)

        items.append(
            {
                "flight": str(row.get("flightId") or row.get("flightNo") or "-"),
                "status": _get_computed_status(row),
                "departureCode": str(row.get("departureCode") or "-"),
                "arrivalCode": str(row.get("arrivalCode") or "-"),
                "displayTime": _extract_display_time(row),
            }
        )

        if len(items) >= limit:
            break

    return items


@router.get("/fixed/{room_id}")
async def get_fixed_widget_summary(
    room_id: str,
    flights: str = Query(..., description="쉼표 또는 공백으로 구분한 편명 목록"),
    start: str = Query(..., description="조회 시작일. YYYY-MM-DD 또는 YYYY-MM-DDTHH:MM"),
    end: str = Query(..., description="조회 종료일. YYYY-MM-DD 또는 YYYY-MM-DDTHH:MM"),
    room_name: Optional[str] = Query(None, alias="roomName"),
    limit: int = Query(MAX_WIDGET_ITEMS, ge=1, le=MAX_WIDGET_ITEMS),
    refresh_interval_minutes: int = Query(
        DEFAULT_REFRESH_INTERVAL_MINUTES,
        alias="refreshIntervalMinutes",
        ge=5,
        le=60,
    ),
) -> Dict[str, Any]:
    normalized_flights = _normalize_flights(flights)
    if not normalized_flights:
        raise HTTPException(status_code=400, detail="조회할 편명이 없습니다.")

    start_date = _normalize_date(start)
    end_date = _normalize_date(end)

    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="시작일과 종료일이 필요합니다.")

    all_rows: List[Dict[str, Any]] = []

    for flight_no in normalized_flights:
        rows = await get_flight_data(
            flight_no=flight_no,
            start_date=start_date,
            end_date=end_date,
        )
        all_rows.extend(rows)

    updated_at = (datetime.utcnow() + timedelta(hours=9)).strftime("%Y-%m-%d %H:%M")

    return {
        "success": True,
        "roomId": room_id,
        "roomName": room_name or room_id,
        "updatedAt": updated_at,
        "refreshIntervalMinutes": refresh_interval_minutes,
        "items": _build_widget_items(all_rows, limit=limit),
    }
