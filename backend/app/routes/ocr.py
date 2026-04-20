from fastapi import APIRouter, UploadFile, File
from app.services.vision_ocr import extract_text_from_image, extract_flight_parking

router = APIRouter()


@router.post("/extract")
async def extract_ocr(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()

        text = extract_text_from_image(file_bytes)

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
