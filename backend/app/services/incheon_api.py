import os
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

SERVICE_KEY = os.getenv("INCHEON_API_SERVICE_KEY", "").strip()

BASE_URL = "https://apis.data.go.kr/B551177/StatusOfCargoFlightsDeOdp"
DEPARTURES_PATH = "/getCargoDeparturesDeOdp"
ARRIVALS_PATH = "/getCargoArrivalsDeOdp"


def _text(node, tag):
    found = node.find(tag)
    return found.text.strip() if found is not None and found.text else ""


def _format_time(value):
    digits = "".join(filter(str.isdigit, value))
    if len(digits) == 12:
        return f"{digits[:4]}/{digits[4:6]}/{digits[6:8]} {digits[8:10]}:{digits[10:12]}"
    return value


def _parse_xml_items(xml_text, source_type):
    root = ET.fromstring(xml_text)
    items = root.findall(".//item")

    now_str = datetime.now().strftime("%Y%m%d%H%M")

    results = []

    for item in items:
        airport_code = _text(item, "airportCode")
        airport_name = _text(item, "airport")
        flight_id = _text(item, "flightId")
        schedule = _text(item, "scheduleDateTime")
        estimated = _text(item, "estimatedDateTime")
        gate = _text(item, "gatenumber")
        terminal = _text(item, "terminalid")
        remark = _text(item, "remark")

        # ✅ ICN 기준 판단
        is_departure = airport_code != "ICN"

        departure_code = "ICN" if is_departure else airport_code
        arrival_code = airport_code if is_departure else "ICN"

        departure_name = "인천공항" if is_departure else airport_name
        arrival_name = airport_name if is_departure else "인천공항"

        # ✅ 상태 판단
        status = ""
        if estimated and estimated <= now_str:
            status = "출발" if is_departure else "도착"

        # ✅ 확장 상태 플래그
        delay = schedule and estimated and schedule != estimated
        canceled = "결항" in remark
        gate_changed = "변경" in remark or "GATE" in remark.upper()

        results.append({
            "flightId": flight_id,
            "departureCode": departure_code,
            "arrivalCode": arrival_code,
            "departureName": departure_name,
            "arrivalName": arrival_name,
            "scheduleDateTime": _format_time(schedule),
            "estimatedDateTime": _format_time(estimated),
            "gatenumber": gate,
            "terminalid": terminal,
            "status": status,
            "delay": delay,
            "canceled": canceled,
            "gateChanged": gate_changed,
        })

    return results


async def get_flight_data(flight_no, start_date, end_date):
    async with httpx.AsyncClient(timeout=10) as client:
        results = []

        for path, t in [(DEPARTURES_PATH, "departure"), (ARRIVALS_PATH, "arrival")]:
            url = f"{BASE_URL}{path}"
            params = {
                "serviceKey": SERVICE_KEY,
                "flight_id": flight_no,
                "searchday": start_date.replace("-", ""),
            }

            res = await client.get(url, params=params)
            if res.status_code == 200:
                results.extend(_parse_xml_items(res.text, t))

        return results
