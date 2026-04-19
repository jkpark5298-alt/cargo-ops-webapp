from __future__ import annotations

import re
from typing import Dict, List


def _normalize_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def _normalize_for_match(value: str) -> str:
    return re.sub(r"\s+", "", value).strip().upper()


def _extract_flight_no(line: str) -> str:
    match = re.search(r"\b([A-Z0-9]{2,3}\d{2,4})\b", line.upper())
    return match.group(1) if match else ""


def _extract_parking_stand(line: str) -> str:
    match = re.search(r"\b([A-Z]{1,2}\d{1,3})\b", line.upper())
    return match.group(1) if match else ""


def _extract_name(line: str) -> str:
    parts = _normalize_line(line).split(" ")
    if not parts:
        return ""
    return parts[0]


def parse_ocr_text(text: str) -> List[Dict]:
    rows: List[Dict] = []

    for raw_line in text.splitlines():
        line = _normalize_line(raw_line)
        if not line:
            continue

        rows.append(
            {
                "raw": line,
                "name": _extract_name(line),
                "flightNo": _extract_flight_no(line),
                "parkingStand": _extract_parking_stand(line),
            }
        )

    return rows


def _parse_target_groups(raw_text: str) -> List[Dict]:
    """
    한 줄 = 한 사람
    한 줄 안에서 쉼표로 이름/별칭/문자코드 입력
    예:
      박종규,A박종규,A,B,C
      김철수,D김철수,D
    """
    groups: List[Dict] = []

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        tokens = [token.strip() for token in line.split(",") if token.strip()]
        if not tokens:
            continue

        display_name = tokens[0]
        alias_set = set()

        for token in tokens:
            alias_set.add(token)
            alias_set.add(token.replace(" ", ""))

            compact = token.replace(" ", "")

            # A박종규 -> A, 박종규 도 같이 등록
            m = re.match(r"^([A-Z])([가-힣A-Z0-9].+)$", compact, re.IGNORECASE)
            if m:
                alias_set.add(m.group(1).upper())
                alias_set.add(m.group(2))

        aliases = sorted(alias_set, key=lambda x: (-len(x), x))
        groups.append(
            {
                "display": display_name,
                "aliases": aliases,
            }
        )

    return groups


def _row_tokens(raw: str) -> List[str]:
    # A,B,C / 공백 / 슬래시 / 파이프 등을 구분자로 분해
    tokens = re.split(r"[,/\|\s]+", raw.strip())
    return [token.strip().upper() for token in tokens if token.strip()]


def _matches_alias(raw: str, name: str, alias: str) -> bool:
    raw_compact = _normalize_for_match(raw)
    name_compact = _normalize_for_match(name)
    alias_compact = _normalize_for_match(alias)

    if not alias_compact:
        return False

    # 단일 문자 별칭(A/B/C)은 반드시 토큰 단위로만 비교
    if len(alias_compact) == 1:
        token_set = set(_row_tokens(raw))
        return alias_compact in token_set

    # 긴 별칭은 원문/이름 내 포함 여부 허용
    return alias_compact in raw_compact or alias_compact == name_compact


def filter_rows_by_targets_text(rows: List[Dict], target_names_text: str) -> List[Dict]:
    groups = _parse_target_groups(target_names_text)
    if not groups:
        return rows

    filtered: List[Dict] = []

    for row in rows:
        raw = (row.get("raw") or "").strip()
        name = (row.get("name") or "").strip()

        matched = False

        for group in groups:
            aliases = group["aliases"]

            if any(_matches_alias(raw, name, alias) for alias in aliases):
                new_row = dict(row)
                new_row["name"] = group["display"] or new_row.get("name") or ""
                filtered.append(new_row)
                matched = True
                break

        if matched:
            continue

    return filtered
