from fastapi import APIRouter, File, UploadFile

from app.services.vision_ocr import extract_text_from_image
from app.services.parser import extract_flight_numbers  # ✅ 이게 핵심

router = APIRouter()


@router.post("/extract")
async def extract(file: UploadFile = File(...)):
    image_bytes = await file.read()

    # OCR 실행 (현재는 스텁)
    text = extract_text_from_image(image_bytes)

    # 편명 추출
    flights = extract_flight_numbers(text)

    return {
        "success": True,
        "text": text,
        "flights": flights,
    }
