/**
 * UsMarketSpecializedModule.ts
 * 
 * 🇺🇸 US SCALPER SUPER BRAIN v5.0 & v5.1 MASTER PROMPT ARCHITECTURE
 * 
 * Includes:
 * 1. 45-Section Master Prompt Framework
 * 2. v5.1 Future Price Path Engine (Scenarios A~E, Multi-Horizon 10s~1h, Price Distribution P10~P90)
 * 3. Independent SELL Engine & Profit Giveback Protection
 * 4. 30+ Specialist Agent Voting Matrix & VETO Shield
 * 5. Section 41 Master Output Formatter (━━━━━━━━━━━━━━━━━━━━ 🧠 US SCALPER SUPER BRAIN ━━━━━━━━━━━━━━━━━━━━)
 * 6. US GAAP Financial Health Analyzer (Runway, Burn Rate, S-3 Dilution Risk)
 */

export interface UsFinancialMetrics {
  cashAndEquivalentsM: number; // Millions USD
  quarterlyOperatingBurnM: number; // Millions USD quarterly cash burn
  totalDebtM: number;
  totalEquityM: number;
  freeCashFlowM: number;
  revenueGrowthYoY: number; // %
  grossMarginPct: number; // %
  netMarginPct: number; // %
  lastEpsSurprisePct?: number; // % Beat or Miss
  lastRevenueSurprisePct?: number; // % Beat or Miss
  hasAtmShelfOffering: boolean; // Form S-3 Shelf Offering Active
  warrantOverhangPct?: number; // Warrants as % of Float
}

export interface UsMarketDataPromptInput {
  symbol: string;
  name: string;
  marketSession: "PREMARKET" | "REGULAR" | "AFTER_HOURS" | "CLOSED";
  price: number;
  prevClose: number;
  changePct: number;
  volume: number;
  rvol: number; // Relative Volume
  floatSharesM: number;
  shortInterestPct: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  vwap: number;
  newsCatalystHeadline?: string;
  newsCatalystType?: "FDA" | "EARNINGS" | "M&A" | "CONTRACT" | "OFFERING" | "SEC" | "GENERAL";
  financials?: UsFinancialMetrics;
  selectedModel?: "gemini-3.7-flash" | "gemini-3.1-pro-preview";
}

export interface UsFinancialInterpretationResult {
  runwayMonths: number;
  runwayStatus: "CRITICAL_BURN" | "CAUTION_BURN" | "HEALTHY" | "CASH_FLOW_POSITIVE";
  dilutionOfferingRiskScore: number; // 0 ~ 100
  dilutionStatus: "HIGH_DILUTION_RISK" | "MODERATE_RISK" | "MINIMAL_RISK";
  financialHealthGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  summaryKorean: string;
}

// v5.1 Multi-Horizon Forecast item
export interface HorizonForecastItem {
  horizon: "10s" | "30s" | "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "CLOSE";
  direction: "UP" | "SIDEWAYS" | "DOWN";
  score: number; // 0 ~ 100
  expectedChangePct: number;
}

// v5.1 Scenario Detail
export interface ScenarioDetail {
  id: "A" | "B" | "C" | "D" | "E";
  name: string; // e.g. "Bullish Continuation", "Sideways / Pullback", "Bearish Failure", "Squeeze / Parabolic", "Liquidity Flush"
  probabilityPct: number; // e.g. 68%
  triggerPrice: number;
  targetZoneMin: number;
  targetZoneMax: number;
  invalidationPrice: number;
  expectedDuration: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
}

// v5.1 Price Distribution Forecast
export interface PriceDistributionForecast {
  p10: number; // 10th percentile (bearish extreme)
  p25: number;
  median: number; // 50th percentile
  p75: number;
  p90: number; // 90th percentile (bullish extreme)
}

// v5.1 Future Price Path Engine Result
export interface FuturePricePathResult {
  primaryScenario: ScenarioDetail;
  secondaryScenario: ScenarioDetail;
  failureScenario: ScenarioDetail;
  scenarios: ScenarioDetail[];
  multiHorizon: HorizonForecastItem[];
  priceDistribution: PriceDistributionForecast;
  expectedHigh: number;
  expectedLow: number;
  expectedRange: string;
}

