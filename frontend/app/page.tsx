"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "cargo_ops_monitor_rooms_v6";
const IMAGE_STORAGE_KEY = "cargo_ops_home_images_v1";
const NOTE_STORAGE_KEY = "cargo_ops_home_note_v1";
const DAILY_NOTION_RECORD_KEY = "cargo_ops_daily_notion_record_v1";

type DailyNotionRecord = {
  pageId: string;
  url?: string;
  savedAt: string;
};

type ImageSlotKey =
  | "daily-schedule"
  | "aircraft-check"
  | "inspection-result"
  | "issue";

const IMAGE_SLOTS: Array<{
  key: ImageSlotKey;
  title: string;
  description: string;
}> = [
  {
    key: "daily-schedule",
    title: "1. 업무일정 이미지",
    description: "당일 업무일정, Cargo Plan, 작업 순서 이미지를 저장합니다.",
  },
  {
    key: "aircraft-check",
    title: "2. 화물기 CHECK 사항 이미지",
    description: "화물기 CHECK 대상과 확인 사항 이미지를 저장합니다.",
  },
  {
    key: "inspection-result",
    title: "3. 점검 대상 결과 이미지",
    description: "점검 대상 결과, 확인 완료 화면, 결과 이미지를 저장합니다.",
  },
];

const ISSUE_IMAGE_SLOT: {
  key: ImageSlotKey;
  title: string;
  description: string;
} = {
  key: "issue",
  title: "4. 특이사항 이미지",
  description: "특이사항 발생 시 증빙용 현장 이미지 또는 캡처를 저장합니다.",
};

const IMAGE_SLOT_PROPERTY_NAME: Record<ImageSlotKey, string> = {
  "daily-schedule": "업무일정 이미지",
  "aircraft-check": "화물기 CHECK 이미지",
  "inspection-result": "점검 대상 결과 이미지",
  issue: "이미지",
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://cargo-ops-backend.onrender.com";

type WeatherInfo = {
  success?: boolean;
  location?: string;
  temperature?: string;
  condition?: string;
  feelsLike?: string;
  humidity?: string;
  windSpeed?: string;
  pm10Grade?: string;
  pm25Grade?: string;
  uvGrade?: string;
  sunset?: string;
  baseTime?: string;
  icon?: string;
  source?: string;
  message?: string;
};

const DEFAULT_WEATHER: WeatherInfo = {
  success: false,
  location: "인천국제공항",
  temperature: "19.6",
  condition: "맑음",
  feelsLike: "18.0",
  humidity: "32",
  windSpeed: "3.3",
  pm10Grade: "좋음",
  pm25Grade: "좋음",
  uvGrade: "보통",
  sunset: "19:30",
  baseTime: "14:00",
  icon: "☀️",
  source: "fallback",
  message: "실시간 날씨 정보를 불러오면 자동으로 갱신됩니다.",
};

type FlightRow = {
  flightId?: string;
  flightNo?: string;
  departureCode?: string;
  arrivalCode?: string;
  formattedScheduleTime?: string;
  formattedEstimatedTime?: string;
  scheduleDateTime?: string;
  estimatedDateTime?: string;
  gatenumber?: string;
  terminalid?: string;
  remark?: string;
  status?: string;
};

type MonitorRoom = {
  id: string;
  name: string;
  flightsInput: string;
  startDateTime: string;
  endDateTime: string;
  fixed: boolean;
  lastFetchedAt: string;
  rows: FlightRow[];
};

type SavedImage = {
  id: string;
  type: ImageSlotKey;
  label: string;
  savedAt: string;
  dataUrl: string;
};

function loadRooms(): MonitorRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadImages(): SavedImage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IMAGE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveImages(images: SavedImage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(images.slice(0, 6)));
}

function getImageBySlot(images: SavedImage[], slotKey: ImageSlotKey) {
  return images.find((image) => image.type === slotKey) || null;
}

function upsertImageBySlot(
  images: SavedImage[],
  nextImage: SavedImage,
): SavedImage[] {
  const filtered = images.filter((image) => image.type !== nextImage.type);
  return [nextImage, ...filtered].slice(0, 8);
}

function removeImageBySlot(images: SavedImage[], slotKey: ImageSlotKey) {
  return images.filter((image) => image.type !== slotKey);
}

function loadNote() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NOTE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveNote(note: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTE_STORAGE_KEY, note);
}

function loadDailyNotionRecord(): DailyNotionRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DAILY_NOTION_RECORD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.pageId ? parsed : null;
  } catch {
    return null;
  }
}

