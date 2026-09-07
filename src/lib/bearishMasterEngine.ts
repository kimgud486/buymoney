// J.A.R.V.I.S. BEARISH MASTER INTELLIGENCE ENGINE V5.0
// Multi-Layered Bearish Evidence Confluence System

export type BearishCategory =
  | "SINGLE_CANDLE"
  | "TWO_CANDLES"
  | "THREE_CANDLES"
  | "MULTI_CANDLE"
  | "MARKET_STRUCTURE"
  | "VWAP_LEVEL"
  | "VOLUME_PRESSURE"
  | "MOMENTUM_DIVERGENCE"
  | "GAP_FAILURE";

export interface BearishPatternDef {
  id: string;
  code: string;
  nameKr: string;
  nameEn: string;
  category: BearishCategory;
  importance: 3 | 4 | 5; // 3 to 5 stars
  coreMeaning: string;
  triggerCondition: string;
  weightScore: number;
}

export const BEARISH_PATTERN_CATALOG: BearishPatternDef[] = [
  // 1. Single Candle
  {
    id: "b-1",
    code: "LONG_BEARISH",
    nameKr: "장대음봉",
    nameEn: "Long Bearish Candle",
    category: "SINGLE_CANDLE",
    importance: 4,
    coreMeaning: "강한 매도 압력 출현 (ATR 대비 몸통 비율 > 1.2)",
    triggerCondition: "Body/ATR >= 1.2 & Close < Open",
    weightScore: 12
  },
  {
    id: "b-2",
    code: "BEARISH_MARUBOZU",
    nameKr: "베어리시 마루보주",
    nameEn: "Bearish Marubozu",
    category: "SINGLE_CANDLE",
    importance: 5,
    coreMeaning: "시가≈고가, 종가≈저가로 장 종가까지 매도세 완전 지배",
    triggerCondition: "Upper Wick < 2% & Lower Wick < 2% & Large Body",
    weightScore: 15
  },
  {
    id: "b-3",
    code: "LONG_UPPER_WICK",
    nameKr: "긴 윗꼬리 음봉",
    nameEn: "Long Upper Wick Candle",
    category: "SINGLE_CANDLE",
    importance: 4,
    coreMeaning: "고가 매수 실패 및 상단 강한 매도세 저항 출현",
    triggerCondition: "Upper Wick >= Body * 1.8",
    weightScore: 11
  },
  {
    id: "b-4",
    code: "SHOOTING_STAR",
    nameKr: "슈팅 스타 (유성형)",
    nameEn: "Shooting Star",
    category: "SINGLE_CANDLE",
    importance: 4,
    coreMeaning: "고점 거부 및 상단 매수자 매물대에 직면하여 반락",
    triggerCondition: "Upper Wick >= Body * 2.0 & Close in Bottom 25%",
    weightScore: 13
  },
  {
    id: "b-5",
    code: "HANGING_MAN",
    nameKr: "교수형 (Hanging Man)",
    nameEn: "Hanging Man",
    category: "SINGLE_CANDLE",
    importance: 3,
    coreMeaning: "상승 추세 고점에서 하방 매도 테스트 및 추세 약화 경고",
    triggerCondition: "Lower Wick >= Body * 2.0 at Uptrend High",
    weightScore: 9
  },
  {
    id: "b-6",
    code: "GRAVESTONE_DOJI",
    nameKr: "비석형 도지",
    nameEn: "Gravestone Doji",
    category: "SINGLE_CANDLE",
    importance: 4,
    coreMeaning: "상승 시도 후 완벽한 고점 붕괴로 시가=종가=저가 형국",
    triggerCondition: "Upper Wick > 3x Body & Open ≈ Close ≈ Low",
    weightScore: 12
  },

  // 2. Two Candles
  {
    id: "b-7",
    code: "BEARISH_ENGULFING",
    nameKr: "하락 장악형",
    nameEn: "Bearish Engulfing",
    category: "TWO_CANDLES",
    importance: 5,
    coreMeaning: "강력한 음봉 매도세가 전일 양봉 몸통 전체를 완전히 장악",
    triggerCondition: "Curr.Open >= Prev.Close & Curr.Close <= Prev.Open",
    weightScore: 15
  },
  {
    id: "b-8",
    code: "DARK_CLOUD_COVER",
    nameKr: "먹구름형 (Dark Cloud)",
    nameEn: "Dark Cloud Cover",
    category: "TWO_CANDLES",
    importance: 4,
    coreMeaning: "갭상승 후 되밀려 이전 양봉 몸통 50% 이상 침투 붕괴",
    triggerCondition: "Curr.Open > Prev.High & Curr.Close < Prev.Midpoint",
    weightScore: 12
  },
  {
    id: "b-9",
    code: "TWEEZER_TOP",
    nameKr: "집게형 고점",
    nameEn: "Tweezer Top",
    category: "TWO_CANDLES",
    importance: 4,
    coreMeaning: "2개 연속 캔들이 동일 고점에서 반복 거부당하며 밀림",
    triggerCondition: "Math.abs(Curr.High - Prev.High) < 0.1% Range",
    weightScore: 11
  },
  {
    id: "b-10",
    code: "BEARISH_HARAMI",
    nameKr: "하락 잉태형",
    nameEn: "Bearish Harami",
    category: "TWO_CANDLES",
    importance: 3,
    coreMeaning: "이전 대형 양봉 내부에 음봉이 수렴하며 상승 모멘텀 급감",
    triggerCondition: "Curr Body inside Prev Large Bullish Body",
    weightScore: 9
  },
  {
    id: "b-11",
    code: "HARAMI_CROSS",
    nameKr: "하락 잉태 십자형",
    nameEn: "Bearish Harami Cross",
    category: "TWO_CANDLES",
    importance: 3,
    coreMeaning: "양봉 내부 Doji 출현으로 매수 매도 교착 및 방향 전환 예고",
    triggerCondition: "Doji inside Prev Bullish Body",
    weightScore: 10
  },
  {
    id: "b-12",
    code: "BEARISH_KICKER",
    nameKr: "하락 키커 (Bearish Kicker)",
    nameEn: "Bearish Kicker",
    category: "TWO_CANDLES",
    importance: 5,
    coreMeaning: "전일 양봉 후 갭하락 음봉으로 시장 투자심리 전격 악화",
    triggerCondition: "Curr.Open < Prev.Open & Long Bearish Candle",
    weightScore: 15
  },

  // 3. Three & Multi Candles
  {
    id: "b-13",
    code: "EVENING_STAR",
    nameKr: "석별형 (Evening Star)",
    nameEn: "Evening Star",
    category: "THREE_CANDLES",
    importance: 5,
    coreMeaning: "양봉 ➔ 소형 몸통 교착 ➔ 장대음봉으로 연결되는 대표 고점 반전",
    triggerCondition: "Large Bull ➔ Small Star ➔ Bearish Penetration",
    weightScore: 15
  },
  {
    id: "b-14",
    code: "EVENING_DOJI_STAR",
    nameKr: "석별 십자형",
    nameEn: "Evening Doji Star",
    category: "THREE_CANDLES",
    importance: 5,
    coreMeaning: "양봉 ➔ 고점 도지 ➔ 급락 음봉으로 고점 불확실성 극대화",
    triggerCondition: "Large Bull ➔ High Doji ➔ Deep Bearish Break",
    weightScore: 15
  },
  {
    id: "b-15",
    code: "THREE_BLACK_CROWS",
    nameKr: "흑삼병 (Three Black Crows)",
    nameEn: "Three Black Crows",
    category: "THREE_CANDLES",
    importance: 5,
    coreMeaning: "연속 3개 장대음봉으로 저가를 경신하는 지속적 강한 매도세",
    triggerCondition: "3 Consecutive Lower Bearish Closes",
    weightScore: 14
  },
  {
    id: "b-16",
    code: "THREE_INSIDE_DOWN",
    nameKr: "스리 인사이드 다운",
    nameEn: "Three Inside Down",
    category: "MULTI_CANDLE",
    importance: 4,
    coreMeaning: "Harami 패턴 이후 3번째 음봉이 전일 저가를 이탈하여 반전 확정",
    triggerCondition: "Harami Pattern ➔ 3rd Candle Break Below",
    weightScore: 12
  },
  {
    id: "b-17",
    code: "THREE_OUTSIDE_DOWN",
    nameKr: "스리 아웃사이드 다운",
    nameEn: "Three Outside Down",
    category: "MULTI_CANDLE",
    importance: 5,
    coreMeaning: "Engulfing 장악형 완성 후 3번째 음봉으로 추세 하락 이탈 가속",
    triggerCondition: "Engulfing Pattern ➔ 3rd Bearish Follow Through",
    weightScore: 14
  },

  // 4. Market Structure
  {
    id: "b-18",
    code: "FAILED_BREAKOUT",
    nameKr: "저항 돌파 실패 (Failed Breakout)",
    nameEn: "Failed Breakout",
    category: "MARKET_STRUCTURE",
    importance: 5,
    coreMeaning: "저항선 상방 돌파 후 매수 실패 및 저항선 아래 재진입 매도 폭발",
    triggerCondition: "High > Resistance ➔ Close < Resistance",
    weightScore: 15
  },
  {
    id: "b-19",
    code: "BULL_TRAP",
    nameKr: "불 트랩 (Bull Trap)",
    nameEn: "Bull Trap",
    category: "MARKET_STRUCTURE",
    importance: 5,
    coreMeaning: "전고점 상방 매수 유혹 후 급락 전환으로 매수자 갇힘 손절 유발",
    triggerCondition: "New High ➔ Rapid Reversal Loss of Highs",
    weightScore: 15
  },
  {
    id: "b-20",
    code: "DOUBLE_TOP",
    nameKr: "이중 고점 (Double Top)",
    nameEn: "Double Top",
    category: "MARKET_STRUCTURE",
    importance: 4,
    coreMeaning: "동일 고점 2회 형성 후 넥라인 붕괴 (M자 반전 패턴)",
    triggerCondition: "Peak1 ≈ Peak2 & Neckline Breakdown",
    weightScore: 13
  },
  {
    id: "b-21",
    code: "TRIPLE_TOP",
    nameKr: "삼중 고점 (Triple Top)",
    nameEn: "Triple Top",
    category: "MARKET_STRUCTURE",
    importance: 4,
    coreMeaning: "고점 3회 반복 거부 및 매수 매집 실패 하향 이탈",
    triggerCondition: "3 Similar High Rejections & Base Breakdown",
    weightScore: 13
  },
  {
    id: "b-22",
    code: "HEAD_AND_SHOULDERS",
    nameKr: "헤드 앤 숄더 (H&S)",
    nameEn: "Head & Shoulders",
    category: "MARKET_STRUCTURE",
    importance: 5,
    coreMeaning: "왼쪽어깨-머리-오른쪽어깨 완료 후 Neckline 붕괴로 추세 전환",
    triggerCondition: "Head Highest ➔ Right Shoulder ➔ Neckline Loss",
    weightScore: 15
  },
  {
    id: "b-23",
    code: "LOWER_HIGH",
    nameKr: "고점 낮아짐 (Lower High)",
    nameEn: "Lower High",
    category: "MARKET_STRUCTURE",
    importance: 4,
    coreMeaning: "2차 반등 고점이 이전 고점 미달로 매수 추진력 구조적 약화",
    triggerCondition: "Peak2 < Peak1 & Resistance Rejection",
    weightScore: 12
  },
  {
    id: "b-24",
    code: "LH_LL_MSS",
    nameKr: "구조적 하락 전환 (LH + LL)",
    nameEn: "Market Structure Shift (LH+LL)",
    category: "MARKET_STRUCTURE",
    importance: 5,
    coreMeaning: "Lower High와 Lower Low가 동시 완성되며 하락 구조 확정",
    triggerCondition: "Lower High & Lower Low Consecutive Breakdown",
    weightScore: 15
  },
  {
    id: "b-25",
    code: "SUPPORT_BREAKDOWN",
    nameKr: "주요 지지선 붕괴",
    nameEn: "Support Breakdown",
    category: "MARKET_STRUCTURE",
    importance: 5,
    coreMeaning: "주요 매수 지지선 수평대가 대량 거래량으로 하향 이탈",
    triggerCondition: "Close < Key Support & RVOL > 1.8",
    weightScore: 15
  },
  {
    id: "b-26",
    code: "BREAKDOWN_RETEST_REJECT",
    nameKr: "붕괴 후 리테스트 실패",
    nameEn: "Breakdown + Retest Failure",
    category: "MARKET_STRUCTURE",
    importance: 5,
    coreMeaning: "지지선 붕괴 ➔ 리테스트 반등 ➔ 과거 지지선에서 저항 거부 반락",
    triggerCondition: "Breakdown ➔ Retest ➔ Rejection Candle",
    weightScore: 15
  },

  // 5. VWAP Level
  {
    id: "b-27",
    code: "VWAP_REJECTION",
    nameKr: "VWAP 회복 실패 (VWAP Rejection)",
    nameEn: "VWAP Rejection",
    category: "VWAP_LEVEL",
    importance: 4,
    coreMeaning: "VWAP 라인 회복 시도 시 상단 매도 폭탄으로 강력 거부",
    triggerCondition: "Price Approaches VWAP ➔ Upper Wick Rejection",
    weightScore: 12
  },
  {
    id: "b-28",
    code: "VWAP_BREAKDOWN",
    nameKr: "VWAP 하향 이탈",
    nameEn: "VWAP Breakdown",
    category: "VWAP_LEVEL",
    importance: 4,
    coreMeaning: "당일 평단가 VWAP 아래로 이탈하며 손실 매물 축적",
    triggerCondition: "Close < VWAP & Lower High Confirmation",
    weightScore: 12
  },

  // 6. Volume & Order Pressure
  {
    id: "b-29",
    code: "VOLUME_CLIMAX_REVERSAL",
    nameKr: "거래량 클라이맥스 반전",
    nameEn: "Volume Climax Reversal",
    category: "VOLUME_PRESSURE",
    importance: 5,
    coreMeaning: "고점에서 매수 거래량 폭발했으나 전량 음봉 매물대로 흡수 반락",
    triggerCondition: "RVOL >= 3.0 & Price Progress Low & Upper Wick",
    weightScore: 15
  },
  {
    id: "b-30",
    code: "DISTRIBUTION_CANDLE",
    nameKr: "대량 분산 매도 음봉",
    nameEn: "Distribution Candle",
    category: "VOLUME_PRESSURE",
    importance: 4,
    coreMeaning: "기관 및 세력의 차익 실현 물량이 대량 거래량으로 출회",
    triggerCondition: "RVOL >= 2.0 & Heavy Volume Bearish Candle",
    weightScore: 13
  },

  // 7. Momentum Divergence
  {
    id: "b-31",
    code: "RSI_BEARISH_DIVERGENCE",
    nameKr: "RSI 하락 다이버전스",
    nameEn: "RSI Bearish Divergence",
    category: "MOMENTUM_DIVERGENCE",
    importance: 4,
    coreMeaning: "주가는 고점 경신(Peak2 > Peak1)이나 RSI 모멘텀은 하락(RSI2 < RSI1)",
    triggerCondition: "Price New High & RSI Lower High",
    weightScore: 12
  },
  {
    id: "b-32",
    code: "MACD_BEARISH_DIVERGENCE",
    nameKr: "MACD 하락 다이버전스",
    nameEn: "MACD Bearish Divergence",
    category: "MOMENTUM_DIVERGENCE",
    importance: 3,
    coreMeaning: "상승 에너지 감소 및 MACD 히스토그램 음전 직전 다이버전스",
    triggerCondition: "Price High & MACD Histogram Shrinking",
    weightScore: 10
  },

  // 8. Gap Failure
  {
    id: "b-33",
    code: "GAP_UP_FAILURE",
    nameKr: "갭상승 실패 음봉",
    nameEn: "Gap Up Failure",
    category: "GAP_FAILURE",
    importance: 5,
    coreMeaning: "장초반 갭상승 시작 후 고가 유지 실패 및 VWAP 상실 급락",
    triggerCondition: "Gap Open > Prev Close & Drive Down Below VWAP",
    weightScore: 15
  },
  {
    id: "b-34",
    code: "GAP_FILL_BREAKDOWN",
    nameKr: "갭 메움 후 붕괴",
    nameEn: "Gap Fill Breakdown",
    category: "GAP_FAILURE",
    importance: 4,
    coreMeaning: "과거 지지 역할을 하던 갭 하단 영역까지 무너지며 지지력 상실",
    triggerCondition: "Price Fill Gap & Break Below Lower Gap Boundary",
    weightScore: 13
  }
];

