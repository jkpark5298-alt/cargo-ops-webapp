import os
import requests
import base64
import re
from typing import List, Dict

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


# -----------------------------
# Google Vision API 호출
# -----------------------------
def call_google_vision(image_bytes: bytes):
    url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_API_KEY}"

    img_base64 = base64.b64encode(image_bytes).decode()

    body = {
        "requests": [
            {
                "image": {"content": img_base64},
                "features": [{"type": "TEXT_DETECTION"}],
            }
        ]
    }

    res = requests.post(url, json=body)

    if res.status_code != 200:
        print("❌ Vision API ERROR:", res.text)
        return {}

    return res.json()


# -----------------------------
# OCR 텍스트 추출
# -----------------------------
def extract_text_from_image(image_bytes: bytes) -> str:
    result = call_google_vision(image_bytes)

    try:
        text = result["responses"][0]["fullTextAnnotation"]["text"]
        print("📌 OCR TEXT:\n", text)
        return text
    except Exception:
        return ""


# -----------------------------
# 편명 정규화
# -----------------------------
def normalize_flight(flight: str) -> str:
    m = re.match(r"KJ0+(\d{3,4})", flight)
    if m:
        return f"KJ{m.group(1)}"
    return flight


# -----------------------------
# 🔥 핵심: 위치 기반 매칭
# -----------------------------
def extract_flight_parking(text: str, target_name="박종규") -> List[Dict]:
    if not text:
        return []

    lines = text.split("\n")
    result = []

    # 1️⃣ 모든 편명 위치 수집
    flights = []
    for i, line in enumerate(lines):
        match = re.search(r"KJ\d{3,4}", line.replace("KJO", "KJ0"))
        if match:
            flights.append((i, normalize_flight(match.group())))

    # 2️⃣ 이름 위치 찾기
    for i, line in enumerate(lines):
        if target_name in line.replace(" ", ""):

            # 🔥 앞뒤 2줄 탐색
            for f_idx, flight in flights:
                if abs(f_idx - i) <= 2:

                    # 주기장 찾기
                    parking = ""
                    search_line = lines[f_idx]

                    p = re.search(r"\d{3}[RL]?", search_line)
                    if p:
                        parking = p.group()

                    result.append({
                        "name": target_name,
                        "flight": flight,
                        "parking": parking
                    })

    # 중복 제거
    unique = {}
    for r in result:
        unique[r["flight"]] = r

    return list(unique.values())
