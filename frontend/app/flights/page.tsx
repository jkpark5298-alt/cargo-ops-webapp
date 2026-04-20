"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const BACKEND_URL = "https://cargo-ops-backend.onrender.com";

type FlightRow = {
  status?: string;
  flightId?: string;
  departureCode?: string;
  departureName?: string;
  arrivalCode?: string;
  arrivalName?: string;
  formattedScheduleTime?: string;
  formattedEstimatedTime?: string;
  gatenumber?: string;
  terminalid?: string;
  masterflightid?: string;
  codeshare?: string;
  delay?: boolean;
  canceled?: boolean;
  gateChanged?: boolean;
};

function getTodayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getTomorrowString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function isArrived(row: FlightRow) {
  if (!row.formattedEstimatedTime) return false;

  const now = new Date();
  const eta = new Date(row.formattedEstimatedTime.replace(" ", "T"));

  return eta < now;
}

function getStatusText(row: FlightRow) {
  if (row.canceled) return "결항";
  if (row.gateChanged) return "게이트 변경";

  if (row.delay) {
    return isArrived(row) ? "도착(지연)" : "출발(지연)";
  }

  if (isArrived(row)) return "도착";

  return "출발";
}

function getStatusColor(row: FlightRow) {
  if (row.canceled) return "#111111";
  if (row.gateChanged) return "#a855f7";
  if (row.delay) return "#f59e0b";

  if (isArrived(row)) return "#3b82f6"; // 파란색 (도착)

  return "#ef4444"; // 빨간색 (출발)
}

export default function FlightLookupPage() {
  const searchParams = useSearchParams();

  const [input, setInput] = useState("");
  const [rows, setRows] = useState<FlightRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTomorrowString());

  const dateInfo = useMemo(() => `${startDate} ~ ${endDate}`, [startDate, endDate]);

  const fetchFlights = async (flightNoArg?: string) => {
    const finalInput = (flightNoArg ?? input).trim();

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
    const q = searchParams.get("flight_no");
    if (q) {
      setInput(q.toUpperCase());
      fetchFlights(q.toUpperCase());
    }
  }, [searchParams]);

  return (
    <div style={{ padding: 40, color: "white" }}>
      <h2>✈️ 편명 조회</h2>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="예: KJ282,KJ913"
          style={{
            flex: 1,
            padding: 10,
            background: "#111",
            border: "1px solid #444",
            borderRadius: 6,
            color: "white",
          }}
        />
        <button
          onClick={() => fetchFlights()}
          style={{
            padding: "10px 20px",
            background: "#4f8cff",
            border: "none",
            borderRadius: 6,
            color: "white",
            cursor: "pointer",
          }}
        >
          조회
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div style={{ marginTop: 10, color: "#9fb3c8" }}>
        기본 조회 범위: D, D+1 / 현재: {dateInfo}
      </div>

      {loading && <p>조회중...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {rows.length > 0 && (
        <table style={{ width: "100%", marginTop: 20 }}>
          <thead>
            <tr>
              <th>현황</th>
              <th>편명</th>
              <th>출발</th>
              <th>도착</th>
              <th>예정</th>
              <th>변경</th>
              <th>게이트</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ color: getStatusColor(r), fontWeight: 700 }}>
                  {getStatusText(r)}
                </td>
                <td>{r.flightId}</td>
                <td>{r.departureCode}</td>
                <td>{r.arrivalCode}</td>
                <td>{r.formattedScheduleTime}</td>
                <td>{r.formattedEstimatedTime}</td>
                <td>{r.gatenumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
