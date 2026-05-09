"use client";

import type {
  ChangeEvent,
  CSSProperties,
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";

type DailyStatus = "normal" | "issue";

type ImageSlot = {
  key: string;
  title: string;
  description: string;
};

type SavedImage = {
  slotKey: string;
  label: string;
  savedAt: string;
  dataUrl: string;
};

type DailyNotionRecord = {
  pageId: string;
  url?: string;
  savedAt: string;
};

type DailyRecordCardProps = {
  dailyStatus: DailyStatus;
  setDailyStatus: Dispatch<SetStateAction<DailyStatus>>;
  images: SavedImage[];
  imageSlots: ImageSlot[];
  getImageBySlot: (images: SavedImage[], slotKey: string) => SavedImage | null;
  openCamera: (slotKey: string) => void;
  openPhotoLibrary: (slotKey: string) => void;
  openLatestImage: (image: SavedImage) => void;
  handleDeleteImageSlot: (slotKey: string) => void;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  libraryInputRef: RefObject<HTMLInputElement | null>;
  handleImageSelected: (
    event: ChangeEvent<HTMLInputElement>,
    sourceLabel: string,
  ) => void;
  author: string;
  setAuthor: Dispatch<SetStateAction<string>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  dailyNotionRecord: DailyNotionRecord | null;
  handleSaveDailyDraft: () => void;
  handleSaveDailyToNotion: () => void;
  handleUpdateDailyToNotion: () => void;
  handleDeleteDailyFromNotion: () => void;
  openDailyNotionPage: () => void;
  openNotionDatabase: (kind: "daily" | "issue") => void;
  handleResetLocalDraft: () => void;
};

export function DailyRecordCard({
  dailyStatus,
  setDailyStatus,
  images,
  imageSlots,
  getImageBySlot,
  openCamera,
  openPhotoLibrary,
  openLatestImage,
  handleDeleteImageSlot,
  cameraInputRef,
  libraryInputRef,
  handleImageSelected,
  author,
  setAuthor,
  note,
  setNote,
  dailyNotionRecord,
  handleSaveDailyDraft,
  handleSaveDailyToNotion,
  handleUpdateDailyToNotion,
  handleDeleteDailyFromNotion,
  openDailyNotionPage,
  openNotionDatabase,
  handleResetLocalDraft,
}: DailyRecordCardProps) {
  return (
    <section style={cardStyle}>
      <div style={cardLabelStyle}>일일 업무 기록</div>
      <h2 style={cardTitleStyle}>사진 중심 업무 내용 정리</h2>
      <p style={cardDescriptionStyle}>
        항목별로 이미지를 먼저 선택해 저장합니다. 잘못 올린 사진은 보기, 변경, 삭제할 수 있습니다.
      </p>

      <div style={statusToggleStyle}>
        <button
          onClick={() => setDailyStatus("normal")}
          style={dailyStatus === "normal" ? statusActiveButtonStyle : statusButtonStyle}
        >
          이상 없음
        </button>
        <button
          onClick={() => setDailyStatus("issue")}
          style={dailyStatus === "issue" ? statusIssueButtonStyle : statusButtonStyle}
        >
          특이사항 있음
        </button>
      </div>

      <div style={imageSlotListStyle}>
        {imageSlots.map((slot) => (
          <DailyImageSlotCard
            key={slot.key}
            slot={slot}
            image={getImageBySlot(images, slot.key)}
            onCamera={() => openCamera(slot.key)}
            onLibrary={() => openPhotoLibrary(slot.key)}
            onView={openLatestImage}
            onDelete={() => handleDeleteImageSlot(slot.key)}
          />
        ))}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => handleImageSelected(event, "카메라 촬영")}
        style={{ display: "none" }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => handleImageSelected(event, "사진첩 선택")}
        style={{ display: "none" }}
      />

      <div style={fieldBlockStyle}>
        <label style={fieldLabelStyle}>작성자</label>
        <input
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="작성자"
          style={inputStyle}
        />
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="주요 사항을 입력하세요. 예: 점검 대상 결과 이상 없음."
        style={noteStyle}
      />

      {dailyNotionRecord ? (
        <div style={notionSavedBoxStyle}>
          <div style={notionSavedTextStyle}>
            Notion 저장 완료 · {dailyNotionRecord.savedAt}
          </div>
          <div style={buttonStackStyle}>
            <button onClick={handleUpdateDailyToNotion} style={greenButtonStyle}>
              Notion 일일 기록 수정
            </button>
            <button onClick={handleDeleteDailyFromNotion} style={dangerButtonStyle}>
              Notion 일일 기록 삭제
            </button>
            <button onClick={openDailyNotionPage} style={darkButtonStyle}>
              Notion에서 보기
            </button>
            <button onClick={() => openNotionDatabase("daily")} style={darkButtonStyle}>
              Notion 일일 업무 DB 열기
            </button>
            <button onClick={handleResetLocalDraft} style={resetButtonStyle}>
              앱 화면만 초기화
            </button>
          </div>
        </div>
      ) : (
        <div style={buttonStackStyle}>
          <button onClick={handleSaveDailyDraft} style={greenButtonStyle}>
            일일 업무 임시 저장
          </button>
          <button onClick={handleSaveDailyToNotion} style={darkButtonStyle}>
            Notion 일일 기록 저장
          </button>
          <button onClick={() => openNotionDatabase("daily")} style={darkButtonStyle}>
            Notion 일일 업무 DB 열기
          </button>
          <button onClick={handleResetLocalDraft} style={resetButtonStyle}>
            앱 화면만 초기화
          </button>
        </div>
      )}
    </section>
  );
}

function DailyImageSlotCard({
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

const statusToggleStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  margin: "14px 0 16px",
};

const statusButtonStyle: CSSProperties = {
  width: "100%",
  padding: "13px 12px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  background: "#111827",
  color: "#dbeafe",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const statusActiveButtonStyle: CSSProperties = {
  ...statusButtonStyle,
  borderColor: "#16a34a",
  background: "#14532d",
  color: "#dcfce7",
};

const statusIssueButtonStyle: CSSProperties = {
  ...statusButtonStyle,
  borderColor: "#f97316",
  background: "#431407",
  color: "#fed7aa",
};

const imageSlotListStyle: CSSProperties = {
  display: "grid",
  gap: 14,
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

const greenButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 58,
  border: "none",
  borderRadius: 16,
  color: "#ffffff",
  background: "#16a34a",
  fontSize: 17,
  fontWeight: 950,
  cursor: "pointer",
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

const notionSavedBoxStyle: CSSProperties = {
  marginTop: 14,
  border: "1px solid #166534",
  background: "#052e16",
  borderRadius: 16,
  padding: 12,
};

const notionSavedTextStyle: CSSProperties = {
  color: "#bbf7d0",
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
