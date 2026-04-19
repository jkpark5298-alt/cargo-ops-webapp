# Backend

FastAPI 기반 백엔드입니다.

## 역할
- 이미지 업로드 수신
- OCR 처리
- 표/행 파싱
- 이름 anchor 기반 편명/주기장 추출
- 인천공항 화물기 API 연동
- 향후 상태 변화 감지 및 알림 엔진 추가

## 실행 예정 명령
```bash
uvicorn app.main:app --reload
```
