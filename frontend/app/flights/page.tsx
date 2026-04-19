"use client";

import { useState } from "react";

export default function FlightPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFlights = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `https://cargo-ops-backend.onrender.com/flights/lookup?flight_no=${input}`
      );

      if (!res.ok) {
        throw new Error(`서버 오류 ${res.status}`);
      }

      const json = await res.json();
      setRows(json.data || []);
    } catch (e: any) {
      setError(e.message || "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const format = (t: string) => {
    if (!t || t.length !== 12) return "-";
    return `${t.slice(0,4)}/${t.slice(4,6)}/${t.slice(6,8)} ${t.slice(8,10)}:${t.slice(10,12)}`;
  };

  const status = (s: string, e: string) => {
    if (!s || !e) return { text: "", color: "" };
    if (s === e) return { text: "정시", color: "#00e676" };
    return { text: "지연", color: "#ff5252" };
  };

  return (
    <div style={{ padding: 40, color: "white" }}>
      <h2>✈️ 편명 조회</h2>

      {/* 입력 */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: KJ282,KJ285"
          style={{
            flex: 1,
            padding: 10,
            background: "#111",
            border: "1px solid #444",
            borderRadius: 6,
            color: "white"
          }}
        />
        <button
          onClick={fetchFlights}
          style={{
            padding: "10px 20px",
            background: "#4f8cff",
            border: "none",
            borderRadius: 6,
            color: "white"
          }}
        >
          조회
        </button>
      </div>

      {loading && <p style={{ marginTop: 20 }}>조회중...</p>}
      {error && <p style={{ marginTop: 20, color: "red" }}>{error}</p>}

      {/* 테이블 */}
      {rows.length > 0 && (
        <div style={{ marginTop: 30, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#222" }}>
                <th>현황</th>
                <th>편명</th>
                <th>출발지</th>
                <th>도착지</th>
                <th>예정</th>
                <th>변경</th>
                <th>게이트</th>
                <th>터미널</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const st = status(r.scheduleDateTime, r.estimatedDateTime);

                return (
                  <tr key={i} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ color: st.color }}>{st.text}</td>
                    <td>{r.flightId}</td>
                    <td>{r.departureCode}</td>
                    <td>{r.arrivalCode}</td>
                    <td>{format(r.scheduleDateTime)}</td>
                    <td>{format(r.estimatedDateTime)}</td>
                    <td>{r.gatenumber || "-"}</td>
                    <td>{r.terminalid || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
