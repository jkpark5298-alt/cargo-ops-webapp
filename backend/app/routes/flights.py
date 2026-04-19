from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.incheon_api import IncheonCargoAPIError, fetch_by_flight

router = APIRouter(prefix="/flights", tags=["flights"])


@router.get("/lookup")
async def lookup_flight(
    flight_no: str = Query(..., description="조회할 편명. 예: KJ193, 5X596"),
    search_day: Optional[str] = Query(
        None,
        description="조회일(YYYYMMDD). 비우면 오늘 기준 D-3~D+6 범위로 순차 조회",
    ),
):
    """
    편명 기준으로 인천공항 화물기 출발/도착 정보를 조회합니다.
    프론트에서:
      GET /flights/lookup?flight_no=KJ193
    형태로 호출하면 됩니다.
    """
    normalized_flight_no = (flight_no or "").strip().upper().replace(" ", "")

    if not normalized_flight_no:
        raise HTTPException(status_code=400, detail="flight_no는 필수입니다.")

    try:
        items = await fetch_by_flight(
            flight_no=normalized_flight_no,
            search_day=search_day,
        )

        # 프론트에서 배열로 바로 처리할 수 있게 그대로 반환
        return items

    except IncheonCargoAPIError as e:
        # 설정/키/응답형식 오류 등 우리가 의도적으로 올린 예외
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        # Render Logs에서 원인 추적하기 쉽게 메시지 남기기
        print(f"[flights.lookup] unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Flight lookup failed.")
