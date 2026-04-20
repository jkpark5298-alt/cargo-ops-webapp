"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cargo-ops-backend.onrender.com";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    setError("");

    if (!file) {
      setError("파일을 선택하세요.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/ocr/extract`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`서버 오류 (${res.status}) : ${text}`);
      }

      const data = await res.json();

      if (data.flights?.length) {
        router.push(`/flights?flight=${encodeURIComponent(data.flights.join(","))}`);
      } else {
        setError("OCR에서 편명을 찾지 못했습니다.");
      }
    } catch (e: any) {
      setError(e.message || "OCR 요청 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 30,
        color: "white",
        background: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>📄 OCR 업로드</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 700 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{
            padding: 10,
            background: "#111827",
            border: "1px solid #374151",
            color: "white",
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "white",
              border: "none",
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "OCR 처리중..." : "OCR 실행"}
          </button>

          <button
            onClick={() => router.push("/flights")}
            style={{
              padding: "10px 20px",
              background: "#16a34a",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            ✈️ 편명 조회 이동
          </button>
        </div>

        {error && (
          <div style={{ color: "#ef4444", marginTop: 8, fontWeight: 600 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
