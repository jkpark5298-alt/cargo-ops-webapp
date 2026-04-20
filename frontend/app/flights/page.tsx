"use client";

import { useMemo, useState } from "react";

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

function getStatusColor(status?: string) {
  if (status === "출발") return "#ef4444";
  if (status === "도착") return "#3b82f6";
  return "#f3f7ff";
}

export default function FlightLookupPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<FlightRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTomorrowString());

  const dateInfo = useMemo(() => `${startDate} ~ ${endDate}`, [startDate, endDate]);

  const fetchFlights = async () => {
    if (!input.trim()) {
      setError("편명을 입력하세요.");
      return;
    }

    setLoading(true);
    setError("");
    setRows([]);

    try {
      const url =
        `${BACKEND_URL}/flights/lookup` +
        `?flight_no=${encodeURIComponent(input)}` +
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
          onClick={fetchFlights}
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

      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
        <label style={{ minWidth: 70 }}>시작일</label>
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

        <label style={{ minWidth: 70, marginLeft: 10 }}>종료일</label>
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#222" }}>
                <th>현황</th>
                <th>편명</th>
                <th>출발지코드</th>
                <th>출발지공항명</th>
                <th>도착지코드</th>
                <th>도착지공항명</th>
                <th>예정일시</th>
                <th>변경일시</th>
                <th>게이트</th>
                <th>터미널</th>
                <th>마스터 편명</th>
                <th>코드쉐어</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ color: getStatusColor(r.status), fontWeight: 700 }}>
                    {r.status || ""}
                  </td>
                  <td>{r.flightId || "-"}</td>
                  <td>{r.departureCode || "-"}</td>
                  <td>{r.departureName || "-"}</td>
                  <td>{r.arrivalCode || "-"}</td>
                  <td>{r.arrivalName || "-"}</td>
                  <td>{r.formattedScheduleTime || "-"}</td>
                  <td>{r.formattedEstimatedTime || "-"}</td>
                  <td>{r.gatenumber || "-"}</td>
                  <td>{r.terminalid || "-"}</td>
                  <td>{r.masterflightid || "-"}</td>
                  <td>{r.codeshare || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
