"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cargo-ops-backend.onrender.com";

const STORAGE_KEY = "cargo_ops_monitor_rooms_v6";
const LAST_FIXED_ROOM_KEY = "last_fixed_room_id";

const DEFAULT_REFRESH_MINUTES = 30;
const FOCUS_REFRESH_MINUTES = 5;
const COMPLETED_EXCLUDE_BUFFER_MINUTES = 10;

type FlightRow = {
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

type WidgetSummaryItem = {
  flight: string;
  status: string;
  departureCode: string;
  arrivalCode: string;
  displayTime: string;
  gate: string;
};

type WidgetSummaryResponse = {
  success: boolean;
  roomId: string;
  roomName: string;
  updatedAt: string;
  refreshIntervalMinutes: number;
  items: WidgetSummaryItem[];
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

function normalizeFlightsInput(rawInput: string) {
  return rawInput
    .split(/[\s,\n,]+/)
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .map((value) => {
      if (/^\d{3,4}$/.test(value)) return `KJ${value}`;
      return value;
    });
}

function parseDateTime(value?: string | null): Date | null {
  if (!value || value === "-") return null;

  const raw = value.trim().replace(/\./g, "-").replace(/\//g, "-").replace("T", " ");

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const fullMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (fullMatch) {
    const [, y, m, d, hh, mm, ss] = fullMatch;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss || "0")
    );
  }

  const monthDayMatch = raw.match(/^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);

  if (monthDayMatch) {
    const now = new Date();
    const [, m, d, hh, mm] = monthDayMatch;
    return new Date(
      now.getFullYear(),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm)
    );
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12) {
    return new Date(
      Number(digits.slice(0, 4)),
      Number(digits.slice(4, 6)) - 1,
      Number(digits.slice(6, 8)),
      Number(digits.slice(8, 10)),
      Number(digits.slice(10, 12))
    );
  }

  return null;
}

function getFlightTimeFromRow(row: FlightRow): Date | null {
  return (
    parseDateTime(row.formattedEstimatedTime) ||
    parseDateTime(row.estimatedDateTime) ||
    parseDateTime(row.formattedScheduleTime) ||
    parseDateTime(row.scheduleDateTime)
  );
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

  const dt = getFlightTimeFromRow(row);
  const now = new Date();

  if (dt && dt.getTime() <= now.getTime()) {
    const dep = (row.departureCode || "").toUpperCase();
    const arr = (row.arrivalCode || "").toUpperCase();

    if (dep === "ICN") return "출발";
    if (arr === "ICN") return "도착";
  }

  return "-";
}

function isFinalCompletedStatus(status: string) {
  return status === "출발" || status === "도착";
}

function getLatestRowsByFlight(rows: FlightRow[]) {
  const map = new Map<string, { row: FlightRow; time: number }>();

  for (const row of rows) {
    const flight = row.flightId || row.flightNo || "";
    if (!flight) continue;

    const dt = getFlightTimeFromRow(row);
    const time = dt ? dt.getTime() : -1;

    const prev = map.get(flight);
    if (!prev || time >= prev.time) {
      map.set(flight, { row, time });
    }
  }

  return map;
}

function getCompletedFlightSetFromRows(rows: FlightRow[]) {
  const completed = new Set<string>();
  const latestMap = getLatestRowsByFlight(rows);
  const now = Date.now();
  const bufferMs = COMPLETED_EXCLUDE_BUFFER_MINUTES * 60 * 1000;

  latestMap.forEach(({ row, time }, flight) => {
    const status = getComputedStatus(row);
    if (!isFinalCompletedStatus(status)) return;
    if (time < 0) return;
    if (time <= now - bufferMs) completed.add(flight);
  });

  return completed;
}

function statusColor(status: string) {
  if (status === "출발") return "#ef4444";
  if (status === "도착") return "#3b82f6";
  if (status.includes("지연")) return "#f59e0b";
  if (status === "게이트 변경") return "#a855f7";
  if (status === "결항") return "#94a3b8";
  return "#e5e7eb";
}

