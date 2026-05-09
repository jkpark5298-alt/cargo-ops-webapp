"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "cargo_ops_monitor_rooms_v6";
const IMAGE_STORAGE_KEY = "cargo_ops_home_images_v1";
const NOTE_STORAGE_KEY = "cargo_ops_home_note_v1";

type FlightRow = {
  flightId?: string;
  flightNo?: string;
  departureCode?: string;
  arrivalCode?: string;
  formattedScheduleTime?: string;
  formattedEstimatedTime?: string;
  scheduleDateTime?: string;
  estimatedDateTime?: string;
  gatenumber?: string;
  terminalid?: string;
  remark?: string;
  status?: string;
};

type MonitorRoom = {
  id: string;
  name: string;
  flightsInput: string;
  startDateTime: string;
  endDateTime: string;
  fixed: boolean;
  lastFetchedAt: string;
  rows: FlightRow[];
};

type SavedImage = {
  id: string;
  type: "cargo-plan" | "schedule-flight";
  label: string;
  savedAt: string;
  dataUrl: string;
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

function loadImages(): SavedImage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IMAGE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveImages(images: SavedImage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(images.slice(0, 6)));
}

function loadNote() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NOTE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveNote(note: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTE_STORAGE_KEY, note);
}

function formatDateForTitle(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  return `${yyyy}.${mm}.${dd} ${weekdays[date.getDay()]}`;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ");
}

function getLatestScheduleRoom(rooms: MonitorRoom[]) {
  const fixedRooms = rooms.filter((room) => room.fixed);
  if (fixedRooms.length > 0) return fixedRooms[0];
  return rooms[0] || null;
}

function getFlightSummary(room: MonitorRoom | null) {
  if (!room) return "저장된 Schedule Flight가 없습니다.";
  return room.flightsInput || "-";
}

function getRoomRowsCount(room: MonitorRoom | null) {
  if (!room) return 0;
  return Array.isArray(room.rows) ? room.rows.length : 0;
}

