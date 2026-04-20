from fastapi import APIRouter, UploadFile, File
from app.services.vision_ocr import (
    extract_text_from_image,
    extract_flight_parking,
)

router = APIRouter()


@router.post("/extract")
async def extract_ocr(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()

        # OCR 텍스트 추출
        text = extract_text_from_image(file_bytes)

        # 행 기준 편명 + 주기장 추출
        data = extract_flight_parking(text)

        return {
            "success": True,
            "text": text,
            "data": data
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": []
        }
