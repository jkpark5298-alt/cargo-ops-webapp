"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "cargo_ops_monitor_rooms_v6";

type MonitorRoom = {
  id: string;
  name: string;
  flightsInput: string;
  startDateTime: string;
  endDateTime: string;
  fixed: boolean;
  lastFetchedAt: string;
  rows: any[];
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

export default function HomePage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<MonitorRoom[]>([]);

  useEffect(() => {
    setRooms(loadRooms());
  }, []);

  const fixedRooms = useMemo(() => rooms.filter((room) => room.fixed), [rooms]);
  const latestFixedRoom = fixedRooms[0];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07152b",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          "Inter, Apple SD Gothic Neo, SF Pro Display, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#0a1528",
          border: "1px solid #22314e",
          borderRadius: 18,
          padding: 22,
        }}
      >
        <h1 style={{ fontSize: 28, marginBottom: 10 }}>Cargo Ops</h1>

        <p style={{ color: "#b8c7db", lineHeight: 1.6, marginBottom: 22 }}>
          편명 조회, FIXED ROOM, FIXED Lite 화면으로 이동할 수 있습니다.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {latestFixedRoom && (
            <button
              onClick={() =>
                router.push(
                  `/fixed-lite?roomId=${encodeURIComponent(latestFixedRoom.id)}`
                )
              }
              style={{
                width: "100%",
                padding: "14px 16px",
                background: "#0f766e",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontWeight: 900,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              FIXED Lite 바로가기
            </button>
          )}

          <button
            onClick={() => router.push("/flights")}
            style={{
              width: "100%",
              padding: "14px 16px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 900,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            편명 조회 화면
          </button>
        </div>

        {latestFixedRoom && (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background: "#091326",
              border: "1px solid #1f2c43",
              color: "#b8c7db",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            최근 FIXED ROOM: {latestFixedRoom.name}
            <br />
            편명: {latestFixedRoom.flightsInput}
          </div>
        )}
      </div>
    </main>
  );
}