function roomButtonStyle(active: boolean): CSSProperties {
  return {
    border: active ? "1px solid #60a5fa" : "1px solid #24354f",
    background: active ? "#0e203d" : "#0a1528",
    color: "white",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    textAlign: "left",
    minWidth: 0,
  };
}

function formatMonthDayTime(value?: string | null) {
  if (!value) return "-";

  const parsed = parseDateTime(value);

  if (parsed) {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(parsed);
  }

  return value;
}

function formatDisplayItemFromRow(flight: string, row: FlightRow): WidgetSummaryItem {
  return {
    flight,
    status: getComputedStatus(row),
    departureCode: row.departureCode || "-",
    arrivalCode: row.arrivalCode || "-",
    displayTime:
      formatMonthDayTime(
        row.formattedEstimatedTime ||
          row.estimatedDateTime ||
          row.formattedScheduleTime ||
          row.scheduleDateTime ||
          "-"
      ) || "-",
    gate: row.gatenumber || "-",
  };
}

function formatFallbackDisplayItem(flight: string): WidgetSummaryItem {
  return {
    flight,
    status: "-",
    departureCode: "-",
    arrivalCode: "-",
    displayTime: "-",
    gate: "-",
  };
}

function getItemDirection(item: WidgetSummaryItem) {
  const dep = (item.departureCode || "").toUpperCase();
  const arr = (item.arrivalCode || "").toUpperCase();

  if (dep === "ICN") return "departure";
  if (arr === "ICN") return "arrival";
  return "unknown";
}

function isItemInFocusWindow(item: WidgetSummaryItem) {
  const dt = parseDateTime(item.displayTime);
  if (!dt) return false;

  const now = Date.now();
  const t = dt.getTime();
  const direction = getItemDirection(item);

  if (direction === "departure") {
    const start = t - 10 * 60 * 1000;
    const end = t + 30 * 60 * 1000;
    return now >= start && now <= end;
  }

  if (direction === "arrival") {
    const start = t - 60 * 60 * 1000;
    const end = t + 30 * 60 * 1000;
    return now >= start && now <= end;
  }

  return false;
}

function getNextRefreshMinutes(activeItems: WidgetSummaryItem[]) {
  if (activeItems.length === 0) return null;

  const hasFocusItem = activeItems.some((item) => isItemInFocusWindow(item));

  return hasFocusItem ? FOCUS_REFRESH_MINUTES : DEFAULT_REFRESH_MINUTES;
}

