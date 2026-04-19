import re
from dataclasses import dataclass, asdict
from typing import Iterable, List


FLIGHT_PATTERN = re.compile(r'\b([A-Z0-9]{2,3}\s?-?\d{2,4})\b', re.IGNORECASE)
STAND_PATTERN = re.compile(r'\b([A-Z]{1,2}\s?-?\d{1,3})\b', re.IGNORECASE)
KOREAN_NAME_PATTERN = re.compile(r'[가-힣]{2,4}')


@dataclass
class RowExtraction:
    row_text: str
    name: str | None
    flight_no: str | None
    stand: str | None


KNOWN_NAMES = [
    '박종규',
    '김도유',
    '이민수',
    '정현우',
    '최성민',
]


def normalize_flight(value: str | None) -> str | None:
    if not value:
        return None
    return re.sub(r'[^A-Z0-9]', '', value.upper())


def normalize_stand(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r'\s+', '', value.upper())
    cleaned = cleaned.replace('--', '-')
    return cleaned


def extract_name(text: str) -> str | None:
    for known in KNOWN_NAMES:
        if known in text:
            return known
    match = KOREAN_NAME_PATTERN.search(text)
    return match.group(0) if match else None


def parse_rows(lines: Iterable[str]) -> List[dict]:
    results: List[dict] = []
    for line in lines:
        flight_match = FLIGHT_PATTERN.search(line)
        stand_match = STAND_PATTERN.search(line)
        row = RowExtraction(
            row_text=line,
            name=extract_name(line),
            flight_no=normalize_flight(flight_match.group(1) if flight_match else None),
            stand=normalize_stand(stand_match.group(1) if stand_match else None),
        )
        if row.name or row.flight_no or row.stand:
            results.append(asdict(row))
    return results
