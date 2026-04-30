"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cargo_ops_monitor_rooms_v6";

function loadRooms() {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function FixedLitePage() {

  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // ✅ 진입 시 자동 ROOM 선택
  useEffect(() => {
    const savedRooms = loadRooms();
    setRooms(savedRooms);

    const fixedOnly = savedRooms.filter((r: any) => r.fixed);

    const params = new URLSearchParams(window.location.search);
    const roomIdFromQuery = params.get("roomId");

    const lastRoomId = localStorage.getItem("last_fixed_room_id");

    let target = null;

    // 1순위: URL
    if (roomIdFromQuery) {
      target = fixedOnly.find((r: any) => r.id === roomIdFromQuery);
    }

    // 2순위: 마지막 ROOM
    if (!target && lastRoomId) {
      target = fixedOnly.find((r: any) => r.id === lastRoomId);
    }

    // 3순위: 첫 ROOM
    if (!target && fixedOnly.length > 0) {
      target = fixedOnly[0];
    }

    if (target) {
      setSelectedRoomId(target.id);
    }

  }, []);

  return (
    <div
      style={{
        padding: 20,
        color: "white",
        background: "#07152b",
        minHeight: "100vh"
      }}
    >

      <h2>FIXED Lite</h2>

      {rooms
        .filter((room) => room.fixed)
        .map((room) => (
          <button
            key={room.id}
            onClick={() => {
              setSelectedRoomId(room.id);

              // ✅ 마지막 ROOM 저장
              localStorage.setItem("last_fixed_room_id", room.id);
            }}
            style={{
              display: "block",
              width: "100%",
              marginTop: 10,
              padding: 12,
              borderRadius: 8,
              border: room.id === selectedRoomId
                ? "2px solid #60a5fa"
                : "1px solid #333",
              background: "#0a1528",
              color: "white",
              textAlign: "left"
            }}
          >
            {room.name}
          </button>
        ))}

      <div style={{ marginTop: 20 }}>
        선택된 ROOM: {selectedRoomId || "없음"}
      </div>

    </div>
  );
}
