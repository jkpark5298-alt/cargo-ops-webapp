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

function getStatusText(row: FlightRow) {
  if (row.canceled) return "결항";
  if (row.gateChanged) return "게이트 변경";

  if (row.delay) {
    if (row.status === "도착") return "도착(지연)";
    if (row.status === "출발") return "출발(지연)";
    return "지연";
  }

  if (row.status === "출발") return "출발";
  if (row.status === "도착") return "도착";

  return "-";
}

function getStatusColor(row: FlightRow) {
  if (row.canceled) return "#111111";
  if (row.gateChanged) return "#a855f7";
  if (row.delay) return "#f59e0b";
  if (row.status === "출발") return "#ef4444";
  if (row.status === "도착") return "#3b82f6";
  return "#f3f4f6";
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

  const currentRangeText = useMemo(() => {
    return `${startDateTime.replace("T", " ")} ~ ${endDateTime.replace("T", " ")}`;
  }, [startDateTime, endDateTime]);

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

      setRows(json.data || []);
      setLastFetchedAt(new Date().toLocaleString("ko-KR"));
    } catch (e: any) {
      setError(e.message || "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  return (
    <div
      style={{
        padding: 40,
        color: "white",
        background: "#07152b",
        minHeight: "100vh",
      }}
    >
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
          style={{
            padding: 10,
            background: "#111",
            border: "1px solid #444",
            borderRadius: 6,
            color: "white",
          }}
        />

        <label style={{ minWidth: 50, marginLeft: 8 }}>종료일</label>
        <input
          type="datetime-local"
          value={endDateTime}
          onChange={(e) => setEndDateTime(e.target.value)}
          style={{
            padding: 10,
            background: "#111",
            border: "1px solid #444",
            borderRadius: 6,
            color: "white",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          onClick={() => fetchFlights()}
          disabled={loading}
          style={{
            padding: "10px 18px",
            background: "#ffffff",
            color: "#111111",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          조회
        </button>

        <button
          onClick={() => setFixed((prev) => !prev)}
          style={{
            padding: "10px 18px",
            background: fixed ? "#16a34a" : "#ffffff",
            color: fixed ? "#ffffff" : "#111111",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          FIXED
        </button>
      </div>

      <div style={{ marginTop: 10, color: "#9fb3c8", fontSize: 14 }}>
        현재 조회 범위: {currentRangeText}
      </div>

      {fixed && (
        <div style={{ marginTop: 6, color: "#facc15", fontSize: 14 }}>
          FIXED 상태: 현재 화면을 유지하며, 다시 조회 버튼을 눌렀을 때만 최신 정보를 가져옵니다.
        </div>
      )}

      {lastFetchedAt && (
        <div style={{ marginTop: 6, color: "#9fb3c8", fontSize: 13 }}>
          마지막 조회 시각: {lastFetchedAt}
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
              <tr key={i} style={{ borderBottom: "1px solid #333" }}>
                <td
                  style={{
                    ...tdStyle,
                    color: getStatusColor(r),
                    fontWeight: 700,
                  }}
                >
                  {getStatusText(r)}
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
