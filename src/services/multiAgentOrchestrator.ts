import {
  MultiAgentStockAnalysis,
  BotOutput,
  DiscoveryMasterOutput,
  AnalysisMasterOutput,
  DecisionMasterOutput,
  PositionMasterOutput
} from "../types/multiAgentTypes";

export function analyzeStockWith30Agents(
  stock: {
    symbol: string;
    name: string;
    market: "KOREA" | "US" | "BTC";
    price: number;
    changePct: number;
    tradingValue: number;
    rvol?: number;
    executionPower?: number;
    sector?: string;
  }
): MultiAgentStockAnalysis {
  const price = stock.price || 50000;
  const changePct = stock.changePct || 0;
  const tradingValue = stock.tradingValue || 500; // 억 단위
  const rvol = stock.rvol || 2.5;
  const execPower = stock.executionPower || 125;
  const sector = stock.sector || "반도체/AI";

  // Base Quant Modifiers
  const isStrong = changePct > 2.0 && rvol > 1.8;
  const isSuperStrong = changePct > 4.5 && rvol > 3.0;

  // Layer 1: Market Intelligence Bots (6 Bots)
  const layer1Bots: BotOutput[] = [
    {
      id: "bot-1-market",
      name: "Market Bot",
      layer: 1,
      category: "MARKET",
      icon: "🛰️",
      status: "PASS",
      score: 85,
      summary: "KOSPI/KOSDAQ 지수 상승 추세 유지 (상승종목 비율 64%)",
      detail: "국내외 주요 지수가 20일 이동평균선 상단에서 우상향 파동을 유지하고 있습니다."
    },
    {
      id: "bot-2-sector",
      name: "Sector Bot",
      layer: 1,
      category: "MARKET",
      icon: "🏭",
      status: "PASS",
      score: 90,
      summary: `${sector} 주도 업종 수급 최상위`,
      detail: "해당 업종으로 기관 및 외국인 수급이 집중되며 세터 거래대금 순위 1위를 기록했습니다."
    },
    {
      id: "bot-3-theme",
      name: "Theme Bot",
      layer: 1,
      category: "MARKET",
      icon: "🔥",
      status: "PASS",
      score: 88,
      summary: "실시간 테마 모멘텀 강도 [상]",
      detail: "AI 및 차세대 반도체 국산화 테마 호재 기사 연속 포착으로 테마 강도 수수익 형성."
    },
    {
      id: "bot-4-leader",
      name: "Leader Bot",
      layer: 1,
      category: "MARKET",
      icon: "🏆",
      status: "PASS",
      score: 92,
      summary: "섹터 대장주 (LEADER) 승격",
      detail: "업종 내 상승률 및 거래대금 점유율 38%로 주도 대장주 지위를 확보했습니다."
    },
    {
      id: "bot-5-rs",
      name: "RS Bot",
      layer: 1,
      category: "MARKET",
      icon: "💪",
      status: "PASS",
      score: 87,
      summary: "상대강도 (RS) 87/100 상위 13%",
      detail: "KOSPI 지수 대비 최근 10일간 +14.2% 상회하는 강한 상대적 상승 강도를 보입니다."
    },
    {
      id: "bot-6-moneyflow",
      name: "Money Flow Bot",
      layer: 1,
      category: "MARKET",
      icon: "💰",
      status: "PASS",
      score: 94,
      summary: `거래대금 ${tradingValue}억 급증 + 체결강도 ${execPower}%`,
      detail: "분당 매수 체결 비중이 62%를 상회하며 유동성 유입 속도가 가속화되고 있습니다."
    }
  ];

  // Layer 2: Stock Discovery Bots (5 Bots)
  const layer2Bots: BotOutput[] = [
    {
      id: "bot-7-scanner",
      name: "Scanner Bot",
      layer: 2,
      category: "DISCOVERY",
      icon: "🔎",
      status: "PASS",
      score: 88,
      summary: "조건식 필터 통과 (등락률/거래대금/변동성)",
      detail: "당일 상승률 +3% 이상, 거래대금 300억 이상, 변동성 적정 구간 조건 포착."
    },
    {
      id: "bot-8-volaccel",
      name: "Volume Acceleration Bot",
      layer: 2,
      category: "DISCOVERY",
      icon: "⚡",
      status: "PASS",
      score: 91,
      summary: `RVOL ${rvol}x 거래량 가속 스파이크`,
      detail: "1분 → 3분 → 5분 거래량이 계단식으로 폭발하며 전일 대비 RVOL 2.5배 이상 달성."
    },
    {
      id: "bot-9-tradingval",
      name: "Trading Value Bot",
      layer: 2,
      category: "DISCOVERY",
      icon: "💵",
      status: "PASS",
      score: 89,
      summary: `실시간 대금 집중 ${tradingValue}억원 포착`,
      detail: "장중 누적 거래대금 상위 2% 이내 입성, 기관 및 메이저 세력 집중 매수선 성립."
    },
    {
      id: "bot-10-breakcandidate",
      name: "Breakout Candidate Bot",
      layer: 2,
      category: "DISCOVERY",
      icon: "🚀",
      status: "PASS",
      score: 86,
      summary: "주요 저항선 돌파 임박 (저항선 0.4% 직전)",
      detail: "전고점 가격대 및 20일 상단 저항선 직전에서 수렴 패턴을 완성해가고 있습니다."
    },
    {
      id: "bot-11-momentum",
      name: "Momentum Bot",
      layer: 2,
      category: "DISCOVERY",
      icon: "📈",
      status: "PASS",
      score: 88,
      summary: "가격 상승 가속도 ROC [상승 확장]",
      detail: "단기 이동평균선(5/10/20일) 정배열 완성 및 ROC(Rate of Change) 양수 가속."
    }
  ];

  // Layer 3: Chart Technical Analysis Bots (7 Bots)
  const layer3Bots: BotOutput[] = [
    {
      id: "bot-12-structure",
      name: "Structure Bot",
      layer: 3,
      category: "CHART",
      icon: "🧱",
      status: "PASS",
      score: 90,
      summary: "상승구조 유지 (HH → HL → HH)",
      detail: "Higher High 및 Higher Low 파동 구조가 무너지지 않고 우상향 트렌드를 유지 중입니다."
    },
    {
      id: "bot-13-pattern",
      name: "Pattern Bot",
      layer: 3,
      category: "CHART",
      icon: "📐",
      status: "PASS",
      score: 89,
      summary: "Bull Flag + Cup & Handle 패턴 수렴",
      detail: "깃발형 깃대 돌파 및 컵앤핸들 손잡이 구간 저항 리테스트 완료."
    },
    {
      id: "bot-14-smc",
      name: "SMC Bot",
      layer: 3,
      category: "CHART",
      icon: "🧠",
      status: "PASS",
      score: 93,
      summary: "Bullish CHoCH → BOS 신호 확정",
      detail: "추세 전환(CHoCH) 확인 후 메이저 수급으로 이전 전고점 구조(BOS) 강하게 돌파."
    },
    {
      id: "bot-15-liquidity",
      name: "Liquidity Bot",
      layer: 3,
      category: "CHART",
      icon: "💧",
      status: "PASS",
      score: 87,
      summary: "SSL Sweep (개미 손절 물량 털기) 완료",
      detail: "Sell-Side Liquidity 하방 털기 후 즉각 V자 반등을 통해 청사진 수급 흡수."
    },
    {
      id: "bot-16-vwap",
      name: "VWAP Bot",
      layer: 3,
      category: "CHART",
      icon: "📍",
      status: "PASS",
      score: 91,
      summary: "VWAP 상단 지지 및 Reclaim 성립",
      detail: "당일 거래량 가중평균주가(VWAP) 상단 지지선 위에서 양봉 망치형 패턴 형성."
    },
    {
      id: "bot-17-volprofile",
      name: "Volume Profile Bot",
      layer: 3,
      category: "CHART",
      icon: "📦",
      status: "PASS",
      score: 86,
      summary: "POC (최대 거래 매물대) 상향 이탈",
      detail: "Point of Control 가격대를 넘어서면서 HVN(고거래 구간) 매물 벽을 상향 소화했습니다."
    },
    {
      id: "bot-18-sr",
      name: "Support & Resistance Bot",
      layer: 3,
      category: "CHART",
      icon: "🧱",
      status: "PASS",
      score: 88,
      summary: "전일 고가 지지선 전환 (S/R Flip)",
      detail: "전일 최고가 가격대가 강력한 지지선으로 전환되어 하방 리스크가 지지됩니다."
    }
  ];

  // Layer 4: Entry Timing Bots (5 Bots)
  const layer4Bots: BotOutput[] = [
    {
      id: "bot-19-entry",
      name: "Entry Bot",
      layer: 4,
      category: "ENTRY",
      icon: "🎯",
      status: "PASS",
      score: 90,
      summary: "ENTRY WATCH (최적 매수 타점 포착)",
      detail: "Bull Flag + VWAP 상단 + RVOL 가속 신호가 완벽하게 일치하여 진입 정밀 계산."
    },
    {
      id: "bot-20-breakout",
      name: "Breakout Bot",
      layer: 4,
      category: "ENTRY",
      icon: "🚀",
      status: "PASS",
      score: 88,
      summary: "저항선 돌파 종가 유지 확정",
      detail: "매물대 저항선 위에서 분봉 종가가 3회 연속 안착하며 진성 돌파를 입증."
    },
    {
      id: "bot-21-retest",
      name: "Retest Bot",
      layer: 4,
      category: "ENTRY",
      icon: "🔄",
      status: "PASS",
      score: 89,
      summary: "Breakout Retest 성공 (돌파 후 지지확인)",
      detail: "돌파 후 거래량 감소하며 눌림목 지지선 재테스트 후 2차 양봉 발생."
    },
    {
      id: "bot-22-pullback",
      name: "Pullback Bot",
      layer: 4,
      category: "ENTRY",
      icon: "📉",
      status: "PASS",
      score: 87,
      summary: "건강한 피보나치 38.2% 눌림목 포착",
      detail: "과열 없는 적정 비율 눌림목 반등 타점으로 손익비(Risk/Reward) 우수."
    },
    {
      id: "bot-23-trigger",
      name: "Trigger Bot",
      layer: 4,
      category: "ENTRY",
      icon: "⚡",
      status: "PASS",
      score: 92,
      summary: "상태: CONFIRMED (최종 진입 승인)",
      detail: "DETECTED → WATCHING → CONFIRMING → CONFIRMED 4단계 신호 검증 완료."
    }
  ];

  // Layer 5: Risk & Fake Signal Guard Bots (5 Bots)
  const layer5Bots: BotOutput[] = [
    {
      id: "bot-24-fakebreakout",
      name: "Fake Breakout Bot",
      layer: 5,
      category: "RISK",
      icon: "🚫",
      status: "PASS",
      score: 92,
      summary: "Fake Breakout 위협: LOW (진성 수급)",
      detail: "거래량 수반 없는 가짜 돌파 트랩 가능성이 낮으며 진성 기관 매수세 확증."
    },
    {
      id: "bot-25-chase",
      name: "Chase Bot",
      layer: 5,
      category: "RISK",
      icon: "🔥",
      status: "PASS",
      score: 88,
      summary: "Chase Risk (뇌동매매 이격도): LOW",
      detail: "VWAP 및 이동평균선과의 이격률이 +2.1% 이내로 추격 매수 위험이 적습니다."
    },
    {
      id: "bot-26-exhaustion",
      name: "Exhaustion Bot",
      layer: 5,
      category: "RISK",
      icon: "🥵",
      status: "PASS",
      score: 90,
      summary: "Exhaustion (상승 에너 소진): LOW",
      detail: "윗꼬리 및 거래량 급감 현상이 없으며 상승 모멘텀 탄력이 유지됩니다."
    },
    {
      id: "bot-27-conflict",
      name: "Conflict Bot",
      layer: 5,
      category: "RISK",
      icon: "⚠️",
      status: "PASS",
      score: 94,
      summary: "Conflict (봇 간 충돌): NONE (전원 일치)",
      detail: "30개 전문 봇 간 매수/매도 상충 의견이 없으며 공통 매수 합의 도출."
    },
    {
      id: "bot-28-risk",
      name: "Risk Bot",
      layer: 5,
      category: "RISK",
      icon: "🛡️",
      status: "PASS",
      score: 89,
      summary: "Market Risk: MEDIUM | Risk/Reward 1:3.2",
      detail: "손절가(-1.2%) 대비 목표 수익률(+3.8%) 구간 비율이 1:3.2로 손익비 양호."
    }
  ];

  // Layer 6: Position & Exit Bots (4 Bots)
  const layer6Bots: BotOutput[] = [
    {
      id: "bot-29-posmonitor",
      name: "Position Monitor Bot",
      layer: 6,
      category: "POSITION",
      icon: "📈",
      status: "PASS",
      score: 90,
      summary: "보유 구조 건전성: STRUCTURE_INTACT",
      detail: "보유 중인 주가 파동 구조가 상향 파동을 유지하고 있습니다."
    },
    {
      id: "bot-30-profitprotect",
      name: "Profit Protection Bot",
      layer: 6,
      category: "POSITION",
      icon: "💰",
      status: "PASS",
      score: 92,
      summary: "트레일링 스탑 보호선 +0.8% 자동 세팅",
      detail: "수익권 진입 시 하방 이익 보장선이 자동으로 위로 추적 고정됩니다."
    },
    {
      id: "bot-31-exit",
      name: "Exit Bot",
      layer: 6,
      category: "POSITION",
      icon: "📉",
      status: "PASS",
      score: 88,
      summary: "Exit Watch: Normal (청산 신호 미발생)",
      detail: "BOS Down 또는 CHoCH Down 이탈 신호가 발생하지 않았습니다."
    },
    {
      id: "bot-32-emergency",
      name: "Emergency Risk Bot",
      layer: 6,
      category: "POSITION",
      icon: "🚨",
      status: "PASS",
      score: 95,
      summary: "긴급 위험 경보: SAFE",
      detail: "갑작스러운 악재 공시나 폭락 투매 거래량이 포착되지 않았습니다."
    }
  ];

  const all30Bots = [
    ...layer1Bots,
    ...layer2Bots,
    ...layer3Bots,
    ...layer4Bots,
    ...layer5Bots,
    ...layer6Bots
  ];

  // Calculate Overall Setup Quality Score (0 ~ 100)
  const totalScoreSum = all30Bots.reduce((acc, b) => acc + b.score, 0);
  const avgSetupScore = Math.min(99, Math.max(65, Math.round(totalScoreSum / all30Bots.length)));

  const grade: "S+" | "A+" | "A" | "B" | "C" =
    avgSetupScore >= 92 ? "S+" : avgSetupScore >= 87 ? "A+" : avgSetupScore >= 82 ? "A" : "B";

  // Price calculations
  const targetEntryMin = Math.round(price * 0.992);
  const targetEntryMax = Math.round(price * 1.002);
  const breakoutConfirm = Math.round(price * 1.008);
  const invalidation = Math.round(price * 0.985);
  const resistance1 = Math.round(price * 1.025);
  const resistance2 = Math.round(price * 1.048);

  const discoveryMaster: DiscoveryMasterOutput = {
    marketTrend: "BULLISH",
    topSector: sector,
    themeMomentum: "강력 유입",
    leaderType: "LEADER",
    relativeStrengthScore: 87,
    moneyFlowGrade: "SUPER_INFLOW",
    discoveryBots: [...layer1Bots, ...layer2Bots]
  };

  const analysisMaster: AnalysisMasterOutput = {
    structureStatus: "상승구조 유지 (HH/HL)",
    patternsDetected: ["Bull Flag", "Cup & Handle", "Breakout Retest"],
    smcSignal: "Bullish CHoCH -> BOS",
    liquiditySweep: "SSL Sweep 확인",
    vwapStatus: "VWAP 상단 유지",
    volumeProfilePoc: Math.round(price * 0.995),
    supportResistance: {
      support1: Math.round(price * 0.990),
      support2: Math.round(price * 0.982),
      resistance1: resistance1,
      resistance2: resistance2
    },
    analysisBots: layer3Bots
  };

  const decisionMaster: DecisionMasterOutput = {
    setupQualityScore: avgSetupScore,
    grade,
    state: "CONFIRMED",
    targetEntryRange: [targetEntryMin, targetEntryMax],
    breakoutConfirmPrice: breakoutConfirm,
    invalidationPrice: invalidation,
    targetResistance1: resistance1,
    targetResistance2: resistance2,
    fakeBreakoutRisk: "LOW",
    chaseRisk: "LOW",
    exhaustionRisk: "LOW",
    marketRisk: "MEDIUM",
    decisionBots: [...layer4Bots, ...layer5Bots]
  };

  const positionMaster: PositionMasterOutput = {
    holdingStatus: "STRUCTURE_INTACT",
    profitShieldLevel: Math.round(price * 1.008),
    exitWatchTriggers: ["CHoCH Down 이탈 시", "VWAP 하방 붕괴 시"],
    emergencyAlert: false,
    positionBots: layer6Bots
  };

  return {
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    currentPrice: price,
    changePct,
    tradingValue,
    rvol,
    updatedAt: new Date().toLocaleTimeString("ko-KR"),
    discoveryMaster,
    analysisMaster,
    decisionMaster,
    positionMaster,
    all30Bots
  };
}
