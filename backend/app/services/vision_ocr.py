from typing import List
import base64

def extract_text_from_image(image_bytes: bytes) -> List[str]:
    """
    OCR 텍스트 추출 (현재는 기본 처리 / 추후 Vision API 연결 가능)
    """

    try:
        # 임시 OCR 처리 (텍스트 디코딩 기반)
        text = image_bytes.decode(errors="ignore")

        lines = [
            line.strip()
            for line in text.split("\n")
            if line.strip()
        ]

        return lines

    except Exception as e:
        print("OCR ERROR:", e)
        return []