function saveDailyNotionRecord(record: DailyNotionRecord) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_NOTION_RECORD_KEY, JSON.stringify(record));
}

function clearDailyNotionRecord() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DAILY_NOTION_RECORD_KEY);
}

function formatDateForTitle(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const weekdays = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];
  return `${yyyy}.${mm}.${dd} ${weekdays[date.getDay()]}`;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ");
}

function getLatestScheduleRoom(rooms: MonitorRoom[]) {
  const fixedRooms = rooms.filter((room) => room.fixed);
  if (fixedRooms.length > 0) return fixedRooms[0];
  return rooms[0] || null;
}

function getFlightSummary(room: MonitorRoom | null) {
  if (!room) return "저장된 Schedule Flight가 없습니다.";

  const inputFlights = room.flightsInput
    .split(",")
    .map((flight) => flight.trim())
    .filter(Boolean);

  const rows = Array.isArray(room.rows) ? room.rows : [];
  const rowFlights = rows.map((row) => getFlightNo(row)).filter(Boolean);
  const uniqueFlights = Array.from(new Set(inputFlights.length > 0 ? inputFlights : rowFlights));

  if (uniqueFlights.length === 0) return "-";

  return uniqueFlights
    .map((flight) => {
      const matchedRow = rows.find((row) => {
        const rowFlight = getFlightNo(row).replace(/\s+/g, "").toUpperCase();
        const targetFlight = flight.replace(/\s+/g, "").toUpperCase();
        return rowFlight === targetFlight || rowFlight.includes(targetFlight);
      });

      const route = getRouteDisplay(matchedRow);
      return route ? `${flight} ${route}` : flight;
    })
    .join(", ");
}

function getFlightNo(row?: FlightRow) {
  if (!row) return "";
  return row.flightId || row.flightNo || "";
}

function getRouteDisplay(row?: FlightRow) {
  if (!row) return "";
  const departure = row.departureCode || "";
  const arrival = row.arrivalCode || "";

  if (!departure && !arrival) return "";
  if (departure && arrival) return `${departure}→${arrival}`;
  if (departure) return `${departure}→-`;
  return `-→${arrival}`;
}


function getFlightRouteItems(room: MonitorRoom | null) {
  if (!room) return [];

  const rows = Array.isArray(room.rows) ? room.rows : [];

  const rowItems = rows
    .map((row) => {
      const flight = getFlightNo(row);
      if (!flight) return null;

      return {
        flight,
        route: getRouteDisplay(row) || "구간 확인 중",
        hasResult: true,
      };
    })
    .filter((item): item is { flight: string; route: string; hasResult: boolean } => Boolean(item));

  const uniqueRowItems = rowItems.filter((item, index, array) => {
    const key = item.flight.replace(/\s+/g, "").toUpperCase();
    return array.findIndex((candidate) => candidate.flight.replace(/\s+/g, "").toUpperCase() === key) === index;
  });

  if (uniqueRowItems.length > 0) {
    return uniqueRowItems;
  }

  return room.flightsInput
    .split(",")
    .map((flight) => flight.trim())
    .filter(Boolean)
    .map((flight) => ({
      flight,
      route: "조회 결과 없음",
      hasResult: false,
    }));
}

function getRoomRowsCount(room: MonitorRoom | null) {
  if (!room) return 0;
  return Array.isArray(room.rows) ? room.rows.length : 0;
}


function getRouteByFlight(room: MonitorRoom | null, flightInput: string) {
  if (!room || !flightInput.trim()) return "";

  const targetFlight = flightInput.replace(/\s+/g, "").toUpperCase();
  const matchedRow = room.rows?.find((row) => {
    const rowFlight = getFlightNo(row).replace(/\s+/g, "").toUpperCase();
    return rowFlight === targetFlight || rowFlight.includes(targetFlight);
  });

  return getRouteDisplay(matchedRow);
}

function getHlnbrByFlight(room: MonitorRoom | null, flightInput: string) {
  if (!room || !flightInput.trim()) return "";

  const targetFlight = flightInput.replace(/\s+/g, "").toUpperCase();
  const matchedRow = room.rows?.find((row) => {
    const rowFlight = getFlightNo(row).replace(/\s+/g, "").toUpperCase();
    return rowFlight === targetFlight || rowFlight.includes(targetFlight);
  });

  const rowWithMaybeHlnbr = matchedRow as FlightRow & {
    fid?: string;
    aircraftRegNo?: string;
    registrationNo?: string;
    hlnbr?: string;
  };

  return (
    rowWithMaybeHlnbr?.fid ||
    rowWithMaybeHlnbr?.aircraftRegNo ||
    rowWithMaybeHlnbr?.registrationNo ||
    rowWithMaybeHlnbr?.hlnbr ||
    ""
  );
}

