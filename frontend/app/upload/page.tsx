'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import StatusPill from '@/app/components/StatusPill';
import type { FlightInfo, OcrResponse } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [manualText, setManualText] = useState('');

  const totalFlights = result?.flights.length ?? 0;
  const totalRows = result?.rows.length ?? 0;

  const standChangedCandidates = useMemo(() => {
    if (!result) return 0;
    return result.rows.filter((row) => row.parkingStand && row.parkingStand.length >= 2).length;
  }, [result]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setResult(null);
    setError('');

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (nextFile) {
      setPreviewUrl(URL.createObjectURL(nextFile));
    } else {
      setPreviewUrl('');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      if (file) formData.append('image', file);
      if (manualText.trim()) formData.append('manual_text', manualText.trim());

      const response = await fetch(`${API_BASE_URL}/ocr/extract`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`요청 실패 (${response.status})`);
      }

      const data = (await response.json()) as OcrResponse;
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container grid">
      <section className="hero">
        <span className="badge">Upload · OCR Test</span>
        <h1>이미지 업로드 및 조회 테스트</h1>
        <p>
          현재 단계에서는 알림 없이, OCR 추출 결과와 편명 기준 운항 정보 조회 흐름을 검증합니다.
          백엔드가 없으면 데모 응답으로 연결되도록 설계하면 됩니다.
        </p>
      </section>

      <section className="kpis">
        <div className="kpi">
          <div className="small">추출 행 수</div>
          <strong>{totalRows}</strong>
        </div>
        <div className="kpi">
          <div className="small">조회 편명 수</div>
          <strong>{totalFlights}</strong>
        </div>
        <div className="kpi">
          <div className="small">주기장 인식 후보</div>
          <strong>{standChangedCandidates}</strong>
        </div>
      </section>

      <section className="card">
        <h2>입력</h2>
        <form className="grid" onSubmit={handleSubmit}>
          <div>
            <div className="small" style={{ marginBottom: 8 }}>이미지 업로드</div>
            <input className="input" type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <div>
            <div className="small" style={{ marginBottom: 8 }}>OCR 없이 파싱만 테스트할 경우 텍스트 직접 입력</div>
            <textarea
              className="textarea"
              placeholder="예: 박종규 5X123 A12"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
          </div>

          <div className="row">
            <button className="button primary" type="submit" disabled={loading || (!file && !manualText.trim())}>
              {loading ? '조회 중...' : 'OCR 및 편명 조회 실행'}
            </button>
          </div>
        </form>
      </section>

      {previewUrl ? (
        <section className="card">
          <h2>업로드 미리보기</h2>
          <img src={previewUrl} alt="업로드 이미지 미리보기" className="preview" />
        </section>
      ) : null}

      {error ? (
        <section className="card">
          <h2>오류</h2>
          <p className="status-bad">{error}</p>
        </section>
      ) : null}

      {result ? (
        <>
          <section className="card">
            <h2>처리 결과</h2>
            <p>{result.message}</p>
            <p className="small">{result.usedDemo ? '현재 응답은 데모 데이터입니다.' : '실제 백엔드 응답입니다.'}</p>
          </section>

          <section className="card">
            <h2>행 단위 추출 결과</h2>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>행</th>
                    <th>이름</th>
                    <th>편명</th>
                    <th>주기장</th>
                    <th>원문</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={`${row.rowIndex}-${row.flightNo}-${row.name}`}>
                      <td>{row.rowIndex}</td>
                      <td>{row.name || '-'}</td>
                      <td>{row.flightNo || '-'}</td>
                      <td>{row.parkingStand || '-'}</td>
                      <td>{row.rawText || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2>편명 기준 운항 정보</h2>
            <FlightTable flights={result.flights} />
          </section>
        </>
      ) : null}
    </main>
  );
}

function FlightTable({ flights }: { flights: FlightInfo[] }) {
  if (!flights.length) {
    return <p className="small">조회된 운항 정보가 없습니다.</p>;
  }

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>편명</th>
            <th>항공사</th>
            <th>운항타입</th>
            <th>예정일시</th>
            <th>변경일시</th>
            <th>공항</th>
            <th>게이트</th>
            <th>터미널</th>
            <th>현황</th>
          </tr>
        </thead>
        <tbody>
          {flights.map((flight) => (
            <tr key={`${flight.flightId}-${flight.scheduleDateTime}`}> 
              <td>{flight.flightId}</td>
              <td>{flight.airline || '-'}</td>
              <td>{flight.flightType || '-'}</td>
              <td>{flight.scheduleDateTime || '-'}</td>
              <td>{flight.changedDateTime || '-'}</td>
              <td>{flight.airportName || flight.airportCode || '-'}</td>
              <td>{flight.gateNumber || '-'}</td>
              <td>{flight.terminal || '-'}</td>
              <td><StatusPill label={flight.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
