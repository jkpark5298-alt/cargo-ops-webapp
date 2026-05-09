"use client";

import type { CSSProperties, Dispatch, SetStateAction } from "react";

type ImageSlotKey =
  | "daily-schedule"
  | "aircraft-check"
  | "inspection-result"
  | "issue";

type ImageSlot = {
  key: ImageSlotKey;
  title: string;
  description: string;
};

type SavedImage = {
  id: string;
  type: ImageSlotKey;
  label: string;
  savedAt: string;
  dataUrl: string;
};

type IssueNotionRecord = {
  pageId: string;
  url?: string;
  savedAt: string;
};

type IssueRecordCardProps = {
  issueImageSlot: ImageSlot;
  issueImage: SavedImage | null;
  openCamera: () => void;
  openPhotoLibrary: () => void;
  openLatestImage: (image: SavedImage) => void;
  handleDeleteImageSlot: () => void;
  todayText: string;
  currentTimeText: string;
  issueFlight: string;
  setIssueFlight: Dispatch<SetStateAction<string>>;
  issueRoute: string;
  setIssueRoute: Dispatch<SetStateAction<string>>;
  issueHlnbr: string;
  setIssueHlnbr: Dispatch<SetStateAction<string>>;
  author: string;
  setAuthor: Dispatch<SetStateAction<string>>;
  weatherSummary: string;
  issueText: string;
  setIssueText: Dispatch<SetStateAction<string>>;
  issueNotionRecord: IssueNotionRecord | null;
  handleSaveIssueToNotion: () => void;
  handleUpdateIssueToNotion: () => void;
  handleDeleteIssueFromNotion: () => void;
  openIssueNotionPage: () => void;
  openNotionDatabase: (kind: "daily" | "issue") => void;
  handleResetLocalDraft: () => void;
};

export function IssueRecordCard({
  issueImageSlot,
  issueImage,
  openCamera,
  openPhotoLibrary,
  openLatestImage,
  handleDeleteImageSlot,
  todayText,
  currentTimeText,
  issueFlight,
  setIssueFlight,
  issueRoute,
  setIssueRoute,
  issueHlnbr,
  setIssueHlnbr,
  author,
  setAuthor,
  weatherSummary,
  issueText,
  setIssueText,
  issueNotionRecord,
  handleSaveIssueToNotion,
  handleUpdateIssueToNotion,
  handleDeleteIssueFromNotion,
  openIssueNotionPage,
  openNotionDatabase,
  handleResetLocalDraft,
}: IssueRecordCardProps) {
  return (
    <section style={{ ...cardStyle, borderColor: "#f9731666" }}>
      <div style={cardLabelStyle}>특이사항 기록</div>
      <h2 style={cardTitleStyle}>문제 발생 대비 증빙 기록</h2>
      <p style={cardDescriptionStyle}>
        특이사항 발생 시 날짜, 시간, 편명, 구간, HL NBR, 날씨, 작성자, 이미지와 메모를 함께 저장합니다.
      </p>

      <IssueImageSlotCard
        slot={issueImageSlot}
        image={issueImage}
        onCamera={openCamera}
        onLibrary={openPhotoLibrary}
        onView={openLatestImage}
        onDelete={handleDeleteImageSlot}
      />

      <div style={formGridStyle}>
        <div style={fieldBlockStyle}>
          <label style={fieldLabelStyle}>날짜</label>
          <input value={todayText} readOnly style={inputStyle} />
        </div>

        <div style={fieldBlockStyle}>
          <label style={fieldLabelStyle}>시간</label>
          <input value={currentTimeText} readOnly style={inputStyle} />
        </div>

        <div style={fieldBlockStyle}>
          <label style={fieldLabelStyle}>편명</label>
          <input
            value={issueFlight}
            onChange={(event) => setIssueFlight(event.target.value.toUpperCase())}
            placeholder="예: KJ919"
            style={inputStyle}
          />
        </div>

        <div style={fieldBlockStyle}>
          <label style={fieldLabelStyle}>구간</label>
          <input
            value={issueRoute}
            onChange={(event) => setIssueRoute(event.target.value.toUpperCase())}
            placeholder="편명 입력 시 자동 표시"
            style={inputStyle}
          />
        </div>

        <div style={fieldBlockStyle}>
          <label style={fieldLabelStyle}>HL NBR</label>
          <input
            value={issueHlnbr}
            onChange={(event) => setIssueHlnbr(event.target.value.toUpperCase())}
            placeholder="예: HL8000"
            style={inputStyle}
          />
        </div>

        <div style={fieldBlockStyle}>
          <label style={fieldLabelStyle}>작성자</label>
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="작성자"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={fieldBlockStyle}>
        <label style={fieldLabelStyle}>날씨</label>
        <input value={weatherSummary} readOnly style={inputStyle} />
      </div>

      <textarea
        value={issueText}
        onChange={(event) => setIssueText(event.target.value)}
        placeholder="특이사항을 입력하세요. 예: 게이트 변경, 지연, 점검 결과 이상 등"
        style={noteStyle}
      />

      {issueNotionRecord ? (
        <div style={notionIssueSavedBoxStyle}>
          <div style={notionIssueSavedTextStyle}>
            Notion 특이사항 저장 완료 · {issueNotionRecord.savedAt}
          </div>
          <div style={buttonStackStyle}>
            <button onClick={handleUpdateIssueToNotion} style={orangeButtonStyle}>
              Notion 특이사항 수정
            </button>
            <button onClick={handleDeleteIssueFromNotion} style={dangerButtonStyle}>
              Notion 특이사항 삭제
            </button>
            <button onClick={openIssueNotionPage} style={darkButtonStyle}>
              Notion에서 보기
            </button>
            <button onClick={() => openNotionDatabase("issue")} style={darkButtonStyle}>
              Notion 특이사항 DB 열기
            </button>
            <button onClick={handleResetLocalDraft} style={resetButtonStyle}>
              앱 화면만 초기화
            </button>
          </div>
        </div>
      ) : (
        <div style={buttonStackStyle}>
          <button onClick={handleSaveIssueToNotion} style={orangeButtonStyle}>
            Notion 특이사항 저장
          </button>
          <button onClick={() => openNotionDatabase("issue")} style={darkButtonStyle}>
            Notion 특이사항 DB 열기
          </button>
          <button onClick={handleResetLocalDraft} style={resetButtonStyle}>
            앱 화면만 초기화
          </button>
        </div>
      )}
    </section>
  );
}

