"use client";

import type { CSSProperties } from "react";
import type { FlightAlertHistoryItem } from "../lib/flight-alerts";

type FlightAlertHistoryCardProps = {
  historyItems: FlightAlertHistoryItem[];
  serverHistoryItems?: FlightAlertHistoryItem[];
  serverLoading?: boolean;
  serverStatus?: string;
  onDeleteItem: (item: FlightAlertHistoryItem) => void;
  onClear: () => void;
  onLoadServerHistory: () => void;
  onMergeServerHistory: () => void;
};

export function FlightAlertHistoryCard({
  historyItems,
  serverHistoryItems = [],
  serverLoading = false,
  serverStatus = "",
  onDeleteItem,
  onClear,
  onLoadServerHistory,
  onMergeServerHistory,
}: FlightAlertHistoryCardProps) {
  return (
    <section style={flightAlertHistoryCardStyle}>
      <div style={flightAlertTopStyle}>
        <div>
          <div style={cardLabelStyle}>출도착 알림 이력</div>
          <h2 style={flightAlertTitleStyle}>최근 변경 {historyItems.length}건</h2>
        </div>
        <div style={flightAlertBadgeStyle}>알림 보관</div>
      </div>

      <div style={serverActionRowStyle}>
        <button
          type="button"
          onClick={onLoadServerHistory}
          disabled={serverLoading}
          style={serverButtonStyle}
        >
          {serverLoading ? "서버 확인 중..." : "서버 미처리 이력 불러오기"}
        </button>
        <button
          type="button"
          onClick={onMergeServerHistory}
          disabled={serverLoading || serverHistoryItems.length === 0}
          style={serverHistoryItems.length > 0 ? serverButtonStyle : disabledServerButtonStyle}
        >
          서버 이력 앱 보관 후 정리
        </button>
      </div>

      {serverStatus && <div style={serverStatusStyle}>{serverStatus}</div>}

      {serverHistoryItems.length > 0 && (
        <div style={serverHistoryBoxStyle}>
          <div style={serverHistoryTitleStyle}>서버 미처리 알림 이력 {serverHistoryItems.length}건</div>
          {serverHistoryItems.slice(0, 3).map((item, index) => (
            <div key={`${item.key}-${item.checkedAt}-${index}`} style={serverHistoryItemStyle}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
              <small>확인 {formatHistoryTime(item.checkedAt)} · {item.roomName}</small>
            </div>
          ))}
        </div>
      )}

      {historyItems.length > 0 ? (
        <div style={flightAlertListStyle}>
          {historyItems.slice(0, 5).map((item, index) => (
            <div key={`${item.key}-${item.checkedAt}-${index}`} style={flightAlertHistoryItemStyle}>
              <div style={flightAlertHistoryItemHeaderStyle}>
                <div style={flightAlertItemTitleStyle}>{item.title}</div>
                <button
                  type="button"
                  onClick={() => onDeleteItem(item)}
                  style={deleteItemButtonStyle}
                  aria-label={`${item.title} 알림 삭제`}
                >
                  삭제
                </button>
              </div>
              <div style={flightAlertItemDescStyle}>{item.description}</div>
              <div style={flightAlertHistoryMetaStyle}>
                확인 {formatHistoryTime(item.checkedAt)} · {item.roomName}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={flightAlertMetaStyle}>아직 저장된 알림 이력이 없습니다.</div>
      )}

      {historyItems.length > 0 && (
        <button onClick={onClear} style={resetButtonStyle}>
          알림 이력 초기화
        </button>
      )}
    </section>
  );
}

const flightAlertHistoryCardStyle: CSSProperties = {
  background: "linear-gradient(145deg, #0b1120, #111827)",
  border: "1px solid #1e3a8a",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
};

const flightAlertTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 12,
};

const cardLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 2,
  textTransform: "uppercase",
};

const flightAlertTitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#f8fafc",
  fontSize: 22,
  lineHeight: 1.15,
  fontWeight: 950,
};

const flightAlertBadgeStyle: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#1d4ed8",
  color: "#dbeafe",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const flightAlertMetaStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  lineHeight: 1.5,
  marginBottom: 14,
};

const flightAlertListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  marginBottom: 14,
};

const flightAlertHistoryItemStyle: CSSProperties = {
  border: "1px solid rgba(59, 130, 246, 0.22)",
  background: "rgba(30, 64, 175, 0.16)",
  borderRadius: 14,
  padding: "10px 12px",
};

const flightAlertHistoryItemHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
  marginBottom: 4,
};

const flightAlertItemTitleStyle: CSSProperties = {
  color: "#fef3c7",
  fontSize: 14,
  fontWeight: 950,
  marginBottom: 4,
};

const flightAlertItemDescStyle: CSSProperties = {
  color: "#fde68a",
  fontSize: 12,
  lineHeight: 1.45,
  fontWeight: 750,
};

const flightAlertHistoryMetaStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: 11,
  lineHeight: 1.4,
  marginTop: 6,
  fontWeight: 800,
};

const serverActionRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginBottom: 10,
};

const serverButtonStyle: CSSProperties = {
  minHeight: 44,
  border: "1px solid rgba(59, 130, 246, 0.45)",
  borderRadius: 12,
  color: "#dbeafe",
  background: "#1d4ed8",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const disabledServerButtonStyle: CSSProperties = {
  ...serverButtonStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

const serverStatusStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 10,
};

const serverHistoryBoxStyle: CSSProperties = {
  border: "1px solid rgba(20, 184, 166, 0.28)",
  background: "rgba(15, 118, 110, 0.14)",
  borderRadius: 14,
  padding: 10,
  marginBottom: 12,
};

const serverHistoryTitleStyle: CSSProperties = {
  color: "#ccfbf1",
  fontSize: 12,
  fontWeight: 950,
  marginBottom: 8,
};

const serverHistoryItemStyle: CSSProperties = {
  display: "grid",
  gap: 3,
  color: "#e0f2fe",
  fontSize: 12,
  lineHeight: 1.35,
  padding: "7px 0",
  borderTop: "1px solid rgba(148, 163, 184, 0.18)",
};

const resetButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 54,
  border: "1px solid rgba(148, 163, 184, 0.3)",
  borderRadius: 14,
  color: "#e5edf7",
  background: "#1f2937",
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
};


const deleteItemButtonStyle: CSSProperties = {
  border: "1px solid rgba(248, 113, 113, 0.42)",
  borderRadius: 999,
  padding: "4px 8px",
  background: "rgba(127, 29, 29, 0.38)",
  color: "#fecaca",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};


function formatHistoryTime(value?: string) {
  if (!value) return "-";

  const raw = value.replace("T", " ").replace("Z", "").trim();
  const match = raw.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})\s+(\d{2}):(\d{2})/);

  if (match) {
    const [, year, month, day, hour, minute] = match;
    return `'${year.slice(2)}/${month}/${day} ${hour}:${minute}`;
  }

  return raw;
}
