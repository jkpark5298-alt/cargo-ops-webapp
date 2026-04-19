from __future__ import annotations

import re
from typing import Dict, List


def _normalize_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def _normalize_for_match(value: str) -> str:
    return re.sub(r"\s+", "", value).strip().upper()


def _extract_flight_no(line: str) -> str:
    """
    예:
    KJ0917 / KJ0242 / KJ3931
    """
    match = re.search(r"\b([A-Z]{2}\d{3,4})\b", line.upper())
    return match.group(1) if match else ""


def _extract_parking_stand(line: str) -> str:
    """
    예:
    621 / 674R / 674L / C01 등
    OCR 결과에서 뒤쪽 주기장 값을 간단히 잡기 위한 패턴
    """
    candidates = re.findall(r"\b([0-9]{3,4}[A-Z]?|[A-Z][0-9]{2,3})\b", line.upper())
    if not candidates:
        return ""
    return candidates[-1]


def _extract_name(line: str) -> str:
    """
    한글 이름 후보 추출
    예:
    A 이영식 -> 이영식
    B박종규 -> 박종규
    """
    match = re.search(r"([가-힣]{2,4})", line)
    return match.group(1) if match else ""


def _row_tokens(raw: str) -> List[str]:
    """
    A / B / C / B박종규 / B 박종규 / 콤마 등을 토큰으로 보기 위한 분리
    """
    tokens = re.split(r"[,/\|\s]+", raw.strip())
    return [token.strip().upper() for token in tokens if token.strip()]


def build_legend_map(rows: List[Dict]) -> Dict[str, str]:
    """
    상단 범례 자동 인식
    예:
      A 이영식
      B 박종규
      C 김우석

    결과:
      {"A": "이영식", "B": "박종규", "C": "김우석"}
    """
    legend_map: Dict[str, str] = {}

    for row in rows:
        raw = (row.get("raw") or "").strip()

        # A 이영식 / B 박종규 / C 김우석
        m = re.search(r"\b([A-Z])\b\s*([가-힣]{2,4})", raw, re.IGNORECASE)
        if m:
            code = m.group(1).upper()
            name = m.group(2)
            legend_map[code] = name
            continue

        # A이영식 / B박종규 처럼 붙은 경우
        m2 = re.search(r"\b([A-Z])([가-힣]{2,4})", raw, re.IGNORECASE)
        if m2:
            code = m2.group(1).upper()
            name = m2.group(2)
            legend_map[code] = name

    return legend_map


def parse_ocr_text(text: str) -> List[Dict]:
    """
    OCR 전체 텍스트를 행 단위로 파싱

    반환 예:
    [
      {
        "raw": "KJ0917 HL8355 ICN TAO 12:30 A 이영식 625",
        "name": "이영식",
        "flightNo": "KJ0917",
        "parkingStand": "625",
        "target": "A"
      }
    ]
    """
    rows: List[Dict] = []

    for raw_line in text.splitlines():
        line = _normalize_line(raw_line)
        if not line:
            continue

        flight_no = _extract_flight_no(line)
        parking_stand = _extract_parking_stand(line)
        name = _extract_name(line)

        target = ""
        m = re.search(r"\b([A-Z])\b", line, re.IGNORECASE)
        if m:
            target = m.group(1).upper()
        else:
            # A박종규 같이 붙은 경우
            m2 = re.search(r"\b([A-Z])([가-힣]{2,4})", line, re.IGNORECASE)
            if m2:
                target = m2.group(1).upper()

        rows.append(
            {
                "raw": line,
                "name": name,
                "flightNo": flight_no,
                "parkingStand": parking_stand,
                "target": target,
            }
        )

    # 범례 맵 생성 후 본문 행 이름 보정
    legend_map = build_legend_map(rows)

    for row in rows:
        raw = (row.get("raw") or "").strip()
        current_name = (row.get("name") or "").strip()
        current_target = (row.get("target") or "").strip().upper()

        # 1) A박종규 / B박종규 / A 박종규 형태면 이름 우선
        m = re.search(r"\b([A-Z])\s*([가-힣]{2,4})", raw, re.IGNORECASE)
        if m:
            row["target"] = m.group(1).upper()
            row["name"] = m.group(2)
            continue

        # 2) 이름이 이미 있으면 이름 우선 유지
        if current_name:
            continue

        # 3) 이름 없고 target만 있으면 범례로 치환
        if current_target and current_target in legend_map:
            row["name"] = legend_map[current_target]

    return rows


def _parse_target_groups(raw_text: str) -> List[Dict]:
    """
    사용자 입력을 사람 단위 그룹으로 파싱

    예:
      박종규,A박종규,A,B,C
      김철수,D김철수,D

    결과:
      [
        {
          "display": "박종규",
          "aliases": ["박종규", "A박종규", "A", "B", "C", ...]
        }
      ]
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


def _matches_alias(raw: str, name: str, alias: str) -> bool:
    """
    매칭 우선순위:
    1. A박종규 / B박종규 같은 결합형
    2. 이름 자체 포함
    3. 단일 문자 별칭(A/B/C)은 토큰 일치 또는 접두(prefix) 허용
    """
    raw_compact = _normalize_for_match(raw)
    name_compact = _normalize_for_match(name)
    alias_compact = _normalize_for_match(alias)

    if not alias_compact:
        return False

    tokens = _row_tokens(raw)

    # 단일 문자 alias (A/B/C)
    if len(alias_compact) == 1:
        for token in tokens:
            if token == alias_compact:
                return True

            # B박종규 / B김철수 형태 허용
            if token.startswith(alias_compact):
                return True

        return False

    # 긴 alias는 포함 검색
    if alias_compact in raw_compact:
        return True

    if alias_compact == name_compact:
        return True

    return False


def filter_rows_by_targets_text(rows: List[Dict], target_names_text: str) -> List[Dict]:
    """
    사용자 입력 기준으로 OCR 파싱 결과 필터링

    지원 예:
      박종규
      B
      B박종규
      박종규,A박종규,A,B,C
    """
    if not target_names_text or not target_names_text.strip():
        return rows

    # 1) 멀티라인 그룹 방식 우선
    groups = _parse_target_groups(target_names_text)

    # 2) 한 줄 입력만 온 경우도 지원
    if not groups:
        flat_tokens = [x.strip() for x in target_names_text.replace("\n", ",").split(",") if x.strip()]
        if flat_tokens:
            groups = [{"display": flat_tokens[0], "aliases": flat_tokens}]

    filtered: List[Dict] = []

    for row in rows:
        raw = (row.get("raw") or "").strip()
        name = (row.get("name") or "").strip()
        target = (row.get("target") or "").strip().upper()

        matched = False

        for group in groups:
            aliases = group["aliases"]

            # alias 매칭
            if any(_matches_alias(raw, name, alias) for alias in aliases):
                new_row = dict(row)

                # 이름 우선 유지
                if not new_row.get("name"):
                    new_row["name"] = group["display"] or ""
                filtered.append(new_row)
                matched = True
                break

            # target 직접 매칭
            if target and any(_normalize_for_match(alias) == target for alias in aliases):
                new_row = dict(row)
                if not new_row.get("name"):
                    new_row["name"] = group["display"] or ""
                filtered.append(new_row)
                matched = True
                break

        if matched:
            continue

    return filtered