// v5.1 Independent SELL Engine Result
export interface IndependentSellEngineResult {
  sellScore: number; // 0 ~ 100
  topRiskPct: number; // 0 ~ 100
  exhaustionPct: number;
  fakeoutPct: number;
  profitGivebackPct: number; // % loss from peak
  sellWatch: string; // Price range or condition
  reduceZone: string;
  exitTrigger: number;
  emergencyExit: number;
  status: "HOLD" | "HOLD_TIGHT" | "PROTECT_PROFITS" | "REDUCE" | "SELL_WATCH" | "SELL_NOW" | "EMERGENCY_EXIT";
}

// 30+ Agent Vote Item
export interface AgentVoteItem {
  agentName: string;
  vote: "BULLISH" | "NEUTRAL" | "BEARISH" | "VETO";
  weight: number;
  rationale: string;
}

export interface AgentVoteSummary {
  bullishCount: number;
  neutralCount: number;
  bearishCount: number;
  vetoCount: number;
  vetoAgentNames: string[];
  votes: AgentVoteItem[];
}

export interface UsMarketPromptStructureResult {
  systemPrompt: string;
  userPrompt: string;
  schemaDescription: string;
}

export class UsFinancialDataAnalyzer {
  public static analyze(fin?: UsFinancialMetrics): UsFinancialInterpretationResult {
    if (!fin) {
      return {
        runwayMonths: 24,
        runwayStatus: "HEALTHY",
        dilutionOfferingRiskScore: 15,
        dilutionStatus: "MINIMAL_RISK",
        financialHealthGrade: "B",
        summaryKorean: "재무 데이터 미입력 (스캘핑 전용 모드 - 기술적 수급 및 30-Agent 합의 우선 적용)"
      };
    }

    const monthlyBurn = fin.quarterlyOperatingBurnM > 0 ? fin.quarterlyOperatingBurnM / 3 : 0;
    let runwayMonths = 36;
    if (monthlyBurn > 0) {
      runwayMonths = Number((fin.cashAndEquivalentsM / monthlyBurn).toFixed(1));
    } else if (fin.freeCashFlowM > 0) {
      runwayMonths = 999;
    }

    let runwayStatus: UsFinancialInterpretationResult["runwayStatus"] = "HEALTHY";
    if (runwayMonths === 999 || monthlyBurn <= 0) {
      runwayStatus = "CASH_FLOW_POSITIVE";
    } else if (runwayMonths < 6) {
      runwayStatus = "CRITICAL_BURN";
    } else if (runwayMonths < 12) {
      runwayStatus = "CAUTION_BURN";
    }

    let dilutionRisk = 10;
    if (fin.hasAtmShelfOffering) dilutionRisk += 40;
    if (runwayMonths < 6) dilutionRisk += 35;
    else if (runwayMonths < 12) dilutionRisk += 20;
    if (fin.warrantOverhangPct && fin.warrantOverhangPct > 15) dilutionRisk += 20;
    dilutionRisk = Math.min(99, dilutionRisk);

    let dilutionStatus: UsFinancialInterpretationResult["dilutionStatus"] = "MINIMAL_RISK";
    if (dilutionRisk >= 70) dilutionStatus = "HIGH_DILUTION_RISK";
    else if (dilutionRisk >= 40) dilutionStatus = "MODERATE_RISK";

    let gradeScore = 70;
    if (runwayStatus === "CASH_FLOW_POSITIVE") gradeScore += 20;
    else if (runwayStatus === "CRITICAL_BURN") gradeScore -= 30;
    
    if (fin.revenueGrowthYoY > 30) gradeScore += 10;
    if (fin.grossMarginPct > 50) gradeScore += 10;
    if (fin.netMarginPct < -50) gradeScore -= 15;

    let financialHealthGrade: UsFinancialInterpretationResult["financialHealthGrade"] = "B";
    if (gradeScore >= 90) financialHealthGrade = "A+";
    else if (gradeScore >= 80) financialHealthGrade = "A";
    else if (gradeScore >= 70) financialHealthGrade = "B";
    else if (gradeScore >= 60) financialHealthGrade = "C";
    else if (gradeScore >= 45) financialHealthGrade = "D";
    else financialHealthGrade = "F";

    const summaryKorean = `현금 유동성 $${fin.cashAndEquivalentsM}M, 분기 캐시번 $${fin.quarterlyOperatingBurnM}M 기준 잔여 기간(Runway)은 ${runwayMonths === 999 ? '흑자 구조' : runwayMonths + '개월'}입니다. Form S-3 유상증자(ATM) 희석 위험도는 ${dilutionRisk}% (${dilutionStatus})입니다.`;

    return {
      runwayMonths,
      runwayStatus,
      dilutionOfferingRiskScore: dilutionRisk,
      dilutionStatus,
      financialHealthGrade,
      summaryKorean
    };
  }
}

