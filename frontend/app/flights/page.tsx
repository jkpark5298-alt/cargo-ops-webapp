"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";

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

const STORAGE_KEY = "cargo_ops_monitor_rooms_v4";

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

  let normalized = raw.trim();

  normalized = normalized.replace(/\./g, "-");
  normalized = normalized.replace(/\//g, "-");
  normalized = normalized.replace("T", " ");

  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date;

  return null;
}

function getComputedStatus(row: FlightRow) {
  if (row.canceled) return "결항";
  if (row.gateChanged) return "게이트 변경";

  if (row.delay) {
    if (row.status === "도착") return "도착(지연)";
    if (row.status === "출발") return "출발(지연)";
    return "지연";
  }

  if (row.status === "출발") return "출발";
  if (row.status === "도착") return "도착";

  // fallback: status가 비어있으면 시간 기준으로 추정
  const dt = parseFlightTime(row);
  const now = new Date();

  if (dt && dt.getTime() <= now.getTime()) {
    if ((row.departureCode || "").toUpperCase() === "ICN") {
      return "출발";
    }
    if ((row.arrivalCode || "").toUpperCase() === "ICN") {
      return "도착";
    }
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

    const flights = finalInput
      .split(",")
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);

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

      if (selectedRoomId) {
        persistRoom(
          selectedRoomId,
          nextRows,
          fetchedAt,
          fixed,
          finalInput,
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
      const flights = selectedRoom.flightsInput
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean);

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
    const newRoom: MonitorRoom = {
      id: `${now.getTime()}`,
      name: formatMonitorRoomName(now),
      flightsInput: trimmedInput,
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
  };

  const handleSelectRoom = (room: MonitorRoom) => {
    setSelectedRoomId(room.id);
    setInput(room.flightsInput);
    setStartDateTime(room.startDateTime);
    setEndDateTime(room.endDateTime);
    setFixed(room.fixed);
    setLastFetchedAt(room.lastFetchedAt);
    setRows(room.rows);
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

    if (selectedRoomId) {
      persistRoom(selectedRoomId, rows, lastFetchedAt, nextFixed);
    }
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
            placeholder="예: KJ247,KJ972"
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
            FIXED 상태: 현재 화면을 유지하며, 조회 버튼을 눌렀을 때만 최신 정보를 반영합니다.
          </div>
        )}

        {lastFetchedAt && (
          <div style={{ marginTop: 6, color: "#9fb3c8", fontSize: 13 }}>
            마지막 조회 시각: {lastFetchedAt}
          </div>
        )}

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
        {error && <p style={{ marginTop: 20, color: "red" }}>{error}</p>}

        <div style={{ marginTop: 30, overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1200,
            }}
          >
            <thead>
              <tr style={{ background: "#222" }}>
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
              {rows.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #333",
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
                  <td style={tdStyle}>{r.flightId || r.flightNo || "-"}</td>
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

        {!loading && !error && rows.length === 0 && (
          <div style={{ marginTop: 30, color: "#9fb3c8" }}>
            조회 결과가 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 10px",
  textAlign: "left",
  borderBottom: "1px solid #333",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  whiteSpace: "nowrap",
};

const dateInputStyle: React.CSSProperties = {
  padding: 10,
  background: "#111",
  border: "1px solid #444",
  borderRadius: 6,
  color: "white",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: "#ffffff",
  color: "#111111",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 700,
};

const refreshBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 700,
};

const fixedOnBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 700,
};

const fixedOffBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: "#ffffff",
  color: "#111111",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 700,
};

const badgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const badgeOrange: React.CSSProperties = {
  ...badgeBase,
  background: "rgba(245, 158, 11, 0.18)",
  color: "#f59e0b",
  border: "1px solid rgba(245, 158, 11, 0.35)",
};

const badgePurple: React.CSSProperties = {
  ...badgeBase,
  background: "rgba(168, 85, 247, 0.18)",
  color: "#c084fc",
  border: "1px solid rgba(168, 85, 247, 0.35)",
};

const badgeRed: React.CSSProperties = {
  ...badgeBase,
  background: "rgba(239, 68, 68, 0.18)",
  color: "#f87171",
  border: "1px solid rgba(239, 68, 68, 0.35)",
};

const badgeNormal: React.CSSProperties = {
  ...badgeBase,
  background: "rgba(148, 163, 184, 0.16)",
  color: "#cbd5e1",
  border: "1px solid rgba(148, 163, 184, 0.28)",
};
