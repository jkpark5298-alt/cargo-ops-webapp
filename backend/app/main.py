from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.routes.flights import router as flights_router
from app.routes.ocr import router as ocr_router

app = FastAPI(title="Cargo Ops API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(flights_router, prefix="/flights", tags=["Flights"])
app.include_router(ocr_router, prefix="/ocr", tags=["OCR"])


@app.get("/")
def root():
    return {"message": "Cargo Ops Backend Running"}


@app.get("/ping")
def ping():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
