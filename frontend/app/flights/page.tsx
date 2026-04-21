"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cargo-ops-backend.onrender.com";

type FlightRow = {
  airline?: string;
  flightId?: string;
  flightNo?: string;
  departureCode?: string;
  departureName?: string;
  arrivalCode?: string;
  arrivalName?: string;
  scheduleDateTime?: string;
  estimatedDateTime?: string;
  formattedScheduleTime?: string;
  formattedEstimatedTime?: string;
  gatenumber?: string;
  terminalid?: string;
  masterflightid?: string;
  codeshare?: string;
  typeOfFlight?: string;
  remark?: string;
  status?: string;
  delay?: boolean;
  canceled?: boolean;
  gateChanged?: boolean;
  sourceType?: string;
  fid?: string;
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

const STORAGE_KEY = "cargo_ops_monitor_rooms_v6";

function toDateTimeLocalString(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getDefaultStartDateTime() {
  return toDateTimeLocalString(new Date());
}

function getDefaultEndDateTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateTimeLocalString(d);
}

function formatMonitorRoomName(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `Monitor_${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
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

function saveRooms(rooms: MonitorRoom[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

function parseFlightTime(row: FlightRow): Date | null {
  const raw =
    row.formattedEstimatedTime ||
    row.formattedScheduleTime ||
    row.estimatedDateTime ||
    row.scheduleDateTime;

  if (!raw) return null;

  const normalized = raw
    .trim()
    .replace(/\./g, "-")
    .replace(/\//g, "-")
    .replace("T", " ");

  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;

  const compactMatch = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (compactMatch) {
    const [, y, m, d, hh, mm, ss] = compactMatch;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss || "0")
    );
  }

  return null;
}

function getRemarkStatus(row: FlightRow): string {
  return `${row.status || ""} ${row.remark || ""}`.trim().toUpperCase();
}

function getComputedStatus(row: FlightRow) {
  const remarkStatus = getRemarkStatus(row);

  if (row.canceled || remarkStatus.includes("CANCEL")) return "결항";
  if (row.gateChanged) return "게이트 변경";

  if (
    remarkStatus.includes("DELAY") ||
    remarkStatus.includes("지연") ||
    row.delay
  ) {
    if (
      remarkStatus.includes("ARRIV") ||
      remarkStatus.includes("도착") ||
      row.status === "도착"
    ) {
      return "도착(지연)";
    }
    if (
      remarkStatus.includes("DEPAR") ||
      remarkStatus.includes("출발") ||
      row.status === "출발"
    ) {
      return "출발(지연)";
    }
    return "지연";
  }

  if (
    row.status === "출발" ||
    remarkStatus.includes("DEPART") ||
    remarkStatus.includes("DEP") ||
    remarkStatus.includes("출발")
  ) {
    return "출발";
  }

  if (
    row.status === "도착" ||
    remarkStatus.includes("ARRIV") ||
    remarkStatus.includes("ARR") ||
    remarkStatus.includes("도착")
  ) {
    return "도착";
  }

  const dt = parseFlightTime(row);
  const now = new Date();

  if (dt && dt.getTime() <= now.getTime()) {
    const dep = (row.departureCode || "").toUpperCase();
    const arr = (row.arrivalCode || "").toUpperCase();

    if (dep === "ICN") return "출발";
    if (arr === "ICN") return "도착";
  }

  return "-";
}

function getStatusColor(row: FlightRow) {
  const status = getComputedStatus(row);

  if (status === "결항") return "#111111";
  if (status === "게이트 변경") return "#a855f7";
  if (status.includes("지연")) return "#f59e0b";
  if (status === "출발") return "#ef4444";
  if (status === "도착") return "#3b82f6";
  return "#e5e7eb";
}

function getAlertCounts(rows: FlightRow[]) {
  const computed = rows.map((r) => getComputedStatus(r));
  return {
    delay: computed.filter((s) => s.includes("지연")).length,
    gateChanged: computed.filter((s) => s === "게이트 변경").length,
    canceled: computed.filter((s) => s === "결항").length,
  };
}

function getRowBackground(row: FlightRow) {
  const status = getComputedStatus(row);

  if (status === "결항") return "rgba(239, 68, 68, 0.12)";
  if (status === "게이트 변경") return "rgba(168, 85, 247, 0.14)";
  if (status.includes("지연")) return "rgba(245, 158, 11, 0.12)";
  if (status === "출발") return "rgba(239, 68, 68, 0.06)";
  if (status === "도착") return "rgba(59, 130, 246, 0.06)";
  return "transparent";
}

function getChangedDateTime(row: FlightRow) {
  return (
    row.formattedEstimatedTime ||
    row.estimatedDateTime ||
    row.formattedScheduleTime ||
    row.scheduleDateTime ||
    "-"
  );
}

function getRegistrationNo(row: FlightRow) {
  return row.fid || "-";
}

function getFlightDisplay(row: FlightRow) {
  return row.flightId || row.flightNo || "-";
}

function getRowKey(row: FlightRow, idx: number) {
  return [
    getFlightDisplay(row),
    row.scheduleDateTime || "",
    row.estimatedDateTime || "",
    row.departureCode || "",
    row.arrivalCode || "",
    row.gatenumber || "",
    idx,
  ].join("|");
}

function normalizeFlightsInput(rawInput: string) {
  return rawInput
    .split(/[\s,\n]+/)
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .map((value) => {
      if (/^\d{3,4}$/.test(value)) {
        return `KJ${value}`;
      }
      return value;
    });
}

function buildFixedDetailRows(row: FlightRow) {
  return [
    { label: "현황", value: getComputedStatus(row) },
    { label: "편명", value: getFlightDisplay(row) },
    { label: "출발지코드", value: row.departureCode || "-" },
    { label: "출발지공항명", value: row.departureName || "-" },
    { label: "도착지코드", value: row.arrivalCode || "-" },
    { label: "도착지공항명", value: row.arrivalName || "-" },
    { label: "예정일시", value: row.formattedScheduleTime || "-" },
    { label: "변경일시", value: row.formattedEstimatedTime || "-" },
    { label: "게이트", value: row.gatenumber || "-" },
    { label: "터미널", value: row.terminalid || "-" },
    { label: "등록기호", value: getRegistrationNo(row) },
    { label: "코드쉐어", value: row.codeshare || "-" },
  ];
}

function DetailToggleButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 34,
        height: 30,
        padding: "0 10px",
        borderRadius: 6,
        border: "1px solid #36527f",
        background: expanded ? "#1d4ed8" : "#10213d",
        color: "white",
        fontWeight: 800,
        cursor: "pointer",
      }}
      aria-label="detail"
      title="DETAIL"
    >
      D
    </button>
  );
}

function FixedResultsTable({
  rows,
  expandedKeys,
  onToggleDetail,
}: {
  rows: FlightRow[];
  expandedKeys: Record<string, boolean>;
  onToggleDetail: (key: string) => void;
}) {
  return (
    <div style={{ marginTop: 30, overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 980,
          background: "#081427",
          border: "1px solid #22314e",
        }}
      >
        <thead>
          <tr style={{ background: "#18263f" }}>
            <th style={thStyle}>편명</th>
            <th style={thStyle}>구분</th>
            <th style={thStyle}>출발</th>
            <th style={thStyle}>도착</th>
            <th style={thStyle}>변경일시</th>
            <th style={thStyle}>게이트</th>
            <th style={thStyle}>등록기호</th>
            <th style={thStyle}>D</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={8}>
                조회 결과가 없습니다.
              </td>
            </tr>
          )}

          {rows.map((row, idx) => {
            const rowKey = getRowKey(row, idx);
            const expanded = Boolean(expandedKeys[rowKey]);
            const detailRows = buildFixedDetailRows(row);

            return (
              <FragmentRow key={rowKey}>
                <tr
                  style={{
                    borderBottom: expanded
                      ? "1px solid transparent"
                      : "1px solid #2b4269",
                    background: getRowBackground(row),
                  }}
                >
                  <td style={tdStyle}>{getFlightDisplay(row)}</td>
                  <td
                    style={{
                      ...tdStyle,
                      color: getStatusColor(row),
                      fontWeight: 800,
                    }}
                  >
                    {getComputedStatus(row)}
                  </td>
                  <td style={tdStyle}>{row.departureCode || "-"}</td>
                  <td style={tdStyle}>{row.arrivalCode || "-"}</td>
                  <td style={tdStyle}>{getChangedDateTime(row)}</td>
                  <td style={tdStyle}>{row.gatenumber || "-"}</td>
                  <td style={tdStyle}>{getRegistrationNo(row)}</td>
                  <td style={tdStyle}>
                    <DetailToggleButton
                      expanded={expanded}
                      onClick={() => onToggleDetail(rowKey)}
                    />
                  </td>
                </tr>

                {expanded && (
                  <tr style={{ background: "#0c1a31", borderBottom: "1px solid #2b4269" }}>
                    <td colSpan={8} style={{ padding: 14 }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          background: "#0a1528",
                          border: "1px solid #2b4269",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#15233b" }}>
                            <th style={detailThStyle}>항목</th>
                            <th style={detailThStyle}>값</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailRows.map((detail) => (
                            <tr key={`${rowKey}-${detail.label}`} style={{ borderBottom: "1px solid #22314e" }}>
                              <td style={detailTdLabelStyle}>{detail.label}</td>
                              <td style={detailTdStyle}>{detail.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </FragmentRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function FlightsPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<FlightRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [startDateTime, setStartDateTime] = useState(getDefaultStartDateTime());
  const [endDateTime, setEndDateTime] = useState(getDefaultEndDateTime());

  const [fixed, setFixed] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState("");

  const [rooms, setRooms] = useState<MonitorRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [expandedDetailKeys, setExpandedDetailKeys] = useState<Record<string, boolean>>({});

  const currentRangeText = useMemo(() => {
    return `${startDateTime.replace("T", " ")} ~ ${endDateTime.replace("T", " ")}`;
  }, [startDateTime, endDateTime]);

  const alertCounts = useMemo(() => getAlertCounts(rows), [rows]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  useEffect(() => {
    const savedRooms = loadRooms();
    setRooms(savedRooms);

    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const q = params.get("flight");

    if (q) {
      const upper = q.toUpperCase();
      setInput(upper);
      fetchFlights(upper);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistRoom = (
    roomId: string,
    nextRows: FlightRow[],
    fetchedAt: string,
    nextFixed: boolean = fixed,
    nextInput: string = input,
    nextStartDateTime: string = startDateTime,
    nextEndDateTime: string = endDateTime
  ) => {
    const nextRooms = rooms.map((room) =>
      room.id === roomId
        ? {
            ...room,
            flightsInput: nextInput,
            startDateTime: nextStartDateTime,
            endDateTime: nextEndDateTime,
            fixed: nextFixed,
            lastFetchedAt: fetchedAt,
            rows: nextRows,
          }
        : room
    );
    setRooms(nextRooms);
    saveRooms(nextRooms);
  };

  const fetchFlights = async (flightArg?: string) => {
    const finalInput = (flightArg ?? input).trim();

    if (!finalInput) {
      setError("편명을 입력하세요.");
      return;
    }

    const flights = normalizeFlightsInput(finalInput);

    if (flights.length === 0) {
      setError("편명을 입력하세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BACKEND_URL}/flights/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flights,
          start: startDateTime,
          end: endDateTime,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json.message || `서버 오류 (${res.status})`);
      }

      const nextRows = json.data || [];
      const fetchedAt = new Date().toLocaleString("ko-KR");

      setRows(nextRows);
      setLastFetchedAt(fetchedAt);
      setExpandedDetailKeys({});

      if (selectedRoomId) {
        persistRoom(
          selectedRoomId,
          nextRows,
          fetchedAt,
          fixed,
          flights.join(", "),
          startDateTime,
          endDateTime
        );
      }
    } catch (e: any) {
      setError(e.message || "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedRoom = async () => {
    if (!selectedRoom) return;

    setInput(selectedRoom.flightsInput);
    setStartDateTime(selectedRoom.startDateTime);
    setEndDateTime(selectedRoom.endDateTime);
    setFixed(selectedRoom.fixed);

    setLoading(true);
    setError("");

    try {
      const flights = normalizeFlightsInput(selectedRoom.flightsInput);

      const res = await fetch(`${BACKEND_URL}/flights/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flights,
          start: selectedRoom.startDateTime,
          end: selectedRoom.endDateTime,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json.message || `서버 오류 (${res.status})`);
      }

      const nextRows = json.data || [];
      const fetchedAt = new Date().toLocaleString("ko-KR");

      setRows(nextRows);
      setLastFetchedAt(fetchedAt);
      setExpandedDetailKeys({});

      const nextRooms = rooms.map((room) =>
        room.id === selectedRoom.id
          ? {
              ...room,
              rows: nextRows,
              lastFetchedAt: fetchedAt,
            }
          : room
      );

      setRooms(nextRooms);
      saveRooms(nextRooms);
    } catch (e: any) {
      setError(e.message || "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMonitor = () => {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      setError("Monitor 방으로 저장할 편명을 먼저 입력하세요.");
      return;
    }

    const now = new Date();
    const normalizedInput = normalizeFlightsInput(trimmedInput).join(", ");
    const newRoom: MonitorRoom = {
      id: `${now.getTime()}`,
      name: formatMonitorRoomName(now),
      flightsInput: normalizedInput,
      startDateTime,
      endDateTime,
      fixed,
      lastFetchedAt,
      rows,
    };

    const nextRooms = [newRoom, ...rooms];
    setRooms(nextRooms);
    saveRooms(nextRooms);
    setSelectedRoomId(newRoom.id);
    setInput(normalizedInput);
  };

  const handleSelectRoom = (room: MonitorRoom) => {
    setSelectedRoomId(room.id);
    setInput(room.flightsInput);
    setStartDateTime(room.startDateTime);
    setEndDateTime(room.endDateTime);
    setFixed(room.fixed);
    setLastFetchedAt(room.lastFetchedAt);
    setRows(room.rows);
    setExpandedDetailKeys({});
    setError("");
  };

  const handleDeleteRoom = (roomId: string) => {
    const nextRooms = rooms.filter((room) => room.id !== roomId);
    setRooms(nextRooms);
    saveRooms(nextRooms);

    if (selectedRoomId === roomId) {
      setSelectedRoomId("");
    }
  };

  const handleToggleFixed = () => {
    const nextFixed = !fixed;
    setFixed(nextFixed);
    setExpandedDetailKeys({});

    if (selectedRoomId) {
      persistRoom(selectedRoomId, rows, lastFetchedAt, nextFixed);
    }
  };

  const handleToggleDetail = (rowKey: string) => {
    setExpandedDetailKeys((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  const selectedRoomCounts = useMemo(
    () => (selectedRoom ? getAlertCounts(selectedRoom.rows) : null),
    [selectedRoom]
  );

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#07152b",
        color: "white",
      }}
    >
      <aside
        style={{
          width: 340,
          borderRight: "1px solid #1f2a44",
          padding: 20,
          background: "#06101f",
        }}
      >
        <h3 style={{ fontSize: 20, marginBottom: 16 }}>Monitor</h3>

        <button
          onClick={handleCreateMonitor}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          현재 조회 저장
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rooms.length === 0 && (
            <div style={{ color: "#94a3b8", fontSize: 14 }}>
              저장된 Monitor 방이 없습니다.
            </div>
          )}

          {rooms.map((room) => {
            const counts = getAlertCounts(room.rows);
            const totalAlerts =
              counts.delay + counts.gateChanged + counts.canceled;

            return (
              <div
                key={room.id}
                style={{
                  border:
                    room.id === selectedRoomId
                      ? "1px solid #60a5fa"
                      : "1px solid #23314f",
                  borderRadius: 8,
                  padding: 12,
                  background:
                    room.id === selectedRoomId ? "#0b1b35" : "#0a1528",
                }}
              >
                <div
                  onClick={() => handleSelectRoom(room)}
                  style={{ cursor: "pointer" }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {room.name}
                  </div>

                  <div
                    style={{
                      color: "#cbd5e1",
                      fontSize: 13,
                      wordBreak: "break-all",
                    }}
                  >
                    {room.flightsInput}
                  </div>

                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
                    {room.startDateTime.replace("T", " ")} ~{" "}
                    {room.endDateTime.replace("T", " ")}
                  </div>

                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                    마지막 조회: {room.lastFetchedAt || "-"}
                  </div>

                  <div
                    style={{
                      color: room.fixed ? "#facc15" : "#94a3b8",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {room.fixed ? "FIXED" : "일반"}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {counts.delay > 0 && (
                      <span style={badgeOrange}>지연 {counts.delay}</span>
                    )}
                    {counts.gateChanged > 0 && (
                      <span style={badgePurple}>게이트 {counts.gateChanged}</span>
                    )}
                    {counts.canceled > 0 && (
                      <span style={badgeRed}>결항 {counts.canceled}</span>
                    )}
                    {totalAlerts === 0 && (
                      <span style={badgeNormal}>이상 없음</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "8px 10px",
                    background: "#334155",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  삭제
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <main style={{ flex: 1, padding: 40 }}>
        <h2 style={{ fontSize: 28, marginBottom: 20 }}>✈️ 편명 조회</h2>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="예: 247,972 또는 KJ247,KJ972"
            style={{
              flex: 1,
              padding: 12,
              background: "#111",
              border: "1px solid #444",
              borderRadius: 6,
              color: "white",
              fontSize: 16,
            }}
          />
        </div>

        <div style={{ marginTop: 8, color: "#9fb3c8", fontSize: 13 }}>
          숫자 3~4자리만 입력하면 KJ를 자동으로 붙여 조회합니다.
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={{ minWidth: 50 }}>시작일</label>
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            style={dateInputStyle}
          />

          <label style={{ minWidth: 50, marginLeft: 8 }}>종료일</label>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            style={dateInputStyle}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => fetchFlights()} disabled={loading} style={primaryBtn}>
            조회
          </button>

          <button
            onClick={handleToggleFixed}
            style={fixed ? fixedOnBtn : fixedOffBtn}
          >
            FIXED
          </button>
        </div>

        <div style={{ marginTop: 10, color: "#9fb3c8", fontSize: 14 }}>
          현재 조회 범위: {currentRangeText}
        </div>

        {fixed && (
          <div style={{ marginTop: 6, color: "#facc15", fontSize: 14 }}>
            FIXED 상태: 기본 7개 정보만 표시되며, D를 눌러 상세 12개 정보를 확인합니다.
          </div>
        )}

        {lastFetchedAt && (
          <div style={{ marginTop: 6, color: "#9fb3c8", fontSize: 13 }}>
            마지막 조회 시각: {lastFetchedAt}
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {alertCounts.delay > 0 && <span style={badgeOrange}>지연 {alertCounts.delay}</span>}
          {alertCounts.gateChanged > 0 && (
            <span style={badgePurple}>게이트 변경 {alertCounts.gateChanged}</span>
          )}
          {alertCounts.canceled > 0 && <span style={badgeRed}>결항 {alertCounts.canceled}</span>}
          {rows.length > 0 &&
            alertCounts.delay + alertCounts.gateChanged + alertCounts.canceled === 0 && (
              <span style={badgeNormal}>이상 없음</span>
            )}
        </div>

        {selectedRoom && (
          <div
            style={{
              marginTop: 20,
              padding: 18,
              background: "#0d1a30",
              border: "1px solid #2b4269",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
                  선택된 Monitor 상세
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {selectedRoom.name}
                </div>
                <div style={{ color: "#cbd5e1", marginBottom: 6 }}>
                  편명: {selectedRoom.flightsInput}
                </div>
                <div style={{ color: "#cbd5e1", marginBottom: 6 }}>
                  조회 범위: {selectedRoom.startDateTime.replace("T", " ")} ~{" "}
                  {selectedRoom.endDateTime.replace("T", " ")}
                </div>
                <div style={{ color: "#cbd5e1", marginBottom: 6 }}>
                  마지막 조회: {selectedRoom.lastFetchedAt || "-"}
                </div>
                <div style={{ color: selectedRoom.fixed ? "#facc15" : "#cbd5e1" }}>
                  상태: {selectedRoom.fixed ? "FIXED" : "일반"}
                </div>
              </div>

              <div style={{ minWidth: 260 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>이상 현황</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {selectedRoomCounts && selectedRoomCounts.delay > 0 && (
                    <span style={badgeOrange}>지연 {selectedRoomCounts.delay}건</span>
                  )}
                  {selectedRoomCounts && selectedRoomCounts.gateChanged > 0 && (
                    <span style={badgePurple}>
                      게이트 변경 {selectedRoomCounts.gateChanged}건
                    </span>
                  )}
                  {selectedRoomCounts && selectedRoomCounts.canceled > 0 && (
                    <span style={badgeRed}>결항 {selectedRoomCounts.canceled}건</span>
                  )}
                  {selectedRoomCounts &&
                    selectedRoomCounts.delay +
                      selectedRoomCounts.gateChanged +
                      selectedRoomCounts.canceled ===
                      0 && <span style={badgeNormal}>이상 없음</span>}
                </div>

                <button onClick={refreshSelectedRoom} disabled={loading} style={refreshBtn}>
                  선택된 Monitor 다시 조회
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && <p style={{ marginTop: 20 }}>조회중...</p>}
        {error && <p style={{ marginTop: 20, color: "#f87171" }}>{error}</p>}

        {!fixed && (
          <div style={{ marginTop: 30, overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1200,
                background: "#081427",
                border: "1px solid #22314e",
              }}
            >
              <thead>
                <tr style={{ background: "#18263f" }}>
                  <th style={thStyle}>현황</th>
                  <th style={thStyle}>편명</th>
                  <th style={thStyle}>출발지코드</th>
                  <th style={thStyle}>출발지공항명</th>
                  <th style={thStyle}>도착지코드</th>
                  <th style={thStyle}>도착지공항명</th>
                  <th style={thStyle}>예정일시</th>
                  <th style={thStyle}>변경일시</th>
                  <th style={thStyle}>게이트</th>
                  <th style={thStyle}>터미널</th>
                  <th style={thStyle}>마스터 편명</th>
                  <th style={thStyle}>코드쉐어</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td style={tdStyle} colSpan={12}>
                      조회 결과가 없습니다.
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr
                    key={getRowKey(r, i)}
                    style={{
                      borderBottom: "1px solid #2b4269",
                      background: getRowBackground(r),
                    }}
                  >
                    <td
                      style={{
                        ...tdStyle,
                        color: getStatusColor(r),
                        fontWeight: 700,
                      }}
                    >
                      {getComputedStatus(r)}
                    </td>
                    <td style={tdStyle}>{getFlightDisplay(r)}</td>
                    <td style={tdStyle}>{r.departureCode || "-"}</td>
                    <td style={tdStyle}>{r.departureName || "-"}</td>
                    <td style={tdStyle}>{r.arrivalCode || "-"}</td>
                    <td style={tdStyle}>{r.arrivalName || "-"}</td>
                    <td style={tdStyle}>{r.formattedScheduleTime || "-"}</td>
                    <td style={tdStyle}>{r.formattedEstimatedTime || "-"}</td>
                    <td style={tdStyle}>{r.gatenumber || "-"}</td>
                    <td style={tdStyle}>{r.terminalid || "-"}</td>
                    <td style={tdStyle}>{r.masterflightid || "-"}</td>
                    <td style={tdStyle}>{r.codeshare || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {fixed && (
          <FixedResultsTable
            rows={rows}
            expandedKeys={expandedDetailKeys}
            onToggleDetail={handleToggleDetail}
          />
        )}

        {!loading && !error && rows.length === 0 && (
          <div style={{ marginTop: 30, color: "#9fb3c8" }}>
            조회 결과가 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}

const thStyle: CSSProperties = {
  borderBottom: "1px solid #334155",
  padding: "12px 10px",
  textAlign: "left",
  fontSize: 14,
  color: "#e2e8f0",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid #1f2937",
  padding: "12px 10px",
  fontSize: 14,
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const detailThStyle: CSSProperties = {
  borderBottom: "1px solid #334155",
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 13,
  color: "#e2e8f0",
  whiteSpace: "nowrap",
};

const detailTdStyle: CSSProperties = {
  borderBottom: "1px solid #22314e",
  padding: "10px 12px",
  fontSize: 13,
  color: "#e5edf7",
};

const detailTdLabelStyle: CSSProperties = {
  ...detailTdStyle,
  width: 180,
  color: "#a7b7ce",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const dateInputStyle: CSSProperties = {
  padding: "10px 12px",
  background: "#111",
  border: "1px solid #444",
  borderRadius: 6,
  color: "white",
  fontSize: 14,
};

const primaryBtn: CSSProperties = {
  padding: "10px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 700,
};

const fixedOnBtn: CSSProperties = {
  padding: "10px 18px",
  background: "#facc15",
  color: "#111827",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 800,
};

const fixedOffBtn: CSSProperties = {
  padding: "10px 18px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 700,
};

const refreshBtn: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 700,
};

const badgeBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px 8px",
  borderRadius: 9999,
  fontSize: 12,
  fontWeight: 700,
};

const badgeOrange: CSSProperties = {
  ...badgeBase,
  background: "rgba(245, 158, 11, 0.18)",
  color: "#fbbf24",
};

const badgePurple: CSSProperties = {
  ...badgeBase,
  background: "rgba(168, 85, 247, 0.18)",
  color: "#c084fc",
};

const badgeRed: CSSProperties = {
  ...badgeBase,
  background: "rgba(239, 68, 68, 0.18)",
  color: "#f87171",
};

const badgeNormal: CSSProperties = {
  ...badgeBase,
  background: "rgba(148, 163, 184, 0.16)",
  color: "#cbd5e1",
};
