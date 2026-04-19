from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.parser import parse_rows
from app.services.vision_ocr import VisionOCRService

router = APIRouter(prefix='/ocr', tags=['ocr'])
ocr_service = VisionOCRService()


@router.post('/extract')
async def extract_from_image(file: UploadFile = File(...)) -> dict:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail='빈 파일입니다.')

    try:
        lines = ocr_service.extract_text_lines(content)
        rows = parse_rows(lines)
        width, height = ocr_service.get_image_size(content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'OCR 처리 실패: {exc}') from exc

    return {
        'filename': file.filename,
        'image_size': {'width': width, 'height': height},
        'raw_lines': lines,
        'rows': rows,
    }
