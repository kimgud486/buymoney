import { KRX_AND_GLOBAL_MASTER_UNIVERSE } from "./krxMasterUniverse";
import { 
  matchesChosungOrKeyword, 
  COMPREHENSIVE_STOCK_INDEX, 
  OVERSEAS_STOCK_MAP, 
  DOMESTIC_STOCK_MAP, 
  CRYPTO_MAP
} from "../lib/stockDictionary";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";

export interface LiveStockItem {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ" | "US" | "UPBIT";

  dataStatus: "LIVE" | "STALE" | "DISCONNECTED";

  price: number | null;
  changeRate: number | null;
  changeAmount: number | null;

  volume: number | null;
  tradeValue: number | null;

  rvol: number | null;
  vwap: number | null;

  score: number | null;
  grade: "S+" | "S" | "A+" | "A" | "B" | "C" | null;

  signal:
    | "BUY_CANDIDATE"
    | "WATCH"
    | "HOLD"
    | "SELL_WATCH"
    | "SELL"
    | "NO_DATA";

  category?: "LARGE" | "MID" | "SMALL" | "CRYPTO";
  categoryLabel?: string;
  theme?: string;
  strategy?: string;
  marketCap?: string | null;
  isCustom?: boolean;
}

export type StockItem = LiveStockItem;

export interface MasterStockMetadata {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US";
  category: "LARGE" | "MID" | "SMALL" | "CRYPTO";
  categoryLabel: string;
  theme: string;
  strategy: string;
}