function getCurrentTimeText() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getWeatherSummary(weather: WeatherInfo) {
  return `${weather.condition || "-"} ${weather.temperature || "-"}℃ / 습도 ${weather.humidity || "-"}% / 미세먼지 ${weather.pm10Grade || "-"}`;
}

export default function HomePage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageSlotRef = useRef<ImageSlotKey>("daily-schedule");
  const [rooms, setRooms] = useState<MonitorRoom[]>([]);
  const [images, setImages] = useState<SavedImage[]>([]);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [weather, setWeather] = useState<WeatherInfo>(DEFAULT_WEATHER);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<"normal" | "issue">("normal");
  const [author, setAuthor] = useState("jkpark");
  const [issueFlight, setIssueFlight] = useState("");
  const [issueRoute, setIssueRoute] = useState("");
  const [issueHlnbr, setIssueHlnbr] = useState("");
  const [issueText, setIssueText] = useState("");
  const [dailyNotionRecord, setDailyNotionRecord] =
    useState<DailyNotionRecord | null>(null);
  const todayText = useMemo(() => formatDateForTitle(new Date()), []);
  const latestRoom = useMemo(() => getLatestScheduleRoom(rooms), [rooms]);

  useEffect(() => {
    setRooms(loadRooms());
    setImages(loadImages());
    setNote(loadNote());
    setDailyNotionRecord(loadDailyNotionRecord());
    void fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const route = getRouteByFlight(latestRoom, issueFlight);
    const hlnbr = getHlnbrByFlight(latestRoom, issueFlight);

    if (route) {
      setIssueRoute(route);
    }

    if (hlnbr) {
      setIssueHlnbr(hlnbr);
    }
  }, [issueFlight, latestRoom]);

  const openFlights = () => router.push("/flights");

  const openScheduleFlight = () => {
    if (latestRoom) {
      router.push(`/fixed-lite?roomId=${encodeURIComponent(latestRoom.id)}`);
      return;
    }
    router.push("/flights");
  };

  async function fetchWeather() {
    setWeatherLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/weather/current`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || json?.detail || `날씨 조회 오류 (${res.status})`);
      }

      setWeather({
        ...DEFAULT_WEATHER,
        ...json,
        success: json?.success !== false,
      });
    } catch (error) {
      setWeather({
        ...DEFAULT_WEATHER,
        success: false,
        source: "fallback",
        message: "날씨 API 연결 전이거나 응답이 지연되어 예시값을 표시합니다.",
      });
    } finally {
      setWeatherLoading(false);
    }
  }

  const openNaverWeather = () => {
    window.open(
      "https://search.naver.com/search.naver?query=%EC%9D%B8%EC%B2%9C%EA%B3%B5%ED%95%AD%20%EB%82%A0%EC%94%A8%20%EB%AF%B8%EC%84%B8%EB%A8%BC%EC%A7%80",
      "_blank",
      "noopener,noreferrer",
    );
  };

  const openCamera = (slotKey: ImageSlotKey) => {
    pendingImageSlotRef.current = slotKey;
    cameraInputRef.current?.click();
  };

  const openPhotoLibrary = (slotKey: ImageSlotKey) => {
    pendingImageSlotRef.current = slotKey;
    libraryInputRef.current?.click();
  };

  const handleImageSelected = (
    event: React.ChangeEvent<HTMLInputElement>,
    sourceLabel: "카메라 촬영" | "사진첩 선택",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      const savedAt = new Date().toLocaleString("ko-KR");
      const slotKey = pendingImageSlotRef.current;
      const slotInfo =
        [...IMAGE_SLOTS, ISSUE_IMAGE_SLOT].find((slot) => slot.key === slotKey) ||
        IMAGE_SLOTS[0];
      const label = `${slotInfo.title} · ${sourceLabel}`;
      const nextImages = upsertImageBySlot(images, {
        id: `${Date.now()}`,
        type: slotKey,
        label,
        savedAt,
        dataUrl,
      });
      setImages(nextImages);
      saveImages(nextImages);
      setNotice(`${slotInfo.title}를 임시 저장했습니다.`);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImageSlot = (slotKey: ImageSlotKey) => {
    const image = getImageBySlot(images, slotKey);
    if (!image) return;

    const confirmed = window.confirm("이 이미지를 삭제할까요?");
    if (!confirmed) return;

    const nextImages = removeImageBySlot(images, slotKey);
    setImages(nextImages);
    saveImages(nextImages);
    setNotice(`${image.label}를 삭제했습니다.`);
  };

  const handleSaveNoteLocal = () => {
    saveNote(note);
    setNotice(
      "노트를 임시 저장했습니다. Notion 저장은 다음 단계에서 연결합니다.",
    );
  };

  const handleSaveDailyDraft = () => {
    setNotice(
      dailyStatus === "normal"
        ? "일일 업무 기록을 임시 저장했습니다. 상태: 이상 없음"
        : "일일 업무 기록을 임시 저장했습니다. 특이사항 입력 화면을 확인하세요.",
    );
  };

  const buildDailyPayload = () => {
    const dailyImages = IMAGE_SLOTS.map((slot) => {
      const image = getImageBySlot(images, slot.key);
      if (!image) return null;

      return {
        slotKey: slot.key,
        propertyName: IMAGE_SLOT_PROPERTY_NAME[slot.key],
        label: image.label,
        savedAt: image.savedAt,
        dataUrl: image.dataUrl,
      };
    }).filter(Boolean);

    return {
      title: `${todayText} KJ 일일 업무`,
      date: new Date().toISOString(),
      author,
      status: dailyStatus === "normal" ? "이상 없음" : "특이사항 있음",
      memo: note,
      images: dailyImages,
    };
  };

  const handleSaveDailyToNotion = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/notion/daily-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildDailyPayload()),
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(result?.detail || result?.message || "Notion 저장 실패");
      }

      const record = {
        pageId: result.pageId,
        url: result.url,
        savedAt: new Date().toLocaleString("ko-KR"),
      };

      setDailyNotionRecord(record);
      saveDailyNotionRecord(record);
      setNotice("Notion에 일일 업무 기록을 저장했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Notion 저장 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateDailyToNotion = async () => {
    if (!dailyNotionRecord?.pageId) {
      setNotice("수정할 Notion 일일 기록이 없습니다. 먼저 저장하세요.");
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/notion/daily-records/${encodeURIComponent(dailyNotionRecord.pageId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildDailyPayload()),
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(result?.detail || result?.message || "Notion 수정 실패");
      }

      const nextRecord = {
        ...dailyNotionRecord,
        url: result.url || dailyNotionRecord.url,
        savedAt: new Date().toLocaleString("ko-KR"),
      };

      setDailyNotionRecord(nextRecord);
      saveDailyNotionRecord(nextRecord);
      setNotice("Notion 일일 업무 기록을 수정했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Notion 수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteDailyFromNotion = async () => {
    if (!dailyNotionRecord?.pageId) {
      setNotice("삭제할 Notion 일일 기록이 없습니다.");
      return;
    }

    const confirmed = window.confirm("Notion 일일 업무 기록을 삭제할까요?");
    if (!confirmed) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/notion/daily-records/${encodeURIComponent(dailyNotionRecord.pageId)}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(result?.detail || result?.message || "Notion 삭제 실패");
      }

      clearDailyNotionRecord();
      setDailyNotionRecord(null);
      setNotice("Notion 일일 업무 기록을 삭제했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Notion 삭제 중 오류가 발생했습니다.");
    }
  };

  const openDailyNotionPage = () => {
    if (!dailyNotionRecord?.url) {
      setNotice("열 수 있는 Notion 링크가 없습니다.");
      return;
    }

    window.open(dailyNotionRecord.url, "_blank", "noopener,noreferrer");
  };

  const handleSaveIssueToNotion = async () => {
    if (!issueFlight.trim()) {
      setNotice("특이사항 기록을 위해 편명을 입력하세요.");
      return;
    }

    if (!issueText.trim()) {
      setNotice("특이사항 내용을 입력하세요.");
      return;
    }

    try {
      const issueImage = getImageBySlot(images, ISSUE_IMAGE_SLOT.key);

      const response = await fetch(`${BACKEND_URL}/notion/issue-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${issueFlight.trim().toUpperCase()} ${issueRoute || ""} 특이사항`,
          date: new Date().toISOString(),
          time: getCurrentTimeText(),
          flight: issueFlight.trim().toUpperCase(),
          route: issueRoute,
          hlnbr: issueHlnbr,
          issue: issueText,
          weather: getWeatherSummary(weather),
          author,
          status: "확인 중",
          image: issueImage
            ? {
                slotKey: ISSUE_IMAGE_SLOT.key,
                propertyName: IMAGE_SLOT_PROPERTY_NAME[ISSUE_IMAGE_SLOT.key],
                label: issueImage.label,
                savedAt: issueImage.savedAt,
                dataUrl: issueImage.dataUrl,
              }
            : null,
        }),
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(result?.detail || result?.message || "Notion 저장 실패");
      }

      setNotice("Notion에 특이사항 기록을 저장했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Notion 저장 중 오류가 발생했습니다.");
    }
  };

  const openLatestImage = (image: SavedImage) => {
    const win = window.open();
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${image.label}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { margin: 0; background: #020817; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            header { padding: 16px; font-weight: 800; }
            img { width: 100%; height: auto; display: block; }
            p { color: #cbd5e1; padding: 0 16px 18px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <header>${image.label}</header>
          <img src="${image.dataUrl}" />
          <p>아이폰에서 공유 버튼을 눌러 사진앱에 저장할 수 있습니다.</p>
        </body>
      </html>
    `);
  };

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={eyebrowStyle}>CARGO OPS</div>
        <h1 style={titleStyle}>KJ 화물기 출도착 모니터링</h1>
        <div style={datePillStyle}>{todayText}</div>
        <section style={weatherCardStyle}>
          <div style={weatherTopRowStyle}>
            <div>
              <div style={weatherLabelStyle}>인천공항 날씨</div>
              <div style={weatherLocationStyle}>{weather.location || "인천국제공항"} 기준</div>
            </div>
            <div style={weatherButtonGroupStyle}>
              <button onClick={fetchWeather} style={weatherButtonStyle}>
                {weatherLoading ? "조회 중" : "날씨 새로고침"}
              </button>
              <button onClick={openNaverWeather} style={weatherSubButtonStyle}>
                네이버 날씨
              </button>
            </div>
          </div>

          <div style={weatherMainRowStyle}>
            <div style={weatherTempStyle}>{weather.temperature || "-"}°</div>
            <div style={weatherConditionBoxStyle}>
              <div style={weatherIconStyle}>{weather.icon || "☀️"}</div>
              <div style={weatherConditionStyle}>{weather.condition || "-"}</div>
            </div>
          </div>

          <div style={weatherMetaStyle}>
            체감 {weather.feelsLike || "-"}° · 습도 {weather.humidity || "-"}% · 풍속 {weather.windSpeed || "-"}m/s
          </div>

          <div style={weatherGridStyle}>
            <WeatherMetric label="미세먼지" value={weather.pm10Grade || "-"} tone={getAirTone(weather.pm10Grade)} />
            <WeatherMetric label="초미세먼지" value={weather.pm25Grade || "-"} tone={getAirTone(weather.pm25Grade)} />
            <WeatherMetric label="자외선" value={weather.uvGrade || "-"} tone={getUvTone(weather.uvGrade)} />
            <WeatherMetric label="일몰" value={weather.sunset || "-"} tone="time" />
          </div>

          <div style={weatherNoteStyle}>
            날씨 기준 {weather.baseTime || "-"}
            {weather.source === "fallback" ? ` · ${weather.message || "예시값 표시 중"}` : " · 실시간 자동 표시"}
          </div>
        </section>
      </section>

      <section style={stackStyle}>
        <ActionCard
          label="편명조회"
          title="오늘 KJ 화물기 조회"
          description="편명, 출발·도착, 변경시간, 게이트 정보를 확인합니다."
          buttonLabel="편명조회 열기"
          onClick={openFlights}
          accent="#2563eb"
        />

        <section style={cardStyle}>
          <div style={cardLabelStyle}>최근 Schedule Flight</div>
          <h2 style={cardTitleStyle}>
            {latestRoom?.name || "저장된 스케줄 없음"}
          </h2>
          <div style={infoListStyle}>
            <FlightRouteRows room={latestRoom} />
            <InfoRow
              label="조회범위"
              value={
                latestRoom
                  ? `${formatDateTime(latestRoom.startDateTime)} ~ ${formatDateTime(latestRoom.endDateTime)}`
                  : "-"
              }
            />
            <InfoRow
              label="마지막 조회"
              value={latestRoom?.lastFetchedAt || "-"}
            />
            <InfoRow
              label="결과 수"
              value={`${getRoomRowsCount(latestRoom)}건`}
            />
          </div>
          <button onClick={openScheduleFlight} style={secondaryButtonStyle}>
            최근 Schedule Flight 열기
          </button>
        </section>

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
            {IMAGE_SLOTS.map((slot) => (
              <ImageSlotCard
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
            </div>
          )}
        </section>

        {dailyStatus === "issue" && (
          <section style={{ ...cardStyle, borderColor: "#f9731666" }}>
            <div style={cardLabelStyle}>특이사항 기록</div>
            <h2 style={cardTitleStyle}>문제 발생 대비 증빙 기록</h2>
            <p style={cardDescriptionStyle}>
              특이사항 발생 시 날짜, 시간, 편명, 구간, HL NBR, 날씨, 작성자, 이미지와 메모를 함께 저장합니다.
            </p>

            <ImageSlotCard
              slot={ISSUE_IMAGE_SLOT}
              image={getImageBySlot(images, ISSUE_IMAGE_SLOT.key)}
              onCamera={() => openCamera(ISSUE_IMAGE_SLOT.key)}
              onLibrary={() => openPhotoLibrary(ISSUE_IMAGE_SLOT.key)}
              onView={openLatestImage}
              onDelete={() => handleDeleteImageSlot(ISSUE_IMAGE_SLOT.key)}
            />

            <div style={formGridStyle}>
              <div style={fieldBlockStyle}>
                <label style={fieldLabelStyle}>날짜</label>
                <input value={todayText} readOnly style={inputStyle} />
              </div>

              <div style={fieldBlockStyle}>
                <label style={fieldLabelStyle}>시간</label>
                <input value={getCurrentTimeText()} readOnly style={inputStyle} />
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
              <input value={getWeatherSummary(weather)} readOnly style={inputStyle} />
            </div>

            <textarea
              value={issueText}
              onChange={(event) => setIssueText(event.target.value)}
              placeholder="특이사항을 입력하세요. 예: 게이트 변경, 지연, 점검 결과 이상 등"
              style={noteStyle}
            />

            <div style={buttonStackStyle}>
              <button onClick={handleSaveIssueToNotion} style={orangeButtonStyle}>
                Notion 특이사항 저장
              </button>
            </div>
          </section>
        )}

        {notice && <div style={noticeStyle}>{notice}</div>}
      </section>
      <footer style={footerStyle}>by jkpark</footer>
    </main>
  );
}

