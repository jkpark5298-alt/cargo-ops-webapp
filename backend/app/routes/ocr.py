from fastapi import APIRouter, UploadFile, File
from app.services.vision_ocr import extract_flight_parking

router = APIRouter()


@router.post("/extract")
async def extract_ocr(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()

        data = extract_flight_parking(file_bytes)

        return {
            "success": True,
            "data": data
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": []
        }
