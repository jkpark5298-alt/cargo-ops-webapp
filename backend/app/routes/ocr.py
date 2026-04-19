from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
import traceback

# OCR (이미지 → 텍스트)
from app.services.vision_ocr import extract_text_from_image

# 🔥 핵심: 새 parser 사용
from app.services.parser import extract_from_ocr

router = APIRouter()


@router.post("/ocr")
async def ocr_api(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    targets: Optional[str] = Form("")
):
    """
    OCR + 대상 필터 API

    - file: 이미지 업로드
    - text: OCR 없이 직접 입력
    - targets: "A,B" / "박종규" / "B박종규" 등
    """

    try:
        # =========================
        # 1️⃣ OCR or 텍스트 입력
        # =========================
        if file:
            contents = await file.read()
            ocr_text = extract_text_from_image(contents)
        else:
            ocr_text = text or ""

        if not ocr_text.strip():
            return JSONResponse({
                "success": False,
                "message": "OCR 결과가 없습니다."
            })

        # =========================
        # 2️⃣ 대상 필터링
        # =========================
        filtered = extract_from_ocr(ocr_text, targets)

        # =========================
        # 3️⃣ 응답
        # =========================
        return JSONResponse({
            "success": True,
            "raw_text": ocr_text,
            "targets": targets,
            "count": len(filtered),
            "results": filtered
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e),
            "trace": traceback.format_exc()
        })
