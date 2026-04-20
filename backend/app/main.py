from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# 🔹 Router import
from app.routes.flights import router as flights_router
from app.routes.ocr import router as ocr_router
from app.routes.health import router as health_router


# 🔹 FastAPI 생성
app = FastAPI(
    title="Cargo Ops API",
    version="1.0.0"
)


# 🔹 CORS 설정 (프론트 Vercel 대응)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요하면 특정 도메인으로 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 🔹 Router 등록
app.include_router(flights_router, prefix="/flights", tags=["Flights"])
app.include_router(ocr_router, prefix="/ocr", tags=["OCR"])
app.include_router(health_router, prefix="/health", tags=["Health"])


# 🔹 루트 체크
@app.get("/")
def root():
    return {"message": "Cargo Ops Backend Running"}


# 🔹 헬스 체크 (Render용)
@app.get("/ping")
def ping():
    return {"status": "ok"}


# 🔥 Render 대응 서버 실행
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))  # ⭐ 핵심
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
