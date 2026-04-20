"use client";

import { useState } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cargo-ops-backend.onrender.com";

export default function FlightsPage() {
  const [flightInput, setFlightInput] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // FIXED 상태
  const [fixed, setFixed] = useState(false);

  const handleSearch = async () => {
    if (!flightInput) return;

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/flights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flights: flightInput.split(",").map((f) => f.trim()),
          start: startDate,
          end: endDate,
        }),
      });

      const result = await res.json();
      setData(result.data || []);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>✈️ 편명 조회</h2>

      {/* 편명 입력 */}
      <input
        style={{ width: "60%" }}
        placeholder="KJ241,KJ987"
        value={flightInput}
        onChange={(e) => setFlightInput(e.target.value)}
      />

      {/* 날짜 + 시간 */}
      <div style={{ marginTop: 10 }}>
        시작일
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        종료일
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* 버튼 */}
      <div style={{ marginTop: 10 }}>
        <button onClick={handleSearch} disabled={loading}>
          조회
        </button>

        {/* FIXED 토글 */}
        <button
          style={{ marginLeft: 10 }}
          onClick={() => setFixed(!fixed)}
        >
          {fixed ? "FIXED 해제" : "FIXED"}
        </button>
      </div>

      {/* 상태 표시 */}
      {loading && <p>로딩중...</p>}

      {/* 결과 테이블 */}
      <table style={{ marginTop: 20, width: "100%" }}>
        <thead>
          <tr>
            <th>편명</th>
            <th>출발</th>
            <th>도착</th>
            <th>시간</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.flight}</td>
              <td>{row.dep}</td>
              <td>{row.arr}</td>
              <td>{row.time}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* FIXED 설명 */}
      {fixed && (
        <p style={{ color: "yellow", marginTop: 10 }}>
          FIXED 상태: 자동 갱신 안됨. 조회 버튼 눌러야 업데이트됨
        </p>
      )}
    </div>
  );
}
