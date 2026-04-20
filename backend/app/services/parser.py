import re
from typing import List, Dict


# -----------------------------
# ✈ 편명 추출 (OCR 보정 포함)
# -----------------------------
def extract_flights(text: str) -> List[str]:
    if not text:
        return []

    text = text.upper()

    # OCR 오류 보정
    text = text.replace("O", "0")
    text = text.replace("I", "1")
    text = text.replace(" ", "")

    patterns = [
        r"KJ\d{3,4}",
        r"[A-Z]{2}\d{3,4}"
    ]

    results = set()

    for pattern in patterns:
        matches = re.findall(pattern, text)
        results.update(matches)

    return list(results)


# -----------------------------
# ⚠ 기존 코드 호환 (중요)
# -----------------------------
def extract_flight_numbers(text: str) -> List[str]:
    return extract_flights(text)


# -----------------------------
# 🅿 주기장 추출 (674R 포함)
# -----------------------------
def extract_parking(text: str) -> str:
    m = re.search(r"\b\d{3}[A-Z]?\b", text)
    return m.group(0) if m else ""


# -----------------------------
# 👤 이름 추출
# -----------------------------
def extract_name(line: str, target_names: List[str]) -> str:
    for name in target_names:
        if name in line:
            return name
    return ""


# -----------------------------
# 🔤 코드 추출 (A/B/C)
# -----------------------------
def extract_codes(line: str) -> List[str]:
    return re.findall(r"\b[A-C]\b", line)


# -----------------------------
# 📌 범례 추출
# 예: A박종규 B김기성 C이기영
# -----------------------------
def extract_legend(text: str) -> Dict[str, str]:
    legend = {}

    matches = re.findall(r"\b([A-C])\s*([가-힣]{2,4})", text)

    for code, name in matches:
        legend[code] = name

    return legend


# -----------------------------
# 🔥 OCR 전체 파싱 (핵심)
# -----------------------------
def parse_ocr_text(
    text: str,
    target_names: List[str],
    fallback_legend: Dict[str, str] = None
) -> List[Dict]:

    legend = extract_legend(text)

    # fallback 입력값 있으면 덮어쓰기
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
        # 1️⃣ 이름 있으면 무조건 이름 기준
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
        # 2️⃣ 이름 없고 A/B/C만 있는 경우
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
