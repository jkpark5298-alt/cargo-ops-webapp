from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.ocr import router as ocr_router
from app.routes.flights import router as flights_router
from app.routes.health import router as health_router

app = FastAPI()

# CORS 설정 (프론트에서 호출 가능하게)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요시 도메인 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록 (이거 없으면 404)
app.include_router(ocr_router, prefix="/ocr", tags=["OCR"])
app.include_router(flights_router, prefix="/flights", tags=["Flights"])
app.include_router(health_router, prefix="/health", tags=["Health"])

@app.get("/")
async def root():
    return {"message": "Cargo Ops Backend Running"}
