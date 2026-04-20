"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function FlightsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [input, setInput] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // -------------------------------
  // 날짜 (D / D+1 기본값)
  // -------------------------------
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = (date: Date) =>
    date.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(formatDate(today));
  const [endDate, setEndDate] = useState(formatDate(tomorrow));

  // -------------------------------
  // 최초 진입 (OCR → 자동 조회)
  // -------------------------------
  useEffect(() => {
    const flightParam = searchParams.get("flight");
    if (flightParam) {
      setInput(flightParam);
      fetchFlights(flightParam);
    }
  }, []);

  // -------------------------------
  // 조회 함수
  // -------------------------------
  const fetchFlights = async (flightStr?: string) => {
    const flights = (flightStr || input).trim();
    if (!flights) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/flights/lookup?flight_no=${flights}&start_date=${startDate}&end_date=${endDate}`
      );

      const json = await res.json();

      setData(json?.data || []);
    } catch (err) {
      console.error(err);
      alert("조회 실패");
    }

    setLoading(false);
  };

  // -------------------------------
  // 상태 판단
  // -------------------------------
  const getStatus = (row: any) => {
    const now = new Date();

    const etd = row.etd ? new Date(row.etd) : null;
    const atd = row.atd ? new Date(row.atd) : null;

    if (row.remark?.includes("결항")) return "cancel";
    if (row.remark?.includes("지연")) return "delay";

    if (etd && now > etd) return "arrived";

    if (row.gate && row.prev_gate && row.gate !== row.prev_gate)
      return "gate";

    return "normal";
  };

  // -------------------------------
  // 색상
  // -------------------------------
  const getColor = (status: string) => {
    switch (status) {
      case "arrived":
        return "#3b82f6"; // 파랑
      case "delay":
        return "#f59e0b"; // 주황
      case "cancel":
        return "#ef4444"; // 빨강
      case "gate":
        return "#a855f7"; // 보라
      default:
        return "#e5e7eb"; // 기본
    }
  };

  // -------------------------------
  // 상태 텍스트
  // -------------------------------
  const getStatusText = (status: string) => {
    switch (status) {
      case "arrived":
        return "도착";
      case "delay":
        return "지연";
      case "cancel":
        return "결항";
      case "gate":
        return "게이트 변경";
      default:
        return "-";
    }
  };

  return (
    <div style={{ padding: 30, color: "white", background: "#0f172a", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>✈️ 편명 조회</h1>

      {/* 입력 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="KJ285,KJ282"
          style={{
            flex: 1,
            padding: 10,
            background: "#111827",
            border: "1px solid #374151",
            color: "white",
          }}
        />
        <button onClick={() => fetchFlights()} style={{ padding: "10px 20px", background: "#2563eb" }}>
          조회
        </button>
      </div>

      {/* 날짜 */}
      <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
        <div>
          시작일
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          종료일
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20, fontSize: 12, color: "#9ca3af" }}>
        기본 조회 범위: D, D+1 / 현재: {startDate} ~ {endDate}
      </div>

      {/* 테이블 */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#1f2937" }}>
            <th>상태</th>
            <th>편명</th>
            <th>출발</th>
            <th>도착</th>
            <th>예정</th>
            <th>게이트</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const status = getStatus(row);

            return (
              <tr key={i} style={{ borderBottom: "1px solid #374151" }}>
                <td style={{ color: getColor(status), fontWeight: "bold" }}>
                  {getStatusText(status)}
                </td>
                <td>{row.flight_no}</td>
                <td>{row.dep}</td>
                <td>{row.arr}</td>
                <td>{row.etd}</td>
                <td>{row.gate || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {loading && <p>로딩중...</p>}
    </div>
  );
}
