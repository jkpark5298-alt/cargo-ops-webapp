import pytesseract
import cv2
import numpy as np


def extract_text_from_image(image_bytes: bytes) -> str:
    try:
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]

        text = pytesseract.image_to_string(gray, lang="kor+eng")

        return text

    except Exception as e:
        raise Exception(f"OCR 처리 실패: {str(e)}")