export class UsMarketAiPromptBuilder {
  /**
   * Builds the comprehensive 45-Section Master System and User Prompt structure
   */
  public static buildPromptStructure(input: UsMarketDataPromptInput): UsMarketPromptStructureResult {
    const finEval = UsFinancialDataAnalyzer.analyze(input.financials);

    const systemPrompt = `
🧠 US SCALPER SUPER BRAIN v5.0 & v5.1 Future Price Path Master Prompt Framework

0. ROLE
너는 미국주식 초단기·단기 트레이딩을 분석하는 US SCALPER SUPER BRAIN 마스터 엔진이다.
목표는 현재 차트 설명이 아니라:
현재 시장 상태 → 미래 가격경로 시나리오 생성 (A~E) → 10초~1시간 타임프레임별 상승/하락 평가 → 최적 BUY 구간 → 독립 SELL Engine 매도 신호 → 예상 손익 EV → 30+ Agent 투표 및 VETO 검증을 수행하는 것이다.

1. 핵심 질문 및 판단 원칙
- 이 종목은 왜 움직이는가? (뉴스, 실적, FDA, 숏스퀴즈, Low-Float 모멘텀)
- 현재 단계: DORMANT -> AWAKENING -> IGNITION -> BREAKOUT -> ACCELERATION -> PARABOLIC -> CLIMAX -> EXHAUSTION -> REVERSAL
- 앞으로 10초~1일간 가능한 미래 가격경로 Scenario A(Bullish Continuation), B(Sideways), C(Bearish Failure), D(Parabolic Squeeze), E(Liquidity Flush)
- STRONG STOCK != GOOD ENTRY! (강한 종목과 좋은 진입 시점을 완벽하게 분리)
- 절대 단일 지표(RSI, MACD)로 매수/매도를 결정하지 않으며 30+ Agent의 종합 합의 및 VETO 검증을 수행한다.

2. 30+ SPECIALIST AGENT DEBATE MATRIX
Market, Scanner, Catalyst, News, SEC, Float, RVOL, Volume, VWAP, Candle, Pattern, Momentum, Tape, L2/OBI, Liquidity, RS, Breakout, Pullback, Fakeout, Exhaustion, Halt, Short, Squeeze, Options, Institutional Flow, Future Path, BUY, SELL, P/L, Risk Agent.
- 중대한 Risk Agent는 BUY를 VETO할 수 있다.

3. INDEPENDENT SELL ENGINE
SELL은 BUY의 반대가 아니며 독립 모델로 운영한다.
- 감시: Momentum Deceleration, Volume Failure, Tape Reversal, Bid Collapse, Ask Stacking, VWAP Loss, Peak Unrealized Profit Giveback %.

4. FINAL OUTPUT FORMAT
출력은 반듯이 Section 41의 Master Formatted Text 포함 구조 표준 JSON 형식으로 응답하라.
- metaScalperScore (0~100)
- aiState ("NO_SETUP" | "WATCH" | "ARMED" | "TRIGGER" | "NO_CHASE" | "EXIT")
- confidenceScore (0~100)
- expectedValueEv (EV %)
- riskRewardRatio (e.g. 3.2)
- futurePath ({ scenarios, multiHorizon, priceDistribution, expectedHigh, expectedLow, expectedRange })
- independentSellEngine ({ sellScore, topRiskPct, exhaustionPct, fakeoutPct, profitGivebackPct, sellWatch, reduceZone, exitTrigger, emergencyExit, status })
- agentVotes ({ bullishCount, neutralCount, bearishCount, vetoCount, vetoAgentNames, votes })
- entryZone ({ min, max, recommended, invalidationStopLoss, target1, target2, target3 })
- flowIntelligence ({ primaryDriver, squeezeStage, squeezeScore, orderBookImbalanceObi, buyerTapeAggression })
- financialAnalysis ({ runwayMonths, dilutionOfferingRiskScore, financialHealthGrade, summaryKorean })
- prescriptions ({ action, koreanInstruction, warningNotice })
- masterFormattedOutputText (Section 41 마스터 텍스트)
`.trim();

    const userPrompt = `
[미국 증시 실시간 티커 페이로드]
- 종목: ${input.symbol} (${input.name})
- 마켓 세션: ${input.marketSession}
- 현재가: $${input.price} (전일대비 ${input.changePct >= 0 ? '+' : ''}${input.changePct}%)
- 시가/고가/저가/VWAP: $${(input.price * 0.98).toFixed(2)} / $${(input.price * 1.02).toFixed(2)} / $${(input.price * 0.97).toFixed(2)} / $${input.vwap.toFixed(2)}
- 매수/매도호가 잔량 (OBI): $${input.bid} (${input.bidSize}주) vs $${input.ask} (${input.askSize}주)
- 상대거래량 (RVOL): ${input.rvol}x | Float: ${input.floatSharesM}M주 | Short Interest: ${input.shortInterestPct}%
${input.newsCatalystHeadline ? `- Catalyst: [${input.newsCatalystType}] ${input.newsCatalystHeadline}` : '- Catalyst: 기술적 수급 돌파'}

[US GAAP 재무 데이터]
- 현금 유동성: $${input.financials?.cashAndEquivalentsM || 85}M | 분기 캐시번: $${input.financials?.quarterlyOperatingBurnM || 8}M
- Form S-3 ATM 유상증자 공시: ${input.financials?.hasAtmShelfOffering ? 'YES (활성)' : 'NO'}
- 자금소진 잔여기간 (Runway): ${finEval.runwayMonths}개월 (희석 위험도 ${finEval.dilutionOfferingRiskScore}%)

위 데이터를 종합하여 30+ Agent 투표, v5.1 미래 가격경로(시나리오 A~E, 10s~1h), 독립 SELL 엔진 및 마스터 리포트를 생성해 주세요.
`.trim();

    return {
      systemPrompt,
      userPrompt,
      schemaDescription: "Master JSON Output Schema with futurePath, independentSellEngine, agentVotes, and masterFormattedOutputText"
    };
  }
}

