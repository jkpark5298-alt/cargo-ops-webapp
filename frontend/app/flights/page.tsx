"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cargo-ops-backend.onrender.com";

type FlightRow = {
  flightId?: string;
  departureCode?: string;
  arrivalCode?: string;
  formattedScheduleTime?: string;
  formattedEstimatedTime?: string;
  gatenumber?: string;
  status?: string;
  delay?: boolean;
  canceled?: boolean;
  gateChanged?: boolean;
};

type MonitorRoom = {
  id: string;
  name: string;
  flightsInput: string;
  startDateTime: string;
  endDateTime: string;
  rows: FlightRow[];
  lastFetchedAt: string;
};

const STORAGE_KEY = "monitor_rooms";

function loadRooms(): MonitorRoom[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveRooms(rooms: MonitorRoom[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

export default function Page() {
  const [rooms, setRooms] = useState<MonitorRoom[]>([]);
  const [selected, setSelected] = useState<MonitorRoom | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRooms(loadRooms());
  }, []);

  // 🔥 다시 조회 (실시간 갱신)
  const refreshRoom = async (room: MonitorRoom) => {
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/flights/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flights: room.flightsInput.split(","),
          start: room.startDateTime,
          end: room.endDateTime,
        }),
      });

      const json = await res.json();

      const updated = {
        ...room,
        rows: json.data || [],
        lastFetchedAt: new Date().toLocaleString(),
      };

      const next = rooms.map((r) => (r.id === room.id ? updated : r));

      setRooms(next);
      setSelected(updated);
      saveRooms(next);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh", color: "white" }}>
      {/* 🔵 LEFT - MONITOR LIST */}
      <div style={{ width: 300, background: "#111", padding: 20 }}>
        <h3>Monitor</h3>

        {rooms.map((room) => (
          <div
            key={room.id}
            onClick={() => setSelected(room)}
            style={{
              padding: 10,
              border: "1px solid #333",
              marginBottom: 10,
              cursor: "pointer",
            }}
          >
            <div>{room.name}</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>
              {room.flightsInput}
            </div>
          </div>
        ))}
      </div>

      {/* 🔴 RIGHT - DETAIL VIEW */}
      <div style={{ flex: 1, padding: 20 }}>
        {!selected && <div>방을 선택하세요</div>}

        {selected && (
          <>
            <h2>{selected.name}</h2>

            <div style={{ marginBottom: 10 }}>
              편명: {selected.flightsInput}
            </div>

            <div style={{ marginBottom: 10 }}>
              기간: {selected.startDateTime} ~ {selected.endDateTime}
            </div>

            <div style={{ marginBottom: 10 }}>
              마지막 조회: {selected.lastFetchedAt}
            </div>

            <button onClick={() => refreshRoom(selected)}>
              🔄 다시 조회
            </button>

            {loading && <p>조회중...</p>}

            <table style={{ width: "100%", marginTop: 20 }}>
              <thead>
                <tr>
                  <th>편명</th>
                  <th>출발</th>
                  <th>도착</th>
                  <th>시간</th>
                  <th>게이트</th>
                </tr>
              </thead>
              <tbody>
                {selected.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.flightId}</td>
                    <td>{r.departureCode}</td>
                    <td>{r.arrivalCode}</td>
                    <td>{r.formattedEstimatedTime}</td>
                    <td>{r.gatenumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
