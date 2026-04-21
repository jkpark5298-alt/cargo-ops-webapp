"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #03142d 0%, #061b3f 55%, #03142d 100%)",
        color: "white",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <section
          style={{
            border: "1px solid rgba(96, 165, 250, 0.18)",
            background: "rgba(15, 23, 42, 0.72)",
            borderRadius: 28,
            padding: "42px 42px 36px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(96, 165, 250, 0.35)",
              color: "#dbeafe",
              fontSize: 18,
              marginBottom: 18,
            }}
          >
            Step 2 - Next.js 프론트
          </div>

          <h1
            style={{
              fontSize: 54,
              lineHeight: 1.15,
              margin: "0 0 18px 0",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            화물기 OCR 조회용 아이폰 웹앱 프론트
          </h1>

          <p
            style={{
              fontSize: 22,
              lineHeight: 1.7,
              color: "#b9c7e3",
              margin: 0,
            }}
          >
            이 단계는 Vercel에 바로 연결 가능한 프론트엔드입니다. 이미지 업로드,
            OCR 결과 검토, 편명 기준 운항 정보 표시까지의 화면 흐름을 먼저
            테스트합니다.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 20,
          }}
        >
          <div style={infoCardStyle}>
            <div style={infoTitleStyle}>배포 대상</div>
            <div style={infoValueStyle}>Vercel</div>
          </div>

          <div style={infoCardStyle}>
            <div style={infoTitleStyle}>백엔드 연결</div>
            <div style={infoValueStyle}>FastAPI</div>
          </div>

          <div style={infoCardStyle}>
            <div style={infoTitleStyle}>현재 범위</div>
            <div style={infoValueStyle}>조회 중심</div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid rgba(96, 165, 250, 0.18)",
            background: "rgba(15, 23, 42, 0.72)",
            borderRadius: 28,
            padding: "34px 32px",
          }}
        >
          <h2
            style={{
              fontSize: 38,
              margin: "0 0 26px 0",
              fontWeight: 800,
            }}
          >
            테스트 순서
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
              fontSize: 24,
              lineHeight: 1.8,
            }}
          >
            <div>1. 이미지 업로드</div>
            <div>2. OCR 결과 행 단위 확인</div>
            <div>3. 편명 기준 조회 결과 확인</div>
            <div>4. 이후 단계에서 알림 엔진 연결</div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 30,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => router.push("/upload")}
              style={primaryButtonStyle}
            >
              업로드 화면으로 이동
            </button>

            <button
              onClick={() => router.push("/flights")}
              style={secondaryButtonStyle}
            >
              편명 조회화면으로 이동
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const infoCardStyle: React.CSSProperties = {
  border: "1px solid rgba(96, 165, 250, 0.18)",
  background: "rgba(15, 23, 42, 0.72)",
  borderRadius: 24,
  padding: "28px 24px",
  minHeight: 150,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const infoTitleStyle: React.CSSProperties = {
  color: "#b9c7e3",
  fontSize: 18,
  marginBottom: 16,
};

const infoValueStyle: React.CSSProperties = {
  fontSize: 50,
  fontWeight: 800,
  lineHeight: 1.15,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "18px 30px",
  borderRadius: 18,
  border: "none",
  background: "#60a5fa",
  color: "#03142d",
  fontSize: 20,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "18px 30px",
  borderRadius: 18,
  border: "1px solid rgba(147, 197, 253, 0.45)",
  background: "rgba(30, 41, 59, 0.9)",
  color: "#e5f0ff",
  fontSize: 20,
  fontWeight: 800,
  cursor: "pointer",
};
