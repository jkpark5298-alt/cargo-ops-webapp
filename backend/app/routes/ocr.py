from fastapi import APIRouter, UploadFile, File
from app.services.vision_ocr import extract_text_from_image, extract_flights

router = APIRouter()


@router.post("/extract")
async def extract_ocr(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()

        # ✅ Vision OCR 실행
        text = extract_text_from_image(file_bytes)

        # ✅ 편명 추출
        flights = extract_flights(text)

        return {
            "success": True,
            "text": text,
            "flights": flights,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "flights": [],
        }
