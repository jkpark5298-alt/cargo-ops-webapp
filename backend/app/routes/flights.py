from fastapi import APIRouter, Query
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime

router = APIRouter()

# 🔑 환경변수로 넣는 걸 추천
SERVICE_KEY = "여기에_네_API_KEY_입력"

API_URL = "https://apis.data.go.kr/B551177/StatusOfCargoFlightsDeOdp/getCargoFlightOdp"


def format_time(t: str):
    if not t or len(t) != 12:
        return "-"
    return f"{t[:4]}/{t[4:6]}/{t[6:8]} {t[8:10]}:{t[10:12]}"


def get_status(schedule: str, estimated: str):
    if not schedule or not estimated:
        return ""

    if schedule == estimated:
        return "정시"
    return "지연"


@router.get("/lookup")
async def lookup_flights(flight_no: str = Query(...)):
    try:
        flight_list = [f.strip() for f in flight_no.split(",") if f.strip()]
        results = []

        async with httpx.AsyncClient(timeout=10) as client:
            for f in flight_list:
                params = {
                    "serviceKey": SERVICE_KEY,
                    "type": "json",
                    "flight_id": f
                }

                res = await client.get(API_URL, params=params)

                if res.status_code != 200:
                    continue

                # 🔥 XML 파싱
                root = ET.fromstring(res.text)

                items = root.findall(".//item")

                for item in items:
                    schedule = item.findtext("scheduleDateTime")
                    estimated = item.findtext("estimatedDateTime")

                    dep = item.findtext("airportCode")  # 출발 or 도착 공항
                    airport_name = item.findtext("airport")

                    gate = item.findtext("gatenumber")
                    terminal = item.findtext("terminalid")

                    remark = item.findtext("remark")  # 출발 / 도착
                    codeshare = item.findtext("codeshare")
                    master = item.findtext("masterflightid")

                    # 🔥 출발/도착 구분 보정
                    if remark == "출발":
                        departure = "ICN"
                        arrival = dep
                    else:
                        departure = dep
                        arrival = "ICN"

                    # 🔥 현황 처리
                    now = datetime.now().strftime("%Y%m%d%H%M")

                    status_text = ""
                    if remark == "출발" and estimated and estimated < now:
                        status_text = "출발"
                    elif remark == "도착" and estimated and estimated < now:
                        status_text = "도착"

                    results.append({
                        "현황": status_text,
                        "flightId": f,
                        "출발지코드": departure,
                        "도착지코드": arrival,
                        "출발지공항명": "인천공항" if departure == "ICN" else airport_name,
                        "도착지공항명": airport_name if arrival != "ICN" else "인천공항",
                        "예정일시": format_time(schedule),
                        "변경일시": format_time(estimated),
                        "게이트": gate or "-",
                        "터미널": terminal or "-",
                        "마스터편명": master or "-",
                        "코드쉐어": codeshare or "-"
                    })

        return {
            "count": len(results),
            "data": results
        }

    except Exception as e:
        return {
            "error": str(e)
        }