function IssueImageSlotCard({
  slot,
  image,
  onCamera,
  onLibrary,
  onView,
  onDelete,
}: {
  slot: ImageSlot;
  image: SavedImage | null;
  onCamera: () => void;
  onLibrary: () => void;
  onView: (image: SavedImage) => void;
  onDelete: () => void;
}) {
  return (
    <div style={imageSlotCardStyle}>
      <div>
        <div style={imageSlotTitleStyle}>{slot.title}</div>
        <div style={imageSlotDescStyle}>{slot.description}</div>
      </div>

      {image ? (
        <div style={imageSlotSavedStyle}>
          <button onClick={() => onView(image)} style={imagePreviewButtonStyle}>
            <img src={image.dataUrl} alt={image.label} style={imagePreviewStyle} />
            <span style={imageTextStyle}>
              저장됨
              <small style={imageDateStyle}>{image.savedAt}</small>
            </span>
          </button>
          <div style={imageSlotActionRowStyle}>
            <button onClick={() => onView(image)} style={miniButtonStyle}>
              보기
            </button>
            <button onClick={onCamera} style={miniButtonStyle}>
              촬영 변경
            </button>
            <button onClick={onLibrary} style={miniButtonStyle}>
              사진첩 변경
            </button>
            <button onClick={onDelete} style={miniDangerButtonStyle}>
              삭제
            </button>
          </div>
        </div>
      ) : (
        <div style={imageSlotActionRowStyle}>
          <button onClick={onCamera} style={grayButtonStyle}>
            사진 촬영
          </button>
          <button onClick={onLibrary} style={darkButtonStyle}>
            사진첩에서 가져오기
          </button>
        </div>
      )}
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "#111827",
  border: "1px solid #26374f",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
};

const cardLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 2,
  textTransform: "uppercase",
};

const cardTitleStyle: CSSProperties = {
  margin: "6px 0 8px",
  color: "#f8fafc",
  fontSize: 21,
  lineHeight: 1.25,
  fontWeight: 950,
};

const cardDescriptionStyle: CSSProperties = {
  color: "#94a3b8",
  margin: "0 0 14px",
  lineHeight: 1.55,
  fontSize: 14,
};

const imageSlotCardStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(2, 6, 23, 0.38)",
};

const imageSlotTitleStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 16,
  fontWeight: 950,
};

const imageSlotDescStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  lineHeight: 1.5,
  marginTop: 4,
};

const imageSlotActionRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginTop: 12,
};

const imageSlotSavedStyle: CSSProperties = {
  marginTop: 12,
};

const imagePreviewButtonStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  gap: 12,
  alignItems: "center",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: 14,
  padding: 10,
  background: "#0f172a",
  color: "#f8fafc",
  cursor: "pointer",
  textAlign: "left",
};

const imagePreviewStyle: CSSProperties = {
  width: 86,
  height: 70,
  borderRadius: 10,
  objectFit: "cover",
  background: "#020617",
};

const imageTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 15,
  fontWeight: 900,
};

const imageDateStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 800,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 14,
};

const fieldBlockStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 14,
};

const fieldLabelStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 900,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #334155",
  borderRadius: 14,
  background: "#020817",
  color: "#f8fafc",
  padding: "13px 14px",
  fontSize: 15,
  fontWeight: 800,
  outline: "none",
};

const noteStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 130,
  resize: "vertical",
  marginTop: 14,
  fontWeight: 700,
  lineHeight: 1.5,
};

const buttonStackStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};

const darkButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 58,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: 16,
  color: "#ffffff",
  background: "#111827",
  fontSize: 17,
  fontWeight: 950,
  cursor: "pointer",
};

const grayButtonStyle: CSSProperties = {
  ...darkButtonStyle,
  background: "#334155",
};

const resetButtonStyle: CSSProperties = {
  ...darkButtonStyle,
  background: "#1f2937",
};

const miniButtonStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: 12,
  padding: "10px 8px",
  background: "#111827",
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const miniDangerButtonStyle: CSSProperties = {
  ...miniButtonStyle,
  borderColor: "rgba(239, 68, 68, 0.55)",
  background: "#450a0a",
  color: "#fecaca",
};

const orangeButtonStyle: CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "none",
  background: "#f97316",
  color: "#111827",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const notionIssueSavedBoxStyle: CSSProperties = {
  marginTop: 14,
  border: "1px solid #9a3412",
  background: "#431407",
  borderRadius: 16,
  padding: 12,
};

const notionIssueSavedTextStyle: CSSProperties = {
  color: "#fed7aa",
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 10,
};

const dangerButtonStyle: CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};
