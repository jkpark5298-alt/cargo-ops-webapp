from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.services.vision_ocr import extract_text_from_image
from app.services.parser import (
    parse_ocr_text,
    filter_rows_by_targets_text
)

router = APIRouter()


@router.post("/extract")
async def extract(
    file: UploadFile = File(...),
    targets: str = Form("")
):
    try:
        # 1. 이미지 → 텍스트
        contents = await file.read()
        raw_text = extract_text_from_image(contents)

        # 2. 텍스트 → 구조화
        parsed = parse_ocr_text(raw_text)

        # 3. 대상 필터링 (복수 입력 가능)
        target_list = [t.strip() for t in targets.split(",") if t.strip()]

        if target_list:
            parsed = filter_rows_by_targets_text(parsed, target_list)

        return JSONResponse({
            "success": True,
            "count": len(parsed),
            "data": parsed
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )
