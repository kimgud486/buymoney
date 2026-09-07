/**
 * Global Stock Name Dictionary, Chosung Search Engine, and Bilingual Resolution
 * Provides ultra-fast Hangul Chosung (초성), English ticker, and theme fuzzy matching.
 */

// Korean Chosung (초성) Table
const CHOSUNG_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

/**
 * Extracts Korean Chosung (초성) string from a given Korean text.
 * Example: "삼성전자" -> "ㅅㅅㅈㅈ", "SK하이닉스" -> "SKㅎㅇㄴㅅ"
 */
export function getChosung(text: string): string {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Korean Unicode range: 0xAC00 (가) ~ 0xD7A3 (힣)
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const chosungIndex = Math.floor((code - 0xAC00) / (21 * 28));
      result += CHOSUNG_LIST[chosungIndex] || text[i];
    } else {
      result += text[i];
    }
  }
  return result;
}

/**
 * Checks if the string consists solely of Korean Chosung consonants and alphanumeric chars.
 */
export function isChosungOnly(query: string): boolean {
  if (!query) return false;
  return /^[ㄱ-ㅎa-zA-Z0-9\s]+$/.test(query.trim()) && /[ㄱ-ㅎ]/.test(query);
}

/**
 * High-performance bilingual and Chosung fuzzy match engine.
 * Supports Korean Chosung (초성), English tickers, brand transliterations, themes, and aliases.
 */
export const COMMON_BRAND_TRANSLITERATION_MAP: Record<string, string[]> = {
  "woojin": ["우진엔텍", "457550"],
  "samsung": ["삼성", "삼성전자", "005930"],
  "hynix": ["하이닉스", "sk하이닉스", "000660"],
  "hyundai": ["현대", "현대차", "005380"],
  "kia": ["기아", "000270"],
  "kakao": ["카카오", "035720"],
  "naver": ["네이버", "035420"],
  "posco": ["포스코", "posco홀딩스", "005490"],
  "celltrion": ["셀트리온", "068270"],
  "ecopro": ["에코프로", "086520"],
  "hanwha": ["한화", "한화에어로스페이스", "012450"],
  "doosan": ["두산", "두산에너빌리티", "034020"],
  "lg": ["엘지", "lg엔솔", "lg화학", "373220"],
  "sk": ["에스케이", "sk하이닉스", "000660"],
  "tesla": ["테슬라", "tsla"],
  "nvidia": ["엔비디아", "nvda"],
  "apple": ["애플", "aapl"],
  "microsoft": ["마이크로소프트", "msft", "마소"],
  "amazon": ["아마존", "amzn"],
  "google": ["구글", "googl"],
  "meta": ["메타", "페이스북", "meta"],
  "palantir": ["팔란티어", "pltr"],
  "bitcoin": ["비트코인", "btc"],
  "ethereum": ["이더리움", "eth"],
  "solana": ["솔라나", "sol"],
  "dappos": ["댑오에스", "dos"],
  "doge": ["도지", "도지코인"],
  "ripple": ["리플", "xrp"],
  "coinbase": ["코인베이스", "coin"],
  "microstrategy": ["마이크로스트래티지", "mstr"],
  "broadcom": ["브로드컴", "avgo"],
  "amd": ["에이엠디", "amd"],
  "arm": ["암", "arm"],
  "supermicro": ["슈퍼마이크로", "smci"],
  "tsmc": ["대만반도체", "tsm"]
};

export function matchesChosungOrKeyword(targetName: string, targetSymbol: string, query: string, aliases?: string[]): boolean {
  if (!query) return true;
  const cleanQ = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!cleanQ) return true;

  const cleanName = (targetName || "").toLowerCase().replace(/\s+/g, "");
  const cleanSym = (targetSymbol || "").toLowerCase().replace(/\s+/g, "").replace(/^krw-/, "");

  // 1. Direct substring match on Symbol or Name
  if (cleanSym.includes(cleanQ) || cleanName.includes(cleanQ)) return true;

  // 2. Lookup in Dictionary maps
  const upperSym = cleanSym.toUpperCase();
  const dictOverseas = OVERSEAS_STOCK_MAP[upperSym] || "";
  const dictDomestic = DOMESTIC_STOCK_MAP[upperSym] || "";
  const dictCrypto = CRYPTO_MAP[upperSym] || "";

  if (dictOverseas && dictOverseas.toLowerCase().replace(/\s+/g, "").includes(cleanQ)) return true;
  if (dictDomestic && dictDomestic.toLowerCase().replace(/\s+/g, "").includes(cleanQ)) return true;
  if (dictCrypto && dictCrypto.toLowerCase().replace(/\s+/g, "").includes(cleanQ)) return true;

  // 3. Korean Chosung Match
  const nameChosung = getChosung(targetName).toLowerCase().replace(/\s+/g, "");
  if (nameChosung.includes(cleanQ)) return true;

  if (dictOverseas && getChosung(dictOverseas).toLowerCase().replace(/\s+/g, "").includes(cleanQ)) return true;
  if (dictDomestic && getChosung(dictDomestic).toLowerCase().replace(/\s+/g, "").includes(cleanQ)) return true;
  if (dictCrypto && getChosung(dictCrypto).toLowerCase().replace(/\s+/g, "").includes(cleanQ)) return true;

  // 4. Aliases Match & Aliases Chosung
  if (aliases && aliases.length > 0) {
    for (const a of aliases) {
      if (!a) continue;
      const cleanA = a.toLowerCase().replace(/\s+/g, "");
      if (cleanA.includes(cleanQ)) return true;
      const aChosung = getChosung(a).toLowerCase().replace(/\s+/g, "");
      if (aChosung.includes(cleanQ)) return true;
    }
  }

  // 5. English Brand Transliteration Keyword Mapping
  for (const [brandKey, equivalents] of Object.entries(COMMON_BRAND_TRANSLITERATION_MAP)) {
    if (cleanQ.includes(brandKey) || brandKey.includes(cleanQ)) {
      if (equivalents.some(eq => cleanName.includes(eq) || cleanSym.includes(eq) || (aliases && aliases.some(a => a.toLowerCase().includes(eq))))) {
        return true;
      }
    }
  }

  return false;
}

