from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
import os
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

router = APIRouter()

SERVICE_KEY = os.getenv("INCHEON_API_SERVICE_KEY", "").strip()

# 실제 사용 중인 화물기 상세 API
BASE_URL = "https://apis.data.go.kr/B551177/StatusOfCargoFlightsDeOdp"
DEPARTURES_PATH = "/getCargoDeparturesDeOdp"
ARRIVALS_PATH = "/getCargoArrivalsDeOdp"


def _text(node, tag: str) -> str:
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

        # 방향 보정
        # 출발편: ICN -> 상대공항
        # 도착편: 상대공항 -> ICN
        is_departure = False
        if remark:
            if "출발" in remark:
                is_departure = True
            elif "도착" in remark:
                is_departure = False
            else:
                is_departure = source_type == "departure"
        else:
            is_departure = source_type == "departure"

        departure_code = "ICN" if is_departure else airport_code
        departure_name = "인천공항" if is_departure else airport_name
        arrival_code = airport_code if is_departure else "ICN"
        arrival_name = airport_name if is_departure else "인천공항"

        # 현황 표시 규칙
        # 출발 완료만 "출발", 출발 전 공란
        # 도착 완료만 "도착", 도착 전 공란
        status_text = ""
        if schedule and estimated and schedule != estimated:
            if "출발" in remark:
                status_text = "출발"
            elif "도착" in remark:
                status_text = "도착"

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
                "gatenumber": gate,
                "terminalid": terminal,
                "masterflightid": master,
                "codeshare": codeshare,
                "typeOfFlight": type_of_flight,
                "remark": remark,
                "status": status_text,
                "sourceType": source_type,
                "fid": fid,
            }
        )

    return rows


async def _fetch_one_day(client: httpx.AsyncClient, flight_no: str, search_day: str) -> List[Dict[str, Any]]:
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

    for path, source_type in [(DEPARTURES_PATH, "departure"), (ARRIVALS_PATH, "arrival")]:
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


@router.get("/lookup")
async def lookup_flight(
    flight_no: str = Query(..., description="예: KJ282 또는 KJ282,KJ285"),
):
    if not SERVICE_KEY:
        raise HTTPException(status_code=500, detail="INCHEON_API_SERVICE_KEY 환경변수가 비어 있습니다.")

    raw_list = [x.strip().upper() for x in flight_no.split(",") if x.strip()]
    if not raw_list:
        raise HTTPException(status_code=400, detail="flight_no는 필수입니다.")

    # 오늘 기준 D-3 ~ D+6
    days = [(datetime.now() + timedelta(days=offset)).strftime("%Y%m%d") for offset in range(-3, 7)]

    all_rows: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        for one_flight in raw_list:
            flight_rows: List[Dict[str, Any]] = []
            for day in days:
                rows = await _fetch_one_day(client, one_flight, day)
                if rows:
                    flight_rows.extend(rows)

            # 중복 제거
            deduped: List[Dict[str, Any]] = []
            seen = set()
            for row in flight_rows:
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

            all_rows.extend(deduped)

    return {
        "success": True,
        "count": len(all_rows),
        "data": all_rows,
    }
