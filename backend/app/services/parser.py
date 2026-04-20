import re
from typing import List, Dict


# -----------------------------
# 편명 추출
# -----------------------------
def extract_flights(text: str) -> List[str]:
    return list(set(re.findall(r"\b[A-Z]{2}\d{3,4}\b", text or "")))


# -----------------------------
# 주기장 추출 (C01, A12 등)
# -----------------------------
def extract_parking(text: str) -> str:
    m = re.search(r"\b[A-Z]\d{2}\b", text)
    return m.group(0) if m else ""


# -----------------------------
# 이름 추출 (이름 기준 우선)
# -----------------------------
def extract_name(line: str, target_names: List[str]) -> str:
    for name in target_names:
        if name in line:
            return name
    return ""


# -----------------------------
# 코드 추출 (A/B/C)
# -----------------------------
def extract_codes(line: str) -> List[str]:
    return re.findall(r"\b[A-C]\b", line)


# -----------------------------
# 범례 추출
# 예: A박종규 B김기성 C이기영
# -----------------------------
def extract_legend(text: str) -> Dict[str, str]:
    legend = {}

    matches = re.findall(r"\b([A-C])\s*([가-힣]{2,4})", text)

    for code, name in matches:
        legend[code] = name

    return legend


# -----------------------------
# OCR 전체 파싱
# -----------------------------
def parse_ocr_text(
    text: str,
    target_names: List[str],
    fallback_legend: Dict[str, str] = None
) -> List[Dict]:

    legend = extract_legend(text)

    # fallback 입력값이 있으면 덮어쓰기
    if fallback_legend:
        legend.update(fallback_legend)

    lines = text.split("\n")

    results = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        flights = extract_flights(line)
        if not flights:
            continue

        parking = extract_parking(line)

        # -----------------------------
        # 1️⃣ 이름이 있는 경우 (최우선)
        # -----------------------------
        name = extract_name(line, target_names)

        if name:
            results.append({
                "name": name,
                "flights": flights,
                "parking": parking
            })
            continue

        # -----------------------------
        # 2️⃣ 코드만 있는 경우 (A/B/C)
        # -----------------------------
        codes = extract_codes(line)

        if codes:
            for code in codes:
                mapped_name = legend.get(code, "")

                results.append({
                    "name": mapped_name,
                    "code": code,
                    "flights": flights,
                    "parking": parking
                })

    return results