export interface SearchableStockItem {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  sectorTag: string;
  price: number;
  changePct: number;
  aliases?: string[];
  themeTags?: string[];
}

export const OVERSEAS_STOCK_MAP: Record<string, string> = {
  // Big Tech & Magnificent 7
  "AAPL": "애플 (Apple Inc.)",
  "NVDA": "엔비디아 (NVIDIA Corp.)",
  "TSLA": "테슬라 (Tesla Inc.)",
  "MSFT": "마이크로소프트 (Microsoft Corp.)",
  "AMZN": "아마존 (Amazon.com Inc.)",
  "GOOGL": "알파벳/구글 Class A (Alphabet)",
  "GOOG": "알파벳/구글 Class C (Alphabet)",
  "META": "메타 페이스북 (Meta Platforms)",
  
  // Semiconductors & AI Hardware
  "AMD": "AMD (Advanced Micro Devices)",
  "INTC": "인텔 (Intel Corp.)",
  "AVGO": "브로드컴 (Broadcom Inc.)",
  "QCOM": "퀄컴 (Qualcomm Inc.)",
  "TXN": "텍사스 인스트루먼트 (Texas Instruments)",
  "MU": "마이크론 테크놀로지 (Micron Technology)",
  "LRCX": "램리서치 (Lam Research)",
  "AMAT": "어플라이드 머티리얼즈 (Applied Materials)",
  "ASML": "ASML 홀딩 (ASML Holding NV)",
  "ARM": "암 홀딩스 (Arm Holdings plc)",
  "SMCI": "슈퍼마이크로 (Super Micro Computer)",
  "TSM": "TSMC (대만 반도체)",
  "MRVL": "마벨 테크놀로지 (Marvell Technology)",

  // Software & Cloud & Cybersecurity
  "PLTR": "팔란티어 테크놀로지스 (Palantir)",
  "CRM": "세일즈포스 (Salesforce Inc.)",
  "ORCL": "오라클 (Oracle Corp.)",
  "NOW": "서비스나우 (ServiceNow Inc.)",
  "SNOW": "스노우플레이크 (Snowflake Inc.)",
  "CRWD": "크라우드스트라이크 (CrowdStrike)",
  "PANW": "팔로알토 네트웍스 (Palo Alto)",
  "ADBE": "어도비 (Adobe Inc.)",
  "IBM": "IBM (International Business Machines)",
  "U": "유니티 소프트웨어 (Unity Software)",

  // Crypto & Fintech & Payments
  "COIN": "코인베이스 (Coinbase Global)",
  "MSTR": "마이크로스트래티지 (MicroStrategy)",
  "HOOD": "로빈후드 (Robinhood Markets)",
  "PYPL": "페이팔 (PayPal Holdings)",
  "SQ": "블록 (Block Inc. / Square)",
  "V": "비자 (Visa Inc.)",
  "MA": "마스터카드 (Mastercard Inc.)",

  // EV & Mobility & Aerospace
  "RIVN": "리비안 (Rivian Automotive)",
  "LCID": "루시드 (Lucid Group)",
  "NIO": "니오 (NIO Inc.)",
  "XPEV": "샤오펑 (XPeng Inc.)",
  "UBER": "우버 (Uber Technologies)",
  "ABNB": "에어비앤비 (Airbnb Inc.)",
  "BA": "보잉 (Boeing Co.)",

  // Consumer & Retail & Healthcare & Finance
  "COST": "코스트코 (Costco Wholesale)",
  "NFLX": "넷플릭스 (Netflix Inc.)",
  "BRK.B": "버크셔 해서웨이 (Berkshire B)",
  "BRK.A": "버크셔 해서웨이 (Berkshire A)",
  "DIS": "디즈니 (Walt Disney Co.)",
  "LLY": "일라이 릴리 (Eli Lilly & Co.)",
  "UNH": "유나이티드헬스 (UnitedHealth)",
  "NKE": "나이키 (Nike Inc.)",
  "JPM": "JP모건 체이스 (JPMorgan Chase)",
  "WMT": "월마트 (Walmart Inc.)",
  "XOM": "엑손모빌 (Exxon Mobil)",
  "PG": "P&G (Procter & Gamble)",
  "JNJ": "존슨앤드존슨 (Johnson & Johnson)",
  "PFE": "화이자 (Pfizer Inc.)",
  "BAC": "뱅크오브아메리카 (Bank of America)",
  "BABA": "알리바바 (Alibaba Group)",
  "SBUX": "스타벅스 (Starbucks Corp.)",
  "KO": "코카콜라 (Coca-Cola Co.)",
  "PEP": "펩시코 (PepsiCo Inc.)",
  "MCD": "맥도날드 (McDonald's Corp.)",
  "ISRG": "인튜이티브 서지컬 (Intuitive Surgical)",

  // Major US ETFs
  "SOXX": "iShares 미국 반도체 ETF",
  "SOXL": "Direxion 3X 반도체 레버리지 ETF",
  "QQQ": "Invesco QQQ 나스닥100 ETF",
  "TQQQ": "ProShares 3X 나스닥 레버리지 ETF",
  "SQQQ": "ProShares 3X 나스닥 인버스 ETF",
  "SPY": "SPDR S&P500 지수 ETF",
  "VOO": "Vanguard S&P500 지수 ETF",
  "SCHD": "Schwab 미국 배당다우존스 ETF",
  "TLT": "iShares 20년+ 미국채 ETF",
  "TMF": "Direxion 3X 20년+ 미국채 레버리지 ETF",
  "NVDL": "GraniteShares 2X 엔비디아 레버리지 ETF",
  "TSLL": "YieldMax 테슬라 레버리지 ETF",
  "BITO": "ProShares 비트코인 선물 ETF",
  "IBIT": "iShares 비트코인 현물 ETF"
};

