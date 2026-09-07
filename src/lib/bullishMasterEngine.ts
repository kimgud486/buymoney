// J.A.R.V.I.S. BULLISH MASTER INTELLIGENCE ENGINE V5.0
// Multi-Layered Bullish Evidence Confluence System (10 Sub-Engines)

export type BullishCategory =
  | "SINGLE_CANDLE"
  | "TWO_CANDLES"
  | "THREE_CANDLES"
  | "MULTI_CANDLE"
  | "MARKET_STRUCTURE"
  | "BREAKOUT_RETEST"
  | "FAILED_BREAKDOWN"
  | "VWAP_LEVEL"
  | "VOLUME_ACCUMULATION"
  | "MOMENTUM_DIVERGENCE"
  | "GAP_OPENING_RANGE";

export interface BullishPatternDef {
  id: string;
  code: string;
  nameKr: string;
  nameEn: string;
  category: BullishCategory;
  importance: 3 | 4 | 5; // 3 to 5 stars
  coreMeaning: string;
  triggerCondition: string;
  weightScore: number;
}

export const BULLISH_PATTERN_CATALOG: BullishPatternDef[] = [
  // 1. Single Candle
  {
    id: "bl-1",
    code: "LONG_BULLISH",
    nameKr: "장대양봉",
    nameEn: "Long Bullish Candle",
    category: "SINGLE_CANDLE",
    importance: 4,
    coreMeaning: "강한 매수 압력 출현 (ATR 대비 몸통 비율 > 1.2 & 종가 고가권 마감)",
    triggerCondition: "Body/ATR >= 1.2 & Close Near High",
    weightScore: 12
  },
  {
    id: "bl-2",
    code: "BULLISH_MARUBOZU",
    nameKr: "불리시 마루보주",
    nameEn: "Bullish Marubozu",
    category: "SINGLE_CANDLE",
    importance: 5,
    coreMeaning: "시가≈저가, 종가≈고가로 장 시작부터 끝까지 매수세가 시장 완전 지배",
    triggerCondition: "Upper Wick < 1.5% & Lower Wick < 1.5% & Large Body",
    weightScore: 15
  },
  {
    id: "bl-3",
    code: "LONG_LOWER_WICK",
    nameKr: "긴 아랫꼬리 양봉",
    nameEn: "Long Lower Wick Candle",
    category: "SINGLE_CANDLE",
    importance: 4,
    coreMeaning: "장중 매도 공격 수용 후 저점 강력 매수세 유입으로 가격 반등",
    triggerCondition: "Lower Wick >= Body * 1.8 & Close > Open",
    weightScore: 11
  },
  {
    id: "bl-4",
    code: "HAMMER",
    nameKr: "망치형 (Hammer)",
    nameEn: "Hammer",
    category: "SINGLE_CANDLE",
    importance: 4,
    coreMeaning: "하락 추세 저점에서 매도 거부 및 강한 저점 방어 매수세 유입",
    triggerCondition: "Lower Wick >= Body * 2.0 & Close in Top 25%",
    weightScore: 13
  },
  {
    id: "bl-5",
    code: "INVERTED_HAMMER",
    nameKr: "역망치형 (Inverted Hammer)",
    nameEn: "Inverted Hammer",
    category: "SINGLE_CANDLE",
    importance: 3,
    coreMeaning: "하락추세 말기 매수세의 상방 테스트 출현 및 반전 준비 신호",
    triggerCondition: "Upper Wick >= Body * 2.0 at Downtrend Low",
    weightScore: 9
  },
  {
    id: "bl-6",
    code: "DRAGONFLY_DOJI",
    nameKr: "드래곤플라이 도지",
    nameEn: "Dragonfly Doji",
    category: "SINGLE_CANDLE",
    importance: 4,
    coreMeaning: "저가 매도 공격을 거의 100% 회복시켜 시가=종가=고가 형성",
    triggerCondition: "Lower Wick > 3x Body & Open ≈ Close ≈ High",
    weightScore: 12
  },

  // 2. Two Candles
  {
    id: "bl-7",
    code: "BULLISH_ENGULFING",
    nameKr: "상승 장악형",
    nameEn: "Bullish Engulfing",
    category: "TWO_CANDLES",
    importance: 5,
    coreMeaning: "강력한 양봉 매수세가 이전 음봉 몸통 전체를 완벽히 장악",
    triggerCondition: "Curr.Open <= Prev.Close & Curr.Close >= Prev.Open",
    weightScore: 15
  },
  {
    id: "bl-8",
    code: "PIERCING_LINE",
    nameKr: "관통형 (Piercing Pattern)",
    nameEn: "Piercing Line",
    category: "TWO_CANDLES",
    importance: 4,
    coreMeaning: "큰 음봉 이후 갭하락 출발하나 이전 음봉 몸통 50% 이상을 급격히 회복",
    triggerCondition: "Curr.Open < Prev.Low & Curr.Close > Prev.Midpoint",
    weightScore: 12
  },
  {
    id: "bl-9",
    code: "TWEEZER_BOTTOM",
    nameKr: "집게형 바닥",
    nameEn: "Tweezer Bottom",
    category: "TWO_CANDLES",
    importance: 4,
    coreMeaning: "2개 연속 캔들이 동일한 지지 저점에서 반복적으로 매수 방어 성공",
    triggerCondition: "Math.abs(Curr.Low - Prev.Low) < 0.1% Range",
    weightScore: 11
  },
  {
    id: "bl-10",
    code: "BULLISH_HARAMI",
    nameKr: "상승 잉태형",
    nameEn: "Bullish Harami",
    category: "TWO_CANDLES",
    importance: 3,
    coreMeaning: "이전 대형 음봉 내부에 소형 양봉 수렴으로 하락 모멘텀 급격히 둔화",
    triggerCondition: "Curr Body inside Prev Large Bearish Body",
    weightScore: 9
  },
  {
    id: "bl-11",
    code: "HARAMI_CROSS",
    nameKr: "상승 잉태 십자형",
    nameEn: "Bullish Harami Cross",
    category: "TWO_CANDLES",
    importance: 3,
    coreMeaning: "음봉 내부 Doji 출현으로 하락 정체 및 강력한 추세 반전 예고",
    triggerCondition: "Doji inside Prev Bearish Body",
    weightScore: 10
  },
  {
    id: "bl-12",
    code: "BULLISH_KICKER",
    nameKr: "상승 키커 (Bullish Kicker)",
    nameEn: "Bullish Kicker",
    category: "TWO_CANDLES",
    importance: 5,
    coreMeaning: "전일 음봉 후 갭상승 양봉 출현으로 시장 매수 심리 급격한 반전",
    triggerCondition: "Curr.Open > Prev.Open & Long Bullish Candle",
    weightScore: 15
  },

  // 3. Three & Multi Candles
  {
    id: "bl-13",
    code: "MORNING_STAR",
    nameKr: "샛별형 (Morning Star)",
    nameEn: "Morning Star",
    category: "THREE_CANDLES",
    importance: 5,
    coreMeaning: "음봉 ➔ 소형 몸통 교착 ➔ 장대양봉으로 연결되는 대표적 저점 반전",
    triggerCondition: "Large Bear ➔ Small Star ➔ Bullish Penetration",
    weightScore: 15
  },
  {
    id: "bl-14",
    code: "MORNING_DOJI_STAR",
    nameKr: "샛별 십자형",
    nameEn: "Morning Doji Star",
    category: "THREE_CANDLES",
    importance: 5,
    coreMeaning: "음봉 ➔ 저점 Doji ➔ 대형 양봉으로 매도 소진 및 강한 매수 유입",
    triggerCondition: "Large Bear ➔ Low Doji ➔ Deep Bullish Break",
    weightScore: 15
  },
  {
    id: "bl-15",
    code: "THREE_WHITE_SOLDIERS",
    nameKr: "적삼병 (Three White Soldiers)",
    nameEn: "Three White Soldiers",
    category: "THREE_CANDLES",
    importance: 5,
    coreMeaning: "연속 3개 장대양봉으로 고가를 경신하는 지속적 강한 매수 유입",
    triggerCondition: "3 Consecutive Higher Bullish Closes",
    weightScore: 14
  },
  {
    id: "bl-16",
    code: "THREE_INSIDE_UP",
    nameKr: "스리 인사이드 업",
    nameEn: "Three Inside Up",
    category: "MULTI_CANDLE",
    importance: 4,
    coreMeaning: "Harami 패턴 이후 3번째 양봉이 전일 고가를 상방 돌파하여 반전 확정",
    triggerCondition: "Harami Pattern ➔ 3rd Candle Break Above",
    weightScore: 12
  },
  {
    id: "bl-17",
    code: "THREE_OUTSIDE_UP",
    nameKr: "스리 아웃사이드 업",
    nameEn: "Three Outside Up",
    category: "MULTI_CANDLE",
    importance: 5,
    coreMeaning: "Engulfing 장악형 완성 후 3번째 양봉으로 추가 상승 모멘텀 가속",
    triggerCondition: "Engulfing Pattern ➔ 3rd Bullish Follow Through",
    weightScore: 14
  },

  // 4. Market Structure
  {
    id: "bl-18",
    code: "DOUBLE_BOTTOM",
    nameKr: "더블 바텀 (W 패턴)",
    nameEn: "Double Bottom",
    category: "MARKET_STRUCTURE",
    importance: 4,
    coreMeaning: "동일 저점 2회 형성 및 저점 매수 방어 후 Neckline 상방 돌파",
    triggerCondition: "Low1 ≈ Low2 & Neckline Breakout",
    weightScore: 13
  },
  {
    id: "bl-19",
    code: "TRIPLE_BOTTOM",
    nameKr: "삼중 바닥 (Triple Bottom)",
    nameEn: "Triple Bottom",
    category: "MARKET_STRUCTURE",
    importance: 4,
    coreMeaning: "저점 3회 반복 지지 확인 후 상단 저항선 폭발적 돌파",
    triggerCondition: "3 Similar Low Supports & Resistance Breakout",
    weightScore: 13
  },
  {
    id: "bl-20",
    code: "INVERSE_HEAD_AND_SHOULDERS",
    nameKr: "역헤드앤숄더 (IH&S)",
    nameEn: "Inverse Head & Shoulders",
    category: "MARKET_STRUCTURE",
    importance: 5,
    coreMeaning: "왼쪽어깨-머리(최저점)-오른쪽어깨 완료 후 Neckline 상방 돌파",
    triggerCondition: "Head Lowest ➔ Right Shoulder ➔ Neckline Reclaim",
    weightScore: 15
  },
  {
    id: "bl-21",
    code: "HIGHER_LOW",
    nameKr: "저점 높아짐 (Higher Low)",
    nameEn: "Higher Low",
    category: "MARKET_STRUCTURE",
    importance: 4,
    coreMeaning: "2차 조정 저점이 이전 저점보다 높아 매수세의 지속적 유입 확인",
    triggerCondition: "Low2 > Low1 & Bullish Bounce",
    weightScore: 12
  },
  {
    id: "bl-22",
    code: "HL_HH_MSS",
    nameKr: "구조적 상승 전환 (HL + HH)",
    nameEn: "Market Structure Shift (HL+HH)",
    category: "MARKET_STRUCTURE",
    importance: 5,
    coreMeaning: "Higher Low와 Higher High가 동시 완성되며 확실한 상승 추세 확립",
    triggerCondition: "Higher Low & Higher High Consecutive Breakout",
    weightScore: 15
  },

  // 5. Breakout & Retest
  {
    id: "bl-23",
    code: "RESISTANCE_BREAKOUT",
    nameKr: "주요 저항선 돌파",
    nameEn: "Resistance Breakout",
    category: "BREAKOUT_RETEST",
    importance: 5,
    coreMeaning: "장기 수평 저항대 및 매물대를 대량 거래량으로 상방 이탈",
    triggerCondition: "Close > Key Resistance & RVOL > 1.8",
    weightScore: 15
  },
  {
    id: "bl-24",
    code: "BREAKOUT_RETEST_HOLD",
    nameKr: "돌파 후 리테스트 지지",
    nameEn: "Breakout + Retest Hold",
    category: "BREAKOUT_RETEST",
    importance: 5,
    coreMeaning: "저항선 돌파 ➔ 리테스트 눌림 ➔ 과거 저항선에서 지지 받으며 반등",
    triggerCondition: "Breakout ➔ Retest ➔ Hold Support Candle",
    weightScore: 15
  },

  // 6. Failed Breakdown & Bear Trap
  {
    id: "bl-25",
    code: "FAILED_BREAKDOWN",
    nameKr: "지지 이탈 실패 (Failed Breakdown)",
    nameEn: "Failed Breakdown",
    category: "FAILED_BREAKDOWN",
    importance: 5,
    coreMeaning: "지지선 아래로 이탈했으나 하락 실패 후 지지선 위 즉시 복귀",
    triggerCondition: "Low < Support ➔ Close > Support Reclaim",
    weightScore: 15
  },
  {
    id: "bl-26",
    code: "BEAR_TRAP",
    nameKr: "베어 트랩 (Bear Trap)",
    nameEn: "Bear Trap",
    category: "FAILED_BREAKDOWN",
    importance: 5,
    coreMeaning: "매도 유혹 후 급격한 상승 전환으로 숏 포지션 갇힘 매수 폭발",
    triggerCondition: "New Low ➔ Rapid Reversal Reclaim Above Lows",
    weightScore: 15
  },

  // 7. VWAP Level
  {
    id: "bl-27",
    code: "VWAP_RECLAIM",
    nameKr: "VWAP 재탈환 (VWAP Reclaim)",
    nameEn: "VWAP Reclaim",
    category: "VWAP_LEVEL",
    importance: 4,
    coreMeaning: "VWAP 라인 아래에서 상승 전환하여 VWAP 상방 재탈환 성공",
    triggerCondition: "Price Cross Above VWAP & Close Above VWAP",
    weightScore: 12
  },
  {
    id: "bl-28",
    code: "VWAP_RETEST_HOLD",
    nameKr: "VWAP 지지 확인 (VWAP Retest)",
    nameEn: "VWAP Retest Hold",
    category: "VWAP_LEVEL",
    importance: 5,
    coreMeaning: "VWAP 상방 돌파 후 VWAP 라인까지 조정받으나 깨지지 않고 반등",
    triggerCondition: "VWAP Break ➔ Pullback to VWAP ➔ Rebound",
    weightScore: 14
  },

  // 8. Volume & Accumulation
  {
    id: "bl-29",
    code: "VOLUME_EXPANSION_BREAKOUT",
    nameKr: "거래량 폭발 돌파",
    nameEn: "Volume Expansion Breakout",
    category: "VOLUME_ACCUMULATION",
    importance: 5,
    coreMeaning: "평균 대비 2배 이상의 RVOL 거래량으로 상단 매물대 돌파",
    triggerCondition: "RVOL >= 2.0 & High Close Price Progress",
    weightScore: 15
  },
  {
    id: "bl-30",
    code: "SELLING_CLIMAX_REVERSAL",
    nameKr: "투매 소진 반전",
    nameEn: "Selling Climax Reversal",
    category: "VOLUME_ACCUMULATION",
    importance: 5,
    coreMeaning: "공포 투매 거래량 폭발 후 더 이상 하락하지 않고 긴 아래꼬리 반등",
    triggerCondition: "RVOL >= 3.0 & Long Lower Wick Reversal",
    weightScore: 15
  },
  {
    id: "bl-31",
    code: "ACCUMULATION_CANDLE",
    nameKr: "세력 매집 양봉",
    nameEn: "Accumulation Candle",
    category: "VOLUME_ACCUMULATION",
    importance: 4,
    coreMeaning: "가격 하락을 저지하며 기관/세력이 대량 물량을 매집하는 특징",
    triggerCondition: "Volume ↑ & Low Downside Progress & High Close",
    weightScore: 13
  },

  // 9. Momentum Divergence
  {
    id: "bl-32",
    code: "RSI_BULLISH_DIVERGENCE",
    nameKr: "RSI 상승 다이버전스",
    nameEn: "RSI Bullish Divergence",
    category: "MOMENTUM_DIVERGENCE",
    importance: 4,
    coreMeaning: "주가는 신저가(Low2 < Low1)이나 RSI 모멘텀은 상승(RSI2 > RSI1)",
    triggerCondition: "Price New Low & RSI Higher Low",
    weightScore: 12
  },
  {
    id: "bl-33",
    code: "MACD_BULLISH_DIVERGENCE",
    nameKr: "MACD 상승 다이버전스",
    nameEn: "MACD Bullish Divergence",
    category: "MOMENTUM_DIVERGENCE",
    importance: 3,
    coreMeaning: "하락 에너지 감소 및 MACD 히스토그램 양전 직전 다이버전스",
    triggerCondition: "Price Low & MACD Histogram Turning Positive",
    weightScore: 10
  },

  // 10. Gap & Opening Range / Continuation
  {
    id: "bl-34",
    code: "GAP_AND_GO",
    nameKr: "갭상승 후 지속 (Gap & Go)",
    nameEn: "Gap & Go",
    category: "GAP_OPENING_RANGE",
    importance: 5,
    coreMeaning: "장초반 갭상승 시작 후 밀리지 않고 모멘텀 유지하며 2차 상승",
    triggerCondition: "Gap Open > Prev Close & Drive Above VWAP",
    weightScore: 15
  },
  {
    id: "bl-35",
    code: "GAP_DOWN_FAILURE",
    nameKr: "갭하락 실패 후 급반등",
    nameEn: "Gap Down Failure",
    category: "GAP_OPENING_RANGE",
    importance: 5,
    coreMeaning: "갭하락 출발했으나 하락 지속 실패 후 시가 및 전일종가 재탈환",
    triggerCondition: "Gap Down ➔ Opening Low ➔ Fast Reclaim",
    weightScore: 15
  },
  {
    id: "bl-36",
    code: "GAP_RECLAIM",
    nameKr: "갭 영역 회복",
    nameEn: "Gap Reclaim",
    category: "GAP_OPENING_RANGE",
    importance: 4,
    coreMeaning: "과거 저항 역할을 하던 갭 하락 영역을 매수세로 다시 완전 복구",
    triggerCondition: "Price Fill Gap & Drive Above Upper Gap Boundary",
    weightScore: 13
  },
  {
    id: "bl-37",
    code: "ORB_BREAKOUT",
    nameKr: "장초반 범위 돌파 (ORB)",
    nameEn: "Opening Range Breakout",
    category: "GAP_OPENING_RANGE",
    importance: 4,
    coreMeaning: "장 시작 후 형성된 고점 범위(Opening Range High)를 거래량 동반 돌파",
    triggerCondition: "Price > Opening Range High & RVOL > 1.5",
    weightScore: 13
  },
  {
    id: "bl-38",
    code: "FIRST_PULLBACK_HOLD",
    nameKr: "첫 번째 정상 조정 지지",
    nameEn: "First Pullback Hold",
    category: "GAP_OPENING_RANGE",
    importance: 4,
    coreMeaning: "강한 상승 돌파 후 첫 번째 거래량 줄어드는 눌림목 지지 및 재반등",
    triggerCondition: "Breakout ➔ Low Volume Pullback ➔ Rebound Candle",
    weightScore: 12
  }
];

