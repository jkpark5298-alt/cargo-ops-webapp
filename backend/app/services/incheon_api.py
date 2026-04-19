from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx


BASE_URL = "https://apis.data.go.kr/B551177/StatusOfCargoFlightsDeOdp"
DEPARTURES_PATH = "/getCargoDeparturesDeOdp"
ARRIVALS_PATH = "/getCargoArrivalsDeOdp"

SERVICE_KEY = os.getenv("INCHEON_API_SERVICE_KEY", "").strip()
RESPONSE_TYPE = os.getenv("INCHEON_API_RESPONSE_TYPE", "json").strip().lower() or "json"
DEFAULT_LANG = os.getenv("INCHEON_API_LANG", "K").strip().upper() or "K"
DEFAULT_INQTIMECHCD = os.getenv("INCHEON_API_INQTIMECHCD", "E").strip().upper() or "E"

# 조회일 기준 D-3 ~ D+6 범위를 API가 안내하므로, 기본적으로 최근/가까운 날짜를 함께 조회
SEARCH_DAY_OFFSETS = [0, -1, 1, -2, 2, -3, 3, 4, 5, 6]

TIMEOUT = httpx.Timeout(20.0, connect=10.0)


@dataclass
class FlightLookupResult:
    airline: str = ""
    flightNo: str = ""
    masterFlightNo: str = ""
    scheduleTime: str = ""
    estimatedTime: str = ""
    airportCode: str = ""
    airportName: str = ""
    gateNumber: str = ""
    terminal: str = ""
    status: str = ""
    operationType: str = ""
    codeshare: str = ""
    sourceType: str = ""  # departure / arrival
    raw: Optional[Dict[str, Any]] = None


class IncheonCargoAPIError(RuntimeError):
    pass


def _require_service_key() -> None:
    if not SERVICE_KEY:
        raise IncheonCargoAPIError("INCHEON_API_SERVICE_KEY 환경변수가 비어 있습니다.")


def _today_yyyymmdd(offset_days: int = 0) -> str:
    return (datetime.now() + timedelta(days=offset_days)).strftime("%Y%m%d")