export const MASTER_STOCK_UNIVERSE_METADATA: MasterStockMetadata[] = [
  // 1. 국내 대형주 / 우량주 (KOREA - LARGE)
  {
    symbol: "005930",
    name: "삼성전자",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "반도체 / AI 하드웨어",
    strategy: "VWAP Reclaim + SMC Order Block"
  },
  {
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "HBM3E / AI 반도체",
    strategy: "52주 신고가 추세 추종"
  },
  {
    symbol: "005380",
    name: "현대차",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "완성차 / 로보틱스 / 수소",
    strategy: "밸류업 저PBR 수급 반등"
  },
  {
    symbol: "000270",
    name: "기아",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "완성차 / EV / 주주환원",
    strategy: "고배당 실적 성장 추세"
  },
  {
    symbol: "005490",
    name: "POSCO홀딩스",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "2차전지 소재 / 철강",
    strategy: "바닥 지지선 2차 반등"
  },
  {
    symbol: "105560",
    name: "KB금융",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "금융 / 밸류업 / 주주환원",
    strategy: "주주환원 확대 수급 유입"
  },
  {
    symbol: "035420",
    name: "NAVER",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "생성형 AI / 검색 / 이커머스",
    strategy: "IT 플랫폼 기관 수급 재유입"
  },
  {
    symbol: "035720",
    name: "카카오",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "카카오톡 / AI 서비스 / 모빌리티",
    strategy: "바닥 다지기 분할 매수"
  },
  {
    symbol: "068270",
    name: "셀트리온",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "바이오시밀러 / 짐펜트라 미국 출시",
    strategy: "미국 실적 모멘텀 돌파"
  },
  {
    symbol: "373220",
    name: "LG에너지솔루션",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "배터리 셀 / ESS / 미국 IRA",
    strategy: "2차전지 반등 세력 매집"
  },

  // 2. 국내 중형주 / 스윙 주도주 (KOREA - MID)
  {
    symbol: "012450",
    name: "한화에어로스페이스",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    theme: "K-방산 / 우주항공 / 수출모멘텀",
    strategy: "Bull Flag 돌파 가속"
  },
  {
    symbol: "034020",
    name: "두산에너빌리티",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    theme: "원전 / SMR / 가스터빈",
    strategy: "거래대금 폭발 전고점 돌파"
  },
  {
    symbol: "064350",
    name: "현대로템",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    theme: "방산(K2전차) / 철도 모빌리티",
    strategy: "외인 기관 쌍끌이 추세"
  },
  {
    symbol: "010120",
    name: "LS ELECTRIC",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    theme: "변압기 / AI 전력망 인프라",
    strategy: "거래량 가속 상승 랠리"
  },
  {
    symbol: "267260",
    name: "HD현대일렉트릭",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    theme: "초고압 변압기 / 북미 수주",
    strategy: "20일선 지지 후 전고점 트라이"
  },
  {
    symbol: "247540",
    name: "에코프로비엠",
    market: "KOSDAQ",
    category: "MID",
    categoryLabel: "중형주",
    theme: "양극재 / 2차전지 반등",
    strategy: "단기 과매도 기술적 반등"
  },
  {
    symbol: "196170",
    name: "알테오젠",
    market: "KOSDAQ",
    category: "MID",
    categoryLabel: "중형주",
    theme: "피하주사(SC) 플랫폼 / 키트루다",
    strategy: "코스닥 1위 대장주 모멘텀"
  },
  {
    symbol: "079550",
    name: "LIG넥스원",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    theme: "유도무기 / 천궁-II / 방산",
    strategy: "수출 수주 모멘텀 3파동"
  },
  {
    symbol: "042660",
    name: "한화오션",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    theme: "조선 / 특수선 / 함정 MRO",
    strategy: "미국 함정 정비 수주 상승"
  },
  {
    symbol: "003230",
    name: "삼양식품",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    theme: "불닭볶음면 / K-푸드 글로벌 수출",
    strategy: "해외 실적 신고가 가속"
  },

  // 3. 국내 소형주 / 테마 주도 알파 (KOREA - SMALL)
  {
    symbol: "277810",
    name: "레인보우로보틱스",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    theme: "휴머노이드 / 삼성 피인수 / 협동로봇",
    strategy: "소형주 수급 폭발 세력 매집 돌파"
  },
  {
    symbol: "454910",
    name: "두산로보틱스",
    market: "KOSPI",
    category: "SMALL",
    categoryLabel: "소형주",
    theme: "협동로봇 / 스마트팩토리 / 로보틱스",
    strategy: "로봇 테마 주도 수급 연동"
  },
  {
    symbol: "080220",
    name: "제주반도체",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    theme: "온디바이스 AI / 저전력 LPDDR",
    strategy: "온디바이스 AI 테마 1차 파동"
  },
  {
    symbol: "000250",
    name: "삼천당제약",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    theme: "경구용 GLP-1 비만치료제",
    strategy: "수급 쏠림형 급등 랠리"
  },
  {
    symbol: "056080",
    name: "유진로봇",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    theme: "자율주행 솔루션 / 물류로봇",
    strategy: "상한가 인접 강력 세력 매수세"
  },
  {
    symbol: "298380",
    name: "에이비엘바이오",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    theme: "이중항체 플랫폼 / BBB 셔틀",
    strategy: "기술수출 모멘텀 박스권 상단 돌파"
  },
  {
    symbol: "032820",
    name: "우리기술",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    theme: "체코 원전 수혜 / DCS 제어시스템",
    strategy: "동전주 탈출 테마 수급 폭발"
  },

  // 4. 미국 빅테크 / 글로벌 주도주 (US STOCKS)
  {
    symbol: "NVDA",
    name: "엔비디아",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    theme: "AI 가속기 / 블랙웰 GPU / AI반도체",
    strategy: "신고가 전고점 SMC 돌파"
  },
  {
    symbol: "TSLA",
    name: "테슬라",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    theme: "로보택시 / 옵티머스 로봇 / FSD",
    strategy: "200달러 눌림목 2차 진입"
  },
  {
    symbol: "AAPL",
    name: "애플",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    theme: "애플 인텔리전스 / 아이폰16 / AI스마트폰",
    strategy: "AI 온디바이스 수혜 상승 추세"
  },
  {
    symbol: "MSFT",
    name: "마이크로소프트",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    theme: "Copilot AI / Azure 클라우드 / OpenAI",
    strategy: "클라우드 성장 재가속"
  },
  {
    symbol: "AMZN",
    name: "아마존",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    theme: "AWS AI 클라우드 / 이커머스 / 로보틱스",
    strategy: "마진 개선 수급 유입"
  },
  {
    symbol: "GOOGL",
    name: "알파벳 (구글)",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    theme: "Gemini AI / 유튜브 / 자율주행 웨이모",
    strategy: "Gemini 1.5 Pro 모멘텀"
  },
  {
    symbol: "PLTR",
    name: "팔란티어",
    market: "US",
    category: "MID",
    categoryLabel: "미국 주도주",
    theme: "AIP AI 플랫폼 / 군사 안보 / S&P500 편입",
    strategy: "기업용 AI 수주 폭발 랠리"
  },
  {
    symbol: "MSTR",
    name: "마이크로스트래티지",
    market: "US",
    category: "MID",
    categoryLabel: "미국 주도주",
    theme: "비트코인 보유량 1위 기업 / BTC 레버리지",
    strategy: "BTC 신고가 돌파 연동 급등"
  },

  // 5. 국내 바이오 및 첨단 테크 우량주 (KOREA - TECH & BIO)
  {
    symbol: "207940",
    name: "삼성바이오로직스",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "바이오시밀러 / CDMO 글로벌 1위",
    strategy: "기관/외인 순매수 지속 우상향"
  },
  {
    symbol: "323410",
    name: "카카오뱅크",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "인터넷전문은행 / 핀테크 플랫폼",
    strategy: "플랫폼 수수료 이익 턴어라운드"
  },
  {
    symbol: "259960",
    name: "크래프톤",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    theme: "K-게임 / 펍지 배틀그라운드 IP",
    strategy: "글로벌 모바일 매출 호조 신고가 돌파"
  },
  {
    symbol: "AVGO",
    name: "브로드컴",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국대형주",
    theme: "AI ASIC 칩 / 데이터센터 네트워킹",
    strategy: "커스텀 AI 칩 수주 확대 모멘텀"
  },
  {
    symbol: "MU",
    name: "마이크론 테크놀로지",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국대형주",
    theme: "HBM3E / 고대역폭 메모리",
    strategy: "AI 메모리 슈퍼사이클 수혜"
  }
];