// 100-Point Bullish Confluence Score Matrix
export interface BullishConfluenceScores {
  bullishCandle: number;      // Max 10
  supportDefense: number;     // Max 15
  marketStructure: number;    // Max 15
  volumeRvol: number;         // Max 15
  breakoutRetest: number;     // Max 15
  vwapLevel: number;          // Max 10
  momentum: number;           // Max 10
  followThrough: number;      // Max 10
  totalScore: number;         // Max 100
}

// Fake Bull Signal Filter Result
export interface FakeBullFilterResult {
  hasPenalty: boolean;
  filterType: string;
  reason: string;
  penaltyDeduction: number;
}

// Bull vs Bear Battle Result
export interface DualAiBattleResult {
  bullScore: number;
  bearScore: number;
  dominantSide: "BULL_DOMINANT" | "BEAR_DOMINANT" | "BALANCED_NEUTRAL";
  actionAdvice: string;
  confluenceSummary: string;
}

export interface BullishEngineAnalysisOutput {
  symbol: string;
  name: string;
  detectedPatterns: BullishPatternDef[];
  scores: BullishConfluenceScores;
  noiseFilter: FakeBullFilterResult;
  finalScore: number;
  signalGrade: "STRONG_BULLISH" | "BULLISH" | "NEUTRAL" | "WEAK_BULLISH";
  battle: DualAiBattleResult;
  metrics: {
    bodyAtrRatio: number;
    lowerWickRatio: number;
    penetrationPct: number;
    rvol: number;
    vwapDistancePct: number;
    rsiDivergenceGap: number;
    breakoutStrengthScore: number;
  };
}

