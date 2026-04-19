"use client"

import { useState } from "react"

const BACKEND_URL = "https://cargo-ops-backend.onrender.com"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [targets, setTargets] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<any>(null)

  // ⏱ timeout fetch
  const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeout = 20000
  ) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      return res
    } finally {
      clearTimeout(id)
    }
  }

  const handleUpload = async () => {
    setError("")
    setResult(null)

    if (!file) {
      setError("파일을 선택하세요.")
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("targets", targets)

      const res = await fetchWithTimeout(
        `${BACKEND_URL}/ocr/extract`,
        {
          method: "POST",
          body: formData,
        },
        25000
      )

      // ❌ HTTP 에러 처리
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`서버 오류 (${res.status}) : ${text}`)
      }

      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      console.error(err)

      if (err.name === "AbortError") {
        setError("⏱ 요청 시간 초과 (서버 지연)")
      } else {
        setError(err.message || "❌ OCR 요청 실패")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>OCR 업로드</h2>

      {/* 파일 선택 */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div style={{ marginTop: 10 }}>
        <textarea
          placeholder="예: B박종규,B"
          value={targets}
          onChange={(e) => setTargets(e.target.value)}
          style={{ width: "100%", height: 80 }}
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={loading}
        style={{ marginTop: 10 }}
      >
        {loading ? "처리중..." : "OCR 실행"}
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
  )
}
