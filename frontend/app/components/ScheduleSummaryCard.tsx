"use client";

import type { CSSProperties } from "react";
import type { FlightRow, MonitorRoom } from "../page";

type ScheduleSummaryCardProps = {
  latestRoom: MonitorRoom | null;
  syncCheckedAt: string;
  onOpenScheduleFlight: () => void;
  onRefreshLatestSchedule: () => void;
};

export function ScheduleSummaryCard({
  latestRoom,
  syncCheckedAt,
  onOpenScheduleFlight,
  onRefreshLatestSchedule,
}: ScheduleSummaryCardProps) {
  return (
    <section style={cardStyle}>
      <div style={cardLabelStyle}>최근 Schedule Flight</div>
      <h2 style={cardTitleStyle}>{latestRoom?.name || "저장된 스케줄 없음"}</h2>
      <div style={infoListStyle}>
        <FlightRouteRows room={latestRoom} />
        <InfoRow
          label="조회범위"
          value={
            latestRoom
              ? `${formatDateTime(latestRoom.startDateTime)} ~ ${formatDateTime(latestRoom.endDateTime)}`
              : "-"
          }
        />
        <InfoRow label="마지막 조회" value={latestRoom?.lastFetchedAt || "-"} />
        <InfoRow label="결과 수" value={`${getRoomRowsCount(latestRoom)}건`} />
      </div>
      {syncCheckedAt ? <div style={syncStatusStyle}>동기화 확인 · {syncCheckedAt}</div> : null}
      <div style={buttonStackStyle}>
        <button onClick={onRefreshLatestSchedule} style={refreshButtonStyle}>
          Schedule Flight 동기화
        </button>
        <button onClick={onOpenScheduleFlight} style={secondaryButtonStyle}>
          최근 Schedule Flight 열기
        </button>
      </div>
    </section>
  );
}