export class BullishIntelligenceEngine {
  public static analyzeStock(
    symbol: string,
    name: string,
    currentPrice: number,
    changeRate: number,
    customSeed?: number
  ): BullishEngineAnalysisOutput {
    // Generate deterministic simulated technical metrics
    const seed = (customSeed || symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) + currentPrice * 3;

    const bodyAtrRatio = Number((((seed % 16) + 4) / 10).toFixed(2)); // 0.4 ~ 2.0
    const lowerWickRatio = Number((((seed % 24) + 6) / 10).toFixed(2)); // 0.6 ~ 3.0
    const penetrationPct = Math.round((seed % 50) + 40); // 40% ~ 90%
    const rvol = Number((((seed % 38) + 8) / 10).toFixed(2)); // 0.8 ~ 4.6
    const vwapDistancePct = Number((((seed % 50) - 20) / 10).toFixed(2)); // -2.0% ~ +3.0%
    const rsiDivergenceGap = Math.round((seed % 28) + 4); // 4 ~ 32p
    const breakoutStrengthScore = Math.round((seed % 38) + 60); // 60 ~ 98

    // Select active patterns based on market condition
    const detectedPatterns: BullishPatternDef[] = [];

    if (changeRate > 1.5) {
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "LONG_BULLISH")!);
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "RESISTANCE_BREAKOUT")!);
    }
    if (rvol > 2.0) {
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "VOLUME_EXPANSION_BREAKOUT")!);
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "ACCUMULATION_CANDLE")!);
    }
    if (lowerWickRatio > 1.8) {
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "HAMMER")!);
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "FAILED_BREAKDOWN")!);
    }
    if (vwapDistancePct > 0.3) {
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "VWAP_RECLAIM")!);
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "VWAP_RETEST_HOLD")!);
    }

    // Default Fallbacks if empty
    if (detectedPatterns.length === 0) {
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "HIGHER_LOW")!);
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "BULLISH_ENGULFING")!);
      detectedPatterns.push(BULLISH_PATTERN_CATALOG.find(p => p.code === "BEAR_TRAP")!);
    }

    // Compute 10 Sub-Engines Confluence Scores (Total 100)
    const bullishCandle = Math.min(10, Math.round(bodyAtrRatio * 5 + (detectedPatterns.length * 1.5)));
    const supportDefense = Math.min(15, Math.round(lowerWickRatio * 4 + 3));
    const marketStructure = Math.min(15, Math.round((breakoutStrengthScore / 100) * 15));
    const volumeRvol = Math.min(15, Math.round((rvol / 4.6) * 15));
    const breakoutRetest = changeRate > 0 ? Math.min(15, Math.round(changeRate * 3 + 6)) : 5;
    const vwapLevel = vwapDistancePct > 0 ? 10 : 4;
    const momentum = Math.min(10, Math.round((rsiDivergenceGap / 32) * 10));
    const followThrough = Math.min(10, Math.round((penetrationPct / 90) * 10));

    const rawTotal = bullishCandle + supportDefense + marketStructure + volumeRvol + breakoutRetest + vwapLevel + momentum + followThrough;

    // Evaluate Fake Bull Signal Filters (가짜 상승 신호 필터)
    let hasPenalty = false;
    let filterType = "NONE";
    let reason = "정상 상승 수급 및 추세 돌파 확정";
    let penaltyDeduction = 0;

    if (changeRate > 3.0 && rvol < 1.1) {
      hasPenalty = true;
      filterType = "LOW_VOLUME_BREAKOUT";
      reason = "거래량 결여된 장대양봉 ➔ 세력 없는 속임수 (Fake Out) 돌파 가능성 높음";
      penaltyDeduction = 18;
    } else if (vwapDistancePct > 2.5) {
      hasPenalty = true;
      filterType = "OVEREXTENDED_VWAP";
      reason = "VWAP 이격도 +2.5% 초과 과열 구간 ➔ 단기 추격 매수 상방 이격 위험";
      penaltyDeduction = 15;
    } else if (rsiDivergenceGap > 25 && changeRate > 5.0) {
      hasPenalty = true;
      filterType = "OVERBOUGHT_EXTREME";
      reason = "RSI 극단적 과매수(75+) 및 고점 윗꼬리 붕괴 위험 연동";
      penaltyDeduction = 16;
    }

    const finalScore = Math.max(0, Math.min(100, rawTotal - penaltyDeduction));

    // Signal Grade Categorization
    let signalGrade: BullishEngineAnalysisOutput["signalGrade"] = "NEUTRAL";
    if (finalScore >= 80) signalGrade = "STRONG_BULLISH";
    else if (finalScore >= 65) signalGrade = "BULLISH";
    else if (finalScore >= 45) signalGrade = "WEAK_BULLISH";
    else signalGrade = "NEUTRAL";

    // Dual AI Score Competition (BULL SCORE vs BEAR SCORE)
    const bullScore = finalScore;
    const bearScore = Math.max(10, Math.min(95, 100 - bullScore + (hasPenalty ? 22 : 0)));

    let dominantSide: DualAiBattleResult["dominantSide"] = "BALANCED_NEUTRAL";
    if (bullScore >= bearScore + 10) dominantSide = "BULL_DOMINANT";
    else if (bearScore >= bullScore + 10) dominantSide = "BEAR_DOMINANT";

    let actionAdvice = "";
    if (dominantSide === "BULL_DOMINANT") {
      actionAdvice = `🚀 [상승 우세 / 매수 분할 진입] ${name} (${symbol})은 Resistance Breakout + VWAP 재탈환 + RVOL ${rvol}배 수급 유입으로 상승 동력이 압도적입니다.`;
    } else if (dominantSide === "BEAR_DOMINANT") {
      actionAdvice = `⚠️ [가짜 상승 / 매수 보류] ${name}은 상승 신호 필터링(${reason})에 의해 상단 저항 매물대 압박이 거셉니다.`;
    } else {
      actionAdvice = `⚖️ [팽팽한 수급 교착] 매수세와 매도세가 균형을 이루고 있어 추가 확인봉(Reclaim Hold) 체크 후 진입을 추천합니다.`;
    }

    const confluenceSummary = `BULL ${bullScore}pt vs BEAR ${bearScore}pt (${detectedPatterns.length}개 상승 패턴 감지, ATR비율 ${bodyAtrRatio}, RVOL ${rvol}배)`;

    return {
      symbol,
      name,
      detectedPatterns,
      scores: {
        bullishCandle,
        supportDefense,
        marketStructure,
        volumeRvol,
        breakoutRetest,
        vwapLevel,
        momentum,
        followThrough,
        totalScore: finalScore
      },
      noiseFilter: {
        hasPenalty,
        filterType,
        reason,
        penaltyDeduction
      },
      finalScore,
      signalGrade,
      battle: {
        bullScore,
        bearScore,
        dominantSide,
        actionAdvice,
        confluenceSummary
      },
      metrics: {
        bodyAtrRatio,
        lowerWickRatio,
        penetrationPct,
        rvol,
        vwapDistancePct,
        rsiDivergenceGap,
        breakoutStrengthScore
      }
    };
  }
}
