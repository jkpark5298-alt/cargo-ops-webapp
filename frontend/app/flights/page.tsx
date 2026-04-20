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

function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getTomorrowString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTomorrowString());

  const dateInfo = useMemo(
    () => `${startDate} ~ ${endDate}`,
    [startDate, endDate]
  );

  const fetchFlights = async (flightArg?: string) => {
    const finalInput = (flightArg ?? input).trim();

    if (!finalInput) {
      setError("편명을 입력하세요.");
      return;
    }

    setLoading(true);
    setError("");
    setRows([]);

    try {
      const url =
        `${BACKEND_URL}/flights/lookup` +
        `?flight_no=${encodeURIComponent(finalInput)}` +
        `&start_date=${encodeURIComponent(startDate)}` +
        `&end_date=${encodeURIComponent(endDate)}`;

      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`서버 오류 (${res.status}) : ${text}`);
      }

      const json = await res.json();
      setRows(json.data || []);
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
          placeholder="예: KJ241,KJ987"
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
        <button
          onClick={() => fetchFlights()}
          style={{
            padding: "12px 22px",
            background: "#4f8cff",
            border: "none",
            borderRadius: 6,
            color: "white",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          조회
        </button>
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
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
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
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            padding: 10,
            background: "#111",
            border: "1px solid #444",
            borderRadius: 6,
            color: "white",
          }}
        />
      </div>

      <div style={{ marginTop: 10, color: "#9fb3c8", fontSize: 14 }}>
        기본 조회 범위: D, D+1 / 현재 조회 범위: {dateInfo}
      </div>

      {loading && <p style={{ marginTop: 20 }}>조회중...</p>}
      {error && <p style={{ marginTop: 20, color: "red" }}>{error}</p>}

      {rows.length > 0 && (
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
      )}

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
