"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "cargo_ops_monitor_rooms_v6";
const LAST_FIXED_ROOM_KEY = "last_fixed_room_id";

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

function formatRange(start: string, end: string) {
  if (!start && !end) return "조회 기간 없음";
  return `${(start || "-").replace("T", " ")} ~ ${(end || "-").replace("T", " ")}`;
}

export default function Home() {
  const router = useRouter();
  const [rooms, setRooms] = useState<MonitorRoom[]>([]);

  useEffect(() => {
    setRooms(loadRooms());
  }, []);

  const fixedRooms = useMemo(() => rooms.filter((room) => room.fixed), [rooms]);
  const lastFixedRoom = useMemo(() => {
    if (typeof window === "undefined") return fixedRooms[0] || null;

    const lastRoomId = localStorage.getItem(LAST_FIXED_ROOM_KEY);
    if (lastRoomId) {
      const found = fixedRooms.find((room) => room.id === lastRoomId);
      if (found) return found;
    }

    return fixedRooms[0] || null;
  }, [fixedRooms]);

  const openFixedLite = () => {
    if (!lastFixedRoom) {
      alert("FIXED ROOM이 없습니다. 먼저 편명 조회에서 Monitor를 저장하고 FIXED로 설정하세요.");
      return;
    }

    router.push(`/fixed-lite?roomId=${encodeURIComponent(lastFixedRoom.id)}`);
  };

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={eyebrowStyle}>Cargo Ops</div>
        <h1 style={titleStyle}>항공 화물 편명 모니터링</h1>
        <p style={descStyle}>
          인천공항 API 기준으로 편명 정보를 조회하고, Monitor Room과 FIXED Lite 화면에서
          현장 확인용으로 빠르게 확인합니다.
        </p>

        <div style={buttonRowStyle}>
          <button onClick={() => router.push("/flights")} style={primaryButtonStyle}>
            ✈️ 편명 조회 시작
          </button>
          <button onClick={openFixedLite} style={secondaryButtonStyle}>
            📱 FIXED Lite 열기
          </button>
        </div>

        <div style={noticeStyle}>
          OCR 기능은 현재 안정화를 위해 제거했습니다. 추후 별도 모듈로 개발한 뒤 다시 연결할 예정입니다.
        </div>
      </section>

      <section style={gridStyle}>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>현재 기능</div>
          <h2 style={cardTitleStyle}>편명 직접 조회</h2>
          <p style={cardTextStyle}>KJ919 또는 919처럼 입력하면 조회됩니다. 여러 편명은 쉼표로 구분합니다.</p>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>Monitor</div>
          <h2 style={cardTitleStyle}>저장된 방 {rooms.length}개</h2>
          <p style={cardTextStyle}>조회 조건과 결과를 저장해 반복 확인할 수 있습니다.</p>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>FIXED</div>
          <h2 style={cardTitleStyle}>FIXED 방 {fixedRooms.length}개</h2>
          <p style={cardTextStyle}>모바일 현장 확인용 Lite 화면으로 연결됩니다.</p>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <h2 style={panelTitleStyle}>최근 FIXED Room</h2>
          <button onClick={() => router.push("/flights")} style={smallButtonStyle}>
            Monitor 관리
          </button>
        </div>

        {lastFixedRoom ? (
          <div style={roomBoxStyle}>
            <div>
              <div style={roomTitleStyle}>{lastFixedRoom.name}</div>
              <div style={roomMetaStyle}>{lastFixedRoom.flightsInput || "편명 없음"}</div>
              <div style={roomMetaStyle}>{formatRange(lastFixedRoom.startDateTime, lastFixedRoom.endDateTime)}</div>
              <div style={roomMetaStyle}>마지막 조회: {lastFixedRoom.lastFetchedAt || "-"}</div>
            </div>
            <button onClick={openFixedLite} style={fixedButtonStyle}>
              FIXED Lite
            </button>
          </div>
        ) : (
          <div style={emptyStyle}>
            아직 FIXED Room이 없습니다. 편명 조회에서 결과를 저장한 뒤 FIXED로 설정하세요.
          </div>
        )}
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "48px 20px",
  background: "linear-gradient(180deg, #07152b 0%, #06101f 100%)",
  color: "white",
};

const heroStyle: CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "44px 28px",
  border: "1px solid #24344f",
  borderRadius: 24,
  background: "radial-gradient(circle at top left, rgba(37, 99, 235, 0.28), rgba(8, 20, 39, 0.92) 48%)",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.28)",
};

const eyebrowStyle: CSSProperties = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(96, 165, 250, 0.16)",
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 18,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(34px, 6vw, 58px)",
  lineHeight: 1.08,
  letterSpacing: -1.2,
};

const descStyle: CSSProperties = {
  maxWidth: 720,
  marginTop: 18,
  marginBottom: 0,
  color: "#b7c7dd",
  fontSize: 17,
  lineHeight: 1.65,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 28,
};

const primaryButtonStyle: CSSProperties = {
  padding: "15px 20px",
  borderRadius: 14,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "15px 20px",
  borderRadius: 14,
  border: "1px solid #31527e",
  background: "#0f766e",
  color: "white",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
};

const noticeStyle: CSSProperties = {
  marginTop: 22,
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(250, 204, 21, 0.12)",
  border: "1px solid rgba(250, 204, 21, 0.24)",
  color: "#fde68a",
  fontSize: 14,
};

const gridStyle: CSSProperties = {
  maxWidth: 980,
  margin: "22px auto 0",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const cardStyle: CSSProperties = {
  padding: 20,
  borderRadius: 18,
  background: "#0b1b35",
  border: "1px solid #22314e",
};

const cardLabelStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 8,
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
};

const cardTextStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "#aabbd2",
  fontSize: 14,
  lineHeight: 1.55,
};

const panelStyle: CSSProperties = {
  maxWidth: 980,
  margin: "22px auto 0",
  padding: 22,
  borderRadius: 20,
  background: "#081427",
  border: "1px solid #22314e",
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
};

const smallButtonStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #36527f",
  background: "#10213d",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const roomBoxStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  padding: 16,
  borderRadius: 14,
  background: "#0d1a30",
  border: "1px solid #2b4269",
};

const roomTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 6,
};

const roomMetaStyle: CSSProperties = {
  color: "#aabbd2",
  fontSize: 13,
  marginTop: 4,
};

const fixedButtonStyle: CSSProperties = {
  padding: "11px 14px",
  borderRadius: 12,
  border: "none",
  background: "#facc15",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 14,
  background: "#0d1a30",
  color: "#aabbd2",
  border: "1px dashed #334155",
};
