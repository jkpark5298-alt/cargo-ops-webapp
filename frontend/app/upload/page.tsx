"use client"

import { useState } from "react"

const BACKEND_URL = "https://cargo-ops-backend.onrender.com"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [targets, setTargets] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  // ⏱ timeout 적용 fetch
  const fetchWithTimeout = async (url: string, options: any, timeout = 15000) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      return response
    } finally {
      clearTimeout(id)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("파일을 선택하세요.")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      // 📦 FormData 구성
      const formData = new FormData()
      formData.append("file", file)
      formData.append("targets", targets) // "B박종규,B" 등

      const response = await fetchWithTimeout(
        `${BACKEND_URL}/ocr/extract`,
        {
          method: "POST",
          body: formData,
        },
        20000 // 20초 timeout (OCR 고려)
      )

      // ❌ HTTP 에러 처리
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`서버 오류 (${response.status}) : ${text}`)
      }

      // 📥 JSON 파싱
      const data = await response.json()

      setResult(data)
    } catch (err: any) {
      console.error(err)

      if (err.name === "AbortError") {
        setError("요청 시간 초과 (서버 응답 지연)")
      } else {
        setError(err.message || "알 수 없는 오류")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>OCR 업로드</h2>

      {/* 파일 업로드 */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      {/* 타겟 입력 */}
      <textarea
        placeholder="예: B박종규,B"
        value={targets}
        onChange={(e) => setTargets(e.target.value)}
        style={{ width: "100%", height: 80, marginTop: 10 }}
      />

      {/* 버튼 */}
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "처리중..." : "OCR 실행"}
      </button>

      {/* 에러 */}
      {error && (
        <div style={{ color: "red", marginTop: 10 }}>
          ❌ {error}
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
