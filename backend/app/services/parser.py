import re
from typing import List, Dict, Tuple


# -------------------------------
# 1. 편명 추출 (KJ282 등)
# -------------------------------
def extract_flight_numbers(text: str) -> List[str]:
    pattern = r"\b[A-Z]{2}\d{3,4}\b"
    return list(set(re.findall(pattern, text or "")))


# -------------------------------
# 2. 사용자 입력 파싱
# (박종규, B박종규, B 등)
# -------------------------------
def parse_user_targets(input_text: str) -> Dict[str, List[str]]:
    """
    입력 예:
    "박종규, B박종규, B"

    결과:
    {
        "names": ["박종규"],
        "codes": ["B"]
    }
    """
    names = []
    codes = []

    if not input_text:
        return {"names": names, "codes": codes}

    tokens = [t.strip() for t in input_text.split(",") if t.strip()]

    for token in tokens:
        # B박종규
        m = re.match(r"^([A-Z])\s*([가-힣]+)$", token)
        if m:
            codes.append(m.group(1))
            names.append(m.group(2))
            continue

        # B
        if re.match(r"^[A-Z]$", token):
            codes.append(token)
            continue

        # 박종규
        names.append(token)

    return {
        "names": list(set(names)),
        "codes": list(set(codes))
    }


# -------------------------------
# 3. OCR 텍스트에서 범례 추출
# (A 이영식 / B 박종규 형태)
# -------------------------------
def extract_legend(text: str) -> Dict[str, str]:
    """
    OCR 텍스트에서
    A 이영식
    B 박종규
    이런 형태 추출
    """

    legend = {}

    if not text:
        return legend

    # 패턴: A 이영식 / B박종규
    matches = re.findall(r"\b([A-Z])\s*([가-힣]{2,4})", text)

    for code, name in matches:
        legend[code] = name

    return legend


# -------------------------------
# 4. OCR 테이블에서 코드 추출
# -------------------------------
def extract_codes_from_line(line: str) -> List[str]:
    """
    한 줄에서 A/B/C 추출
    """
    return re.findall(r"\b[A-Z]\b", line)


# -------------------------------
# 5. OCR 전체 텍스트 → 행 단위 매핑
# -------------------------------
def build_row_mapping(text: str) -> List[Dict]:
    """
    OCR 텍스트를 줄 단위로 나누고
    각 줄에서 코드(A/B/C) 추출
    """

    rows = []

    if not text:
        return rows

    lines = text.split("\n")

    for line in lines:
        codes = extract_codes_from_line(line)

        rows.append({
            "raw": line,
            "codes": codes
        })

    return rows


# -------------------------------
# 6. 최종 필터링 로직
# -------------------------------
def match_targets(
    ocr_text: str,
    user_input: str
) -> List[Dict]:
    """
    OCR + 사용자 입력을 결합해서
    해당되는 행만 필터링
    """

    targets = parse_user_targets(user_input)
    legend = extract_legend(ocr_text)
    rows = build_row_mapping(ocr_text)

    result = []

    for row in rows:
        codes = row["codes"]

        for code in codes:
            name = legend.get(code)

            # 코드 매칭
            if code in targets["codes"]:
                result.append(row)
                break

            # 이름 매칭
            if name and name in targets["names"]:
                result.append(row)
                break

    return result