export const DOMESTIC_STOCK_MAP: Record<string, string> = {
  "457550": "우진엔텍",
  "452880": "우진엔텍",
  "450880": "우진엔텍",
  "005930": "삼성전자",
  "000660": "SK하이닉스",
  "035420": "NAVER",
  "035720": "카카오",
  "005380": "현대차",
  "000270": "기아",
  "068270": "셀트리온",
  "005935": "삼성전자우",
  "105560": "KB금융",
  "055550": "신한지주",
  "005490": "POSCO홀딩스",
  "051910": "LG화학",
  "373220": "LG에너지솔루션",
  "207940": "삼성바이오로직스",
  "012330": "현대모비스",
  "028260": "삼성물산",
  "003550": "LG",
  "032830": "삼성생명",
  "000810": "삼성화재",
  "086520": "에코프로",
  "247540": "에코프로비엠",
  "403870": "HPSP",
  "403070": "HPSP",
  "042700": "한미반도체",
  "272210": "한화시스템",
  "012450": "한화에어로스페이스",
  "009540": "HD한국조선해양",
  "010140": "삼성중공업",
  "034020": "두산에너빌리티",
  "277810": "레인보우로보틱스",
  "018260": "삼성에스디에스",
  "006400": "삼성SDI",
  "009150": "삼성전기",
  "036570": "엔씨소프트",
  "259960": "크래프톤",
  "196170": "알테오젠",
  "024110": "기업은행",
  "323410": "카카오뱅크",
  "377300": "카카오페이",
  "003490": "대한항공",
  "011200": "HMM",
  "030200": "KT",
  "017670": "SK텔레콤",
  "032640": "LG유플러스",
  "000100": "유한양행",
  "128940": "한미약품",
  "003670": "포스코퓨처엠",
  "010130": "고려아연",
  "015760": "한국전력",
  "033780": "KT&G",
  "267260": "HD현대일렉트릭",
  "017040": "대성에너지",
  "080220": "제주반도체",
  "001440": "대한전선",
  "028300": "HLB",
  "003230": "삼양식품"
};

export const CRYPTO_MAP: Record<string, string> = {
  "BTC": "비트코인 (Bitcoin)",
  "ETH": "이더리움 (Ethereum)",
  "SOL": "솔라나 (Solana)",
  "XRP": "리플 (Ripple)",
  "DOGE": "도지코인 (Dogecoin)",
  "DOS": "댑오에스 (dappOS)",
  "DAPPOS": "댑오에스 (dappOS)",
  "ADA": "에이다 (Cardano)",
  "AVAX": "아발란체 (Avalanche)",
  "DOT": "폴카닷 (Polkadot)",
  "SEI": "세이 (Sei)",
  "SUI": "수이 (Sui)",
  "SHIB": "시바이누 (Shiba Inu)",
  "PEPE": "페페 (Pepe)",
  "NEAR": "니어프로토콜 (Near)",
  "STX": "스택스 (Stacks)",
  "LINK": "체인링크 (Chainlink)",
  "XLM": "스텔라루멘 (Stellar)",
  "APT": "앱토스 (Aptos)",
  "SAND": "샌드박스 (Sandbox)",
  "MANA": "디센트럴랜드 (Decentraland)",
  "MATIC": "폴리곤 (Polygon)",
  "POL": "폴리곤 에코 (POL)",
  "ETC": "이더리움클래식 (ETC)",
  "BCH": "비트코인캐시 (BCH)",
  "BORA": "보라 (BORA)",
  "GLM": "골렘 (Golem)",
  "CRO": "크로노스 (Cronos)",
  "WAVES": "웨이브 (Waves)",
  "HIFI": "하이파이 (Hifi Finance)",
  "CHZ": "칠리즈 (Chiliz)",
  "TRX": "트론 (Tron)",
  "ARB": "아비트럼 (Arbitrum)",
  "OP": "옵티미즘 (Optimism)",
  "HBAR": "헤데라 (Hedera)",
  "ALGO": "알고랜드 (Algorand)",
  "QTUM": "퀀텀 (Qtum)",
  "BAT": "베이직어텐션토큰 (BAT)",
  "ZIL": "질리카 (Zilliqa)",
  "WAXP": "왁스 (WAX)",
  "IOST": "이오스트 (IOST)",
  "FLOW": "플로우 (Flow)",
  "KAVA": "카바 (Kava)",
  "TON": "톤 (Toncoin)",
  "WLD": "월드코인 (Worldcoin)",
  "RENDER": "렌더 (Render)",
  "FET": "인공지능동맹 (FET)",
  "GALA": "갈라 (Gala)",
  "PYTH": "피스네트워크 (Pyth)",
  "BLUR": "블러 (Blur)",
  "TIA": "셀레스티아 (Celestia)",
  "INJ": "인젝티브 (Injective)",
  "ONDO": "온도파이낸스 (Ondo)",
  "PENDLE": "펜들 (Pendle)",
  "TAO": "비텐서 (Bittensor)"
};

export function safeSymbolStr(symbol: any): string {
  if (symbol === null || symbol === undefined) return "";
  if (typeof symbol === "string") return symbol.trim();
  if (typeof symbol === "number") return String(symbol).trim();
  if (typeof symbol === "object") {
    if (typeof symbol.symbol === "string") return symbol.symbol.trim();
    if (typeof symbol.code === "string") return symbol.code.trim();
    if (typeof symbol.ticker === "string") return symbol.ticker.trim();
    if (typeof symbol.id === "string") return symbol.id.trim();
  }
  return String(symbol).trim();
}

/**
 * Returns a clean, bilingual stock name for any symbol and market type.
 */
