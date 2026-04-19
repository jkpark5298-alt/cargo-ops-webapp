"use client";

import { useMemo, useState } from "react";

type FlightLookupItem = {
  airline?: string;
  flightNo?: string;
  masterFlightNo?: string;
  scheduleTime?: string;
  estimatedTime?: string;
  airportCode?: string;
  airportName?: string;
  gateNumber?: string;
  terminal?: string;
  status?: string;
  operationType?: string;
  codeshare?: string;
  fid?: string;
  sourceType?: string;
};

type ExtractedRow = {
  raw: string;
  name?: string;
  flightNo?: string;
  parkingStand?: string;
};

type ExtractResponse = {
  rows: ExtractedRow[];
  text?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function formatDateTime(value?: string) {
  if (!value) return "-";

  const digits = String(value).replace(/\D/g, "");
  if (digits.length !== 12) return value;

  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(
    6,
    8
  )} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
}

function normalizeStatus(status?: string) {
  return (status || "").trim();
}

/**
 * 현황 표시 규칙
 * - 출발 완료: "출발" (빨강)
 * - 출발 전: 공란
 * - 도착 완료: "도착" (파랑)
 * - 도착 전: 공란
 *
 * 기준:
 * - status에 출발/도착이 명시되어 있고
 * - scheduleTime !== estimatedTime 일 때만 실제 변동/실행으로 간주
 *
 * 참고:
 * 공항 응답에서 scheduleTime === estimatedTime 인 경우가 많아
 * 아직 출발 전 / 도착 전으로 보고 공란 처리
 */
function displayStatus(item: FlightLookupItem) {
  const status = normalizeStatus(item.status);
  const sched = (item.scheduleTime || "").trim();
  const est = (item.estimatedTime || "").trim();

  // 시간 정보가 같으면 아직 실행 전으로 간주
  if (!est || !sched || sched === est) {
    return "";
  }

  if (status.includes("출발")) return "출발";
  if (status.includes("도착")) return "도착";

  return "";
}

function getStatusColor(statusText: string) {
  if (statusText === "출발") return "#ef4444"; // red
  if (statusText === "도착") return "#3b82f6"; // blue
  return "#f3f7ff";
}

/**
 * 방향 판단:
 * 1) status에 "도착"이 있으면 도착편
 * 2) status에 "출발"이 있으면 출발편
 * 3) status가 없으면 sourceType 사용
 *    - departure -> 출발편
 *    - arrival -> 도착편
 * 4) 둘 다 없으면 기본적으로 출발편으로 처리
 *
 * airportCode / airportName은 "상대 공항"으로 보고,
 * - 출발편이면 ICN -> 상대공항
 * - 도착편이면 상대공항 -> ICN
 */
function isDepartureFlight(item: FlightLookupItem) {
  const status = normalizeStatus(item.status);

  if (status.includes("도착")) return false;
  if (status.includes("출발")) return true;

  if (item.sourceType === "arrival") return false;
  if (item.sourceType === "departure") return true;

  return true;
}

function getDepartureCode(item: FlightLookupItem) {
  return isDepartureFlight(item) ? "ICN" : item.airportCode || "-";
}

function getDepartureName(item: FlightLookupItem) {
  return isDepartureFlight(item) ? "인천공항" : item.airportName || "-";
}

function getArrivalCode(item: FlightLookupItem) {
  return isDepartureFlight(item) ? item.airportCode || "-" : "ICN";
}

