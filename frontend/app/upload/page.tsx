"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND_URL = "https://cargo-ops-backend.onrender.com";

export default function UploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [targets, setTargets] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  // ⏱ timeout fetch
  const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeout = 20000
  ) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(id);
    }
  };

  const handleUpload = async () => {
    setError("");
    setResult(null);

    if (!file) {
      setError("파일을 선택하세요.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targets", targets);

      const res = await fetchWithTimeout(
        `${BACKEND_URL}/ocr/extract`,
        {
          method: "POST",
          body: formData,
        },
        25000
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`서버 오류 (${res.status}) : ${text}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);

      if (err.name === "AbortError") {
        setError("⏱ 요청 시간 초과 (서버 지연)");
      } else {
        setError(err.message || "❌ OCR 요청 실패");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, color: "white" }}>
      <h2>📄 OCR 업로드</h2>

      {/* 파일 선택 */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      {/* 대상 입력 */}
      <div style={{ marginTop: 10 }}>
        <textarea
          placeholder="예: 박종규,B박종규,B"
          value={targets}
          onChange={(e) => setTargets(e.target.value)}
          style={{
            width: "100%",
            height: 80,
            background: "#111",
            color: "white",
            border: "1px solid #444",
            borderRadius: 6,
            padding: 10,
          }}
        />
      </div>

      {/* OCR 실행 */}
      <button
        onClick={handleUpload}
        disabled={loading}
        style={{
          marginTop: 10,
          padding: "10px 20px",
          background: "#4f8cff",
          border: "none",
          borderRadius: 6,
          color: "white",
          cursor: "pointer",
        }}
      >
        {loading ? "처리중..." : "OCR 실행"}
      </button>

      {/* 🔥 추가된 버튼 (핵심) */}
      <button
        onClick={() => router.push("/flights")}
        style={{
          marginTop: 20,
          marginLeft: 10,
          padding: "10px 20px",
          background: "#00c853",
          border: "none",
          borderRadius: 6,
          color: "white",
          cursor: "pointer",
        }}
      >
        ✈️ 편명 조회 이동
      </button>

      {/* 에러 */}
      {error && (
        <div style={{ color: "red", marginTop: 10 }}>
          {error}
        </div>
      )}

      {/* 결과 */}
      {result && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
