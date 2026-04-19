from fastapi import APIRouter, UploadFile, File, Form
from typing import List

from app.services.vision_ocr import extract_text_from_image
from app.services.parser import parse_ocr_text, filter_rows_by_targets_text

router = APIRouter()


@router.post("/ocr/parse")
async def ocr_parse(
    file: UploadFile = File(...),
    targets: str = Form(default="")
):
    """
    OCR + 필터
    targets:
      - A,B,C
      - 박종규
      - B박종규
      - 복수 가능
    """

    contents = await file.read()

    # 1️⃣ OCR
    lines = extract_text_from_image(contents)

    # 2️⃣ 파싱
    parsed = parse_ocr_text(lines)

    # 3️⃣ 필터
    filtered = filter_rows_by_targets_text(parsed, targets)

    return {
        "raw_lines": lines,
        "parsed": parsed,
        "filtered": filtered
    }