function getArrivalName(item: FlightLookupItem) {
  return isDepartureFlight(item) ? item.airportName || "-" : "인천공항";
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [flightNo, setFlightNo] = useState("");
  const [extractLoading, setExtractLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [extractResult, setExtractResult] = useState<ExtractResponse | null>(
    null
  );
  const [lookupResult, setLookupResult] = useState<FlightLookupItem[] | null>(
    null
  );

  const extractedRows = useMemo(() => extractResult?.rows ?? [], [extractResult]);
  const extractedFlightNos = useMemo(
    () => extractedRows.map((row) => row.flightNo).filter(Boolean),
    [extractedRows]
  );
  const extractedParkingStands = useMemo(
    () => extractedRows.map((row) => row.parkingStand).filter(Boolean),
    [extractedRows]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleExtract = async () => {
    setExtractLoading(true);
    setExtractError("");
    setExtractResult(null);

    try {
      const formData = new FormData();

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      if (rawText.trim()) {
        formData.append("raw_text", rawText.trim());
      }

      const response = await fetch(`${API_BASE_URL}/ocr/extract`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR 요청 실패 (${response.status})`);
      }

      const data: ExtractResponse = await response.json();
      setExtractResult(data);
    } catch (error) {
      setExtractError(
        error instanceof Error ? error.message : "OCR 처리 중 오류가 발생했습니다."
      );
    } finally {
      setExtractLoading(false);
    }
  };

  const lookupSingleFlight = async (singleFlightNo: string) => {
    const response = await fetch(
      `${API_BASE_URL}/flights/lookup?flight_no=${encodeURIComponent(
        singleFlightNo
      )}`
    );

    if (!response.ok) {
      throw new Error(`운항 조회 실패 (${response.status})`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return data as FlightLookupItem[];
    }
    if (data?.items && Array.isArray(data.items)) {
      return data.items as FlightLookupItem[];
    }
    if (data) {
      return [data as FlightLookupItem];
    }
    return [];
  };

  const dedupeResults = (items: FlightLookupItem[]) => {
    return items.filter((item, index, self) => {
      const key = [
        item.flightNo ?? "",
        item.scheduleTime ?? "",
        item.estimatedTime ?? "",
        item.airportCode ?? "",
        item.gateNumber ?? "",
        item.terminal ?? "",
        item.status ?? "",
      ].join("|");

      return (
        index ===
        self.findIndex((target) => {
          const targetKey = [
            target.flightNo ?? "",
            target.scheduleTime ?? "",
            target.estimatedTime ?? "",
            target.airportCode ?? "",
            target.gateNumber ?? "",
            target.terminal ?? "",
            target.status ?? "",
          ].join("|");
          return targetKey === key;
        })
      );
    });
  };

  const handleLookup = async (targetFlightNo?: string) => {
    const rawInput = (targetFlightNo ?? flightNo).trim().toUpperCase();

    if (!rawInput) {
      setLookupError("편명을 입력해주세요.");
      return;
    }

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const flightList = rawInput
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean);

      if (flightList.length === 0) {
        throw new Error("유효한 편명이 없습니다.");
      }

      const results = await Promise.all(
        flightList.map(async (singleFlightNo) => {
          return await lookupSingleFlight(singleFlightNo);
        })
      );

      const merged = results.flat();
      const unique = dedupeResults(merged);

      setLookupResult(unique);
    } catch (error) {
      setLookupError(
        error instanceof Error ? error.message : "운항 조회 중 오류가 발생했습니다."
      );
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #07111f 0%, #09162a 50%, #081221 100%)",
        color: "#f3f7ff",
        padding: "32px 20px 80px",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <section
          style={{
            border: "1px solid #20314d",
            borderRadius: 24,
            padding: 28,
            background: "rgba(9,20,40,0.92)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "inline-block",
              border: "1px solid #3b5d9a",
              color: "#b9d4ff",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 14,
              marginBottom: 14,
            }}
          >
            Upload · OCR Test
          </div>

          <h1 style={{ fontSize: 54, lineHeight: 1.15, margin: 0, fontWeight: 800 }}>
            이미지 업로드 및 조회 테스트
          </h1>

          <p
            style={{
              color: "#b6c4de",
              fontSize: 28,
              lineHeight: 1.6,
              marginTop: 18,
              marginBottom: 0,
            }}
          >
            OCR 추출 결과와 편명 기준 운항 정보 조회 흐름을 검증합니다. 이미지가 없어도
            편명을 직접 입력해 조회할 수 있으며, 쉼표(,)로 여러 편명을 한 번에 조회할 수 있습니다.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard label="추출 행 수" value={String(extractedRows.length)} />
          <StatCard label="조회 편명 수" value={String(extractedFlightNos.length)} />
          <StatCard
            label="주기장 인식 후보"
            value={String(extractedParkingStands.length)}
          />
        </section>

        <section
          style={{
            border: "1px solid #20314d",
            borderRadius: 24,
            padding: 28,
            background: "rgba(9,20,40,0.92)",
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 22, fontSize: 30 }}>입력</h2>

          <label style={labelStyle}>이미지 업로드</label>
          <div style={inputWrapStyle}>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <label style={{ ...labelStyle, marginTop: 20 }}>
            OCR 없이 파싱만 테스트할 경우 텍스트 직접 입력
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="예: 박종규 5X123 A12"
            style={textareaStyle}
          />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            <button
              onClick={handleExtract}
              disabled={extractLoading}
              style={primaryButtonStyle}
            >
              {extractLoading ? "추출 중..." : "OCR / 파싱 실행"}
            </button>
          </div>

          <hr style={dividerStyle} />

          <label style={labelStyle}>편명 직접 입력 조회</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <input
              value={flightNo}
              onChange={(e) => setFlightNo(e.target.value.toUpperCase())}
              placeholder="예: KJ282, KJ285, KJ587"
              style={textInputStyle}
            />
            <button
              onClick={() => handleLookup()}
              disabled={lookupLoading}
              style={primaryButtonStyle}
            >
              {lookupLoading ? "조회 중..." : "편명 조회"}
            </button>
          </div>

          {extractError ? <ErrorBox message={extractError} /> : null}
          {lookupError ? <ErrorBox message={lookupError} /> : null}
        </section>

        <section
          style={{
            border: "1px solid #20314d",
            borderRadius: 24,
            padding: 28,
            background: "rgba(9,20,40,0.92)",
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 30 }}>
            OCR / 파싱 결과
          </h2>

          {extractedRows.length === 0 ? (
            <EmptyText text="아직 추출된 결과가 없습니다." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>이름</Th>
                    <Th>편명</Th>
                    <Th>주기장</Th>
                    <Th>원문</Th>
                    <Th>동작</Th>
                  </tr>
                </thead>
                <tbody>
                  {extractedRows.map((row, index) => (
                    <tr key={`${row.raw}-${index}`}>
                      <Td>{row.name || "-"}</Td>
                      <Td>{row.flightNo || "-"}</Td>
                      <Td>{row.parkingStand || "-"}</Td>
                      <Td>{row.raw || "-"}</Td>
                      <Td>
                        {row.flightNo ? (
                          <button
                            onClick={() => handleLookup(row.flightNo)}
                            disabled={lookupLoading}
                            style={miniButtonStyle}
                          >
                            이 편명 조회
                          </button>
                        ) : (
                          "-"
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          style={{
            border: "1px solid #20314d",
            borderRadius: 24,
            padding: 28,
            background: "rgba(9,20,40,0.92)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 30 }}>
            운항 조회 결과
          </h2>

          {!lookupResult ? (
            <EmptyText text="아직 조회 결과가 없습니다." />
          ) : lookupResult.length === 0 ? (
            <EmptyText text="조회 결과가 없습니다." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>현황</Th>
                    <Th>편명</Th>
                    <Th>출발지코드</Th>
                    <Th>출발지공항명</Th>
                    <Th>도착지코드</Th>
                    <Th>도착지공항명</Th>
                    <Th>예정일시</Th>
                    <Th>변경일시</Th>
                    <Th>게이트</Th>
                    <Th>터미널</Th>
                    <Th>마스터 편명</Th>
                    <Th>코드쉐어</Th>
                  </tr>
                </thead>
                <tbody>
                  {lookupResult.map((item, index) => {
                    const statusText = displayStatus(item);

                    return (
                      <tr
                        key={`${item.flightNo ?? "flight"}-${item.scheduleTime ?? index}`}
                      >
                        <Td>
                          <span
                            style={{
                              color: getStatusColor(statusText),
                              fontWeight: 800,
                            }}
                          >
                            {statusText}
                          </span>
                        </Td>
                        <Td>{item.flightNo || "-"}</Td>
                        <Td>{getDepartureCode(item)}</Td>
                        <Td>{getDepartureName(item)}</Td>
                        <Td>{getArrivalCode(item)}</Td>
                        <Td>{getArrivalName(item)}</Td>
                        <Td>{formatDateTime(item.scheduleTime)}</Td>
                        <Td>{formatDateTime(item.estimatedTime)}</Td>
                        <Td>{item.gateNumber || "-"}</Td>
                        <Td>{item.terminal || "-"}</Td>
                        <Td>{item.masterFlightNo || "-"}</Td>
                        <Td>{item.codeshare || "-"}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #20314d",
        borderRadius: 24,
        padding: 22,
        background: "rgba(9,20,40,0.92)",
      }}
    >
      <div style={{ color: "#b6c4de", fontSize: 18, marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: 54, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: 16,
        border: "1px solid #7d2a3d",
        background: "rgba(122, 26, 52, 0.18)",
        color: "#ffcad6",
        borderRadius: 14,
        padding: "14px 16px",
        fontSize: 16,
      }}
    >
      {message}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p style={{ color: "#b6c4de", fontSize: 18, margin: 0 }}>{text}</p>;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 18,
  color: "#b6c4de",
  marginBottom: 10,
};

const inputWrapStyle: React.CSSProperties = {
  border: "1px solid #2b4168",
  borderRadius: 18,
  padding: "16px 18px",
  background: "#0a1730",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 170,
  resize: "vertical",
  border: "1px solid #2b4168",
  borderRadius: 18,
  background: "#0a1730",
  color: "#f3f7ff",
  padding: "18px 20px",
  fontSize: 18,
  outline: "none",
  boxSizing: "border-box",
};

const textInputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #2b4168",
  borderRadius: 18,
  background: "#0a1730",
  color: "#f3f7ff",
  padding: "18px 20px",
  fontSize: 18,
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 14,
  background: "#69a7ff",
  color: "#081221",
  fontWeight: 800,
  fontSize: 17,
  padding: "14px 20px",
  cursor: "pointer",
};

const miniButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  background: "#69a7ff",
  color: "#081221",
  fontWeight: 700,
  fontSize: 14,
  padding: "10px 14px",
  cursor: "pointer",
};

const dividerStyle: React.CSSProperties = {
  border: 0,
  height: 1,
  background: "#20314d",
  margin: "24px 0",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1350,
};

const cellCommonStyle: React.CSSProperties = {
  borderBottom: "1px solid #20314d",
  textAlign: "left",
  padding: "14px 12px",
  fontSize: 15,
  verticalAlign: "top",
};

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        ...cellCommonStyle,
        color: "#b9d4ff",
        fontWeight: 700,
        background: "#0a1730",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ ...cellCommonStyle, color: "#f3f7ff" }}>{children}</td>;
}
