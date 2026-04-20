from google.cloud import vision
import io


def extract_text_from_image(image_bytes: bytes) -> str:
    try:
        client = vision.ImageAnnotatorClient()

        image = vision.Image(content=image_bytes)

        response = client.text_detection(image=image)
        texts = response.text_annotations

        if not texts:
            return ""

        return texts[0].description

    except Exception as e:
        print("OCR ERROR:", e)
        return ""