// Preserved array reference for legacy imports, evaluated strictly via live market feed
export const INITIAL_STOCK_UNIVERSE: StockItem[] = [];

/**
 * Creates a strict LiveStockItem strictly from real-time market data or fail-closed DISCONNECTED state.
 */
export function buildLiveStockItem(
  symbol: string,
  name: string,
  market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US",
  meta?: {
    category?: "LARGE" | "MID" | "SMALL" | "CRYPTO";
    categoryLabel?: string;
    theme?: string;
    strategy?: string;
    isCustom?: boolean;
  }
): LiveStockItem {
  const live = realtimeMarketFeedService.getQuote(symbol);

  // FAIL-CLOSED GATE: If live feed is missing, null, or has price <= 0, return NO_DATA and DISCONNECTED
  if (!live || typeof live.price !== "number" || live.price <= 0) {
    return {
      symbol,
      name,
      market,
      dataStatus: "DISCONNECTED",

      price: null,
      changeRate: null,
      changeAmount: null,

      volume: null,
      tradeValue: null,

      rvol: null,
      vwap: null,

      score: null,
      grade: null,

      signal: "NO_DATA",

      category: meta?.category || "LARGE",
      categoryLabel: meta?.categoryLabel || "",
      theme: meta?.theme || "",
      strategy: meta?.strategy || "",
      marketCap: null,
      isCustom: meta?.isCustom
    };
  }

  // Verified Real Live Market Data
  const isStale = live.status === "STALE";
  const dataStatus: "LIVE" | "STALE" = isStale ? "STALE" : "LIVE";

  return {
    symbol,
    name,
    market,
    dataStatus,

    price: live.price,
    changeRate: live.changeRate,
    changeAmount: live.changeAmount,

    volume: live.volume,
    tradeValue: live.tradeValue,

    rvol: null, // RVOL must be calculated dynamically by IndicatorEngine from real OHLCV candles
    vwap: null, // VWAP must be calculated dynamically by IndicatorEngine from real OHLCV candles

    score: null, // Setup Score computed dynamically by Scanner, not hardcoded
    grade: null,

    signal: isStale ? "NO_DATA" : "WATCH",

    category: meta?.category || "LARGE",
    categoryLabel: meta?.categoryLabel || "",
    theme: meta?.theme || "",
    strategy: meta?.strategy || "",
    marketCap: live.marketCap ? String(live.marketCap) : null,
    isCustom: meta?.isCustom
  };
}

