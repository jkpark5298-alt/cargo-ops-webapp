import re
from typing import List, Dict


# ===============================
# 🔧 텍스트 정규화
# ===============================
def _normalize_for_match(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", "", text).upper()


def _row_tokens(text: str) -> List[str]:
    if not text:
        return []
    return re.findall(r"[A-Z]+|[가-힣]+", text.upper())


# ===============================
# 🔍 alias 매칭 (핵심 로직)
# ===============================
def _matches_alias(raw: str, name: str, alias: str) -> bool:
    raw_compact = _normalize_for_match(raw)
    name_compact = _normalize_for_match(name)
    alias_compact = _normalize_for_match(alias)

    if not alias_compact:
        return False

    tokens = _row_tokens(raw)

    # ✅ 1. 단일 문자 alias (A/B/C)
    if len(alias_compact) == 1:
        for token in tokens:
            # 완전 일치
            if token == alias_compact:
                return True

            # ✅ 핵심: B박종규 같은 prefix 대응
            if token.startswith(alias_compact):
                return True

        return False

    # ✅ 2. 일반 alias (이름 / A박종규)
    if alias_compact in raw_compact:
        return True

    if alias_compact == name_compact:
        return True

    return False


# ===============================
# 👤 대상 파싱 (입력값 처리)
# ===============================
def parse_targets(input_text: str) -> List[Dict]:
    """
    예:
    "박종규"
    "A박종규"
    "A,B,C"
    "박종규, 김우석"
    """

    if not input_text:
        return []

    results = []
    items = re.split(r"[,\s]+", input_text.strip())

    for item in items:
        if not item:
            continue

        item = item.strip()

        # A,B,C 같은 경우
        if len(item) == 1 and item.isalpha():
            results.append({
                "name": "",
                "alias": item.upper()
            })
            continue

        # A박종규 형태
        m = re.match(r"([A-Z])([가-힣]+)", item.upper())
        if m:
            results.append({
                "name": m.group(2),
                "alias": m.group(1)
            })
            continue

        # 일반 이름
        results.append({
            "name": item,
            "alias": item
        })

    return results


# ===============================
# 📊 OCR 결과에서 대상 추출
# ===============================
def extract_from_ocr(ocr_text: str, target_input: str) -> List[Dict]:
    """
    OCR 전체 텍스트에서 대상 추출
    """

    if not ocr_text:
        return []

    targets = parse_targets(target_input)
    lines = ocr_text.split("\n")

    results = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        for t in targets:
            if _matches_alias(line, t["name"], t["alias"]):
                results.append({
                    "raw": line,
                    "name": t["name"],
                    "alias": t["alias"]
                })
                break

    # 중복 제거
    unique = []
    seen = set()

    for r in results:
        key = r["raw"]
        if key not in seen:
            seen.add(key)
            unique.append(r)

    return unique
