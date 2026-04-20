from fastapi import APIRouter, UploadFile, File
from app.services.vision_ocr import extract_text_from_image
from app.services.parser import extract_flight_numbers, extract_name_parking

router = APIRouter()


@router.post("/extract")
async def extract_ocr(file: UploadFile = File(...)):
    image_bytes = await file.read()

    text = extract_text_from_image(image_bytes)

    flights = extract_flight_numbers(text)
    name_parking = extract_name_parking(text)

    return {
        "success": True,
        "text": text,
        "flights": flights,
        "nameParking": name_parking
    }
