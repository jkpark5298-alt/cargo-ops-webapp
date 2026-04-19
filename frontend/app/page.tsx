import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container grid">
      <section className="hero">
        <span className="badge">Step 2 · Next.js 프론트</span>
        <h1>화물기 OCR 조회용 아이폰 웹앱 프론트</h1>
        <p>
          이 단계는 Vercel에 바로 연결 가능한 프론트엔드입니다. 이미지 업로드, OCR 결과 검토,
          편명 기준 운항 정보 표시까지의 화면 흐름을 먼저 테스트합니다.
        </p>
      </section>

      <section className="kpis">
        <div className="kpi">
          <div className="small">배포 대상</div>
          <strong>Vercel</strong>
        </div>
        <div className="kpi">
          <div className="small">백엔드 연결</div>
          <strong>FastAPI</strong>
        </div>
        <div className="kpi">
          <div className="small">현재 범위</div>
          <strong>조회 중심</strong>
        </div>
      </section>

      <section className="card">
        <h2>테스트 순서</h2>
        <div className="grid">
          <div>1. 이미지 업로드</div>
          <div>2. OCR 결과 행 단위 확인</div>
          <div>3. 편명 기준 조회 결과 확인</div>
          <div>4. 이후 단계에서 알림 엔진 연결</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Link href="/upload" className="button primary">
            업로드 화면으로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
