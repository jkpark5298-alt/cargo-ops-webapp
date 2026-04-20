import os
import requests
import base64
import re
from typing import List, Dict, Any

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


# -----------------------------
# Vision API 호출
# -----------------------------
def call_google_vision(image_bytes: bytes) -> Dict[str, Any]:
    url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_API_KEY}"

    img_base64 = base64.b64encode(image_bytes).decode()

    body = {
        "requests": [
            {
                "image": {"content": img_base64},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
            }
        ]
    }

    res = requests.post(url, json=body)

    if res.status_code != 200:
        print("❌ Vision API ERROR:", res.text)
        return {}

    return res.json()


# -----------------------------
# 텍스트 + 위치 블록 추출
# -----------------------------
def extract_blocks(image_bytes: bytes):
    result = call_google_vision(image_bytes)

    blocks = []

    try:
        pages = result["responses"][0]["fullTextAnnotation"]["pages"]
        for page in pages:
            for block in page["blocks"]:
                for para in block["paragraphs"]:
                    for word in para["words"]:
                        text = "".join([s["text"] for s in word["symbols"]])
                        vertices = word["boundingBox"]["vertices"]

                        # y 좌표 평균 (행 판단용)
                        y = sum([v.get("y", 0) for v in vertices]) / len(vertices)

                        blocks.append({
                            "text": text,
                            "y": y
                        })
    except Exception as e:
        print("OCR PARSE ERROR:", e)

    return blocks


# -----------------------------
# 행 클러스터링
# -----------------------------
def group_by_line(blocks, threshold=10):
    lines = []

    for b in blocks:
        placed = False
        for line in lines:
            if abs(line["y"] - b["y"]) < threshold:
                line["words"].append(b["text"])
                placed = True
                break

        if not placed:
            lines.append({
                "y": b["y"],
                "words": [b["text"]]
            })

    return lines


# -----------------------------
# 편명 정규화
# -----------------------------
def normalize_flight(f):
    m = re.match(r"KJ0*(\d{3,4})", f)
    if m:
        return f"KJ{m.group(1)}"
    return f


# -----------------------------
# 행 기반 추출 (핵심)
# -----------------------------
def extract_flight_parking(image_bytes: bytes, target_name="박종규") -> List[Dict]:
    blocks = extract_blocks(image_bytes)
    lines = group_by_line(blocks)

    result = []

    for line in lines:
        text = "".join(line["words"])

        # 이름 포함된 행만
        if target_name not in text:
            continue

        # 편명
        f_match = re.search(r"KJ\d{3,4}", text.replace("KJO", "KJ0"))
        if not f_match:
            continue

        flight = normalize_flight(f_match.group())

        # 주기장
        p_match = re.search(r"\d{3}[RL]?", text)
        parking = p_match.group() if p_match else ""

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
