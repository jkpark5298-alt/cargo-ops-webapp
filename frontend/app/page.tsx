"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

const STORAGE_KEY = "cargo_ops_monitor_rooms_v6";

type MonitorRoom = {
  id: string;
  name: string;
  flightsInput: string;
  startDateTime: string;
  endDateTime: string;
  fixed: boolean;
  lastFetchedAt: string;
  rows: unknown[];
};

function getKoreanDateLabel(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  return `${yyyy}.${mm}.${dd} ${weekdays[date.getDay()]}`;
}

function loadRooms(): MonitorRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ");
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function downloadPlanImage(dateLabel: string, rooms: MonitorRoom[], mode: "cargo" | "schedule") {
  if (typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#07152b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#e5edf7";
  ctx.font = "bold 46px Arial";
  ctx.fillText(`KJ 화물기 출도착 모니터링(${dateLabel})`, 70, 90);

  ctx.fillStyle = "#93a7c4";
  ctx.font = "24px Arial";
  ctx.fillText(mode === "cargo" ? "Cargo Plan Image" : "Schedule Flight Image", 70, 135);

  const fixedRooms = rooms.filter((room) => room.fixed);
  const latestRoom = fixedRooms[0] || rooms[0];

  const cards = [
    { title: "편명조회", value: "POST /flights", desc: "인천공항 API 기준 출도착 조회" },
    { title: "Schedule Flight", value: `${fixedRooms.length} rooms`, desc: "저장된 스케줄 모니터링" },
    { title: "저장된 Monitor", value: `${rooms.length} rooms`, desc: "브라우저 로컬 저장 기준" },
  ];

  cards.forEach((card, idx) => {
    const x = 70 + idx * 410;
    const y = 190;
    drawRoundedRect(ctx, x, y, 360, 180, 24);
    ctx.fillStyle = "#0d1a30";
    ctx.fill();
    ctx.strokeStyle = "#263a5f";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#9fb3c8";
    ctx.font = "22px Arial";
    ctx.fillText(card.title, x + 28, y + 50);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.fillText(card.value, x + 28, y + 100);

    ctx.fillStyle = "#93a7c4";
    ctx.font = "20px Arial";
    ctx.fillText(card.desc, x + 28, y + 145);
  });

  drawRoundedRect(ctx, 70, 430, 1260, 270, 26);
  ctx.fillStyle = "#081427";
  ctx.fill();
  ctx.strokeStyle = "#263a5f";
  ctx.stroke();

  ctx.fillStyle = "#e5edf7";
  ctx.font = "bold 30px Arial";
  ctx.fillText("최근 Schedule Flight", 110, 490);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "24px Arial";
  ctx.fillText(`편명: ${latestRoom?.flightsInput || "-"}`, 110, 550);
  ctx.fillText(`조회 범위: ${formatDateTime(latestRoom?.startDateTime)} ~ ${formatDateTime(latestRoom?.endDateTime)}`, 110, 600);
  ctx.fillText(`마지막 조회: ${latestRoom?.lastFetchedAt || "-"}`, 110, 650);

  ctx.fillStyle = "#64748b";
  ctx.font = "20px Arial";
  ctx.fillText("by jkpark", 70, 830);

  const link = document.createElement("a");
  link.download = `${mode === "cargo" ? "cargo-plan" : "schedule-flight"}-${dateLabel.replace(/[.\s]/g, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function HomePage() {
  const [dateLabel, setDateLabel] = useState("2026.05.09 토요일");
  const [rooms, setRooms] = useState<MonitorRoom[]>([]);

  useEffect(() => {
    setDateLabel(getKoreanDateLabel(new Date()));
    setRooms(loadRooms());
  }, []);

  const fixedRooms = useMemo(() => rooms.filter((room) => room.fixed), [rooms]);
  const latestScheduleRoom = fixedRooms[0] || rooms[0] || null;

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Cargo Ops</div>
          <h1 style={titleStyle}>KJ 화물기 출도착 모니터링({dateLabel})</h1>
          <p style={subtitleStyle}>
            편명 조회와 Schedule Flight를 한 화면에서 시작합니다. OCR 기능은 제거하고,
            현재는 인천공항 API 기반 편명 조회에 집중합니다.
          </p>
        </div>
        <div style={dateBadgeStyle}>{dateLabel}</div>
      </section>

      <section style={topGridStyle}>
        <div style={leftPanelStyle}>
          <div style={panelHeaderStyle}>업무 메뉴</div>
          <div style={menuRowStyle}>
            <Link href="/flights" style={menuCardBlueStyle}>
              <div style={menuIconStyle}>✈️</div>
              <div style={menuTitleStyle}>편명조회</div>
              <div style={menuDescStyle}>KJ 편명 출도착 현황 조회</div>
            </Link>

            <Link href="/fixed-lite" style={menuCardGreenStyle}>
              <div style={menuIconStyle}>📋</div>
              <div style={menuTitleStyle}>Schedule Flight</div>
              <div style={menuDescStyle}>저장된 스케줄 모니터링</div>
            </Link>
          </div>

          <div style={summaryRowStyle}>
            <div style={summaryBoxStyle}>
              <span style={summaryLabelStyle}>저장된 Monitor</span>
              <strong style={summaryValueStyle}>{rooms.length}</strong>
            </div>
            <div style={summaryBoxStyle}>
              <span style={summaryLabelStyle}>Schedule Flight</span>
              <strong style={summaryValueStyle}>{fixedRooms.length}</strong>
            </div>
          </div>
        </div>

        <aside style={weatherPanelStyle}>
          <div style={panelHeaderStyle}>날씨</div>
          <div style={weatherTitleStyle}>네이버 날씨</div>
          <p style={weatherTextStyle}>
            네이버 날씨를 새 창으로 열어 인천공항 주변 기상 상황을 확인합니다.
          </p>
          <a
            href="https://search.naver.com/search.naver?query=%EC%9D%B8%EC%B2%9C%EA%B3%B5%ED%95%AD%20%EB%82%A0%EC%94%A8"
            target="_blank"
            rel="noreferrer"
            style={weatherButtonStyle}
          >
            네이버 날씨 열기
          </a>
          <div style={weatherNoticeStyle}>
            실시간 수치 자동 표시가 필요하면 다음 단계에서 백엔드 날씨 프록시를 붙이면 됩니다.
          </div>
        </aside>
      </section>

      <section style={schedulePanelStyle}>
        <div style={sectionHeaderRowStyle}>
          <div>
            <div style={panelHeaderStyle}>최근 Schedule Flight</div>
            <h2 style={sectionTitleStyle}>{latestScheduleRoom?.name || "저장된 Schedule Flight 없음"}</h2>
          </div>
          <Link href="/flights" style={smallButtonStyle}>Schedule Flight 만들기</Link>
        </div>

        <div style={scheduleInfoGridStyle}>
          <InfoItem label="편명" value={latestScheduleRoom?.flightsInput || "-"} />
          <InfoItem
            label="조회 범위"
            value={
              latestScheduleRoom
                ? `${formatDateTime(latestScheduleRoom.startDateTime)} ~ ${formatDateTime(latestScheduleRoom.endDateTime)}`
                : "-"
            }
          />
          <InfoItem label="마지막 조회" value={latestScheduleRoom?.lastFetchedAt || "-"} />
          <InfoItem label="상태" value={latestScheduleRoom?.fixed ? "Schedule Flight" : "일반"} />
        </div>
      </section>

      <section style={imageSavePanelStyle}>
        <div style={panelHeaderStyle}>이미지 저장</div>
        <div style={imageSaveRowStyle}>
          <button
            type="button"
            onClick={() => downloadPlanImage(dateLabel, rooms, "cargo")}
            style={imageButtonStyle}
          >
            Cargo Plan 이미지 저장
          </button>
          <button
            type="button"
            onClick={() => downloadPlanImage(dateLabel, rooms, "schedule")}
            style={imageButtonStyle}
          >
            Schedule Flight 이미지 저장
          </button>
          <Link href="/flights" style={imageLinkStyle}>편명조회 화면으로 이동</Link>
        </div>
      </section>

      <footer style={footerStyle}>by jkpark</footer>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoItemStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value}</div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "42px",
  background: "linear-gradient(135deg, #06101f 0%, #07152b 45%, #0b1f3a 100%)",
  color: "white",
};

const heroStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "flex-start",
  marginBottom: 28,
};

const eyebrowStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const titleStyle: CSSProperties = {
  fontSize: 42,
  lineHeight: 1.18,
  margin: 0,
  fontWeight: 900,
};

const subtitleStyle: CSSProperties = {
  marginTop: 14,
  maxWidth: 760,
  color: "#b6c5d8",
  fontSize: 16,
  lineHeight: 1.65,
};

const dateBadgeStyle: CSSProperties = {
  flexShrink: 0,
  padding: "12px 18px",
  borderRadius: 999,
  background: "rgba(37, 99, 235, 0.18)",
  border: "1px solid rgba(147, 197, 253, 0.35)",
  color: "#dbeafe",
  fontWeight: 800,
};

const topGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.8fr)",
  gap: 22,
  marginBottom: 22,
};

const leftPanelStyle: CSSProperties = {
  padding: 24,
  borderRadius: 22,
  background: "rgba(8, 20, 39, 0.88)",
  border: "1px solid #263a5f",
  boxShadow: "0 24px 80px rgba(0,0,0,0.24)",
};

const weatherPanelStyle: CSSProperties = {
  padding: 24,
  borderRadius: 22,
  background: "rgba(13, 26, 48, 0.9)",
  border: "1px solid #28436b",
};

const panelHeaderStyle: CSSProperties = {
  color: "#93a7c4",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 14,
};

const menuRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const menuCardBaseStyle: CSSProperties = {
  display: "block",
  minHeight: 170,
  padding: 22,
  borderRadius: 20,
  textDecoration: "none",
  color: "white",
  border: "1px solid rgba(255,255,255,0.12)",
};

const menuCardBlueStyle: CSSProperties = {
  ...menuCardBaseStyle,
  background: "linear-gradient(135deg, #1d4ed8, #0f2f6d)",
};

const menuCardGreenStyle: CSSProperties = {
  ...menuCardBaseStyle,
  background: "linear-gradient(135deg, #0f766e, #0b3d40)",
};

const menuIconStyle: CSSProperties = {
  fontSize: 34,
  marginBottom: 18,
};

const menuTitleStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  marginBottom: 8,
};

const menuDescStyle: CSSProperties = {
  color: "rgba(255,255,255,0.78)",
  fontSize: 14,
};

const summaryRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
  marginTop: 18,
};

const summaryBoxStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#0a1528",
  border: "1px solid #23314f",
};

const summaryLabelStyle: CSSProperties = {
  display: "block",
  color: "#9fb3c8",
  fontSize: 13,
  marginBottom: 8,
};

const summaryValueStyle: CSSProperties = {
  fontSize: 30,
};

const weatherTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  marginBottom: 12,
};

const weatherTextStyle: CSSProperties = {
  color: "#cbd5e1",
  lineHeight: 1.6,
  marginBottom: 18,
};

const weatherButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  borderRadius: 12,
  background: "#22c55e",
  color: "#052e16",
  fontWeight: 900,
  textDecoration: "none",
};

const weatherNoticeStyle: CSSProperties = {
  marginTop: 16,
  color: "#93a7c4",
  fontSize: 13,
  lineHeight: 1.55,
};

const schedulePanelStyle: CSSProperties = {
  padding: 24,
  borderRadius: 22,
  background: "rgba(8, 20, 39, 0.9)",
  border: "1px solid #263a5f",
  marginBottom: 22,
};

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 18,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
};

const smallButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
};

const scheduleInfoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
};

const infoItemStyle: CSSProperties = {
  padding: 16,
  borderRadius: 14,
  background: "#0a1528",
  border: "1px solid #23314f",
};

const infoLabelStyle: CSSProperties = {
  color: "#93a7c4",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 8,
};

const infoValueStyle: CSSProperties = {
  color: "#e5edf7",
  fontSize: 15,
  fontWeight: 700,
  wordBreak: "break-word",
};

const imageSavePanelStyle: CSSProperties = {
  padding: 24,
  borderRadius: 22,
  background: "rgba(8, 20, 39, 0.9)",
  border: "1px solid #263a5f",
};

const imageSaveRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const imageButtonStyle: CSSProperties = {
  padding: "16px 18px",
  borderRadius: 14,
  background: "#334155",
  color: "white",
  border: "1px solid #475569",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 15,
};

const imageLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px 18px",
  borderRadius: 14,
  background: "#0f766e",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
};

const footerStyle: CSSProperties = {
  marginTop: 24,
  textAlign: "center",
  color: "#64748b",
  fontSize: 14,
  fontWeight: 700,
};
