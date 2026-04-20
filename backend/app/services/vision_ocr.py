import os
import requests
import base64
import re
from typing import List, Dict

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


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


def extract_text_from_image(image_bytes: bytes) -> str:
    result = call_google_vision(image_bytes)

    try:
        return result["responses"][0]["fullTextAnnotation"]["text"]
    except Exception:
        return ""


def _normalize(line: str) -> str:
    return re.sub(r"\s+", "", line or "").upper()


def _is_target_line(line: str, target_name="박종규") -> bool:
    normalized = _normalize(line)
    target = _normalize(target_name)

    if target in normalized:
        return True

    for code in ["A", "B", "C"]:
        if f"{code}{target}" in normalized:
            return True

    return False


def _normalize_flight(flight: str) -> str:
    m = re.match(r"KJ0+(\d{3,4})", flight)
    if m:
        return f"KJ{m.group(1)}"
    return flight


def _extract_flight(line: str) -> str:
    line = _normalize(line)

    # OCR 오인식 보정
    line = line.replace("KJO", "KJ0")

    match = re.search(r"KJ\d{3,4}", line)
    if match:
        return _normalize_flight(match.group())

    return ""


def _extract_parking(line: str) -> str:
    line = _normalize(line)

    match = re.search(r"\d{3}[RL]?", line)
    if match:
        return match.group()

    return ""


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