export function resolveStockName(symbol: any, rawName?: string, market?: string): string {
  const cleanSym = safeSymbolStr(symbol).toUpperCase();
  if (!cleanSym) {
    return rawName && typeof rawName === "string" && rawName.trim() ? rawName.trim() : "미지정 종목";
  }
  const unCrypto = cleanSym.replace("KRW-", "");

  const safeRawName = typeof rawName === "string" ? rawName : typeof rawName === "object" && rawName && "name" in rawName ? (rawName as any).name : undefined;

  // 0. Explicit Crypto / Upbit handling
  const isExplicitCrypto = market === "BTC" || market === "UPBIT" || cleanSym.startsWith("KRW-");
  if (isExplicitCrypto) {
    if (CRYPTO_MAP[unCrypto]) return CRYPTO_MAP[unCrypto];
    if (CRYPTO_MAP[cleanSym]) return CRYPTO_MAP[cleanSym];
    if (safeRawName && safeRawName.trim() && safeRawName !== cleanSym && !safeRawName.includes("Corp.") && !safeRawName.includes("미국")) {
      return `${safeRawName} (가상자산)`;
    }
    return `${unCrypto} (업비트 가상자산)`;
  }

  // 1. Domestic Stock Map (6-digit numeric symbol)
  if (DOMESTIC_STOCK_MAP[cleanSym]) {
    return DOMESTIC_STOCK_MAP[cleanSym];
  }
  if (/^\d{6}$/.test(cleanSym)) {
    return safeRawName || `${cleanSym} (국내 주식)`;
  }

  // 2. Explicit US market lookup
  if (market === "US" && OVERSEAS_STOCK_MAP[cleanSym]) {
    return OVERSEAS_STOCK_MAP[cleanSym];
  }

  // 3. Check Crypto Map (even without explicit market)
  if (CRYPTO_MAP[cleanSym] || CRYPTO_MAP[unCrypto]) {
    return CRYPTO_MAP[cleanSym] || CRYPTO_MAP[unCrypto];
  }

  // 4. Check Overseas US Map
  if (OVERSEAS_STOCK_MAP[cleanSym]) {
    return OVERSEAS_STOCK_MAP[cleanSym];
  }

  // 5. If rawName exists and is informative
  if (safeRawName && safeRawName.trim() !== "" && safeRawName.trim().toUpperCase() !== cleanSym && safeRawName !== "US_STOCK") {
    if (cleanSym === "AAPL" && !safeRawName.includes("애플")) return "애플 (Apple Inc.)";
    if (cleanSym === "NVDA" && !safeRawName.includes("엔비디아")) return "엔비디아 (NVIDIA Corp.)";
    if (cleanSym === "TSLA" && !safeRawName.includes("테슬라")) return "테슬라 (Tesla Inc.)";
    if (cleanSym === "MSFT" && !safeRawName.includes("마이크로소프트")) return "마이크로소프트 (Microsoft Corp.)";
    return safeRawName;
  }

  // 6. Market-aware fallback
  if (market === 'US') {
    return `${cleanSym} Corp. (미국 주식)`;
  }
  if (market === 'KOREA') {
    return `${cleanSym} (국내 주식)`;
  }

  return cleanSym;
}

/**
 * Comprehensive in-memory search index for high-speed multi-market suggestions.
 */