export default function HomePage() {
  const router = useRouter();
  const cargoPlanInputRef = useRef<HTMLInputElement | null>(null);
  const scheduleFlightInputRef = useRef<HTMLInputElement | null>(null);
  const [rooms, setRooms] = useState<MonitorRoom[]>([]);
  const [images, setImages] = useState<SavedImage[]>([]);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const todayText = useMemo(() => formatDateForTitle(new Date()), []);
  const latestRoom = useMemo(() => getLatestScheduleRoom(rooms), [rooms]);

  useEffect(() => {
    setRooms(loadRooms());
    setImages(loadImages());
    setNote(loadNote());
  }, []);

  const openFlights = () => router.push("/flights");

  const openScheduleFlight = () => {
    if (latestRoom) {
      router.push(`/fixed-lite?roomId=${encodeURIComponent(latestRoom.id)}`);
      return;
    }
    router.push("/flights");
  };

  const openNaverWeather = () => {
    window.open(
      "https://search.naver.com/search.naver?query=%EC%9D%B8%EC%B2%9C%EA%B3%B5%ED%95%AD%20%EB%82%A0%EC%94%A8%20%EB%AF%B8%EC%84%B8%EB%A8%BC%EC%A7%80",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleCaptureClick = (type: "cargo-plan" | "schedule-flight") => {
    if (type === "cargo-plan") cargoPlanInputRef.current?.click();
    else scheduleFlightInputRef.current?.click();
  };

  const handleImageSelected = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "cargo-plan" | "schedule-flight"
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      const savedAt = new Date().toLocaleString("ko-KR");
      const label = type === "cargo-plan" ? "Cargo Plan 이미지" : "Schedule Flight 이미지";
      const nextImages: SavedImage[] = [
        { id: `${Date.now()}`, type, label, savedAt, dataUrl },
        ...images,
      ].slice(0, 6);
      setImages(nextImages);
      saveImages(nextImages);
      setNotice(`${label}를 임시 저장했습니다. 아이폰 사진앱 저장은 이미지를 열어 공유/저장을 선택하세요.`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNoteLocal = () => {
    saveNote(note);
    setNotice("노트를 임시 저장했습니다. Notion 저장은 다음 단계에서 연결합니다.");
  };

  const openLatestImage = (image: SavedImage) => {
    const win = window.open();
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${image.label}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { margin: 0; background: #020817; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            header { padding: 16px; font-weight: 800; }
            img { width: 100%; height: auto; display: block; }
            p { color: #cbd5e1; padding: 0 16px 18px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <header>${image.label}</header>
          <img src="${image.dataUrl}" />
          <p>아이폰에서 공유 버튼을 눌러 사진앱에 저장할 수 있습니다.</p>
        </body>
      </html>
    `);
  };

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={eyebrowStyle}>CARGO OPS</div>
        <h1 style={titleStyle}>KJ 화물기 출도착 모니터링</h1>
        <div style={datePillStyle}>{todayText}</div>
        <p style={descriptionStyle}>
          편명조회와 Schedule Flight를 아이폰 화면에서 빠르게 확인합니다. OCR 기능은 제거했고,
          현재는 인천공항 API 기반 편명 조회에 집중합니다.
        </p>
      </section>

      <section style={stackStyle}>
        <ActionCard
          label="편명조회"
          title="오늘 KJ 화물기 조회"
          description="편명, 출발·도착, 변경시간, 게이트 정보를 확인합니다."
          buttonLabel="편명조회 열기"
          onClick={openFlights}
          accent="#2563eb"
        />

        <ActionCard
          label="Schedule Flight"
          title="저장된 스케줄 확인"
          description="최근 저장한 Schedule Flight를 아이폰용 화면으로 엽니다."
          buttonLabel="Schedule Flight 열기"
          onClick={openScheduleFlight}
          accent="#0f766e"
        />

        <section style={cardStyle}>
          <div style={cardLabelStyle}>최근 Schedule Flight</div>
          <h2 style={cardTitleStyle}>{latestRoom?.name || "저장된 스케줄 없음"}</h2>
          <div style={infoListStyle}>
            <InfoRow label="편명" value={getFlightSummary(latestRoom)} />
            <InfoRow label="조회범위" value={latestRoom ? `${formatDateTime(latestRoom.startDateTime)} ~ ${formatDateTime(latestRoom.endDateTime)}` : "-"} />
            <InfoRow label="마지막 조회" value={latestRoom?.lastFetchedAt || "-"} />
            <InfoRow label="결과 수" value={`${getRoomRowsCount(latestRoom)}건`} />
          </div>
          <button onClick={openScheduleFlight} style={secondaryButtonStyle}>이 Schedule Flight 열기</button>
        </section>

        <section style={cardStyle}>
          <div style={cardLabelStyle}>날씨</div>
          <h2 style={cardTitleStyle}>인천공항 날씨</h2>
          <p style={cardDescriptionStyle}>
            현재는 네이버 날씨를 새 창으로 열어 확인합니다. 다음 단계에서 기온, 습도, 강수, 풍속,
            미세먼지, 초미세먼지를 자동 표시하도록 백엔드 프록시를 붙입니다.
          </p>
          <button onClick={openNaverWeather} style={greenButtonStyle}>네이버 날씨 열기</button>
        </section>

        <section style={cardStyle}>
          <div style={cardLabelStyle}>이미지 저장</div>
          <h2 style={cardTitleStyle}>아이폰 카메라로 바로 촬영</h2>
          <p style={cardDescriptionStyle}>Cargo Plan 또는 Schedule Flight 이미지를 촬영해 앱 안에 임시 저장합니다.</p>
          <div style={buttonStackStyle}>
            <button onClick={() => handleCaptureClick("cargo-plan")} style={grayButtonStyle}>Cargo Plan 이미지 촬영</button>
            <button onClick={() => handleCaptureClick("schedule-flight")} style={grayButtonStyle}>Schedule Flight 이미지 촬영</button>
          </div>
          <input ref={cargoPlanInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => handleImageSelected(event, "cargo-plan")} style={{ display: "none" }} />
          <input ref={scheduleFlightInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => handleImageSelected(event, "schedule-flight")} style={{ display: "none" }} />
          {images.length > 0 && (
            <div style={imageListStyle}>
              {images.slice(0, 3).map((image) => (
                <button key={image.id} onClick={() => openLatestImage(image)} style={imagePreviewButtonStyle}>
                  <img src={image.dataUrl} alt={image.label} style={imagePreviewStyle} />
                  <span style={imageTextStyle}>{image.label}<small style={imageDateStyle}>{image.savedAt}</small></span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <div style={cardLabelStyle}>노트</div>
          <h2 style={cardTitleStyle}>현장 메모</h2>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="예: KJ919 게이트 672 확인. 특이사항 없음." style={noteStyle} />
          <div style={buttonStackStyle}>
            <button onClick={handleSaveNoteLocal} style={greenButtonStyle}>임시 저장</button>
            <button onClick={() => setNotice("Notion 저장은 다음 단계에서 백엔드 API로 연결합니다.")} style={darkButtonStyle}>Notion 저장 준비 중</button>
          </div>
        </section>

        {notice && <div style={noticeStyle}>{notice}</div>}
      </section>
      <footer style={footerStyle}>by jkpark</footer>
    </main>
  );
}

function ActionCard({ label, title, description, buttonLabel, onClick, accent }: { label: string; title: string; description: string; buttonLabel: string; onClick: () => void; accent: string }) {
  return (
    <section style={{ ...cardStyle, borderColor: `${accent}66` }}>
      <div style={cardLabelStyle}>{label}</div>
      <h2 style={cardTitleStyle}>{title}</h2>
      <p style={cardDescriptionStyle}>{description}</p>
      <button onClick={onClick} style={{ ...primaryButtonStyle, background: accent }}>{buttonLabel}</button>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={infoValueStyle}>{value}</span>
    </div>
  );
}

const pageStyle: CSSProperties = { minHeight: "100vh", background: "radial-gradient(circle at top right, rgba(37, 99, 235, 0.26), transparent 32%), linear-gradient(180deg, #061121 0%, #07152b 52%, #020817 100%)", color: "#f8fafc", padding: "max(22px, env(safe-area-inset-top)) 16px max(28px, env(safe-area-inset-bottom))", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' };
const heroStyle: CSSProperties = { width: "100%", maxWidth: 520, margin: "0 auto", padding: "18px 0 12px" };
const eyebrowStyle: CSSProperties = { color: "#9fb3c8", fontSize: 13, fontWeight: 900, letterSpacing: "0.22em", marginBottom: 14 };
const titleStyle: CSSProperties = { margin: 0, fontSize: "clamp(30px, 9vw, 42px)", lineHeight: 1.08, letterSpacing: "-0.06em", fontWeight: 950, wordBreak: "keep-all" };
const datePillStyle: CSSProperties = { display: "inline-flex", alignItems: "center", marginTop: 14, padding: "9px 14px", borderRadius: 999, background: "rgba(37, 99, 235, 0.18)", border: "1px solid rgba(147, 197, 253, 0.28)", color: "#dbeafe", fontSize: 15, fontWeight: 800 };
const descriptionStyle: CSSProperties = { margin: "18px 0 0", color: "#b8c5d8", fontSize: 16, lineHeight: 1.65, wordBreak: "keep-all" };
const stackStyle: CSSProperties = { width: "100%", maxWidth: 520, margin: "18px auto 0", display: "flex", flexDirection: "column", gap: 14 };
const cardStyle: CSSProperties = { width: "100%", boxSizing: "border-box", padding: 18, borderRadius: 24, background: "rgba(8, 20, 39, 0.84)", border: "1px solid rgba(148, 163, 184, 0.22)", boxShadow: "0 18px 45px rgba(0, 0, 0, 0.24)", overflow: "hidden" };
const cardLabelStyle: CSSProperties = { color: "#9fb3c8", fontSize: 13, letterSpacing: "0.12em", fontWeight: 900, textTransform: "uppercase", marginBottom: 8 };
const cardTitleStyle: CSSProperties = { margin: 0, fontSize: 24, lineHeight: 1.25, letterSpacing: "-0.04em", fontWeight: 900, wordBreak: "keep-all" };
const cardDescriptionStyle: CSSProperties = { margin: "12px 0 16px", color: "#b8c5d8", fontSize: 15, lineHeight: 1.6, wordBreak: "keep-all" };
const primaryButtonStyle: CSSProperties = { width: "100%", minHeight: 52, border: "none", borderRadius: 16, color: "white", fontSize: 17, fontWeight: 900, cursor: "pointer" };
const secondaryButtonStyle: CSSProperties = { ...primaryButtonStyle, marginTop: 16, background: "#2563eb" };
const greenButtonStyle: CSSProperties = { ...primaryButtonStyle, background: "#16a34a" };
const grayButtonStyle: CSSProperties = { ...primaryButtonStyle, background: "#334155" };
const darkButtonStyle: CSSProperties = { ...primaryButtonStyle, background: "#111827", border: "1px solid rgba(148, 163, 184, 0.22)" };
const buttonStackStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 10 };
const infoListStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 10, marginTop: 14 };
const infoRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "86px 1fr", gap: 10, alignItems: "start", padding: "10px 0", borderBottom: "1px solid rgba(148, 163, 184, 0.14)" };
const infoLabelStyle: CSSProperties = { color: "#94a3b8", fontSize: 14, fontWeight: 800 };
const infoValueStyle: CSSProperties = { color: "#f8fafc", fontSize: 15, lineHeight: 1.45, fontWeight: 800, wordBreak: "break-word" };
const imageListStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 10, marginTop: 14 };
const imagePreviewButtonStyle: CSSProperties = { display: "grid", gridTemplateColumns: "76px 1fr", gap: 12, alignItems: "center", width: "100%", padding: 10, borderRadius: 16, background: "rgba(15, 23, 42, 0.92)", border: "1px solid rgba(148, 163, 184, 0.2)", color: "white", textAlign: "left" };
const imagePreviewStyle: CSSProperties = { width: 76, height: 76, objectFit: "cover", borderRadius: 12, background: "#111827" };
const imageTextStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 15, fontWeight: 900 };
const imageDateStyle: CSSProperties = { color: "#94a3b8", fontSize: 12, fontWeight: 700 };
const noteStyle: CSSProperties = { width: "100%", minHeight: 130, boxSizing: "border-box", margin: "14px 0 12px", padding: 14, borderRadius: 16, border: "1px solid rgba(148, 163, 184, 0.28)", background: "#020817", color: "white", fontSize: 16, lineHeight: 1.5, resize: "vertical" };
const noticeStyle: CSSProperties = { padding: 14, borderRadius: 18, background: "rgba(250, 204, 21, 0.12)", border: "1px solid rgba(250, 204, 21, 0.26)", color: "#fde68a", fontSize: 14, lineHeight: 1.5 };
const footerStyle: CSSProperties = { maxWidth: 520, margin: "24px auto 0", padding: "8px 0", color: "#64748b", textAlign: "center", fontSize: 13, fontWeight: 800 };