// 100-Point Bearish Confluence Score Matrix
export interface ConfluenceScores {
  candlePattern: number;      // Max 15
  rejectionLocation: number;  // Max 15
  marketStructure: number;    // Max 15
  volumeOrderPressure: number;// Max 15
  vwapLevel: number;          // Max 10
  momentum: number;           // Max 10
  breakdown: number;          // Max 10
  followThrough: number;      // Max 10
  totalScore: number;         // Max 100
}

// False Signal Filter Result
export interface FalseSignalFilterResult {
  hasPenalty: boolean;
  filterType: string;
  reason: string;
  penaltyDeduction: number;
}

// Bull vs Bear Battle Result
export interface BullVsBearBattle {
  bullScore: number;
  bearScore: number;
  dominantSide: "BULL_DOMINANT" | "BEAR_DOMINANT" | "BALANCED_NEUTRAL";
  actionAdvice: string;
  confluenceSummary: string;
}

export interface EngineAnalysisOutput {
  symbol: string;
  name: string;
  detectedPatterns: BearishPatternDef[];
  scores: ConfluenceScores;
  noiseFilter: FalseSignalFilterResult;
  finalScore: number;
  riskLevel: "CRITICAL_RISK" | "HIGH_RISK" | "MODERATE_RISK" | "LOW_RISK";
  battle: BullVsBearBattle;
  metrics: {
    bodyAtrRatio: number;
    upperWickRatio: number;
    penetrationPct: number;
    rvol: number;
    vwapDistancePct: number;
    rsiDivergenceGap: number;
    breakoutFailureScore: number;
  };
}