function getAirTone(value?: string): "good" | "normal" | "bad" | "time" {
  if (!value) return "normal";
  if (value.includes("좋음")) return "good";
  if (value.includes("나쁨") || value.includes("매우")) return "bad";
  return "normal";
}

function getUvTone(value?: string): "good" | "normal" | "bad" | "time" {
  if (!value) return "normal";
  if (value.includes("낮") || value.includes("좋음")) return "good";
  if (value.includes("높") || value.includes("위험")) return "bad";
  return "normal";
}

function WeatherMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "normal" | "bad" | "time";
}) {
  const valueColor =
    tone === "good"
      ? "#22c55e"
      : tone === "bad"
        ? "#ef4444"
        : tone === "normal"
          ? "#facc15"
          : "#dbeafe";

  return (
    <div style={weatherMetricStyle}>
      <span style={weatherMetricLabelStyle}>{label}</span>
      <strong style={{ ...weatherMetricValueStyle, color: valueColor }}>
        {value}
      </strong>
    </div>
  );
}

function ActionCard({
  label,
  title,
  description,
  buttonLabel,
  onClick,
  accent,
}: {
  label: string;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <section style={{ ...cardStyle, borderColor: `${accent}66` }}>
      <div style={cardLabelStyle}>{label}</div>
      <h2 style={cardTitleStyle}>{title}</h2>
      <p style={cardDescriptionStyle}>{description}</p>
      <button
        onClick={onClick}
        style={{ ...primaryButtonStyle, background: accent }}
      >
        {buttonLabel}
      </button>
    </section>
  );
}

