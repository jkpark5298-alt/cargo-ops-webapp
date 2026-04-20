import os
import requests
import base64
import re

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
        return result["responses"][0]["fullTextAnnotation"]["text"]
    except Exception:
        return ""


# -----------------------------
# ✈ 편명 추출 (핵심 개선)
# -----------------------------
def extract_flights(text: str):
    if not text:
        return []

    text = text.upper()

    # 줄 기준으로 나누기 (표 구조 유지)
    lines = text.split("\n")

    flights = []

    for line in lines:
        # KJ 편명만 추출 (HL 제거됨)
        match = re.search(r"\bKJ\d{3,4}\b", line)
        if match:
            flights.append(match.group())

    # 중복 제거 + 순서 유지
    seen = set()
    result = []
    for f in flights:
        if f not in seen:
            seen.add(f)
            result.append(f)

    return result
