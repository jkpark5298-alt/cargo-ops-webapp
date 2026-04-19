from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile

from app.services.parser import parse_ocr_text, filter_rows_by_targets_text
from app.services.vision_ocr import extract_text_from_image

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/extract")
async def extract_ocr(
    file: UploadFile | None = File(default=None),
    raw_text: str | None = Form(default=None),
    target_names: str | None = Form(default=None),
):
    text = ""

    if file is not None:
        text = await extract_text_from_image(file)
    elif raw_text:
        text = raw_text
    else:
        return {
            "rows": [],
            "text": "",
        }

    rows = parse_ocr_text(text)

    if target_names and target_names.strip():
        rows = filter_rows_by_targets_text(rows, target_names)

    return {
        "rows": rows,
        "text": text,
    }
