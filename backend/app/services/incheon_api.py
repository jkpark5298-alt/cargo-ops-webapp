from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx


BASE_URL = "https://apis.data.go.kr/B551177/StatusOfCargoFlightsDeOdp"
DEPARTURES_PATH = "/getCargoDeparturesDeOdp"
ARRIVALS_PATH = "/getCargoArrivalsDeOdp"

SERVICE_KEY = os.getenv("INCHEON_API_SERVICE_KEY", "").strip()
DEFAULT_LANG = os.getenv("INCHEON_API_LANG", "K").strip().upper() or "K"
DEFAULT_INQTIMECHCD = os.getenv("INCHEON_API_INQTIMECHCD", "E").strip().upper() or "E"

# 오늘 기준 D-3 ~ D+6 범위 조회
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
    fid: str = ""
    sourceType: str = ""   # departure / arrival
    raw: Optional[Dict[str, Any]] = None


class IncheonCargoAPIError(RuntimeError):
    pass


def _require_service_key() -> None:
    if not SERVICE_KEY:
        raise IncheonCargoAPIError("INCHEON_API_SERVICE_KEY 환경변수가 비어 있습니다.")


def _today_yyyymmdd(offset_days: int = 0) -> str:
    return (datetime.now() + timedelta(days=offset_days)).strftime("%Y%m%d")


