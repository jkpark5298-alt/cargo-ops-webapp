"use client";

import { useEffect, useState } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cargo-ops-backend.onrender.com";

export default function FlightsPage() {
  const [flightInput, setFlightInput] = useState("");
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔥 SSR 문제 방지 (window에서만 실행)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const flightParam = params.get("flight");

    if (flightParam) {
      setFlightInput(flightParam);
      fetchFlights(flightParam);
    }
  }, []);

  const fetchFlights = async (flightStr: string) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${BACKEND_URL}/flights/lookup?flight_no=${flightStr}`
      );

      if (!res.ok) {
        throw new Error("조회 실패");
      }

      const data = await res.json();
      setFlights(data.data || []);
    } catch (e) {
      console.error(e);
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!flightInput) return;
    fetchFlights(flightInput);
  };

  return (
    <div
      style={{
        padding: 40,
        background: "#07152b",
        minHeight: "100vh",
        color: "white",
      }}
    >
      <h2>✈️ 편명 조회</h2>

      {/* 입력창 */}
      <div style={{ marginTop: 20 }}>
        <input
          value={flightInput}
          onChange={(e) => setFlightInput(e.target.value)}
          placeholder="KJ282,KJ913"
          style={{
            width: 400,
            padding: 10,
            marginRight: 10,
            borderRadius: 6,
          }}
        />
        <button onClick={handleSearch}>조회</button>
      </div>

      {/* 결과 */}
      <div style={{ marginTop: 30 }}>
        {loading && <p>조회 중...</p>}

        {!loading && flights.length === 0 && <p>데이터 없음</p>}

        {!loading &&
          flights.map((f, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                borderBottom: "1px solid #333",
              }}
            >
              <b>{f.flightId}</b> / {f.std} / {f.etd}
            </div>
          ))}
      </div>
    </div>
  );
}
