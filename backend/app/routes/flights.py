from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.incheon_api import get_flight_data

router = APIRouter()


class FlightQueryRequest(BaseModel):
    flights: List[str] = Field(default_factory=list)
    start: str
    end: str


def _normalize_flight_code(value: str) -> str:
    code = (value or "").strip().upper()
    if not code:
        return ""

    if code.isdigit() and len(code) in {3, 4}:
        return f"KJ{code}"

    return code


def _normalize_flights(values: List[str]) -> List[str]:
    normalized: List[str] = []
    seen = set()

    for value in values:
        for part in str(value).replace("\n", ",").replace(" ", ",").split(","):
            code = _normalize_flight_code(part)
            if not code:
                continue
            if code in seen:
                continue
            seen.add(code)
            normalized.append(code)

    return normalized


def _extract_date(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""

    if "T" in raw:
        return raw.split("T")[0]

    if " " in raw:
        return raw.split(" ")[0]

    return raw


def _parse_request_datetime(value: str) -> Optional[datetime]:
    raw = (value or "").strip()
    if not raw:
        return None

    candidates = [
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    ]

    for fmt in candidates:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue

    return None


def _parse_row_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None

    raw = str(value).strip()
    if not raw or raw == "-":
        return None

    raw = raw.replace(".", "-").replace("/", "-").replace("T", " ")

    candidates = [
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
    ]

    for fmt in candidates:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue

    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) == 12:
        try:
            return datetime.strptime(digits, "%Y%m%d%H%M")
        except ValueError:
            return None

    return None


def _get_row_datetime(row: Dict[str, Any]) -> Optional[datetime]:
    candidates = [
        row.get("formattedEstimatedTime"),
        row.get("formattedScheduleTime"),
        row.get("estimatedDateTime"),
        row.get("scheduleDateTime"),
    ]

    for candidate in candidates:
        parsed = _parse_row_datetime(candidate)
        if parsed is not None:
            return parsed

    return None


def _row_matches_time_range(
    row: Dict[str, Any],
    start_dt: Optional[datetime],
    end_dt: Optional[datetime],
) -> bool:
    if start_dt is None and end_dt is None:
        return True

    row_dt = _get_row_datetime(row)

    if row_dt is None:
        return True

    if start_dt is not None and row_dt < start_dt:
        return False

    if end_dt is not None and row_dt > end_dt:
        return False

    return True


def _get_row_sort_key(row: Dict[str, Any]):
    dt = _get_row_datetime(row)
    flight = str(row.get("flightId") or row.get("flightNo") or "")
    if dt is None:
        return (1, datetime.max, flight)
    return (0, dt, flight)


@router.post("/")
async def search_flights(payload: FlightQueryRequest) -> Dict[str, Any]:
    normalized_flights = _normalize_flights(payload.flights)

    if not normalized_flights:
        raise HTTPException(status_code=400, detail="조회할 편명이 없습니다.")

    start_dt = _parse_request_datetime(payload.start)
    end_dt = _parse_request_datetime(payload.end)

    if start_dt is None or end_dt is None:
        raise HTTPException(status_code=400, detail="시작일시 또는 종료일시 형식이 올바르지 않습니다.")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="시작일시는 종료일시보다 늦을 수 없습니다.")

    start_date = _extract_date(payload.start)
    end_date = _extract_date(payload.end)

    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="시작일 또는 종료일이 필요합니다.")

    all_rows: List[Dict[str, Any]] = []

    for flight_no in normalized_flights:
        rows = await get_flight_data(
            flight_no=flight_no,
            start_date=start_date,
            end_date=end_date,
        )

        filtered_rows = [
            row
            for row in rows
            if _row_matches_time_range(row, start_dt, end_dt)
        ]

        all_rows.extend(filtered_rows)

    all_rows.sort(key=_get_row_sort_key)

    return {
        "success": True,
        "data": all_rows,
        "count": len(all_rows),
        "queriedFlights": normalized_flights,
        "start": payload.start,
        "end": payload.end,
    }
