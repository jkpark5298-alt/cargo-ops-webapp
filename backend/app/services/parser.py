import re
from typing import List, Dict


# -------------------------------
# 1. 편명 추출
# -------------------------------
def extract_flight_numbers(text: str) -> List[str]:
    pattern = r"\b[A-Z]{2}\d{3,4}\b"
    return list(set(re.findall(pattern, text or "")))


# -------------------------------
# 2. 사용자 입력 파싱 (A/B/C, 편명 등)
# -------------------------------
def parse_user_targets(text: str) -> Dict:
    if not text:
        return {"flights": [], "owners": [], "codes": []}

    text = text.upper()

    flights = re.findall(r"\b[A-Z]{2}\d{3,4}\b", text)
    owners = re.findall(r"\b[A-Z]\b", text)
    codes = re.findall(r"\b[A-Z]{3}\b", text)

    return {
        "flights": list(set(flights)),
        "owners": list(set(owners)),
        "codes": list(set(codes)),
    }


# -------------------------------
# 3. A/B/C 범례 추출
# -------------------------------
def extract_legend(text: str) -> Dict[str, str]:
    legend = {}

    matches = re.findall(r"([A-Z])\s*[:：]\s*([^\n]+)", text)
    for key, value in matches:
        legend[key] = value.strip()

    return legend


# -------------------------------
# 4. 한 줄에서 코드 추출
# -------------------------------
def extract_codes_from_line(line: str) -> List[str]:
    return re.findall(r"\b[A-Z]{2}\d{3,4}\b|\b[A-Z]{3}\b", line)


# -------------------------------
# 5. OCR 텍스트 → 행 매핑
# -------------------------------
def build_row_mapping(text: str) -> List[Dict]:
    rows = []
    lines = text.split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        flights = re.findall(r"\b[A-Z]{2}\d{3,4}\b", line)
        codes = re.findall(r"\b[A-Z]{3}\b", line)

        if flights:
            rows.append({
                "line": line,
                "flights": flights,
                "codes": codes
            })

    return rows


# -------------------------------
# 6. 사용자 입력 기준 필터링
# -------------------------------
def match_targets(rows: List[Dict], targets: Dict) -> List[Dict]:
    result = []

    for row in rows:
        # 편명 기준 필터
        if targets["flights"]:
            if not any(f in row["flights"] for f in targets["flights"]):
                continue

        # 코드 기준 필터
        if targets["codes"]:
            if not any(c in row["codes"] for c in targets["codes"]):
                continue

        result.append(row)

    return result
