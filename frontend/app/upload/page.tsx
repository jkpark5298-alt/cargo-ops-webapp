"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cargo-ops-backend.onrender.com";

function normalizeFlights(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toUpperCase()
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    )
  );
}

export default function UploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [ocrFlights, setOcrFlights] = useState<string[]>([]);
  const [extraFlights, setExtraFlights] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mergedFlights = useMemo(() => {
    const merged = [...ocrFlights, ...normalizeFlights(extraFlights)];
    return Array.from(new Set(merged));
  }, [ocrFlights, extraFlights]);

  const handleOCR = async () => {
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
      const flights = Array.isArray(data.flights) ? data.flights : [];

      setOcrFlights(flights.map((v: string) => v.toUpperCase()));

      if (flights.length === 0) {
        setError("OCR에서 편명을 찾지 못했습니다. 직접 추가 입력하세요.");
      }
    } catch (e: any) {
      setError(e.message || "OCR 요청 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = () => {
    const finalFlights = mergedFlights.join(",");
    if (!finalFlights) {
      setError("조회할 편명이 없습니다.");
      return;
    }

    router.push(`/flights?flight=${encodeURIComponent(finalFlights)}`);
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

      <div style={{ maxWidth: 900 }}>
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

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={handleOCR}
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
            {loading ? "OCR 처리중..." : "OCR 추출"}
          </button>

          <button
            onClick={handleLookup}
            style={{
              padding: "12px 20px",
              background: "#16a34a",
              border: "none",
              borderRadius: 6,
              color: "white",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            편명 조회
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, color: "#cbd5e1" }}>
            OCR 추출 편명
          </div>
          <input
            value={ocrFlights.join(",")}
            readOnly
            placeholder="OCR 추출 결과가 여기에 표시됩니다."
            style={{
              width: "100%",
              padding: 12,
              background: "#111",
              border: "1px solid #444",
              borderRadius: 6,
              color: "white",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, color: "#cbd5e1" }}>
            추가 입력 편명
          </div>
          <input
            value={extraFlights}
            onChange={(e) => setExtraFlights(e.target.value.toUpperCase())}
            placeholder="예: KJ241,KJ987"
            style={{
              width: "100%",
              padding: 12,
              background: "#111",
              border: "1px solid #444",
              borderRadius: 6,
              color: "white",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, color: "#cbd5e1" }}>
            최종 조회 편명
          </div>
          <input
            value={mergedFlights.join(",")}
            readOnly
            placeholder="OCR 편명 + 추가 입력 편명이 합쳐집니다."
            style={{
              width: "100%",
              padding: 12,
              background: "#111",
              border: "1px solid #444",
              borderRadius: 6,
              color: "white",
            }}
          />
        </div>

        {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  );
}