export function getCustomStocks(): LiveStockItem[] {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem("aistock_custom_registered_stocks");
      if (raw) {
        const customMetaList = JSON.parse(raw);
        if (Array.isArray(customMetaList)) {
          return customMetaList.map((item) =>
            buildLiveStockItem(item.symbol, item.name, item.market || "KOSPI", {
              category: item.category,
              categoryLabel: item.categoryLabel,
              theme: item.theme,
              strategy: item.strategy,
              isCustom: true
            })
          );
        }
      }
    }
  } catch (e) {
    console.error("Failed to load custom stocks", e);
  }
  return [];
}

export function saveCustomStock(stock: LiveStockItem): void {
  try {
    const existing = getCustomStocks();
    const updated = [stock, ...existing.filter((s) => s.symbol !== stock.symbol)];
    localStorage.setItem("aistock_custom_registered_stocks", JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save custom stock", e);
  }
}

export function getAllStocks(): LiveStockItem[] {
  const custom = getCustomStocks();
  const map = new Map<string, LiveStockItem>();

  // 1. Base Master Universe
  MASTER_STOCK_UNIVERSE_METADATA.forEach((meta) => {
    map.set(meta.symbol, buildLiveStockItem(meta.symbol, meta.name, meta.market, meta));
  });

  // 2. Comprehensive KRX & Global master universe
  KRX_AND_GLOBAL_MASTER_UNIVERSE.forEach((master) => {
    if (!map.has(master.symbol)) {
      const marketVal: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" = 
        master.market === "US" ? "US" : master.market === "UPBIT" ? "UPBIT" : (master.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI");
      const catLabel = master.capCategory === "LARGE" ? "대형주" : master.capCategory === "MID" ? "중형주" : master.capCategory === "CRYPTO" ? "가상자산" : "소형주";

      map.set(
        master.symbol,
        buildLiveStockItem(master.symbol, master.name, marketVal, {
          category: master.capCategory,
          categoryLabel: catLabel,
          theme: master.sector || (master.themeTags ? master.themeTags.join(" / ") : "실시간 시세 연동"),
          strategy: "실시간 시장 수급 추세 추종"
        })
      );
    }
  });

  // 3. Fallback Dictionary Symbols (No fallback prices or values)
  Object.entries(OVERSEAS_STOCK_MAP).forEach(([sym, name]) => {
    if (!map.has(sym)) {
      map.set(
        sym,
        buildLiveStockItem(sym, name, "US", {
          category: "LARGE",
          categoryLabel: "미국주식",
          theme: "미국 주식 / 글로벌 우량주",
          strategy: "글로벌 모멘텀 추종"
        })
      );
    }
  });

  Object.entries(CRYPTO_MAP).forEach(([sym, name]) => {
    if (!map.has(sym) && !map.has(`KRW-${sym}`)) {
      map.set(
        sym,
        buildLiveStockItem(sym, name, "UPBIT", {
          category: "CRYPTO",
          categoryLabel: "가상자산",
          theme: "업비트 원화 가상자산",
          strategy: "24시간 변동성 추세 돌파"
        })
      );
    }
  });

  Object.entries(DOMESTIC_STOCK_MAP).forEach(([sym, name]) => {
    if (!map.has(sym)) {
      map.set(
        sym,
        buildLiveStockItem(sym, name, "KOSPI", {
          category: "LARGE",
          categoryLabel: "국내주식",
          theme: "국내 우량 상장주식",
          strategy: "KOSPI/KOSDAQ 주도주"
        })
      );
    }
  });

  // 4. User custom registered stocks
  custom.forEach((item) => {
    map.set(item.symbol, buildLiveStockItem(item.symbol, item.name, item.market, item));
  });

  return Array.from(map.values());
}

export function searchUniversalStocks(query: string, marketFilter?: string): LiveStockItem[] {
  const all = getAllStocks();
  if (!query || !query.trim()) {
    if (!marketFilter || marketFilter === "ALL") return all;
    return all.filter(s => s.market === marketFilter);
  }
  const cleanQ = query.trim();
  return all.filter(s => {
    if (marketFilter && marketFilter !== "ALL" && s.market !== marketFilter) return false;
    return matchesChosungOrKeyword(s.name, s.symbol, cleanQ, [
      s.theme || "", 
      s.categoryLabel || "", 
      s.strategy || "", 
      s.market
    ]);
  });
}


