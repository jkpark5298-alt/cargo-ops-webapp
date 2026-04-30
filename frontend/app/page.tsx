"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div style={{ padding: 20 }}>

      {/* 기존 기능 */}
      <button
        onClick={() => router.push("/flights")}
        style={{
          padding: "14px 16px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontWeight: 800,
          cursor: "pointer",
          width: "100%",
          marginBottom: 10
        }}
      >
        편명 조회
      </button>

      {/* FIXED Lite 바로가기 */}
      <button
        onClick={() => {
          const rooms = JSON.parse(localStorage.getItem("cargo_ops_monitor_rooms_v6") || "[]");
          const lastRoomId = localStorage.getItem("last_fixed_room_id");

          let target = null;

          // 1순위: 마지막 ROOM
          if (lastRoomId) {
            target = rooms.find((r: any) => r.id === lastRoomId && r.fixed);
          }

          // 2순위: 첫 FIXED ROOM
          if (!target) {
            target = rooms.find((r: any) => r.fixed);
          }

          if (target) {
            router.push(`/fixed-lite?roomId=${target.id}`);
          } else {
            alert("FIXED ROOM이 없습니다.");
          }
        }}
        style={{
          padding: "14px 16px",
          background: "#0f766e",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontWeight: 800,
          cursor: "pointer",
          width: "100%"
        }}
      >
        FIXED Lite 바로가기
      </button>

    </div>
  );
}