export const COMPREHENSIVE_STOCK_INDEX: SearchableStockItem[] = [
  // 🇰🇷 KOSPI & KOSDAQ (한국증시 우량/인기주)
  { symbol: "005930", name: "삼성전자", market: "KOREA", sectorTag: "반도체/대장주", price: 74800, changePct: 2.80, aliases: ["삼전", "삼성", "samsung", "ㅅㅅㅈㅈ"], themeTags: ["AI반도체", "HBM", "CXL", "파운드리"] },
  { symbol: "000660", name: "SK하이닉스", market: "KOREA", sectorTag: "AI 반도체", price: 198500, changePct: 2.10, aliases: ["하닉", "하이닉스", "sk", "ㅎㅇㄴㅅ", "ㅅㅋㅎㅇㄴㅅ"], themeTags: ["HBM3E", "엔비디아공급망", "AI가속기"] },
  { symbol: "207940", name: "삼성바이오로직스", market: "KOREA", sectorTag: "바이오 CDMO", price: 920000, changePct: 1.10, aliases: ["삼바", "삼성바이오", "ㅅㅅㅂㅇㅇ"], themeTags: ["CDMO", "항체약물접합체", "바이오"] },
  { symbol: "005490", name: "POSCO홀딩스", market: "KOREA", sectorTag: "철강/리튬/2차전지", price: 375000, changePct: 0.95, aliases: ["포스코", "포홀", "ㅍㅅㅋ"], themeTags: ["리튬", "2차전지소재", "철강"] },
  { symbol: "005380", name: "현대차", market: "KOREA", sectorTag: "자동차/모빌리티", price: 245000, changePct: -0.81, aliases: ["현대", "hyundai", "ㅎㄷㅊ"], themeTags: ["전기차", "자율주행", "저PBR", "밸류업"] },
  { symbol: "000270", name: "기아", market: "KOREA", sectorTag: "자동차", price: 118000, changePct: 1.72, aliases: ["kia", "ㄱㅇ"], themeTags: ["PBV", "전기차", "저PBR"] },
  { symbol: "012330", name: "현대모비스", market: "KOREA", sectorTag: "자동차부품/전장", price: 235000, changePct: 1.30, aliases: ["모비스", "현모", "ㅎㄷㅁㅂㅅ"], themeTags: ["전장", "자율주행", "저PBR"] },
  { symbol: "035420", name: "NAVER", market: "KOREA", sectorTag: "플랫폼/인터넷", price: 182000, changePct: 0.55, aliases: ["네이버", "naver", "ㄴㅇㅂ"], themeTags: ["생성형AI", "하이퍼클로바X", "클라우드"] },
  { symbol: "035720", name: "카카오", market: "KOREA", sectorTag: "플랫폼", price: 42500, changePct: -1.16, aliases: ["kakao", "ㅋㅋㅇ"], themeTags: ["플랫폼", "카카오톡", "핀테크"] },
  { symbol: "323410", name: "카카오뱅크", market: "KOREA", sectorTag: "인터넷은행", price: 22800, changePct: 1.80, aliases: ["카뱅", "카카오뱅크", "ㅋㅋㅇㅂㅋ"], themeTags: ["인터넷은행", "핀테크", "플랫폼"] },
  { symbol: "377300", name: "카카오페이", market: "KOREA", sectorTag: "간편결제/핀테크", price: 27500, changePct: -0.90, aliases: ["카페", "카카오페이", "ㅋㅋㅇㅍㅇ"], themeTags: ["간편결제", "증권", "원화결제"] },
  { symbol: "259960", name: "크래프톤", market: "KOREA", sectorTag: "K-게임/배틀그라운드", price: 310000, changePct: 2.80, aliases: ["배그", "크래프톤", "ㅋㄹㅍㅌ"], themeTags: ["배틀그라운드", "게임신작", "AI게임"] },
  { symbol: "036570", name: "엔씨소프트", market: "KOREA", sectorTag: "K-게임/리니지", price: 195000, changePct: 0.80, aliases: ["엔씨", "nc", "ㅇㅆㅅㅍㅌ"], themeTags: ["리니지", "TL", "게임"] },
  { symbol: "068270", name: "셀트리온", market: "KOREA", sectorTag: "바이오시밀러", price: 184000, changePct: 0.55, aliases: ["셀트", "ㅅㅌㄹㅇ"], themeTags: ["짐펜트라", "바이오", "FDA승인"] },
  { symbol: "196170", name: "알테오젠", market: "KOREA", sectorTag: "바이오플랫폼", price: 285000, changePct: 4.80, aliases: ["알테", "ㅇㅌㅇㅈ"], themeTags: ["키트루다SC", "기술수출", "바이오"] },
  { symbol: "373220", name: "LG에너지솔루션", market: "KOREA", sectorTag: "2차전지 배터리", price: 342000, changePct: 0.88, aliases: ["엔솔", "엘지에너지솔루션", "ㅇㅈㅇㄴㅈㅅㄹㅅ"], themeTags: ["전기차배터리", "LFP", "ESS"] },
  { symbol: "051910", name: "LG화학", market: "KOREA", sectorTag: "석유화학/양극재", price: 315000, changePct: 0.50, aliases: ["엘화", "LG화학", "ㅇㅈㅎㅎ"], themeTags: ["양극재", "친환경소재"] },
  { symbol: "066570", name: "LG전자", market: "KOREA", sectorTag: "가전/전장부품", price: 98000, changePct: 1.20, aliases: ["엘전", "LG전자", "ㅇㅈㅈㅈ"], themeTags: ["VS전장", "가전", "구독경제"] },
  { symbol: "006400", name: "삼성SDI", market: "KOREA", sectorTag: "2차전지/전고체", price: 325000, changePct: 1.40, aliases: ["삼스디", "삼성sdi", "ㅅㅅsdi"], themeTags: ["전고체배터리", "BMW배터리"] },
  { symbol: "247540", name: "에코프로비엠", market: "KOREA", sectorTag: "양극재", price: 185000, changePct: 2.30, aliases: ["에코비엠", "ㅇㅋㅍㄹㅂㅇ"], themeTags: ["하이니켈", "2차전지", "양극재"] },
  { symbol: "086520", name: "에코프로", market: "KOREA", sectorTag: "2차전지 지주", price: 92000, changePct: 3.12, aliases: ["에코", "ㅇㅋㅍㄹ"], themeTags: ["2차전지", "수직계열화"] },
  { symbol: "386870", name: "에코프로에이치엔", market: "KOREA", sectorTag: "친환경/2차전지소재", price: 43500, changePct: 3.80, aliases: ["에코에이치엔", "ㅇㅋㅍㄹㅇㅇㅊㅇ"], themeTags: ["온실가스", "전해질첨가제"] },
  { symbol: "450080", name: "에코프로머티", market: "KOREA", sectorTag: "전구체", price: 104000, changePct: 1.95, aliases: ["머티", "ㅇㅋㅍㄹㅁㅌ"], themeTags: ["전구체", "IRA수혜"] },
  { symbol: "012450", name: "한화에어로스페이스", market: "KOREA", sectorTag: "K-방산/우주", price: 295000, changePct: 4.20, aliases: ["에어로", "한화에어로", "ㅎㅎㅇㅇㄹㅅㅍㅇㅅ"], themeTags: ["K9자주포", "천무", "우주항공", "누리호"] },
  { symbol: "064350", name: "현대로템", market: "KOREA", sectorTag: "K2전차/철도", price: 61200, changePct: 3.38, aliases: ["로템", "현대로템", "ㅎㄷㄹㅌ"], themeTags: ["K2전차", "폴란드수출", "방산"] },
  { symbol: "079550", name: "LIG넥스원", market: "KOREA", sectorTag: "유도무기/방산", price: 215000, changePct: 4.10, aliases: ["넥스원", "lig", "ㄹㅇㅈㄴㅅㅇ"], themeTags: ["천궁-II", "고스트로보틱스", "방산"] },
  { symbol: "042700", name: "한미반도체", market: "KOREA", sectorTag: "HBM 장비", price: 135000, changePct: 3.80, aliases: ["한미", "ㅎㅁㅂㄷㅊ"], themeTags: ["TC본더", "HBM3E", "후공정"] },
  { symbol: "034020", name: "두산에너빌리티", market: "KOREA", sectorTag: "SMR/원자력", price: 21500, changePct: 3.20, aliases: ["두산", "두에빌", "ㄷㅅㅇㄴㅂㄹㅌ"], themeTags: ["체코원전", "SMR", "가스터빈"] },
  { symbol: "277810", name: "레인보우로보틱스", market: "KOREA", sectorTag: "휴머노이드 로봇", price: 165000, changePct: 5.40, aliases: ["레인보우", "로봇", "ㄹㅇㅂㅇㄹㅂㅌㅅ"], themeTags: ["삼성로봇", "협동로봇", "휴머노이드"] },
  { symbol: "009540", name: "HD한국조선해양", market: "KOREA", sectorTag: "조선/해양", price: 142000, changePct: 1.80, aliases: ["한국조선해양", "조선", "ㅎㄷㅎㄱㅈㅅㅎㅇ"], themeTags: ["LNG운반선", "슈퍼사이클", "조선업"] },
  { symbol: "267260", name: "HD현대일렉트릭", market: "KOREA", sectorTag: "전력인프라/변압기", price: 285000, changePct: 6.10, aliases: ["현대일렉", "변압기", "ㅎㄷㅎㄷㅇㄹㅌㄹ"], themeTags: ["AI데이터센터", "초고압변압기", "북미인프라"] },
  { symbol: "105560", name: "KB금융", market: "KOREA", sectorTag: "금융/은행", price: 78000, changePct: 0.90, aliases: ["국민은행", "kb", "ㅋㅂㄱㅇ"], themeTags: ["저PBR", "고배당", "밸류업"] },
  { symbol: "055550", name: "신한지주", market: "KOREA", sectorTag: "금융/은행", price: 52500, changePct: 0.80, aliases: ["신한", "신한은행", "ㅅㅎㅈㅈ"], themeTags: ["밸류업", "자사주매입", "고배당"] },
  { symbol: "017040", name: "대성에너지", market: "KOREA", sectorTag: "도시가스/에너지", price: 9850, changePct: 3.45, aliases: ["대성", "대성에너지", "ㄷㅅㅇㄴㅈ"], themeTags: ["천연가스", "에너지수급", "겨울난방", "유가급등수혜"] },
  { symbol: "080220", name: "제주반도체", market: "KOREA", sectorTag: "온디바이스 AI 칩", price: 21500, changePct: 4.85, aliases: ["제주", "제주반도체", "ㅈㅈㅂㄷㅊ"], themeTags: ["온디바이스AI", "LPDDR", "팹리스"] },
  { symbol: "028300", name: "HLB", market: "KOREA", sectorTag: "바이오 신약", price: 78500, changePct: 2.10, aliases: ["에이치엘비", "hlb", "ㅇㅇㅊㅇㅂ"], themeTags: ["리보세라닙", "간암신약", "FDA재승인"] },
  { symbol: "001440", name: "대한전선", market: "KOREA", sectorTag: "전력망/해저케이블", price: 14500, changePct: 5.20, aliases: ["대한전선", "전선", "ㄷㅎㅈㅅ"], themeTags: ["초고압직류송전", "해저케이블", "전력인프라"] },
  { symbol: "003230", name: "삼양식품", market: "KOREA", sectorTag: "K-푸드/수출", price: 620000, changePct: 4.35, aliases: ["삼양", "불닭", "ㅅㅇㅅㅍ"], themeTags: ["불닭볶음면", "수출호조", "미국월마트"] },
  { symbol: "011200", name: "HMM", market: "KOREA", sectorTag: "해운/컨테이너", price: 18200, changePct: 2.10, aliases: ["hmm", "현대상선", "ㅎㅁㅁ"], themeTags: ["해운운임지수", "SCFI", "물류"] },
  { symbol: "015760", name: "한국전력", market: "KOREA", sectorTag: "전력/공기업", price: 21200, changePct: -0.50, aliases: ["한전", "한국전력", "ㅎㄱㅈㄹ"], themeTags: ["전기요금인상", "원자력", "공기업"] },

  // 🇺🇸 US STOCKS & ETFS (미국 주요 증시)
  { symbol: "NVDA", name: "엔비디아 (NVIDIA)", market: "US", sectorTag: "AI 반도체 1위", price: 128.5, changePct: 4.25, aliases: ["엔비", "엔비디아", "nvidia", "ㅇㅂㄷㅇ"], themeTags: ["블랙웰", "AI가속기", "CUDA", "데이터센터"] },
  { symbol: "TSLA", name: "테슬라 (Tesla)", market: "US", sectorTag: "전기차/FSD 로봇", price: 218.4, changePct: -2.30, aliases: ["테슬", "테슬라", "tesla", "ㅌㅅㄹ"], themeTags: ["로보택시", "FSD", "옵티머스", "에너지스토리지"] },
  { symbol: "AAPL", name: "애플 (Apple)", market: "US", sectorTag: "빅테크/스마트폰", price: 224.2, changePct: 0.85, aliases: ["애플", "apple", "아이폰", "ㅇㅍ"], themeTags: ["애플인텔리전스", "M4칩", "비전프로"] },
  { symbol: "MSFT", name: "마이크로소프트 (Microsoft)", market: "US", sectorTag: "클라우드/AI", price: 442.8, changePct: 1.12, aliases: ["마소", "마이크로소프트", "microsoft", "ㅁㅅ"], themeTags: ["OpenAI", "애저", "코파일럿"] },
  { symbol: "AMZN", name: "아마존 (Amazon)", market: "US", sectorTag: "이커머스/AWS", price: 186.2, changePct: -0.45, aliases: ["아마존", "amazon", "ㅇㅁㅈ"], themeTags: ["AWS", "클라우드", "생성형AI"] },
  { symbol: "GOOGL", name: "알파벳/구글 (Google)", market: "US", sectorTag: "검색/AI모델", price: 178.4, changePct: 0.95, aliases: ["구글", "알파벳", "google", "ㄱㄱ"], themeTags: ["Gemini", "유튜브", "검색광고"] },
  { symbol: "META", name: "메타 (Meta Platforms)", market: "US", sectorTag: "SNS/오픈소스AI", price: 485.6, changePct: 1.80, aliases: ["메타", "페이스북", "meta", "ㅁㅌ"], themeTags: ["Llama3", "인스타그램", "스마트글래스"] },
  { symbol: "AMD", name: "AMD", market: "US", sectorTag: "CPU/AI가속기", price: 156.8, changePct: 3.10, aliases: ["에이엠디", "amd", "ㅇㅇㅁㄷ"], themeTags: ["MI300X", "라이젠", "AI반도체"] },
  { symbol: "TSM", name: "대만 반도체 (TSMC)", market: "US", sectorTag: "파운드리 1위", price: 172.4, changePct: 2.80, aliases: ["tsmc", "티에스엠씨", "ㅌㅇㅅㅁㅆ"], themeTags: ["3나노", "2나노", "파운드리"] },
  { symbol: "INTC", name: "인텔 (Intel)", market: "US", sectorTag: "종합반도체", price: 21.5, changePct: -1.20, aliases: ["인텔", "intel", "ㅇㅌ"], themeTags: ["파운드리", "x86", "CPU"] },
  { symbol: "PLTR", name: "팔란티어 (Palantir)", market: "US", sectorTag: "국방 AI/엔터프라이즈", price: 28.4, changePct: 5.20, aliases: ["팔란티어", "palantir", "ㅍㄹㅌㅇ"], themeTags: ["AIP", "방산AI", "S&P500편입"] },
  { symbol: "AVGO", name: "브로드컴 (Broadcom)", market: "US", sectorTag: "네트워크/통신칩", price: 165.2, changePct: 2.40, aliases: ["브로드컴", "avgo", "ㅂㄹㄷㅋ"], themeTags: ["맞춤형ASIC", "AI네트워킹"] },
  { symbol: "ARM", name: "Arm Holdings", market: "US", sectorTag: "반도체 아키텍처", price: 128.0, changePct: 3.90, aliases: ["암", "arm", "ㅇ"], themeTags: ["v9아키텍처", "모바일CPU"] },
  { symbol: "COIN", name: "코인베이스 (Coinbase)", market: "US", sectorTag: "가상자산 거래소", price: 220.1, changePct: 6.40, aliases: ["코인베이스", "coinbase", "ㅋㅇㅂㅇㅅ"], themeTags: ["비트코인ETF", "가상자산수탁"] },
  { symbol: "MSTR", name: "마이크로스트래티지 (MicroStrategy)", market: "US", sectorTag: "비트코인 보유사", price: 1650.0, changePct: 7.80, aliases: ["마스트", "mstr", "ㅁㅅㅌㄹ"], themeTags: ["비트코인프록시", "세일러"] },
  { symbol: "LLY", name: "일라이 릴리 (Eli Lilly)", market: "US", sectorTag: "비만치료제 1위", price: 920.0, changePct: 1.80, aliases: ["일라이릴리", "릴리", "ㅇㄹㅇㄹㄹ"], themeTags: ["마운자로", "젭바운드", "비만약"] },
  { symbol: "SOXL", name: "Direxion 3X 반도체 ETF", market: "US", sectorTag: "3X 레버리지", price: 45.8, changePct: 8.50, aliases: ["속슬", "soxl", "ㅅㅅ"], themeTags: ["반도체3배", "레버리지"] },
  { symbol: "QQQ", name: "Invesco QQQ 나스닥100", market: "US", sectorTag: "나스닥 대표 ETF", price: 480.2, changePct: 1.20, aliases: ["큐큐큐", "qqq", "ㅋ큐ㅋ"], themeTags: ["미국빅테크", "나스닥지수"] },
  { symbol: "TQQQ", name: "ProShares 3X 나스닥 레버리지", market: "US", sectorTag: "3X 레버리지", price: 72.4, changePct: 3.60, aliases: ["티큐", "티큐큐큐", "tqqq", "ㅌㅋ"], themeTags: ["나스닥3배"] },
  { symbol: "SPY", name: "SPDR S&P500 ETF", market: "US", sectorTag: "미국대형주 대표 ETF", price: 550.0, changePct: 0.80, aliases: ["스파이", "spy", "ㅅㅍㅇ"], themeTags: ["S&P500", "미국지수"] },

  // 🪙 UPBIT CRYPTO (원화 가상자산)
  { symbol: "BTC", name: "비트코인 (Bitcoin)", market: "BTC", sectorTag: "가상자산 대장주", price: 0, changePct: 2.45, aliases: ["비트", "비트코인", "btc", "ㅂㅌㅋㅇ"], themeTags: ["반감기", "현물ETF", "디지털금"] },
  { symbol: "ETH", name: "이더리움 (Ethereum)", market: "BTC", sectorTag: "스마트컨트랙트 메이저", price: 3850000, changePct: 1.82, aliases: ["이더", "이더리움", "eth", "ㅇㄷㄹㅇ"], themeTags: ["현물ETF", "디파이", "스테이킹"] },
  { symbol: "SOL", name: "솔라나 (Solana)", market: "BTC", sectorTag: "고성능 L1 메이저", price: 248000, changePct: 5.12, aliases: ["솔라나", "sol", "ㅅㄹㄴ"], themeTags: ["디핀", "밈코인허브", "고속처리"] },
  { symbol: "XRP", name: "리플 (Ripple)", market: "BTC", sectorTag: "국경간 결제 송금", price: 820, changePct: -0.85, aliases: ["리플", "xrp", "ㄹㅍ"], themeTags: ["SEC합의", "RLUSD스테이블코인"] },
  { symbol: "DOGE", name: "도지코인 (Dogecoin)", market: "BTC", sectorTag: "글로벌 밈코인 1위", price: 185, changePct: 3.40, aliases: ["도지", "doge", "ㄷㅈㅋㅇ"], themeTags: ["일론머스크", "밈코인"] },
  { symbol: "DOS", name: "댑오에스 (dappOS)", market: "BTC", sectorTag: "웹3 인프라/AI 의도", price: 396, changePct: 8.40, aliases: ["댑오에스", "dappos", "dos", "ㄷㅇㅇㅅ", "업비트댑오에스"], themeTags: ["인텐트실행", "바이낸스랩스", "업비트원화", "가상자산"] },
  { symbol: "SEI", name: "세이 (Sei)", market: "BTC", sectorTag: "초고속 EVM L1", price: 540, changePct: 6.20, aliases: ["세이", "sei", "ㅅㅇ"], themeTags: ["병렬EVM", "트레이딩L1"] },
  { symbol: "SUI", name: "수이 (Sui)", market: "BTC", sectorTag: "Move 기반 고성능 L1", price: 2150, changePct: 7.40, aliases: ["수이", "sui", "ㅅㅇ"], themeTags: ["Move언어", "오브젝트모델"] },
  { symbol: "NEAR", name: "니어프로토콜 (Near)", market: "BTC", sectorTag: "AI x Web3 블록체인", price: 7800, changePct: 3.90, aliases: ["니어", "near", "ㄴㅇ"], themeTags: ["체인추상화", "AI코인"] },
  { symbol: "ADA", name: "에이다 (Cardano)", market: "BTC", sectorTag: "카르다노 L1", price: 540, changePct: 1.20, aliases: ["에이다", "ada", "ㅇㅇㄷ"], themeTags: ["지분증명", "카르다노"] },
  { symbol: "AVAX", name: "아발란체 (Avalanche)", market: "BTC", sectorTag: "서브넷 L1", price: 38500, changePct: 3.10, aliases: ["아발란체", "avax", "ㅇㅂㄹㅊ"], themeTags: ["서브넷", "RWA"] },
  { symbol: "SHIB", name: "시바이누 (Shiba Inu)", market: "BTC", sectorTag: "밈코인 생태계", price: 0.025, changePct: 4.80, aliases: ["시바이누", "shib", "ㅅㅂㅇㄴ"], themeTags: ["시바리움", "밈코인"] },
  { symbol: "PEPE", name: "페페 (Pepe)", market: "BTC", sectorTag: "글로벌 밈코인", price: 0.015, changePct: 7.50, aliases: ["페페", "pepe", "ㅍㅍ"], themeTags: ["밈코인", "개구리페페"] },
  { symbol: "XLM", name: "스텔라루멘 (Stellar)", market: "BTC", sectorTag: "결제 네트워크", price: 215, changePct: 3.82, aliases: ["스텔라", "스텔라루멘", "xlm", "ㅅㅌㄹㄹㅁ"], themeTags: ["국제결제", "소액송금"] },
  { symbol: "APT", name: "앱토스 (Aptos)", market: "BTC", sectorTag: "Move 기반 L1", price: 12400, changePct: 4.50, aliases: ["앱토스", "apt", "ㅇㅌㅅ"], themeTags: ["Move", "메타출신"] },
  { symbol: "STX", name: "스택스 (Stacks)", market: "BTC", sectorTag: "비트코인 L2", price: 2450, changePct: 5.80, aliases: ["스택스", "stx", "ㅅㅌㅅ"], themeTags: ["비트코인L2", "나카모토업그레이드"] },
  { symbol: "BORA", name: "보라 (BORA)", market: "BTC", sectorTag: "카카오 게임/엔터 블록체인", price: 185, changePct: 2.80, aliases: ["보라", "bora", "ㅂㄹ"], themeTags: ["카카오게임즈", "웹3게임"] }
];