function ImageSlotCard({
  slot,
  image,
  onCamera,
  onLibrary,
  onView,
  onDelete,
}: {
  slot: { key: ImageSlotKey; title: string; description: string };
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

function FlightRouteRows({ room }: { room: MonitorRoom | null }) {
  const items = getFlightRouteItems(room);

  return (
    <div style={infoRowStyle}>
      <div style={infoLabelStyle}>편명 / 구간</div>
      <div style={flightRouteListStyle}>
        {items.length > 0 ? (
          items.map((item) => (
            <div key={`${item.flight}-${item.route}`} style={flightRouteRowStyle}>
              <span style={flightRouteNoStyle}>{item.flight}</span>
              <span style={flightRouteValueStyle}>{item.route}</span>
            </div>
          ))
        ) : (
          <div style={infoValueStyle}>저장된 Schedule Flight가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={infoValueStyle}>{value}</span>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right, rgba(37, 99, 235, 0.26), transparent 32%), linear-gradient(180deg, #061121 0%, #07152b 52%, #020817 100%)",
  color: "#f8fafc",
  padding:
    "max(22px, env(safe-area-inset-top)) 16px max(28px, env(safe-area-inset-bottom))",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
};
const heroStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  margin: "0 auto",
  padding: "18px 0 12px",
};
const eyebrowStyle: CSSProperties = {
  color: "#9fb3c8",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: "0.22em",
  marginBottom: 14,
};
const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(30px, 9vw, 42px)",
  lineHeight: 1.08,
  letterSpacing: "-0.06em",
  fontWeight: 950,
  wordBreak: "keep-all",
};
const datePillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  marginTop: 14,
  padding: "9px 14px",
  borderRadius: 999,
  background: "rgba(37, 99, 235, 0.18)",
  border: "1px solid rgba(147, 197, 253, 0.28)",
  color: "#dbeafe",
  fontSize: 15,
  fontWeight: 800,
};
const weatherCardStyle: CSSProperties = {
  marginTop: 16,
  padding: 18,
  borderRadius: 26,
  background:
    "linear-gradient(160deg, rgba(31, 41, 55, 0.94), rgba(15, 23, 42, 0.94))",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  boxShadow: "0 18px 42px rgba(0, 0, 0, 0.28)",
};
const weatherTopRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};
const weatherLabelStyle: CSSProperties = {
  color: "#e5edf7",
  fontSize: 17,
  fontWeight: 950,
  letterSpacing: "-0.02em",
};
const weatherLocationStyle: CSSProperties = {
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 750,
};
const weatherButtonStyle: CSSProperties = {
  minWidth: 70,
  minHeight: 38,
  border: "1px solid rgba(191, 219, 254, 0.28)",
  borderRadius: 999,
  background: "rgba(15, 118, 110, 0.92)",
  color: "white",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};
const weatherButtonGroupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  alignItems: "flex-end",
};
const weatherSubButtonStyle: CSSProperties = {
  minWidth: 70,
  minHeight: 34,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: 999,
  background: "rgba(15, 23, 42, 0.74)",
  color: "#dbeafe",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};
const weatherMainRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginTop: 16,
};
const weatherTempStyle: CSSProperties = {
  fontSize: 58,
  lineHeight: 1,
  letterSpacing: "-0.08em",
  fontWeight: 950,
  color: "#f8fafc",
};
const weatherConditionBoxStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 82,
};
const weatherIconStyle: CSSProperties = {
  fontSize: 34,
  lineHeight: 1,
  marginBottom: 6,
};
const weatherConditionStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 16,
  fontWeight: 900,
};
const weatherMetaStyle: CSSProperties = {
  marginTop: 12,
  color: "#cbd5e1",
  fontSize: 14,
  fontWeight: 750,
  lineHeight: 1.45,
  wordBreak: "keep-all",
};
const weatherGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 16,
};
const weatherMetricStyle: CSSProperties = {
  padding: "12px 12px",
  borderRadius: 18,
  background: "rgba(2, 8, 23, 0.42)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
};
const weatherMetricLabelStyle: CSSProperties = {
  display: "block",
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 850,
  marginBottom: 5,
};
const weatherMetricValueStyle: CSSProperties = {
  display: "block",
  fontSize: 17,
  fontWeight: 950,
};
const weatherNoteStyle: CSSProperties = {
  marginTop: 12,
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.5,
  wordBreak: "keep-all",
};
const descriptionStyle: CSSProperties = {
  margin: "18px 0 0",
  color: "#b8c5d8",
  fontSize: 16,
  lineHeight: 1.65,
  wordBreak: "keep-all",
};
const stackStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  margin: "18px auto 0",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const cardStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 18,
  borderRadius: 24,
  background: "rgba(8, 20, 39, 0.84)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.24)",
  overflow: "hidden",
};
const cardLabelStyle: CSSProperties = {
  color: "#9fb3c8",
  fontSize: 13,
  letterSpacing: "0.12em",
  fontWeight: 900,
  textTransform: "uppercase",
  marginBottom: 8,
};
const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.25,
  letterSpacing: "-0.04em",
  fontWeight: 900,
  wordBreak: "keep-all",
};
const cardDescriptionStyle: CSSProperties = {
  margin: "12px 0 16px",
  color: "#b8c5d8",
  fontSize: 15,
  lineHeight: 1.6,
  wordBreak: "keep-all",
};
const primaryButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 52,
  border: "none",
  borderRadius: 16,
  color: "white",
  fontSize: 17,
  fontWeight: 900,
  cursor: "pointer",
};
const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  marginTop: 16,
  background: "#2563eb",
};
const greenButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "#16a34a",
};
const grayButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "#334155",
};
const darkButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "#111827",
  border: "1px solid rgba(148, 163, 184, 0.22)",
};
const buttonStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
const infoListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginTop: 14,
};
const flightRouteListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flex: 1,
};

const flightRouteRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "88px 1fr",
  gap: 12,
  alignItems: "center",
  color: "#f8fafc",
  fontSize: 15,
  fontWeight: 900,
  lineHeight: 1.35,
};

const flightRouteNoStyle: CSSProperties = {
  letterSpacing: 0.5,
  whiteSpace: "nowrap",
};

const flightRouteValueStyle: CSSProperties = {
  color: "#dbeafe",
  wordBreak: "keep-all",
};

const infoRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "86px 1fr",
  gap: 10,
  alignItems: "start",
  padding: "10px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
};
const infoLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 14,
  fontWeight: 800,
};
const infoValueStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 15,
  lineHeight: 1.45,
  fontWeight: 800,
  wordBreak: "break-word",
};
const imageListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginTop: 14,
};
const imagePreviewButtonStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "76px 1fr",
  gap: 12,
  alignItems: "center",
  width: "100%",
  padding: 10,
  borderRadius: 16,
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  color: "white",
  textAlign: "left",
};
const imagePreviewStyle: CSSProperties = {
  width: 76,
  height: 76,
  objectFit: "cover",
  borderRadius: 12,
  background: "#111827",
};
const imageTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 15,
  fontWeight: 900,
};
const imageDateStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
};
const noteStyle: CSSProperties = {
  width: "100%",
  minHeight: 130,
  boxSizing: "border-box",
  margin: "14px 0 12px",
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  background: "#020817",
  color: "white",
  fontSize: 16,
  lineHeight: 1.5,
  resize: "vertical",
};
const imageSlotListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  marginTop: 14,
};