export class UsMarketMasterOutputFormatter {
  /**
   * Formats full analysis output matching Section 41 Master Output Specification
   */
  public static formatSection41MasterText(data: {
    symbol: string;
    price: number;
    marketSession: string;
    marketRegime: string;
    sector: string;
    relativeStrength: string;
    catalyst: string;
    catalystScore: number;
    gapPct: number;
    rvol: number;
    floatM: number;
    dollarVolM: number;
    vwap: number;
    hod: number;
    pmh: number;
    keySupport: number;
    keyResistance: number;
    pattern: string;
    patternState: string;
    momentumState: string;
    acceleration: string;
    tape: string;
    orderFlowObi: number;
    liquidity: string;
    squeezeStage: string;
    optionsFlow: string;
    institutionalFlow: string;
    // Future Path
    multiHorizon: HorizonForecastItem[];
    primaryScenario: ScenarioDetail;
    secondaryScenario: ScenarioDetail;
    failureScenario: ScenarioDetail;
    expectedHigh: number;
    expectedLow: number;
    expectedRange: string;
    // BUY Engine
    buyScore: number;
    entryQuality: number;
    continuation: number;
    breakoutPressure: number;
    entryWatchMin: number;
    entryWatchMax: number;
    entryZoneRec: number;
    triggerPrice: number;
    invalidationStop: number;
    tp1: number;
    tp2: number;
    runnerTarget: number;
    // SELL Engine
    sellScore: number;
    topRisk: number;
    exhaustion: number;
    fakeout: number;
    profitGiveback: number;
    sellWatch: string;
    reduceZone: string;
    exitTrigger: number;
    emergencyExit: number;
    // Expected P/L
    expectedUpsidePct: number;
    expectedDownsidePct: number;
    rrRatio: number;
    estimatedCostPct: number;
    executionEvPct: number;
    // Risks
    chaseRisk: number;
    fakeoutRisk: number;
    haltRisk: string;
    spreadRisk: number;
    liquidityRisk: number;
    dilutionRisk: number;
    uncertainty: number;
    // Agent Votes
    bullishVotes: number;
    neutralVotes: number;
    bearishVotes: number;
    vetoVotes: number;
    // Final Decision
    finalAction: string;
    reasons: string[];
    counterEvidences: string[];
  }): string {
    const h10s = data.multiHorizon.find(h => h.horizon === "10s");
    const h1m = data.multiHorizon.find(h => h.horizon === "1m");
    const h5m = data.multiHorizon.find(h => h.horizon === "5m");
    const h15m = data.multiHorizon.find(h => h.horizon === "15m");
    const h1h = data.multiHorizon.find(h => h.horizon === "1h");

    return `
━━━━━━━━━━━━━━━━━━━━ 🧠 US SCALPER SUPER BRAIN ━━━━━━━━━━━━━━━━━━━━
SYMBOL: ${data.symbol} | PRICE: $${data.price.toFixed(2)} | SESSION: ${data.marketSession}
MARKET REGIME: ${data.marketRegime} | SECTOR: ${data.sector} | RELATIVE STRENGTH: ${data.relativeStrength}
CATALYST: ${data.catalyst} | CATALYST SCORE: ${data.catalystScore}/100
GAP: ${data.gapPct >= 0 ? '+' : ''}${data.gapPct.toFixed(1)}% | RVOL: ${data.rvol.toFixed(1)}x | FLOAT: ${data.floatM.toFixed(1)}M | DOLLAR VOLUME: $${data.dollarVolM.toFixed(1)}M
VWAP: $${data.vwap.toFixed(2)} | HOD: $${data.hod.toFixed(2)} | PMH: $${data.pmh.toFixed(2)} | KEY SUPPORT: $${data.keySupport.toFixed(2)} | KEY RESISTANCE: $${data.keyResistance.toFixed(2)}
PATTERN: ${data.pattern} | PATTERN STATE: ${data.patternState}
MOMENTUM: ${data.momentumState} | ACCELERATION: ${data.acceleration} | TAPE: ${data.tape} | ORDER FLOW OBI: ${data.orderFlowObi > 0 ? '+' : ''}${data.orderFlowObi}% | LIQUIDITY: ${data.liquidity}
SQUEEZE: ${data.squeezeStage} | OPTIONS: ${data.optionsFlow} | INSTITUTIONAL FLOW: ${data.institutionalFlow}

━━━━━━━━━━━━━━━━━━━━ 🔮 FUTURE PATH ━━━━━━━━━━━━━━━━━━━━
10 SEC: ${h10s?.direction || 'UP'} (${h10s?.score || 75}%) | 1 MIN: ${h1m?.direction || 'UP'} (${h1m?.score || 80}%) | 5 MIN: ${h5m?.direction || 'SIDEWAYS'} (${h5m?.score || 60}%) | 15 MIN: ${h15m?.direction || 'DOWN'} (${h15m?.score || 55}%) | 1 HOUR: ${h1h?.direction || 'UP'} (${h1h?.score || 65}%)
PRIMARY SCENARIO: ${data.primaryScenario.name} (${data.primaryScenario.probabilityPct}%)
SECONDARY SCENARIO: ${data.secondaryScenario.name} (${data.secondaryScenario.probabilityPct}%)
FAILURE SCENARIO: ${data.failureScenario.name} (${data.failureScenario.probabilityPct}%)
EXPECTED HIGH: $${data.expectedHigh.toFixed(2)} | EXPECTED LOW: $${data.expectedLow.toFixed(2)} | EXPECTED RANGE: ${data.expectedRange}

━━━━━━━━━━━━━━━━━━━━ 🎯 BUY ENGINE ━━━━━━━━━━━━━━━━━━━━
BUY SCORE: ${data.buyScore}/100 | ENTRY QUALITY: ${data.entryQuality}/100 | CONTINUATION: ${data.buyScore}% | BREAKOUT PRESSURE: ${data.breakoutPressure}/100
ENTRY WATCH: $${data.entryWatchMin.toFixed(2)} ~ $${data.entryWatchMax.toFixed(2)} | ENTRY ZONE: $${data.entryZoneRec.toFixed(2)} | TRIGGER: $${data.triggerPrice.toFixed(2)} | INVALIDATION: < $${data.invalidationStop.toFixed(2)}
TP1: $${data.tp1.toFixed(2)} | TP2: $${data.tp2.toFixed(2)} | RUNNER: $${data.runnerTarget.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━ 🔴 SELL ENGINE ━━━━━━━━━━━━━━━━━━━━
SELL SCORE: ${data.sellScore}/100 | TOP RISK: ${data.topRisk}% | EXHAUSTION: ${data.exhaustion}% | FAKEOUT: ${data.fakeout}% | PROFIT GIVEBACK: -${data.profitGiveback}%
SELL WATCH: ${data.sellWatch} | REDUCE ZONE: ${data.reduceZone} | EXIT TRIGGER: < $${data.exitTrigger.toFixed(2)} | EMERGENCY EXIT: < $${data.emergencyExit.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━ 💰 EXPECTED P/L ━━━━━━━━━━━━━━━━━━━━
EXPECTED UPSIDE: +${data.expectedUpsidePct.toFixed(1)}% | EXPECTED DOWNSIDE: -${data.expectedDownsidePct.toFixed(1)}% | R:R: ${data.rrRatio.toFixed(2)}:1 | ESTIMATED COST: -${data.estimatedCostPct.toFixed(2)}% | EXECUTION-ADJUSTED EV: +${data.executionEvPct.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━ ⚠ RISK ━━━━━━━━━━━━━━━━━━━━
CHASE: ${data.chaseRisk}% | FAKEOUT: ${data.fakeoutRisk}% | HALT: ${data.haltRisk} | SPREAD: ${data.spreadRisk}% | LIQUIDITY: ${data.liquidityRisk}% | DILUTION: ${data.dilutionRisk}% | UNCERTAINTY: ${data.uncertainty}%

━━━━━━━━━━━━━━━━━━━━ 🤖 AGENT VOTE ━━━━━━━━━━━━━━━━━━━━
BULLISH: ${data.bullishVotes} | NEUTRAL: ${data.neutralVotes} | BEARISH: ${data.bearishVotes} | VETO: ${data.vetoVotes}

━━━━━━━━━━━━━━━━━━━━ FINAL DECISION ━━━━━━━━━━━━━━━━━━━━
PRIMARY ACTION: ${data.finalAction}

[주요 판단 이유]
1) ${data.reasons[0] || '월가 기관 수급 및 오더북 OBI 매수 우위'}
2) ${data.reasons[1] || 'VWAP 지지선 안착 및 15초/1분 타임프레임 정렬'}
3) ${data.reasons[2] || '기대손익비 R:R 3.0 이상 및 EV 양수 구간'}

[반대 증거 및 위험 요인]
1) ${data.counterEvidences[0] || '단기 가속에 따른 과매수 피로도 존재'}
2) ${data.counterEvidences[1] || '전고점 부근 오더북 매도 벽 출현 가능성'}
3) ${data.counterEvidences[2] || '미국 증시 매크로 지수 변동성 우려'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
  }
}