def _clean(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def _dedupe_keep_order(items: List[FlightLookupResult]) -> List[FlightLookupResult]:
    seen = set()
    out: List[FlightLookupResult] = []

    for item in items:
        key = (
            item.flightNo,
            item.masterFlightNo,
            item.scheduleTime,
            item.estimatedTime,
            item.airportCode,
            item.status,
            item.sourceType,
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(item)

    return out


def _safe_get(data: Dict[str, Any], *keys: str) -> Any:
    cur: Any = data
    for key in keys:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(key)
    return cur


def _extract_items(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    data.go.kr 공공 API 응답은 보통 다음 구조를 가집니다.
    {
      "response": {
        "header": {...},
        "body": {
          "items": {
            "item": [...]
          }
        }
      }
    }
    item이 단건일 때 dict로 오는 경우도 방어합니다.
    """
    items = _safe_get(payload, "response", "body", "items", "item")

    if items is None:
        return []
    if isinstance(items, list):
        return [x for x in items if isinstance(x, dict)]
    if isinstance(items, dict):
        return [items]
    return []


def _header_result_ok(payload: Dict[str, Any]) -> bool:
    result_code = _clean(_safe_get(payload, "response", "header", "resultCode"))
    return result_code in {"00", "0", ""}


def _header_result_message(payload: Dict[str, Any]) -> str:
    return _clean(_safe_get(payload, "response", "header", "resultMsg"))


def _normalize_item(item: Dict[str, Any], source_type: str) -> FlightLookupResult:
    """
    실제 응답 필드명이 문서/버전별로 조금 다를 수 있어 후보 키를 폭넓게 매핑합니다.
    """
    def pick(*candidates: str) -> str:
        for key in candidates:
            value = item.get(key)
            if value not in (None, ""):
                return _clean(value)
        return ""

    return FlightLookupResult(
        airline=pick("airline", "airlineNm", "airline_name", "airlineName"),
        flightNo=pick("flightNo", "flight_id", "flightId"),
        masterFlightNo=pick("masterFlightNo", "master_flight_id", "masterFlightId"),
        scheduleTime=pick("scheduleDateTime", "schedule_time", "std", "estimated_or_schedule_datetime", "schDateTime"),
        estimatedTime=pick("estimatedDateTime", "changeDateTime", "estimated_time", "etd", "eta", "chgDateTime"),
        airportCode=pick("airportCode", "airport_code", "toAirportCode", "destAirportCode"),
        airportName=pick("airport", "airportNm", "airport_name", "toAirportName", "destAirportName"),
        gateNumber=pick("gateNumber", "gateNo", "gate_number"),
        terminal=pick("terminal", "terminalId", "terminal_no"),
        status=pick("status", "remark", "rmk", "statusNm", "flightStatus"),
        operationType=pick("operationType", "operation_type", "aircraftOperationType"),
        codeshare=pick("codeshare", "codeshareYn", "codeShareYn"),
        sourceType=source_type,
        raw=item,
    )


async def _request_one(
    client: httpx.AsyncClient,
    path: str,
    flight_no: str,
    search_day: str,
) -> List[FlightLookupResult]:
    params = {
        "serviceKey": SERVICE_KEY,
        "pageNo": 1,
        "numOfRows": 50,
        "type": RESPONSE_TYPE,
        "searchday": search_day,
        "from_time": "0000",
        "to_time": "2400",
        "flight_id": flight_no,      # 문서상 지원 파라미터
        "inqtimechcd": DEFAULT_INQTIMECHCD,
        "lang": DEFAULT_LANG,
    }

    url = f"{BASE_URL}{path}"
    response = await client.get(url, params=params)

    # 404 등은 엔드포인트/파라미터 문제이므로 바로 예외로 올림
    response.raise_for_status()

    if RESPONSE_TYPE != "json":
        raise IncheonCargoAPIError("현재 코드는 json 응답만 지원합니다. INCHEON_API_RESPONSE_TYPE=json 으로 설정하세요.")

    payload = response.json()

    if not _header_result_ok(payload):
        msg = _header_result_message(payload) or "인천공항 API가 오류를 반환했습니다."
        raise IncheonCargoAPIError(msg)

    source_type = "departure" if path == DEPARTURES_PATH else "arrival"
    items = _extract_items(payload)
    return [_normalize_item(item, source_type=source_type) for item in items]


async def fetch_by_flight(
    flight_no: str,
    search_day: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    편명 기준으로 출발/도착 양쪽 엔드포인트를 조회합니다.
    반환값은 프론트가 바로 쓰기 쉬운 dict 리스트입니다.
    """
    _require_service_key()

    normalized_flight_no = _clean(flight_no).upper().replace(" ", "")
    if not normalized_flight_no:
        raise IncheonCargoAPIError("편명이 비어 있습니다.")

    days_to_try = [search_day] if search_day else [_today_yyyymmdd(offset) for offset in SEARCH_DAY_OFFSETS]

    results: List[FlightLookupResult] = []
    errors: List[str] = []

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for day in days_to_try:
            for path in (DEPARTURES_PATH, ARRIVALS_PATH):
                try:
                    items = await _request_one(
                        client=client,
                        path=path,
                        flight_no=normalized_flight_no,
                        search_day=day,
                    )
                    results.extend(items)
                except httpx.HTTPStatusError as e:
                    # 404/403/500 등은 원인 파악에 도움이 되도록 저장
                    errors.append(f"{path} {day} HTTP {e.response.status_code}")
                except Exception as e:
                    errors.append(f"{path} {day} {type(e).__name__}: {e}")

            # 한 날짜에서 결과가 나오면 너무 멀리까지 안 가도 됨
            if results:
                break

    results = _dedupe_keep_order(results)

    if results:
        return [r.__dict__ for r in results]

    # 결과가 없는데 호출 자체는 됐을 수 있으므로 빈 배열 반환
    # 디버깅이 필요하면 아래 메시지를 로깅하도록 routes 쪽에서 처리
    if errors:
        # 완전 실패와 단순 no data를 구분하고 싶다면 여기서 raise 대신 빈 배열+로그 추천
        # 지금은 프론트 UX를 위해 빈 배열을 반환
        return []

    return []


# 하위호환용 별칭
class IncheonCargoFlightAPI:
    async def fetch_by_flight(self, flight_no: str, search_day: Optional[str] = None) -> List[Dict[str, Any]]:
        return await fetch_by_flight(flight_no=flight_no, search_day=search_day)