def _clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _dedupe_keep_order(items: List[FlightLookupResult]) -> List[FlightLookupResult]:
    seen = set()
    out: List[FlightLookupResult] = []

    for item in items:
        key = (
            item.flightNo,
            item.scheduleTime,
            item.estimatedTime,
            item.airportCode,
            item.gateNumber,
            item.terminal,
            item.status,
            item.sourceType,
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(item)

    return out


def _xml_text(parent: ET.Element, tag_name: str) -> str:
    elem = parent.find(tag_name)
    if elem is None or elem.text is None:
        return ""
    return elem.text.strip()


def _parse_xml_items(xml_text: str, source_type: str) -> List[FlightLookupResult]:
    root = ET.fromstring(xml_text)

    result_code = _clean(root.findtext("./header/resultCode"))
    result_msg = _clean(root.findtext("./header/resultMsg"))

    if result_code not in {"00", "0", ""}:
        raise IncheonCargoAPIError(result_msg or f"인천공항 API 오류 코드: {result_code}")

    item_nodes = root.findall("./body/items/item")
    results: List[FlightLookupResult] = []

    for item in item_nodes:
        raw = {
            "airline": _xml_text(item, "airline"),
            "airport": _xml_text(item, "airport"),
            "airportCode": _xml_text(item, "airportCode"),
            "codeshare": _xml_text(item, "codeshare"),
            "estimatedDateTime": _xml_text(item, "estimatedDateTime"),
            "fid": _xml_text(item, "fid"),
            "flightId": _xml_text(item, "flightId"),
            "gatenumber": _xml_text(item, "gatenumber"),
            "masterflightid": _xml_text(item, "masterflightid"),
            "remark": _xml_text(item, "remark"),
            "scheduleDateTime": _xml_text(item, "scheduleDateTime"),
            "terminalid": _xml_text(item, "terminalid"),
            "typeOfFlight": _xml_text(item, "typeOfFlight"),
        }

        results.append(
            FlightLookupResult(
                airline=raw["airline"],
                flightNo=raw["flightId"],
                masterFlightNo=raw["masterflightid"],
                scheduleTime=raw["scheduleDateTime"],
                estimatedTime=raw["estimatedDateTime"],
                airportCode=raw["airportCode"],
                airportName=raw["airport"],
                gateNumber=raw["gatenumber"],
                terminal=raw["terminalid"],
                status=raw["remark"],
                operationType=raw["typeOfFlight"],
                codeshare=raw["codeshare"],
                fid=raw["fid"],
                sourceType=source_type,
                raw=raw,
            )
        )

    return results


def _json_get(data: Dict[str, Any], *keys: str) -> Any:
    cur: Any = data
    for key in keys:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(key)
    return cur


def _parse_json_items(payload: Dict[str, Any], source_type: str) -> List[FlightLookupResult]:
    result_code = _clean(_json_get(payload, "response", "header", "resultCode"))
    result_msg = _clean(_json_get(payload, "response", "header", "resultMsg"))

    if result_code not in {"00", "0", ""}:
        raise IncheonCargoAPIError(result_msg or f"인천공항 API 오류 코드: {result_code}")

    items = _json_get(payload, "response", "body", "items", "item")
    if items is None:
        return []
    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list):
        return []

    results: List[FlightLookupResult] = []

    for item in items:
        if not isinstance(item, dict):
            continue

        results.append(
            FlightLookupResult(
                airline=_clean(item.get("airline")),
                flightNo=_clean(item.get("flightId") or item.get("flightNo")),
                masterFlightNo=_clean(item.get("masterflightid") or item.get("masterFlightNo")),
                scheduleTime=_clean(item.get("scheduleDateTime")),
                estimatedTime=_clean(item.get("estimatedDateTime")),
                airportCode=_clean(item.get("airportCode")),
                airportName=_clean(item.get("airport")),
                gateNumber=_clean(item.get("gatenumber") or item.get("gateNumber")),
                terminal=_clean(item.get("terminalid") or item.get("terminal")),
                status=_clean(item.get("remark") or item.get("status")),
                operationType=_clean(item.get("typeOfFlight") or item.get("operationType")),
                codeshare=_clean(item.get("codeshare")),
                fid=_clean(item.get("fid")),
                sourceType=source_type,
                raw=item,
            )
        )

    return results


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
        "searchday": search_day,
        "from_time": "0000",
        "to_time": "2400",
        "flight_id": flight_no,
        "inqtimechcd": DEFAULT_INQTIMECHCD,
        "lang": DEFAULT_LANG,
    }

    url = f"{BASE_URL}{path}"
    response = await client.get(url, params=params)
    response.raise_for_status()

    content_type = (response.headers.get("content-type") or "").lower()
    source_type = "departure" if path == DEPARTURES_PATH else "arrival"

    # XML 우선 대응
    if "xml" in content_type or response.text.lstrip().startswith("<?xml"):
        return _parse_xml_items(response.text, source_type=source_type)

    # JSON 대응
    if "json" in content_type:
        return _parse_json_items(response.json(), source_type=source_type)

    # content-type가 애매해도 XML/JSON 순으로 재시도
    body_text = response.text.strip()
    if body_text.startswith("<?xml") or body_text.startswith("<response"):
        return _parse_xml_items(body_text, source_type=source_type)

    try:
        return _parse_json_items(response.json(), source_type=source_type)
    except Exception as e:
        raise IncheonCargoAPIError(f"응답 형식을 해석할 수 없습니다. content-type={content_type}, error={e}")


async def fetch_by_flight(
    flight_no: str,
    search_day: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    편명 기준으로 출발/도착 화물기 정보를 조회.
    프론트가 바로 쓰기 쉬운 dict 리스트로 반환.
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
                    errors.append(f"{path} {day} HTTP {e.response.status_code}")
                except Exception as e:
                    errors.append(f"{path} {day} {type(e).__name__}: {e}")

            if results:
                break

    results = _dedupe_keep_order(results)

    if results:
        return [asdict(r) for r in results]

    # 결과가 없을 때는 빈 배열 반환
    # 디버깅이 필요하면 Render Logs에서 errors를 print 하도록 확장 가능
    if errors:
        print(f"[incheon_api.fetch_by_flight] no results for {normalized_flight_no}, errors={errors}")

    return []


class IncheonCargoFlightAPI:
    async def fetch_by_flight(self, flight_no: str, search_day: Optional[str] = None) -> List[Dict[str, Any]]:
        return await fetch_by_flight(flight_no=flight_no, search_day=search_day)