const imageSlotCardStyle: CSSProperties = {
  border: "1px solid #26374f",
  borderRadius: 18,
  background: "#071426",
  padding: 14,
};

const imageSlotTitleStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 16,
  fontWeight: 950,
  marginBottom: 4,
};

const imageSlotDescStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  lineHeight: 1.45,
  marginBottom: 12,
};

const imageSlotSavedStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const imageSlotActionRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const miniButtonStyle: CSSProperties = {
  padding: "10px 8px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e5edf7",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const miniDangerButtonStyle: CSSProperties = {
  ...miniButtonStyle,
  background: "#450a0a",
  border: "1px solid #991b1b",
  color: "#fecaca",
};

const statusToggleStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  margin: "12px 0 16px",
};

const statusButtonStyle: CSSProperties = {
  padding: "12px 12px",
  borderRadius: 14,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#cbd5e1",
  fontWeight: 900,
  fontSize: 14,
  cursor: "pointer",
};

const statusActiveButtonStyle: CSSProperties = {
  ...statusButtonStyle,
  background: "#14532d",
  border: "1px solid #22c55e",
  color: "#dcfce7",
};

const statusIssueButtonStyle: CSSProperties = {
  ...statusButtonStyle,
  background: "#7c2d12",
  border: "1px solid #fb923c",
  color: "#ffedd5",
};

const fieldBlockStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 12,
};

const fieldLabelStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 900,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#020617",
  color: "#f8fafc",
  fontSize: 15,
  fontWeight: 800,
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
};

const orangeButtonStyle: CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "none",
  background: "#f97316",
  color: "white",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const notionSavedBoxStyle: CSSProperties = {
  marginTop: 14,
  border: "1px solid #14532d",
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

const noticeStyle: CSSProperties = {
  padding: 14,
  borderRadius: 18,
  background: "rgba(250, 204, 21, 0.12)",
  border: "1px solid rgba(250, 204, 21, 0.26)",
  color: "#fde68a",
  fontSize: 14,
  lineHeight: 1.5,
};
const footerStyle: CSSProperties = {
  maxWidth: 520,
  margin: "24px auto 0",
  padding: "8px 0",
  color: "#64748b",
  textAlign: "center",
  fontSize: 13,
  fontWeight: 800,
};
