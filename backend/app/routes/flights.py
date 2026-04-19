from fastapi import APIRouter, HTTPException, Query

from app.services.incheon_api import IncheonFlightAPI

router = APIRouter(prefix='/flights', tags=['flights'])
flight_api = IncheonFlightAPI()


@router.get('/lookup')
async def lookup_flight(
    flight_no: str = Query(..., description='편명'),
    search_day: str | None = Query(default=None, description='YYYYMMDD'),
) -> dict:
    if not flight_no:
        raise HTTPException(status_code=400, detail='편명은 필수입니다.')

    data = await flight_api.fetch_by_flight(flight_no=flight_no, search_day=search_day)
    return {'flight_no': flight_no, 'result': data}