export default function FixedLitePage() {
  const [rooms, setRooms] = useState<MonitorRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [summary, setSummary] = useState<WidgetSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [currentIntervalMinutes, setCurrentIntervalMinutes] = useState<number | null>(null);
  const [completedFlightsByRoom, setCompletedFlightsByRoom] = useState<Record<string, string[]>>({});
  const [lastKnownItemsByRoom, setLastKnownItemsByRoom] = useState<
    Record<string, WidgetSummaryItem[]>
  >({});

  const timerRef = useRef<number | null>(null);

  const fixedRooms = useMemo(() => rooms.filter((room) => room.fixed), [rooms]);

  const selectedRoom = useMemo(
    () => fixedRooms.find((room) => room.id === selectedRoomId) || null,
    [fixedRooms, selectedRoomId]
  );

  const displayItemsForSelectedRoom = useMemo(() => {
    if (!selectedRoom) return [];

    const requested = normalizeFlightsInput(selectedRoom.flightsInput);
    const latestRowMap = getLatestRowsByFlight(selectedRoom.rows);
    const knownItemsMap = new Map(
      (lastKnownItemsByRoom[selectedRoom.id] || []).map((item) => [item.flight, item])
    );

    return requested.map((flight) => {
      const known = knownItemsMap.get(flight);
      if (known) return known;

      const latestRow = latestRowMap.get(flight)?.row;
      if (latestRow) return formatDisplayItemFromRow(flight, latestRow);

      return formatFallbackDisplayItem(flight);
    });
  }, [selectedRoom, lastKnownItemsByRoom]);

  const activeItemsForSelectedRoom = useMemo(() => {
    if (!selectedRoom) return [];

    const completedFromRows = getCompletedFlightSetFromRows(selectedRoom.rows);
    const completedFromSummary = new Set(completedFlightsByRoom[selectedRoom.id] || []);

    return displayItemsForSelectedRoom.filter((item) => {
      if (completedFromRows.has(item.flight)) return false;
      if (completedFromSummary.has(item.flight)) return false;
      if (isFinalCompletedStatus(item.status)) return false;
      return true;
    });
  }, [selectedRoom, displayItemsForSelectedRoom, completedFlightsByRoom]);

  const backToFlightsHref = selectedRoomId
    ? `/flights?roomId=${encodeURIComponent(selectedRoomId)}`
    : "/flights";

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleNext(room: MonitorRoom, activeItems: WidgetSummaryItem[]) {
    clearTimer();

    const nextMinutes = getNextRefreshMinutes(activeItems);

    if (!nextMinutes) {
      setCurrentIntervalMinutes(null);
      setNextRefreshAt(null);
      return;
    }

    setCurrentIntervalMinutes(nextMinutes);
    setNextRefreshAt(new Date(Date.now() + nextMinutes * 60 * 1000));

    timerRef.current = window.setTimeout(() => {
      void fetchSummary(room);
    }, nextMinutes * 60 * 1000);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedRooms = loadRooms();
    setRooms(savedRooms);

    const fixedOnly = savedRooms.filter((room) => room.fixed);
    const params = new URLSearchParams(window.location.search);
    const roomIdFromQuery = params.get("roomId") || "";
    const lastRoomId = localStorage.getItem(LAST_FIXED_ROOM_KEY);

    let target: MonitorRoom | undefined;

    if (roomIdFromQuery) {
      target = fixedOnly.find((room) => room.id === roomIdFromQuery);
    }

    if (!target && lastRoomId) {
      target = fixedOnly.find((room) => room.id === lastRoomId);
    }

    if (!target && fixedOnly.length > 0) {
      target = fixedOnly[0];
    }

    if (target) {
      setSelectedRoomId(target.id);
      localStorage.setItem(LAST_FIXED_ROOM_KEY, target.id);
    }
  }, []);

  useEffect(() => {
    clearTimer();

    if (!selectedRoom) {
      setSummary(null);
      setNextRefreshAt(null);
      setCurrentIntervalMinutes(null);
      return;
    }

    void fetchSummary(selectedRoom);

    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  async function fetchSummary(room: MonitorRoom) {
    const completedFromRows = getCompletedFlightSetFromRows(room.rows);
    const completedFromSummary = new Set(completedFlightsByRoom[room.id] || []);

    const currentKnownItems = (() => {
      const requested = normalizeFlightsInput(room.flightsInput);
      const latestRowMap = getLatestRowsByFlight(room.rows);
      const knownItemsMap = new Map(
        (lastKnownItemsByRoom[room.id] || []).map((item) => [item.flight, item])
      );

      return requested.map((flight) => {
        const known = knownItemsMap.get(flight);
        if (known) return known;

        const latestRow = latestRowMap.get(flight)?.row;
        if (latestRow) return formatDisplayItemFromRow(flight, latestRow);

        return formatFallbackDisplayItem(flight);
      });
    })();

    const activeItems = currentKnownItems.filter((item) => {
      if (completedFromRows.has(item.flight)) return false;
      if (completedFromSummary.has(item.flight)) return false;
      if (isFinalCompletedStatus(item.status)) return false;
      return true;
    });

    const activeFlights = activeItems.map((item) => item.flight);

    if (activeFlights.length === 0) {
      setError("");
      setSummary({
        success: true,
        roomId: room.id,
        roomName: room.name,
        updatedAt: new Date().toISOString(),
        refreshIntervalMinutes: 0,
        items: [],
      });
      scheduleNext(room, []);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const url = new URL(
        `${BACKEND_URL}/widget/fixed/${encodeURIComponent(room.id)}`
      );

      url.searchParams.set("flights", activeFlights.join(","));
      url.searchParams.set("start", room.startDateTime);
      url.searchParams.set("end", room.endDateTime);
      url.searchParams.set("roomName", room.name);
      url.searchParams.set("refreshIntervalMinutes", String(DEFAULT_REFRESH_MINUTES));
      url.searchParams.set("limit", String(activeFlights.length));

      const res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json()) as WidgetSummaryResponse & {
        message?: string;
        detail?: string;
      };

      if (!res.ok || json.success === false) {
        throw new Error(json.message || json.detail || "요약 조회에 실패했습니다.");
      }

      const newlyCompleted = json.items
        .filter((item) => isFinalCompletedStatus(item.status))
        .map((item) => item.flight);

      const nextCompletedSet = new Set<string>([
        ...(completedFlightsByRoom[room.id] || []),
        ...newlyCompleted,
      ]);

      setLastKnownItemsByRoom((prev) => {
        const merged = new Map<string, WidgetSummaryItem>();

        (prev[room.id] || []).forEach((item) => {
          merged.set(item.flight, item);
        });

        json.items.forEach((item) => {
          merged.set(item.flight, item);
        });

        return {
          ...prev,
          [room.id]: Array.from(merged.values()),
        };
      });

      if (newlyCompleted.length > 0) {
        setCompletedFlightsByRoom((prev) => {
          const prevSet = new Set(prev[room.id] || []);
          newlyCompleted.forEach((flight) => prevSet.add(flight));
          return {
            ...prev,
            [room.id]: Array.from(prevSet),
          };
        });
      }

      const mergedItemsMap = new Map<string, WidgetSummaryItem>();

      currentKnownItems.forEach((item) => {
        mergedItemsMap.set(item.flight, item);
      });

      json.items.forEach((item) => {
        mergedItemsMap.set(item.flight, item);
      });

      const nextActiveItems = Array.from(mergedItemsMap.values()).filter((item) => {
        if (completedFromRows.has(item.flight)) return false;
        if (nextCompletedSet.has(item.flight)) return false;
        if (isFinalCompletedStatus(item.status)) return false;
        return true;
      });

      setSummary(json);
      scheduleNext(room, nextActiveItems);
    } catch (e: any) {
      setError(e.message || "요약 조회에 실패했습니다.");
      setSummary(null);
      scheduleNext(room, activeItems);
    } finally {
      setLoading(false);
    }
  }

  function formatNextRefresh(date: Date | null) {
    if (!date) return "-";

    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#07152b",
        color: "white",
        padding: "16px 14px 28px",
        fontFamily:
          "Inter, Apple SD Gothic Neo, SF Pro Display, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <section style={sectionStyle}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              marginBottom: 6,
              letterSpacing: -0.3,
            }}
          >
            FIXED Lite
          </div>

          <div style={{ color: "#b8c7db", fontSize: 13, lineHeight: 1.5 }}>
            기본 30분 자동조회입니다.
            <br />
            출발 집중구간은 10분 전~30분 후, 도착 집중구간은 60분 전~30분 후이며 이때 5분 간격으로 조회합니다.
          </div>
        </section>

        <section style={sectionStyle}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
            FIXED ROOM 선택
          </div>

          {fixedRooms.length === 0 ? (
            <div style={{ color: "#b8c7db", fontSize: 14 }}>
              저장된 FIXED ROOM이 없습니다.
              <br />
              먼저 편명 조회 화면에서 FIXED ROOM을 저장해 주세요.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 10,
              }}
            >
              {fixedRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    localStorage.setItem(LAST_FIXED_ROOM_KEY, room.id);
                  }}
                  style={roomButtonStyle(room.id === selectedRoomId)}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      marginBottom: 4,
                    }}
                  >
                    {room.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#b8c7db",
                      wordBreak: "break-all",
                    }}
                  >
                    {room.flightsInput}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedRoom && (
          <>
            <section style={sectionStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {selectedRoom.name}
                  </div>
                  <div style={{ color: "#b8c7db", fontSize: 12, marginTop: 4 }}>
                    마지막 저장 조회: {selectedRoom.lastFetchedAt || "-"}
                  </div>
                  <div style={{ color: "#92a7c5", fontSize: 12, marginTop: 6 }}>
                    표시 대상: {displayItemsForSelectedRoom.length}개
                  </div>
                  <div style={{ color: "#92a7c5", fontSize: 12, marginTop: 2 }}>
                    자동조회 대상: {activeItemsForSelectedRoom.length}개
                  </div>
                  <div style={{ color: "#92a7c5", fontSize: 12, marginTop: 2 }}>
                    현재 자동조회 주기:{" "}
                    {currentIntervalMinutes ? `${currentIntervalMinutes}분` : "-"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => void fetchSummary(selectedRoom)}
                    disabled={loading}
                    style={actionBtnStyle}
                  >
                    {loading ? "조회중..." : "다시 조회"}
                  </button>

                  <button
                    onClick={() => {
                      window.location.href = backToFlightsHref;
                    }}
                    style={backBtnStyle}
                  >
                    FIXED ROOM으로 돌아가기
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div style={infoCardStyle}>
                  <div style={infoLabelStyle}>위젯 대체 갱신 시각</div>
                  <div style={infoValueStyle}>
                    {summary?.updatedAt
                      ? formatMonthDayTime(summary.updatedAt)
                      : "-"}
                  </div>
                </div>

                <div style={infoCardStyle}>
                  <div style={infoLabelStyle}>다음 자동 새로고침</div>
                  <div style={infoValueStyle}>{formatNextRefresh(nextRefreshAt)}</div>
                </div>
              </div>
            </section>

            <section style={sectionStyle}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                핵심 요약
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: 12,
                    color: "#fca5a5",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              {!error && !summary && loading && (
                <div style={{ color: "#b8c7db", fontSize: 14 }}>조회중...</div>
              )}

              {!error && displayItemsForSelectedRoom.length === 0 && (
                <div style={{ color: "#b8c7db", fontSize: 14 }}>
                  표시할 편명이 없습니다.
                </div>
              )}

              {displayItemsForSelectedRoom.map((item) => {
                const completed = isFinalCompletedStatus(item.status);
                const focused = !completed && isItemInFocusWindow(item);

                return (
                  <div
                    key={`${item.flight}-${item.departureCode}-${item.arrivalCode}-${item.displayTime}-${item.gate}`}
                    style={{
                      background: "#091326",
                      border: focused ? "1px solid #fbbf24" : "1px solid #1f2c43",
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 10,
                      opacity: completed ? 0.88 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          letterSpacing: -0.2,
                        }}
                      >
                        {item.flight}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        {focused && (
                          <span style={focusBadgeStyle}>집중조회</span>
                        )}

                        {completed && (
                          <span style={completedBadgeStyle}>자동조회 제외</span>
                        )}

                        <div
                          style={{
                            color: statusColor(item.status),
                            background: `${statusColor(item.status)}22`,
                            border: `1px solid ${statusColor(item.status)}55`,
                            borderRadius: 999,
                            padding: "5px 10px",
                            fontSize: 12,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.status}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          letterSpacing: 0.2,
                        }}
                      >
                        {item.departureCode} → {item.arrivalCode}
                      </div>

                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {item.displayTime}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div style={{ color: "#92a7c5", fontSize: 12 }}>
                        주기장 / 게이트
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "white",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {item.gate || "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const sectionStyle: CSSProperties = {
  background: "#0a1528",
  border: "1px solid #22314e",
  borderRadius: 16,
  padding: 16,
};

const actionBtnStyle: CSSProperties = {
  border: "none",
  background: "#2563eb",
  color: "white",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
  minWidth: 96,
};

const backBtnStyle: CSSProperties = {
  border: "none",
  background: "#0f766e",
  color: "white",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
  minWidth: 150,
};

const infoCardStyle: CSSProperties = {
  background: "#091326",
  border: "1px solid #1f2c43",
  borderRadius: 12,
  padding: 12,
};

const infoLabelStyle: CSSProperties = {
  color: "#92a7c5",
  fontSize: 11,
  marginBottom: 4,
};

const infoValueStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: 15,
};

const focusBadgeStyle: CSSProperties = {
  color: "#fbbf24",
  background: "#fbbf2422",
  border: "1px solid #fbbf2455",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const completedBadgeStyle: CSSProperties = {
  color: "#93c5fd",
  background: "#93c5fd22",
  border: "1px solid #93c5fd55",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};
