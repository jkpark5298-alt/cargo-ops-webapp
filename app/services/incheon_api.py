from typing import Any
import httpx

from app.core.config import settings


class IncheonFlightAPI:
    async def fetch_by_flight(self, flight_no: str, search_day: str | None = None) -> dict[str, Any]:
        if not settings.incheon_api_service_key:
            return {
                'mode': 'demo',
                'items': [
                    {
                        'flight_id': flight_no,
                        'airline': 'Demo Cargo',
                        'schedule_date_time': '2026-04-19 14:20',
                        'estimated_date_time': '2026-04-19 14:35',
                        'airport': 'ANC',
                        'airport_name': 'Anchorage',
                        'gate': 'G12',
                        'terminal': 'T1',
                        'status': '예정',
                        'operation_type': 'DEP',
                    }
                ],
            }

        params = {
            'serviceKey': settings.incheon_api_service_key,
            'type': settings.incheon_api_response_type,
            'flight_id': flight_no,
        }
        if search_day:
            params['searchday'] = search_day

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(settings.incheon_api_base_url, params=params)
            response.raise_for_status()
            if settings.incheon_api_response_type.lower() == 'json':
                return response.json()
            return {'raw_xml': response.text}
