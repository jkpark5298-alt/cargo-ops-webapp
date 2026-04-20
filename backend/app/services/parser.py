import re
from typing import List, Dict


def extract_flight_numbers(text: str) -> List[str]:
    pattern = r"\b[A-Z]{2}\d{3,4}\b"
    return list(set(re.findall(pattern, text or "")))


def parse_user_targets(input_text: str) -> Dict[str, List[str]]:
    names = []
    codes = []

    if not input_text:
        return {"names": names, "codes": codes}

    tokens = [t.strip() for t in input_text.split(",") if t.strip()]

    for token in tokens:
        m = re.match(r"^([A-Z])\s*([가-힣]+)$", token)
        if m:
            codes.append(m.group(1))
            names.append(m.group(2))
            continue

        if re.match(r"^[A-Z]$", token):
            codes.append(token)
            continue

        names.append(token)

    return {
        "names": list(set(names)),
        "codes": list(set(codes))
    }


def extract_legend(text: str) -> Dict[str, str]:
    legend = {}

    if not text:
        return legend

    matches = re.findall(r"\b([A-Z])\s*([가-힣]{2,4})", text)

    for code, name in matches:
        legend[code] = name

    return legend


def extract_codes_from_line(line: str) -> List[str]:
    return re.findall(r"\b[A-Z]\b", line)


def build_row_mapping(text: str) -> List[Dict]:
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


def match_targets(ocr_text: str, user_input: str) -> List[Dict]:
    targets = parse_user_targets(user_input)
    legend = extract_legend(ocr_text)
    rows = build_row_mapping(ocr_text)

    result = []

    for row in rows:
        for code in row["codes"]:
            name = legend.get(code)

            if code in targets["codes"]:
                result.append(row)
                break

            if name and name in targets["names"]:
                result.append(row)
                break

    return result
