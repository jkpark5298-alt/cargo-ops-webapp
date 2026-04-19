import io
import json
from typing import List

from google.cloud import vision
from google.oauth2 import service_account
from PIL import Image

from app.core.config import settings


class VisionOCRService:
    def __init__(self) -> None:
        self._client = None

    def _build_client(self) -> vision.ImageAnnotatorClient:
        if settings.google_application_credentials_json:
            info = json.loads(settings.google_application_credentials_json)
            credentials = service_account.Credentials.from_service_account_info(info)
            return vision.ImageAnnotatorClient(credentials=credentials)
        return vision.ImageAnnotatorClient()

    @property
    def client(self) -> vision.ImageAnnotatorClient:
        if self._client is None:
            self._client = self._build_client()
        return self._client

    def extract_text_lines(self, file_bytes: bytes) -> List[str]:
        image = vision.Image(content=file_bytes)
        response = self.client.text_detection(image=image)
        if response.error.message:
            raise RuntimeError(response.error.message)

        if not response.text_annotations:
            return []

        full_text = response.text_annotations[0].description
        return [line.strip() for line in full_text.splitlines() if line.strip()]

    def get_image_size(self, file_bytes: bytes) -> tuple[int, int]:
        with Image.open(io.BytesIO(file_bytes)) as img:
            return img.size
