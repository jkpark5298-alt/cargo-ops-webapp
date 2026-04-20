import httpx
import xml.etree.ElementTree as ET
from datetime import datetime

SERVICE_KEY = "여기에_너_API_KEY"

BASE_URL = "http://apis.data.go.kr/B551177/StatusOfPassengerFlightsOdp/getPassengerDeparturesOdp"


def _parse_xml_items(xml_text):
    root = ET.fromstring(xml_text)
    items = root.findall(".//item")

    results = []

    for item in items:
        def get(tag):
            el = item.find(tag)
            return el.text.strip() if el is not None and el.text else ""

        std = get("std")
        etd = get("etd")
        remark = get("rmkEng")
        gate = get("gate")
        terminal = get("terminalId")

        # -------------------------
        # 🔥 상태 판단 로직 핵심
        # -------------------------
        status_text = "-"
        delay = False
        canceled = False
        gate_changed = False

        # 출발 / 도착 구분
        if remark:
            if "DEPARTED" in remark:
                status_text = "출발"
            elif "ARRIVED" in remark:
                status_text = "도착"
            elif "CANCELLED" in remark:
                status_text = "결항"
                canceled = True
            elif "DELAYED" in remark:
                status_text = "지연"
                delay = True
            else:
                status_text = remark

        # 지연 판단 (시간 비교)
        try:
            if std and etd and std != etd:
                delay = True
        except:
            pass

        # 게이트 변경 판단 (간단 기준)
        if "GATE" in remark.upper():
            gate_changed = True

        results.append({
            "flightId": get("airFln"),
            "departureCode": get("depIata"),
            "departureName": get("depAirportNm"),
            "arrivalCode": get("arrIata"),
            "arrivalName": get("arrAirportNm"),
            "formattedScheduleTime": std,
            "formattedEstimatedTime": etd,
            "gatenumber": gate,
            "terminalid": terminal,
            "masterflightid": "-",
            "codeshare": "Master",

            # 🔥 여기 중요
            "status": status_text,
            "delay": delay,
            "canceled": canceled,
            "gateChanged": gate_changed
        })

    return results


async def fetch_flights(flight_no: str, start_date: str):
    async with httpx.AsyncClient(timeout=20.0) as client:
        params = {
            "serviceKey": SERVICE_KEY,
            "numOfRows": "100",
            "pageNo": "1",
            "from_time": "0000",
            "to_time": "2400",
            "flight_id": flight_no,
            "searchday": start_date.replace("-", "")
        }

        res = await client.get(BASE_URL, params=params)

        if res.status_code != 200:
            return []

        return _parse_xml_items(res.text)
