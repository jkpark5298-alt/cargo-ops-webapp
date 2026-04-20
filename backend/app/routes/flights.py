from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.incheon_api import get_flight_data

router = APIRouter()


class FlightsLookupRequest(BaseModel):
    flights: List[str]
    start: Optional[str] = None
    end: Optional[str] = None


def _normalize_date(value: Optional[str]) -> str:
    """
    프론트에서 넘어오는 값:
    - YYYY-MM-DDTHH:MM
    - YYYY-MM-DD
    - YYYY-MM-DD HH:MM
    중 무엇이든 YYYY-MM-DD 로 정규화
    """
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


@router.post("/")
async def lookup_flights(payload: FlightsLookupRequest):
    flights = [f.strip().upper() for f in payload.flights if f and f.strip()]

    if not flights:
        return {
            "success": False,
            "message": "조회할 편명이 없습니다.",
            "data": [],
        }

    start_date = _normalize_date(payload.start)
    end_date = _normalize_date(payload.end)

    if not start_date or not end_date:
        return {
            "success": False,
            "message": "시작일과 종료일이 필요합니다.",
            "data": [],
        }

    all_rows = []

    for flight_no in flights:
        rows = await get_flight_data(
            flight_no=flight_no,
            start_date=start_date,
            end_date=end_date,
        )
        all_rows.extend(rows)

    return {
        "success": True,
        "data": all_rows,
    }
