import os
import requests
import base64
import re

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


# 🔥 핵심: 편명 추출 강화
def extract_flights(text: str):
    if not text:
        return []

    text = text.upper()

    # OCR 깨짐 보정
    text = text.replace(" ", "").replace("\n", "")

    # KJ + 숫자 패턴
    flights = re.findall(r"KJ\d{3,4}", text)

    return list(set(flights))
