import re
from typing import List, Dict

# 👇 B, C, A / 이름 포함 패턴 모두 대응
TARGET_PATTERN = re.compile(
    r"\b([A-C])\b\s*([가-힣]{2,4})?"  # A, B, C + 이름 optional
)

FLIGHT_PATTERN = re.compile(r"KJ\d{3,4}")

def parse_ocr_text(lines: List[str]) -> List[Dict]:
    """
    OCR 텍스트 → 구조화
    """
    results = []

    for line in lines:
        flight_match = FLIGHT_PATTERN.search(line)
        target_match = TARGET_PATTERN.search(line)

        if flight_match:
            results.append({
                "flight_no": flight_match.group(),
                "raw": line,
                "target": target_match.group(1) if target_match else None,
                "name": target_match.group(2) if target_match and target_match.group(2) else None
            })

    return results


def filter_rows_by_targets_text(
    parsed_rows: List[Dict],
    target_text: str
) -> List[Dict]:
    """
    A,B,C / 이름 / 복수 필터
    """

    if not target_text:
        return parsed_rows

    # 입력: "A,B,C", "박종규", "B박종규"
    targets = [t.strip() for t in target_text.split(",")]

    filtered = []

    for row in parsed_rows:
        for t in targets:
            if not t:
                continue

            # A / B / C 매칭
            if t in ["A", "B", "C"] and row.get("target") == t:
                filtered.append(row)
                break

            # 이름 포함 매칭
            if row.get("name") and t in row["name"]:
                filtered.append(row)
                break

            # "B박종규" 같은 경우
            if row.get("raw") and t in row["raw"]:
                filtered.append(row)
                break

    return filtered
