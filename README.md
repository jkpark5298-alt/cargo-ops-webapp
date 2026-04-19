# Cargo Ops WebApp Monorepo

이 저장소는 아이폰용 웹앱(PWA/향후 앱 래핑 가능) + OCR/공항 API 백엔드로 분리된 모노레포 구조입니다.

## 폴더 구조

- `frontend/` : Vercel 배포용 프론트엔드(다음 단계에서 Next.js로 구성)
- `backend/` : OCR, 파싱, 인천공항 API 연동용 FastAPI 서버
- `docs/` : 설계 문서, API 명세, OCR 규칙 문서

## 추천 GitHub 저장소 운영

초기에는 이 모노레포 하나로 시작하고, 운영 단계에서 필요하면 프론트/백엔드 저장소를 분리합니다.

## 개발 순서

1. GitHub 구조 정리
2. 프론트엔드 Next.js/Vercel 구성
3. 백엔드 Render 배포
4. 알림 엔진 추가