import { KRX_AND_GLOBAL_MASTER_UNIVERSE } from "../data/krxMasterUniverse";

/**
 * Filter stock items with multi-criteria Chosung matching.
 */
export function searchStocksFromIndex(
  query: string, 
  limit: number = 30, 
  marketFilter: "ALL" | "KOREA" | "US" | "BTC" = "ALL"
): SearchableStockItem[] {
  // Build a merged index from COMPREHENSIVE_STOCK_INDEX and KRX_AND_GLOBAL_MASTER_UNIVERSE
  const mergedMap = new Map<string, SearchableStockItem>();

  // Add comprehensive index items
  COMPREHENSIVE_STOCK_INDEX.forEach(item => {
    const cleanSym = item.symbol.toUpperCase().replace(/^KRW-/, "");
    const marketKey: "KOREA" | "US" | "BTC" = 
      item.market === "US" ? "US" : (item.market === "BTC" || item.market === "UPBIT" as any) ? "BTC" : "KOREA";
    const key = `${marketKey}-${cleanSym}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, {
        ...item,
        symbol: cleanSym,
        market: marketKey
      });
    }
  });

  // Add all master universe items without duplicates
  KRX_AND_GLOBAL_MASTER_UNIVERSE.forEach(item => {
    const cleanSym = item.symbol.toUpperCase().replace(/^KRW-/, "");
    const marketKey: "KOREA" | "US" | "BTC" = 
      item.market === "US" ? "US" : (item.market === "UPBIT" || item.market === "BTC" as any) ? "BTC" : "KOREA";
    const key = `${marketKey}-${cleanSym}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, {
        symbol: cleanSym,
        name: item.name,
        market: marketKey,
        sectorTag: item.sector,
        price: marketKey === "BTC" ? 1000 : marketKey === "US" ? 100 : 30000,
        changePct: 0,
        aliases: item.aliases,
        themeTags: item.themeTags
      });
    }
  });

  const allList = Array.from(mergedMap.values());

  if (!query || query.trim() === "") {
    return marketFilter === "ALL" 
      ? allList.slice(0, limit)
      : allList.filter(s => s.market === marketFilter).slice(0, limit);
  }

  const cleanQ = query.trim();

  const filtered = allList.filter(stock => {
    if (marketFilter !== "ALL" && stock.market !== marketFilter) return false;
    return matchesChosungOrKeyword(stock.name, stock.symbol, cleanQ, stock.aliases);
  });

  return filtered.slice(0, limit);
}

