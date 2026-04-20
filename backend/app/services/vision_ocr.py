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
        print("📌 OCR TEXT:\n", text)  # 디버깅용
        return text
    except Exception:
        return ""


# -----------------------------
# 문자열 정규화
# -----------------------------
def _normalize(line: str) -> str:
    if not line:
        return ""
    line = line.upper()
    line = re.sub(r"\s+", "", line)
    return line


# -----------------------------
# 🔥 이름 인식 (강화 버전)
# -----------------------------
def _is_target_line(line: str, target_name="박종규") -> bool:
    if not line:
        return False

    normalized = _normalize(line)

    # 기본 포함
    if target_name in normalized:
        return True

    # 공백 깨짐 대응
    if target_name in normalized.replace(" ", ""):
        return True

    # 글자 분해 대응 (박 종 규 따로 찍힌 경우)
    if all(char in normalized for char in ["박", "종", "규"]):
        return True

    return False


# -----------------------------
# 편명 정규화 (0 제거)
# -----------------------------
def _normalize_flight(flight: str) -> str:
    m = re.match(r"KJ0+(\d{3,4})", flight)
    if m:
        return f"KJ{m.group(1)}"
    return flight


# -----------------------------
# 편명 추출
# -----------------------------
def _extract_flight(line: str) -> str:
    line = _normalize(line)

    # OCR 오인식 보정
    line = line.replace("KJO", "KJ0")
    line = line.replace("KJI", "KJ1")

    match = re.search(r"KJ\d{3,4}", line)
    if match:
        return _normalize_flight(match.group())

    return ""


# -----------------------------
# 주기장 추출
# -----------------------------
def _extract_parking(line: str) -> str:
    line = _normalize(line)

    match = re.search(r"\d{3}[RL]?", line)
    if match:
        return match.group()

    return ""


# -----------------------------
# 🔥 최종: 행 단위 추출
# -----------------------------
def extract_flight_parking(text: str, target_name="박종규") -> List[Dict]:
    if not text:
        return []

    lines = text.split("\n")
    result = []

    for line in lines:
        if not _is_target_line(line, target_name):
            continue

        flight = _extract_flight(line)
        parking = _extract_parking(line)

        if flight:
            result.append({
                "name": target_name,
                "flight": flight,
                "parking": parking
            })

    return result