export class BearishIntelligenceEngine {
  public static analyzeStock(
    symbol: string,
    name: string,
    currentPrice: number,
    changeRate: number,
    customSeed?: number
  ): EngineAnalysisOutput {
    // Generate deterministic simulated technical metrics based on symbol/seed
    const seed = (customSeed || symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) + currentPrice;
    
    const bodyAtrRatio = Number((((seed % 15) + 5) / 10).toFixed(2)); // 0.5 ~ 2.0
    const upperWickRatio = Number((((seed % 25) + 8) / 10).toFixed(2)); // 0.8 ~ 3.3
    const penetrationPct = Math.round((seed % 45) + 35); // 35% ~ 80%
    const rvol = Number((((seed % 35) + 10) / 10).toFixed(2)); // 1.0 ~ 4.5
    const vwapDistancePct = Number((((seed % 40) - 20) / 10).toFixed(2)); // -2.0% ~ +2.0%
    const rsiDivergenceGap = Math.round((seed % 25) + 5); // 5 ~ 30p
    const breakoutFailureScore = Math.round((seed % 35) + 60); // 60 ~ 95

    // Select active patterns based on market condition
    const detectedPatterns: BearishPatternDef[] = [];

    if (changeRate < -1.5) {
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "LONG_BEARISH")!);
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "SUPPORT_BREAKDOWN")!);
    }
    if (rvol > 2.0) {
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "VOLUME_CLIMAX_REVERSAL")!);
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "DISTRIBUTION_CANDLE")!);
    }
    if (upperWickRatio > 1.8) {
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "SHOOTING_STAR")!);
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "FAILED_BREAKOUT")!);
    }
    if (vwapDistancePct < -0.5) {
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "VWAP_BREAKDOWN")!);
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "VWAP_REJECTION")!);
    }

    // Default Fallbacks if empty
    if (detectedPatterns.length === 0) {
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "LOWER_HIGH")!);
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "BEARISH_ENGULFING")!);
      detectedPatterns.push(BEARISH_PATTERN_CATALOG.find(p => p.code === "BULL_TRAP")!);
    }

    // Compute 8 Sub-Engines Confluence Scores (Total 100)
    const candlePattern = Math.min(15, Math.round(bodyAtrRatio * 7 + (detectedPatterns.length * 2)));
    const rejectionLocation = Math.min(15, Math.round(upperWickRatio * 4 + 3));
    const marketStructure = Math.min(15, Math.round((breakoutFailureScore / 100) * 15));
    const volumeOrderPressure = Math.min(15, Math.round((rvol / 4.5) * 15));
    const vwapLevel = vwapDistancePct < 0 ? 9 : 4;
    const momentum = Math.min(10, Math.round((rsiDivergenceGap / 30) * 10));
    const breakdown = changeRate < 0 ? Math.min(10, Math.round(Math.abs(changeRate) * 2.5)) : 3;
    const followThrough = Math.min(10, Math.round((penetrationPct / 80) * 10));

    const rawTotal = candlePattern + rejectionLocation + marketStructure + volumeOrderPressure + vwapLevel + momentum + breakdown + followThrough;

    // Evaluate False Signal Filters (가짜 하락 신호 필터)
    let hasPenalty = false;
    let filterType = "NONE";
    let reason = "정상 하락 수급 패턴 확정";
    let penaltyDeduction = 0;

    if (changeRate > 2.0 && rvol < 1.2) {
      hasPenalty = true;
      filterType = "STRONG_UPTREND_PULLBACK";
      reason = "강한 상승 추세 내 거래량 없는 소형 음봉 ➔ 정상 눌림목 (Pullback) 가능성 높음";
      penaltyDeduction = 18;
    } else if (vwapDistancePct > 1.2) {
      hasPenalty = true;
      filterType = "VWAP_NOISE";
      reason = "VWAP 상단 지지선 위 소형 음봉 ➔ 단순 노이즈 가능성";
      penaltyDeduction = 14;
    } else if (rsiDivergenceGap < 8 && changeRate < -4.0) {
      hasPenalty = true;
      filterType = "OVERSOLD_REBOUND";
      reason = "RSI 단기 과매도 + VWAP 과대 이격 ➔ 하락 추격 매도 위험 구간";
      penaltyDeduction = 15;
    }

    const finalScore = Math.max(0, Math.min(100, rawTotal - penaltyDeduction));

    // Risk Level Categorization
    let riskLevel: EngineAnalysisOutput["riskLevel"] = "MODERATE_RISK";
    if (finalScore >= 80) riskLevel = "CRITICAL_RISK";
    else if (finalScore >= 65) riskLevel = "HIGH_RISK";
    else if (finalScore >= 40) riskLevel = "MODERATE_RISK";
    else riskLevel = "LOW_RISK";

    // Dual AI Score Competition (BULL SCORE vs BEAR SCORE)
    const bearScore = finalScore;
    const bullScore = Math.max(10, Math.min(95, 100 - bearScore + (hasPenalty ? 25 : 0)));

    let dominantSide: BullVsBearBattle["dominantSide"] = "BALANCED_NEUTRAL";
    if (bearScore >= bullScore + 10) dominantSide = "BEAR_DOMINANT";
    else if (bullScore >= bearScore + 10) dominantSide = "BULL_DOMINANT";

    let actionAdvice = "";
    if (dominantSide === "BEAR_DOMINANT") {
      actionAdvice = `🚨 [하락 우세 / 매도 손절 권고] ${name} (${symbol})은 Failed Breakout + VWAP 이탈 + RVOL ${rvol}배 대량 분산 매도로 하락 위험이 압도적입니다.`;
    } else if (dominantSide === "BULL_DOMINANT") {
      actionAdvice = `🛡️ [가짜 하락 / 매수 유지] ${name}은 하락 신호 필터링(${reason})에 의해 매수세 지지력이 유지되는 정상 눌림목입니다.`;
    } else {
      actionAdvice = `⚖️ [팽팽한 수급 교착] 상승세와 하락세가 균형을 이루고 있어 주요 지지선 Breakout 확인 후 진입을 추천합니다.`;
    }

    const confluenceSummary = `BEAR ${bearScore}pt vs BULL ${bullScore}pt (${detectedPatterns.length}개 하락 패턴 감지, ATR비율 ${bodyAtrRatio}, RVOL ${rvol}배)`;

    return {
      symbol,
      name,
      detectedPatterns,
      scores: {
        candlePattern,
        rejectionLocation,
        marketStructure,
        volumeOrderPressure,
        vwapLevel,
        momentum,
        breakdown,
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
      riskLevel,
      battle: {
        bullScore,
        bearScore,
        dominantSide,
        actionAdvice,
        confluenceSummary
      },
      metrics: {
        bodyAtrRatio,
        upperWickRatio,
        penetrationPct,
        rvol,
        vwapDistancePct,
        rsiDivergenceGap,
        breakoutFailureScore
      }
    };
  }
}
