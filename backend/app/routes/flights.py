from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.services.incheon_api import get_flight_data

router = APIRouter()


@router.get("/lookup")
async def lookup_flight(
    flight_no: str = Query(..., description="예: KJ282 또는 KJ282,KJ913"),
    start_date: str | None = Query(None, description="조회 시작일 YYYY-MM-DD"),
    end_date: str | None = Query(None, description="조회 종료일 YYYY-MM-DD"),
):
    today = datetime.now().date()

    # 기본값: D, D+1
    start_date = start_date or today.strftime("%Y-%m-%d")
    end_date = end_date or (today + timedelta(days=1)).strftime("%Y-%m-%d")

    raw_flights = [x.strip().upper() for x in flight_no.split(",") if x.strip()]
    if not raw_flights:
        raise HTTPException(status_code=400, detail="flight_no는 필수입니다.")

    all_rows: List[dict] = []

    for one_flight in raw_flights:
        rows = await get_flight_data(
            flight_no=one_flight,
            start_date=start_date,
            end_date=end_date,
        )
        all_rows.extend(rows)

    return {
        "success": True,
        "flight_count": len(raw_flights),
        "start_date": start_date,
        "end_date": end_date,
        "count": len(all_rows),
        "data": all_rows,
    }
