from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pywebpush import WebPushException, webpush

from app.services.incheon_api import (
    IncheonApiQuotaExceededError,
    get_all_kj_flight_data,
    get_flight_data,
)

router = APIRouter()

LATEST_SCHEDULE_FILE = Path(
    os.getenv("LATEST_SCHEDULE_FILE", "/tmp/cargo_ops_latest_schedule.json")
)
PUSH_SUBSCRIPTIONS_FILE = Path(
    os.getenv("PUSH_SUBSCRIPTIONS_FILE", "/tmp/cargo_ops_push_subscriptions.json")
)


class PushSubscriptionRequest(BaseModel):
    subscription: Dict[str, Any]
    userAgent: Optional[str] = None
    deviceName: Optional[str] = None


class TestPushRequest(BaseModel):
    title: str = "KJ Cargo Ops 테스트 알림"
    body: str = "PWA 푸시 알림 수신 준비가 완료되었습니다."
    url: str = "/"


class LatestScheduleRequest(BaseModel):
    room: Dict[str, Any]


class FlightQueryRequest(BaseModel):
    flights: List[str] = Field(default_factory=list)
    start: str
    end: str


class FlightRangeRequest(BaseModel):
    start: str
    end: str


def _read_latest_schedule() -> Optional[Dict[str, Any]]:
    try:
        if not LATEST_SCHEDULE_FILE.exists():
            return None

        data = json.loads(LATEST_SCHEDULE_FILE.read_text(encoding="utf-8"))
        room = data.get("room")
        return room if isinstance(room, dict) else None
    except Exception:
        return None


def _write_latest_schedule(room: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "room": room,
        "savedAt": datetime.now().isoformat(timespec="seconds"),
    }
    LATEST_SCHEDULE_FILE.parent.mkdir(parents=True, exist_ok=True)
    LATEST_SCHEDULE_FILE.write_text(
        json.dumps(payload, ensure_ascii=False),
        encoding="utf-8",
    )
    return payload


def _read_push_subscriptions() -> List[Dict[str, Any]]:
    try:
        if not PUSH_SUBSCRIPTIONS_FILE.exists():
            return []

        data = json.loads(PUSH_SUBSCRIPTIONS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _write_push_subscriptions(items: List[Dict[str, Any]]) -> None:
    PUSH_SUBSCRIPTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    PUSH_SUBSCRIPTIONS_FILE.write_text(
        json.dumps(items, ensure_ascii=False),
        encoding="utf-8",
    )


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


def _validate_range(start: str, end: str):
    start_dt = _parse_request_datetime(start)
    end_dt = _parse_request_datetime(end)

    if start_dt is None or end_dt is None:
        raise HTTPException(status_code=400, detail="시작일시 또는 종료일시 형식이 올바르지 않습니다.")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="시작일시는 종료일시보다 늦을 수 없습니다.")

    start_date = _extract_date(start)
    end_date = _extract_date(end)

    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="시작일 또는 종료일이 필요합니다.")

    return start_dt, end_dt, start_date, end_date


def _get_vapid_settings() -> tuple[str, str, str]:
    public_key = os.getenv("WEB_PUSH_PUBLIC_KEY", "").strip()
    private_key = os.getenv("WEB_PUSH_PRIVATE_KEY", "").strip()
    subject = os.getenv("WEB_PUSH_SUBJECT", "mailto:admin@example.com").strip()

    if not public_key or not private_key:
        raise HTTPException(
            status_code=400,
            detail="WEB_PUSH_PUBLIC_KEY 또는 WEB_PUSH_PRIVATE_KEY 환경변수가 없습니다.",
        )

    return public_key, private_key, subject


def _send_web_push(subscription: Dict[str, Any], payload: Dict[str, Any]) -> None:
    _, private_key, subject = _get_vapid_settings()

    webpush(
        subscription_info=subscription,
        data=json.dumps(payload, ensure_ascii=False),
        vapid_private_key=private_key,
        vapid_claims={"sub": subject},
    )


@router.get("/push-public-key")
async def get_push_public_key() -> Dict[str, Any]:
    public_key = os.getenv("WEB_PUSH_PUBLIC_KEY", "").strip()
    return {
        "success": True,
        "configured": bool(public_key),
        "publicKey": public_key,
    }


