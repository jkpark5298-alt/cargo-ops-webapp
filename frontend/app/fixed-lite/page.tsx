"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cargo-ops-backend.onrender.com";

const STORAGE_KEY = "cargo_ops_monitor_rooms_v6";
const REFRESH_INTERVAL_MINUTES = 10;
const FIXED_LITE_MAX_ITEMS = 7;

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
      if (/^\d{3,4}$/.test(value)) {
        return `KJ${value}`;
      }
      return value;
    });
}

function statusColor(status: string) {
  switch (status) {
    case "출발":
      return "#ef4444";
    case "도착":
      return "#3b82f6";
    case "결항":
      return "#94a3b8";
    case "게이트 변경":
      return "#a855f7";
    case "지연":
      return "#f59e0b";
    default:
      return "#e5e7eb";
  }
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

function formatMonthDayTime(value: string) {
  if (!value) return "-";

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(direct);
  }

  const normalized = value.replace("T", " ");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    const parsed = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss || "0")
    );

    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(parsed);
    }
  }

  return value;
}

export default function FixedLitePage() {
  const [roomIdFromQuery, setRoomIdFromQuery] = useState("");
  const [rooms, setRooms] = useState<MonitorRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [summary, setSummary] = useState<WidgetSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  const fixedRooms = useMemo(() => rooms.filter((room) => room.fixed), [rooms]);

  const selectedRoom = useMemo(
    () => fixedRooms.find((room) => room.id === selectedRoomId) || null,
    [fixedRooms, selectedRoomId]
  );

  const backToFlightsHref = selectedRoomId
    ? `/flights?roomId=${encodeURIComponent(selectedRoomId)}`
    : "/flights";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setRoomIdFromQuery(params.get("roomId") || "");
  }, []);

  useEffect(() => {
    const savedRooms = loadRooms();
    setRooms(savedRooms);

    const fixedOnly = savedRooms.filter((room) => room.fixed);

    if (fixedOnly.length === 0) {
      setSelectedRoomId("");
      return;
    }

    if (roomIdFromQuery) {
      const found = fixedOnly.find((room) => room.id === roomIdFromQuery);
      if (found) {
        setSelectedRoomId(found.id);
        return;
      }
    }

    setSelectedRoomId(fixedOnly[0].id);
  }, [roomIdFromQuery]);

  useEffect(() => {
    if (!selectedRoom) {
      setSummary(null);
      setNextRefreshAt(null);
      return;
    }

    void fetchSummary(selectedRoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoom) return;

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = window.setInterval(() => {
      void fetchSummary(selectedRoom);
    }, REFRESH_INTERVAL_MINUTES * 60 * 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  async function fetchSummary(room: MonitorRoom) {
    const normalizedFlights = normalizeFlightsInput(room.flightsInput);

    if (normalizedFlights.length === 0) {
      setError("선택된 FIXED ROOM에 편명이 없습니다.");
      setSummary(null);
      setNextRefreshAt(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const url = new URL(
        `${BACKEND_URL}/widget/fixed/${encodeURIComponent(room.id)}`
      );

      url.searchParams.set("flights", normalizedFlights.join(","));
      url.searchParams.set("start", room.startDateTime);
      url.searchParams.set("end", room.endDateTime);
      url.searchParams.set("roomName", room.name);
      url.searchParams.set(
        "refreshIntervalMinutes",
        String(REFRESH_INTERVAL_MINUTES)
      );
      url.searchParams.set("limit", String(FIXED_LITE_MAX_ITEMS));

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

      setSummary(json);
      setNextRefreshAt(
        new Date(Date.now() + REFRESH_INTERVAL_MINUTES * 60 * 1000)
      );
    } catch (e: any) {
      setError(e.message || "요약 조회에 실패했습니다.");
      setSummary(null);
      setNextRefreshAt(
        new Date(Date.now() + REFRESH_INTERVAL_MINUTES * 60 * 1000)
      );
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
        <section
          style={{
            background: "#0a1528",
            border: "1px solid #22314e",
            borderRadius: 16,
            padding: 16,
          }}
        >
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
            아이폰 홈 화면에 추가해서 빠르게 여는 전용 화면입니다.
            <br />
            편명 / 현황 / 출발코드 / 도착코드 / 예정일시 / 주기장만 간단히 표시하며,
            최대 7개까지 표시합니다.
          </div>
        </section>

        <section
          style={{
            background: "#0a1528",
            border: "1px solid #22314e",
            borderRadius: 16,
            padding: 16,
          }}
        >
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
                  onClick={() => setSelectedRoomId(room.id)}
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
            <section
              style={{
                background: "#0a1528",
                border: "1px solid #22314e",
                borderRadius: 16,
                padding: 16,
              }}
            >
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
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => void fetchSummary(selectedRoom)}
                    disabled={loading}
                    style={{
                      border: "none",
                      background: "#2563eb",
                      color: "white",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontWeight: 800,
                      cursor: "pointer",
                      minWidth: 96,
                    }}
                  >
                    {loading ? "조회중..." : "다시 조회"}
                  </button>

                  <a
                    href={backToFlightsHref}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#0f766e",
                      color: "white",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontWeight: 800,
                      textDecoration: "none",
                      minWidth: 150,
                    }}
                  >
                    FIXED ROOM으로 돌아가기
                  </a>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    background: "#091326",
                    border: "1px solid #1f2c43",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ color: "#92a7c5", fontSize: 11, marginBottom: 4 }}>
                    위젯 대체 갱신 시각
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>
                    {summary?.updatedAt ? formatMonthDayTime(summary.updatedAt) : "-"}
                  </div>
                </div>

                <div
                  style={{
                    background: "#091326",
                    border: "1px solid #1f2c43",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ color: "#92a7c5", fontSize: 11, marginBottom: 4 }}>
                    다음 자동 새로고침
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>
                    {formatNextRefresh(nextRefreshAt)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  color: "#92a7c5",
                  fontSize: 12,
                  marginTop: 12,
                  lineHeight: 1.5,
                }}
              >
                이 화면이 열려 있는 동안 {REFRESH_INTERVAL_MINUTES}분마다 자동
                새로고침됩니다.
              </div>
            </section>

            <section
              style={{
                background: "#0a1528",
                border: "1px solid #22314e",
                borderRadius: 16,
                padding: 16,
              }}
            >
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

              {!error && summary && summary.items.length === 0 && (
                <div style={{ color: "#b8c7db", fontSize: 14 }}>
                  표시할 요약 편명이 없습니다.
                </div>
              )}

              {summary?.items.map((item) => (
                <div
                  key={`${item.flight}-${item.departureCode}-${item.arrivalCode}-${item.displayTime}-${item.gate}`}
                  style={{
                    background: "#091326",
                    border: "1px solid #1f2c43",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
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
              ))}
            </section>

            <section
              style={{
                background: "#0a1528",
                border: "1px solid #22314e",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
                사용 방법
              </div>

              <div
                style={{
                  color: "#b8c7db",
                  fontSize: 13,
                  lineHeight: 1.65,
                }}
              >
                1. 아이폰 Safari에서 이 화면을 엽니다.
                <br />
                2. 공유 버튼을 누릅니다.
                <br />
                3. <b style={{ color: "white" }}>홈 화면에 추가</b>를 선택합니다.
                <br />
                4. 홈 화면에서 바로 실행하면 위젯처럼 빠르게 확인할 수 있습니다.
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