function FlightRouteRows({ room }: { room: MonitorRoom | null }) {
  const items = getFlightRouteItems(room);

  return (
    <div style={flightRouteOnlyBlockStyle}>
      {items.length > 0 ? (
        items.map((item) => (
          <div key={`${item.flight}-${item.route}`} style={flightRouteRowStyle}>
            <span style={flightRouteNoStyle}>{item.flight}</span>
            <span style={flightRouteValueStyle}>{item.route}</span>
            <span style={flightRouteMetaStyle}>
              {item.status} · {item.time}
            </span>
          </div>
        ))
      ) : (
        <div style={infoValueStyle}>저장된 Schedule Flight가 없습니다.</div>
      )}
    </div>
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

function getFlightRouteItems(room: MonitorRoom | null) {
  if (!room) return [];

  const rows = Array.isArray(room.rows) ? room.rows : [];

  const rowItems = rows
    .map((row) => {
      const flight = getFlightNo(row);
      if (!flight) return null;

      return {
        flight,
        route: getRouteDisplay(row) || "구간 확인 중",
        direction: "기준",
        status: getComputedStatus(row),
        time: getFlightTimeDisplay(row),
        hasResult: true,
      };
    })
    .filter(
      (item): item is {
        flight: string;
        route: string;
        direction: string;
        status: string;
        time: string;
        hasResult: boolean;
      } => Boolean(item),
    );

  const uniqueRowItems = rowItems.filter((item, index, array) => {
    const key = item.flight.replace(/\s+/g, "").toUpperCase();
    return array.findIndex((candidate) => candidate.flight.replace(/\s+/g, "").toUpperCase() === key) === index;
  });

  if (uniqueRowItems.length > 0) {
    return uniqueRowItems;
  }

  return room.flightsInput
    .split(",")
    .map((flight) => flight.trim())
    .filter(Boolean)
    .map((flight) => ({
      flight,
      route: "조회 결과 없음",
      direction: "기준",
      status: "-",
      time: "-",
      hasResult: false,
    }));
}

function getFlightNo(row: FlightRow) {
  return row.flightNo || row.flightId || "";
}

function getRouteDisplay(row?: FlightRow) {
  if (!row) return "";
  const departure = row.departureCode || "";
  const arrival = row.arrivalCode || "";

  if (!departure && !arrival) return "";
  if (departure && arrival) return `${departure}→${arrival}`;
  if (departure) return `${departure}→-`;
  return `-→${arrival}`;
}

function getDirectionLabel(row?: FlightRow) {
  if (!row) return "운항";
  const remark = `${row.remark || ""} ${row.status || ""}`.toLowerCase();
  const route = getRouteDisplay(row);

  if (remark.includes("arrival") || remark.includes("도착") || route.endsWith("→ICN")) return "도착";
  if (remark.includes("departure") || remark.includes("출발") || route.startsWith("ICN→")) return "출발";

  return "운항";
}

function getComputedStatus(row?: FlightRow) {
  if (!row) return "-";
  const remarkStatus = `${row.status || ""} ${row.remark || ""}`.trim().toUpperCase();

  if (row.canceled || remarkStatus.includes("CANCEL")) return "결항";
  if (row.gateChanged) return "게이트 변경";

  if (remarkStatus.includes("DELAY") || remarkStatus.includes("지연") || row.delay) {
    if (remarkStatus.includes("ARRIV") || remarkStatus.includes("도착") || row.status === "도착") return "도착(지연)";
    if (remarkStatus.includes("DEPAR") || remarkStatus.includes("출발") || row.status === "출발") return "출발(지연)";
    return "지연";
  }

  if (row.status === "출발" || remarkStatus.includes("DEPART") || remarkStatus.includes("DEP") || remarkStatus.includes("출발")) return "출발";
  if (row.status === "도착" || remarkStatus.includes("ARRIV") || remarkStatus.includes("ARR") || remarkStatus.includes("도착")) return "도착";

  return "-";
}

function getFlightTimeDisplay(row?: FlightRow) {
  if (!row) return "-";
  return row.formattedEstimatedTime || row.estimatedDateTime || row.formattedScheduleTime || row.scheduleDateTime || "-";
}

function getRoomRowsCount(room: MonitorRoom | null) {
  return room?.rows?.length || 0;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

const syncStatusStyle: CSSProperties = {
  marginTop: 12,
  color: "#bfdbfe",
  fontSize: 12,
  fontWeight: 850,
  textAlign: "right",
};

const cardStyle: CSSProperties = {
  background: "#111827",
  border: "1px solid #26374f",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
};

const cardLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 2,
  textTransform: "uppercase",
};

const cardTitleStyle: CSSProperties = {
  margin: "6px 0 8px",
  color: "#f8fafc",
  fontSize: 21,
  lineHeight: 1.25,
  fontWeight: 950,
};

const infoListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  marginTop: 12,
};

const infoRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "86px 1fr",
  gap: 10,
  alignItems: "start",
  padding: "10px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
};

const infoLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 14,
  fontWeight: 800,
};

const infoValueStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 15,
  lineHeight: 1.45,
  fontWeight: 800,
  wordBreak: "break-word",
};

const flightRouteOnlyBlockStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "10px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
};

const flightRouteRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "76px minmax(82px, 1fr) minmax(150px, auto)",
  gap: 10,
  alignItems: "center",
  color: "#f8fafc",
  fontSize: 15,
  fontWeight: 900,
  lineHeight: 1.35,
};

const flightRouteNoStyle: CSSProperties = {
  letterSpacing: 0.5,
  whiteSpace: "nowrap",
};

const flightRouteValueStyle: CSSProperties = {
  color: "#dbeafe",
  wordBreak: "keep-all",
};

const flightRouteMetaStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 900,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const buttonStackStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};

const refreshButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 58,
  border: "1px solid rgba(147, 197, 253, 0.34)",
  borderRadius: 16,
  color: "#dbeafe",
  background: "#0f172a",
  fontSize: 17,
  fontWeight: 950,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 58,
  border: "none",
  borderRadius: 16,
  color: "#ffffff",
  background: "#2563eb",
  fontSize: 17,
  fontWeight: 950,
  cursor: "pointer",
};