@router.post("/push-subscriptions")
async def save_push_subscription(payload: PushSubscriptionRequest) -> Dict[str, Any]:
    subscription = dict(payload.subscription or {})
    endpoint = str(subscription.get("endpoint") or "")

    if not endpoint:
        raise HTTPException(status_code=400, detail="Push subscription endpoint가 없습니다.")

    items = _read_push_subscriptions()
    next_item = {
        "subscription": subscription,
        "userAgent": payload.userAgent or "",
        "deviceName": payload.deviceName or "",
        "savedAt": datetime.now().isoformat(timespec="seconds"),
    }

    filtered = [
        item
        for item in items
        if str((item.get("subscription") or {}).get("endpoint") or "") != endpoint
    ]

    filtered.insert(0, next_item)
    _write_push_subscriptions(filtered[:20])

    return {
        "success": True,
        "count": len(filtered[:20]),
    }


@router.get("/push-subscriptions/count")
async def get_push_subscription_count() -> Dict[str, Any]:
    return {
        "success": True,
        "count": len(_read_push_subscriptions()),
    }


@router.post("/push-test")
async def send_test_push(payload: TestPushRequest) -> Dict[str, Any]:
    items = _read_push_subscriptions()

    if not items:
        raise HTTPException(status_code=400, detail="저장된 Push 구독 정보가 없습니다.")

    message = {
        "title": payload.title,
        "body": payload.body,
        "url": payload.url,
    }

    sent = 0
    failed = 0
    errors: List[str] = []

    for item in items:
        subscription = item.get("subscription") or {}

        try:
            _send_web_push(subscription, message)
            sent += 1
        except WebPushException as exc:
            failed += 1
            errors.append(str(exc))
        except Exception as exc:
            failed += 1
            errors.append(str(exc))

    return {
        "success": sent > 0,
        "sent": sent,
        "failed": failed,
        "errors": errors[:3],
    }


@router.get("/latest-schedule")
async def get_latest_schedule() -> Dict[str, Any]:
    room = _read_latest_schedule()
    return {
        "success": True,
        "room": room,
    }


@router.post("/latest-schedule")
async def save_latest_schedule(payload: LatestScheduleRequest) -> Dict[str, Any]:
    room = dict(payload.room or {})

    if not room.get("fixed"):
        room["fixed"] = True

    if not room.get("id"):
        room["id"] = str(int(datetime.now().timestamp() * 1000))

    if not room.get("name"):
        room["name"] = "Schedule_Synced"

    saved = _write_latest_schedule(room)
    return {
        "success": True,
        "room": saved["room"],
        "savedAt": saved["savedAt"],
    }


@router.post("/kj-all")
async def search_all_kj_flights(payload: FlightRangeRequest) -> Dict[str, Any]:
    start_dt, end_dt, start_date, end_date = _validate_range(payload.start, payload.end)

    try:
        rows = await get_all_kj_flight_data(
            start_date=start_date,
            end_date=end_date,
        )

        filtered_rows = [
            row
            for row in rows
            if _row_matches_time_range(row, start_dt, end_dt)
        ]

    except IncheonApiQuotaExceededError:
        raise HTTPException(status_code=429, detail="한도 초과로 조회 불가")

    filtered_rows.sort(key=_get_row_sort_key)

    queried_flights = sorted(
        {
            str(row.get("flightId") or row.get("flightNo") or "").upper()
            for row in filtered_rows
            if str(row.get("flightId") or row.get("flightNo") or "").upper().startswith("KJ")
        }
    )

    return {
        "success": True,
        "data": filtered_rows,
        "count": len(filtered_rows),
        "queriedFlights": queried_flights,
        "start": payload.start,
        "end": payload.end,
    }


@router.post("/")
async def search_flights(payload: FlightQueryRequest) -> Dict[str, Any]:
    normalized_flights = _normalize_flights(payload.flights)

    if not normalized_flights:
        raise HTTPException(status_code=400, detail="조회할 편명이 없습니다.")

    start_dt, end_dt, start_date, end_date = _validate_range(payload.start, payload.end)

    all_rows: List[Dict[str, Any]] = []

    try:
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

    except IncheonApiQuotaExceededError:
        raise HTTPException(status_code=429, detail="한도 초과로 조회 불가")

    all_rows.sort(key=_get_row_sort_key)

    return {
        "success": True,
        "data": all_rows,
        "count": len(all_rows),
        "queriedFlights": normalized_flights,
        "start": payload.start,
        "end": payload.end,
    }
