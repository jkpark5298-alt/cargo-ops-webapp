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

    try {
      setLoading(true);

      const res = await fetch(`${BACKEND_URL}/ocr/extract`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OCR 실패 (${res.status}) : ${text}`);
      }

      const data = await res.json();

      if (data.flights && data.flights.length > 0) {
        const flights = data.flights.join(",");
        router.push(`/flights?flight=${encodeURIComponent(flights)}`);
      } else {
        setError("편명을 찾지 못했습니다.");
      }
    } catch (e: any) {
      setError(e.message || "업로드 실패");
    } finally {
      setLoading(false);
    }
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
      <h2 style={{ fontSize: 28, marginBottom: 24 }}>📷 OCR 업로드</h2>

      <div style={{ marginTop: 20 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
            }
          }}
          style={{ marginBottom: 20 }}
        />

        <div>
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              padding: "12px 20px",
              background: "#4f8cff",
              border: "none",
              borderRadius: 6,
              color: "white",
              cursor: "pointer",
              fontSize: 16,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "처리중..." : "업로드 & 조회"}
          </button>
        </div>

        {error && <p style={{ color: "red", marginTop: 20 }}>{error}</p>}
      </div>
    </div>
  );
}
