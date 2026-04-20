import os
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import Any, Dict, List


SERVICE_KEY = os.getenv("INCHEON_API_SERVICE_KEY", "").strip()

BASE_URL = "https://apis.data.go.kr/B551177/StatusOfCargoFlightsDeOdp"
DEPARTURES_PATH = "/getCargoDeparturesDeOdp"
ARRIVALS_PATH = "/getCargoArrivalsDeOdp"


def _text(node: ET.Element, tag: str) -> str:
    found = node.find(tag)
    if found is None or found.text is None:
        return ""
    return found.text.strip()


def _format_time(value: str) -> str:
    if not value:
        return ""
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) != 12:
        return value
    return f"{digits[:4]}/{digits[4:6]}/{digits[6:8]} {digits[8:10]}:{digits[10:12]}"


def _parse_xml_items(xml_text: str, source_type: str) -> List[Dict[str, Any]]:
    root = ET.fromstring(xml_text)

    result_code = root.findtext("./header/resultCode", default="").strip()
    if result_code not in {"00", "0", ""}:
        return []

    items = root.findall("./body/items/item")
    rows: List[Dict[str, Any]] = []

    now_str = datetime.now().strftime("%Y%m%d%H%M")

    for item in items:
        airline = _text(item, "airline")
        airport_name = _text(item, "airport")
        airport_code = _text(item, "airportCode")
        codeshare = _text(item, "codeshare")
        estimated = _text(item, "estimatedDateTime")
        flight_id = _text(item, "flightId")
        gate = _text(item, "gatenumber")
        master = _text(item, "masterflightid")
        remark = _text(item, "remark")
        schedule = _text(item, "scheduleDateTime")
        terminal = _text(item, "terminalid")
        type_of_flight = _text(item, "typeOfFlight")
        fid = _text(item, "fid")

        # source_type 기준으로 방향 판단
        # departure API -> ICN 출발편
        # arrival API   -> ICN 도착편
        is_departure = source_type == "departure"

        departure_code = "ICN" if is_departure else airport_code
        departure_name = "인천공항" if is_departure else airport_name
        arrival_code = airport_code if is_departure else "ICN"
        arrival_name = airport_name if is_departure else "인천공항"

        # 현황
        status = ""
        if estimated and estimated <= now_str:
            status = "출발" if is_departure else "도착"

        # 상태 플래그
        canceled = "결항" in remark
        delay = bool(schedule and estimated and schedule != estimated and not canceled)
        gate_changed = (
            "게이트변경" in remark
            or "게이트 변경" in remark
            or "GATE CHANGE" in remark.upper()
            or "GATE CHANGED" in remark.upper()
        )

        rows.append(
            {
                "airline": airline,
                "flightId": flight_id,
                "flightNo": flight_id,
                "departureCode": departure_code,
                "departureName": departure_name,
                "arrivalCode": arrival_code,
                "arrivalName": arrival_name,
                "scheduleDateTime": schedule,
                "estimatedDateTime": estimated,
                "formattedScheduleTime": _format_time(schedule),
                "formattedEstimatedTime": _format_time(estimated),
                "gatenumber": gate or "-",
                "terminalid": terminal or "-",
                "masterflightid": master or "-",
                "codeshare": codeshare or "-",
                "typeOfFlight": type_of_flight,
                "remark": remark,
                "status": status,
                "delay": delay,
                "canceled": canceled,
                "gateChanged": gate_changed,
                "sourceType": source_type,
                "fid": fid,
            }
        )

    return rows


async def _fetch_one_day(
    client: httpx.AsyncClient,
    flight_no: str,
    search_day: str,
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    common_params = {
        "serviceKey": SERVICE_KEY,
        "pageNo": 1,
        "numOfRows": 50,
        "searchday": search_day,
        "from_time": "0000",
        "to_time": "2400",
        "flight_id": flight_no,
        "inqtimechcd": "E",
        "lang": "K",
    }

    for path, source_type in [
        (DEPARTURES_PATH, "departure"),
        (ARRIVALS_PATH, "arrival"),
    ]:
        url = f"{BASE_URL}{path}"
        try:
            res = await client.get(url, params=common_params)
            if res.status_code != 200:
                continue

            parsed = _parse_xml_items(res.text, source_type=source_type)
            results.extend(parsed)
        except Exception:
            continue

    return results


def _date_range(start_date: str, end_date: str) -> List[str]:
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()

    if end < start:
        start, end = end, start

    days: List[str] = []
    current = start
    while current <= end:
        days.append(current.strftime("%Y%m%d"))
        current += timedelta(days=1)

    return days


async def get_flight_data(
    flight_no: str,
    start_date: str,
    end_date: str,
) -> List[Dict[str, Any]]:
    if not SERVICE_KEY:
        raise ValueError("INCHEON_API_SERVICE_KEY 환경변수가 비어 있습니다.")

    day_list = _date_range(start_date, end_date)
    all_rows: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        for day in day_list:
            rows = await _fetch_one_day(client, flight_no, day)
            all_rows.extend(rows)

    # 중복 제거
    deduped: List[Dict[str, Any]] = []
    seen = set()

    for row in all_rows:
        key = (
            row.get("flightId", ""),
            row.get("scheduleDateTime", ""),
            row.get("estimatedDateTime", ""),
            row.get("departureCode", ""),
            row.get("arrivalCode", ""),
            row.get("gatenumber", ""),
            row.get("terminalid", ""),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)

    deduped.sort(
        key=lambda x: (
            x.get("scheduleDateTime", ""),
            x.get("flightId", ""),
        )
    )

    return deduped
