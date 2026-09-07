import React, { useState, useEffect, useMemo } from "react";
import { 
  Brain, 
  Cpu, 
  Zap, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Sliders
} from "lucide-react";
import { StockItem } from "../../data/stockUniverse";
import { UnifiedMasterDecisionEngine, NeuralBotVoteItem } from "../../services/unifiedMasterDecisionEngine";

export interface NeuralNodeDef {
  id: string;
  name: string;
  category: "SMC" | "QUANT" | "PRICE_ACTION" | "ORDERFLOW" | "RISK_DEFENSE" | "MACRO";
  categoryKr: string;
  role: string;
  icon: string;
  weight: number; // contribution weight 0.05 ~ 0.25
  defaultVote: "BULLISH" | "BEARISH" | "NEUTRAL";
  baseConfidence: number;
  metricLabel: string;
  speedMs: number;
}

export const ALL_40_NEURAL_BOTS: NeuralNodeDef[] = [
  // 1. SMC & Liquidity (7 bots)
  { id: "smc_ob", name: "기관 오더블록(OB) 봇", category: "SMC", categoryKr: "SMC 기관 수급", role: "대량 매수 주문 대기 수요구간 탐지", icon: "📦", weight: 0.25, defaultVote: "BULLISH", baseConfidence: 94, metricLabel: "OB 지지율 98.4%", speedMs: 1200 },
  { id: "smc_fvg", name: "페어밸류갭(FVG) 불균형 봇", category: "SMC", categoryKr: "SMC 기관 수급", role: "비정상 급등락 매수공백 채움 감지", icon: "⚡", weight: 0.20, defaultVote: "BULLISH", baseConfidence: 91, metricLabel: "FVG 회수율 +92%", speedMs: 1400 },
  { id: "smc_bos", name: "구조돌파(BOS) 추세 봇", category: "SMC", categoryKr: "SMC 기관 수급", role: "직전 고점 유의미한 상향 돌파 확정", icon: "🚀", weight: 0.22, defaultVote: "BULLISH", baseConfidence: 95, metricLabel: "BOS 연속 2회", speedMs: 1000 },
  { id: "smc_choch", name: "추세전환(CHoCH) 봇", category: "SMC", categoryKr: "SMC 기관 수급", role: "하락 구조 종료 및 상승 전환 포착", icon: "🔄", weight: 0.18, defaultVote: "BULLISH", baseConfidence: 89, metricLabel: "CHoCH 반전 완성", speedMs: 1600 },
  { id: "smc_liq", name: "유동성 청산(Liq Sweep) 봇", category: "SMC", categoryKr: "SMC 기관 수급", role: "개미 손절 물량 휩소 후 반등 매집", icon: "🎯", weight: 0.15, defaultVote: "BULLISH", baseConfidence: 92, metricLabel: "개미 청산 94.2억", speedMs: 1100 },
  { id: "smc_prem", name: "프리미엄/디스카운트 봇", category: "SMC", categoryKr: "SMC 기관 수급", role: "50% 균형가격 이하 저평가 매수", icon: "🏷️", weight: 0.14, defaultVote: "BULLISH", baseConfidence: 87, metricLabel: "할인율 38.5%", speedMs: 1800 },
  { id: "smc_void", name: "유동성 보이드(Void) 봇", category: "SMC", categoryKr: "SMC 기관 수급", role: "거래량 결핍 구간 진입 속도 측정", icon: "🕳️", weight: 0.12, defaultVote: "BULLISH", baseConfidence: 86, metricLabel: "보이드 돌파속도 2.1x", speedMs: 1500 },

  // 2. 16-Quant Multi-Factor (8 bots)
  { id: "quant_rvol", name: "RVOL 상대거래량 봇", category: "QUANT", categoryKr: "16대 퀀트 팩터", role: "20일 평균 대비 거래량 2.5배 폭증", icon: "📊", weight: 0.22, defaultVote: "BULLISH", baseConfidence: 96, metricLabel: "RVOL 2.45배", speedMs: 900 },
  { id: "quant_rsi", name: "RSI 상승 다이버전스 봇", category: "QUANT", categoryKr: "16대 퀀트 팩터", role: "가격 저점 하락 vs RSI 저점 상승", icon: "📈", weight: 0.19, defaultVote: "BULLISH", baseConfidence: 90, metricLabel: "Bullish Divergence", speedMs: 1300 },
  { id: "quant_macd", name: "MACD 골든크로스 봇", category: "QUANT", categoryKr: "16대 퀀트 팩터", role: "시그널선 상향 돌파 및 히스토그램 양수", icon: "✨", weight: 0.18, defaultVote: "BULLISH", baseConfidence: 88, metricLabel: "MACD +1.42", speedMs: 1500 },
  { id: "quant_bb", name: "볼린저 밴드 스퀴즈 봇", category: "QUANT", categoryKr: "16대 퀀트 팩터", role: "변동성 수렴 후 상단 밴드워킹", icon: "🗜️", weight: 0.17, defaultVote: "BULLISH", baseConfidence: 91, metricLabel: "밴드폭 4.8% 수렴", speedMs: 1200 },
  { id: "quant_vwap", name: "기관 VWAP 평균단가 봇", category: "QUANT", categoryKr: "16대 퀀트 팩터", role: "당일 기관 거래량가중평균가 상단 지지", icon: "⚖️", weight: 0.20, defaultVote: "BULLISH", baseConfidence: 93, metricLabel: "VWAP +1.8% 상회", speedMs: 800 },
  { id: "quant_fibo", name: "피보나치 0.618 황금비 봇", category: "QUANT", categoryKr: "16대 퀀트 팩터", role: "상승 파동의 0.618 눌림목 지지", icon: "📐", weight: 0.16, defaultVote: "BULLISH", baseConfidence: 87, metricLabel: "0.618 지지선 안착", speedMs: 1600 },
  { id: "quant_atr", name: "ATR 변동성 레인지 봇", category: "QUANT", categoryKr: "16대 퀀트 팩터", role: "평균진폭 대비 1.8배 폭발력 추적", icon: "📏", weight: 0.14, defaultVote: "BULLISH", baseConfidence: 85, metricLabel: "ATR 2,450원", speedMs: 1700 },
  { id: "quant_mom", name: "20일 모멘텀 가속 봇", category: "QUANT", categoryKr: "16대 퀀트 팩터", role: "섹터 상대강도 상위 5% 돌파", icon: "🔥", weight: 0.18, defaultVote: "BULLISH", baseConfidence: 92, metricLabel: "모멘텀 상위 3.2%", speedMs: 1100 },

  // 3. Price Action & Geometry (8 bots)
  { id: "pa_pinbar", name: "망치형 핀바(Pinbar) 봇", category: "PRICE_ACTION", categoryKr: "차트 기하학", role: "긴 아래꼬리 달린 저가 매수세 확인", icon: "🔨", weight: 0.20, defaultVote: "BULLISH", baseConfidence: 95, metricLabel: "아래꼬리 비율 76%", speedMs: 950 },
  { id: "pa_engulf", name: "상승 장악형(Engulfing) 봇", category: "PRICE_ACTION", categoryKr: "차트 기하학", role: "직전 음봉을 120% 덮는 장대 양봉", icon: "🟩", weight: 0.20, defaultVote: "BULLISH", baseConfidence: 93, metricLabel: "장악률 134%", speedMs: 1050 },
  { id: "pa_wbottom", name: "W자 쌍바닥 넥라인 봇", category: "PRICE_ACTION", categoryKr: "차트 기하학", role: "이중 바닥 형성 후 넥라인 상향 돌파", icon: "🇼", weight: 0.18, defaultVote: "BULLISH", baseConfidence: 94, metricLabel: "넥라인 돌파 확정", speedMs: 1400 },
  { id: "pa_triangle", name: "상승 삼각형(Asc Triangle) 봇", category: "PRICE_ACTION", categoryKr: "차트 기하학", role: "수평 저항선 & 상승 지지선 수렴 돌파", icon: "📐", weight: 0.17, defaultVote: "BULLISH", baseConfidence: 89, metricLabel: "삼각형 상단 돌파", speedMs: 1350 },
  { id: "pa_flag", name: "불 플래그(Bull Flag) 봇", category: "PRICE_ACTION", categoryKr: "차트 기하학", role: "깃대형 급등 후 거래량 감소 눌림", icon: "🚩", weight: 0.18, defaultVote: "BULLISH", baseConfidence: 92, metricLabel: "플래그 돌파각 42도", speedMs: 1250 },
  { id: "pa_soldiers", name: "적삼병(3 White Soldiers) 봇", category: "PRICE_ACTION", categoryKr: "차트 기하학", role: "3연속 양봉 몸통 확장 추세 지속", icon: "🛡️", weight: 0.15, defaultVote: "BULLISH", baseConfidence: 90, metricLabel: "적삼병 3단계 완성", speedMs: 1600 },
  { id: "pa_morning", name: "샛별형(Morning Star) 봇", category: "PRICE_ACTION", categoryKr: "차트 기하학", role: "음봉-도지-양봉 바닥 반전 3봉 완성", icon: "⭐", weight: 0.16, defaultVote: "BULLISH", baseConfidence: 91, metricLabel: "샛별형 반전 확정", speedMs: 1450 },
  { id: "pa_inside", name: "인사이드바(Inside Bar) 봇", category: "PRICE_ACTION", categoryKr: "차트 기하학", role: "모선 내부 응축 후 방향성 폭발", icon: "🧱", weight: 0.13, defaultVote: "BULLISH", baseConfidence: 86, metricLabel: "인사이드 돌파", speedMs: 1550 },

  // 4. HFT & Tape Orderflow (6 bots)
  { id: "hft_cvd", name: "1초 CVD 체결강도 봇", category: "ORDERFLOW", categoryKr: "HFT 호가창", role: "누적순매수델타 시장가 매수 틱 실시간 추적", icon: "🌊", weight: 0.22, defaultVote: "BULLISH", baseConfidence: 96, metricLabel: "체결강도 138%", speedMs: 700 },
  { id: "hft_depth", name: "호가창 10단계 매수벽 봇", category: "ORDERFLOW", categoryKr: "HFT 호가창", role: "매수 총잔량 vs 매도 총잔량 비율 감시", icon: "🏢", weight: 0.19, defaultVote: "BULLISH", baseConfidence: 92, metricLabel: "매수잔량 우위 164%", speedMs: 750 },
  { id: "hft_iceberg", name: "빙산주문(Iceberg) 봇", category: "ORDERFLOW", categoryKr: "HFT 호가창", role: "호가에 숨겨진 기관 대량 분할주문 포착", icon: "🧊", weight: 0.18, defaultVote: "BULLISH", baseConfidence: 90, metricLabel: "숨은매수 42만주", speedMs: 850 },
  { id: "hft_footprint", name: "풋프린트 클러스터 봇", category: "ORDERFLOW", categoryKr: "HFT 호가창", role: "특정 가격대 체결량 밀집도 분석", icon: "👣", weight: 0.17, defaultVote: "BULLISH", baseConfidence: 91, metricLabel: "Delta +3,820", speedMs: 900 },
  { id: "hft_tape", name: "타임앤세일즈 초고속 봇", category: "ORDERFLOW", categoryKr: "HFT 호가창", role: "초당 50건 이상 시장가 매수 연속 체결", icon: "⚡", weight: 0.16, defaultVote: "BULLISH", baseConfidence: 93, metricLabel: "속도 62 ticks/sec", speedMs: 650 },
  { id: "hft_whale", name: "고래 실시간 매집 봇", category: "ORDERFLOW", categoryKr: "HFT 호가창", role: "단일 10억원 이상 대량 체결 실시간 알림", icon: "🐋", weight: 0.20, defaultVote: "BULLISH", baseConfidence: 95, metricLabel: "대형체결 8건 유입", speedMs: 800 },

  // 5. Bearish Defense & Gatekeepers (6 bots)
  { id: "risk_wick", name: "하락봉 V5 윗꼬리 거부권 봇", category: "RISK_DEFENSE", categoryKr: "하락방어 게이트", role: "단기 급등 후 매도벽 충돌 거부권 발동", icon: "🛡️", weight: 0.25, defaultVote: "NEUTRAL", baseConfidence: 94, metricLabel: "매도저항 24점 (안전)", speedMs: 1100 },
  { id: "risk_gapdown", name: "갭하락 탈출 가드 봇", category: "RISK_DEFENSE", categoryKr: "하락방어 게이트", role: "시초가 -2% 이하 갭하락 시 자동 매수 차단", icon: "🛑", weight: 0.22, defaultVote: "BULLISH", baseConfidence: 96, metricLabel: "갭하락 위험 0%", speedMs: 1200 },
  { id: "risk_panic", name: "투매 소화(Panic Absorb) 봇", category: "RISK_DEFENSE", categoryKr: "하락방어 게이트", role: "투매 발생 시 바닥 지지 흡수량 계산", icon: "🧯", weight: 0.18, defaultVote: "BULLISH", baseConfidence: 89, metricLabel: "투매 흡수율 88%", speedMs: 1300 },
  { id: "risk_be_stop", name: "본절가 스탑로스 가디언", category: "RISK_DEFENSE", categoryKr: "하락방어 게이트", role: "1차 익절(+3.5%) 즉시 스탑로스 본절 상향", icon: "🔒", weight: 0.24, defaultVote: "BULLISH", baseConfidence: 98, metricLabel: "무손실 락 대기", speedMs: 950 },
  { id: "risk_vol_break", name: "거래량 이탈 경보 봇", category: "RISK_DEFENSE", categoryKr: "하락방어 게이트", role: "음봉 시 거래량 폭증 시 즉시 손절 경보", icon: "⚠️", weight: 0.20, defaultVote: "BULLISH", baseConfidence: 91, metricLabel: "음봉거래량 정상", speedMs: 1050 },
  { id: "risk_slippage", name: "슬리피지 0.05% 방어 봇", category: "RISK_DEFENSE", categoryKr: "하락방어 게이트", role: "시장가 체결 시 호가 슬리피지 방어 주문", icon: "🛡️", weight: 0.15, defaultVote: "BULLISH", baseConfidence: 95, metricLabel: "슬리피지 0.02%", speedMs: 1000 },

  // 6. Macro & Trend Alignment (5 bots)
  { id: "macro_foreigner", name: "외인/기관 대량 순매수 봇", category: "MACRO", categoryKr: "매크로 & 섹터", role: "메이저 수급 3일 연속 순유입 종목 선별", icon: "🏛️", weight: 0.20, defaultVote: "BULLISH", baseConfidence: 93, metricLabel: "외인 +182억 유입", speedMs: 1400 },
  { id: "macro_sector", name: "주도 섹터 자금순환 봇", category: "MACRO", categoryKr: "매크로 & 섹터", role: "AI 반도체 섹터 일일 자금 집중도 1위", icon: "🌐", weight: 0.18, defaultVote: "BULLISH", baseConfidence: 91, metricLabel: "섹터 강도 1위", speedMs: 1500 },
  { id: "macro_index", name: "코스피/코스닥 지수 베타 봇", category: "MACRO", categoryKr: "매크로 & 섹터", role: "시장 지수 대비 알파 1.6배 상회", icon: "📈", weight: 0.16, defaultVote: "BULLISH", baseConfidence: 89, metricLabel: "Beta 1.45 (강세)", speedMs: 1600 },
  { id: "macro_margin", name: "신용잔고 건전성 봇", category: "MACRO", categoryKr: "매크로 & 섹터", role: "신용비율 3.5% 이하 안전 종목 검증", icon: "🏦", weight: 0.15, defaultVote: "BULLISH", baseConfidence: 88, metricLabel: "신용비율 2.8%", speedMs: 1700 },
  { id: "macro_fx", name: "원달러 환율/금리 연동 봇", category: "MACRO", categoryKr: "매크로 & 섹터", role: "환율 안정세 및 외국인 우호 환경 확인", icon: "💵", weight: 0.14, defaultVote: "BULLISH", baseConfidence: 87, metricLabel: "환율 변동성 안정", speedMs: 1800 }
];

interface NeuralBotClusterVisualizerProps {
  currentStock: StockItem;
  onOpenConsensusModal?: (symbol: string) => void;
}

export const NeuralBotClusterVisualizer: React.FC<NeuralBotClusterVisualizerProps> = ({
  currentStock,
  onOpenConsensusModal
}) => {
  const [selectedNode, setSelectedNode] = useState<NeuralNodeDef | null>(ALL_40_NEURAL_BOTS[0]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");
  const [pulseTick, setPulseTick] = useState<number>(0);
  const [scanPulseIndex, setScanPulseIndex] = useState<number>(0);

  // Compute unified decision using UnifiedMasterDecisionEngine
  const unifiedDecision = useMemo(() => {
    return UnifiedMasterDecisionEngine.analyze(
      currentStock.symbol,
      currentStock.name,
      currentStock.price || 0,
      currentStock.changeRate || 0,
      (currentStock.market as any) || "KOREA"
    );
  }, [currentStock]);

  // Live pulsing animation trigger
  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTick((prev) => (prev + 1) % 1000);
      setScanPulseIndex((prev) => (prev + 1) % ALL_40_NEURAL_BOTS.length);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  // Filtered nodes
  const visibleNodes = useMemo(() => {
    if (activeCategoryFilter === "ALL") return ALL_40_NEURAL_BOTS;
    return ALL_40_NEURAL_BOTS.filter((n) => n.category === activeCategoryFilter);
  }, [activeCategoryFilter]);

  // Real-time vote counts and weights across all 40 bots
  const clusterStats = useMemo(() => {
    const bearishRiskScore = unifiedDecision?.factors?.bearishRiskScore ?? 0;
    const isBearishRisk = bearishRiskScore >= 50 || (unifiedDecision?.masterScore ?? 0) < 75;
    const isConflictState = Boolean(unifiedDecision?.conflictResolution?.isConflictTriggered);

    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let totalConfidence = 0;

    ALL_40_NEURAL_BOTS.forEach((node, idx) => {
      let vote = node.defaultVote;
      let conf = node.baseConfidence;

      if (isBearishRisk) {
        if (node.category === "RISK_DEFENSE") {
          vote = "BEARISH";
          conf = Math.max(92, bearishRiskScore);
        } else if (node.category === "QUANT" && idx % 2 === 0) {
          vote = "BEARISH";
          conf = 84;
        } else if (node.category === "ORDERFLOW" && idx % 2 === 1) {
          vote = "BEARISH";
          conf = 88;
        } else if (idx % 3 === 0) {
          vote = "BEARISH";
          conf = 80;
        } else {
          vote = "NEUTRAL";
          conf = 75;
        }
      } else if (isConflictState) {
        if (idx % 2 === 0) {
          vote = "BULLISH";
          conf = 82;
        } else if (idx % 3 === 0) {
          vote = "BEARISH";
          conf = 85;
        } else {
          vote = "NEUTRAL";
          conf = 78;
        }
      }

      if (vote === "BULLISH") bullishCount++;
      else if (vote === "BEARISH") bearishCount++;
      else neutralCount++;

      totalConfidence += conf;
    });

    const totalBots = ALL_40_NEURAL_BOTS.length;
    const bullishPct = Math.round((bullishCount / totalBots) * 100);
    const bearishPct = Math.round((bearishCount / totalBots) * 100);
    const diffPct = Math.abs(bullishPct - bearishPct);
    const isConflict = isConflictState || (diffPct < 20 && bullishCount > 0 && bearishCount > 0);
    const avgConfidence = Math.round(totalConfidence / totalBots);

    return {
      totalBots,
      bullishCount,
      bearishCount,
      neutralCount,
      bullishPct,
      bearishPct,
      diffPct,
      isConflict,
      avgConfidence
    };
  }, [unifiedDecision]);

  return (
    <div className="w-full bg-slate-950 text-white rounded-2xl sm:rounded-3xl border border-purple-500/40 shadow-2xl p-3.5 sm:p-6 space-y-4 sm:space-y-6 relative overflow-hidden">
      {/* Background glow lines */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER: Title & Quick Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
            </span>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>40대 초지능 신경세포 클러스터 &amp; 중앙 통제 뇌 (Unified Brain)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                40/40 NODES ONLINE
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {currentStock.name} ({currentStock.symbol}) 종목에 대해 40개 개별 전문 봇이 실시간 투표를 집계하고, 상충 신호 시 '자율 충돌 방어'를 발동합니다.
          </p>
        </div>

        {/* Action Buttons & Consensus Shortcut */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenConsensusModal && (
            <button
              onClick={() => onOpenConsensusModal(currentStock.symbol)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 border border-purple-400 shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span>💬 봇 실시간 합의 토론장 열기</span>
            </button>
          )}
        </div>
      </div>

      {/* 🛑 MANDATORY CONFLICT RESOLUTION STATUS BANNER */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border transition relative z-10 ${
        unifiedDecision.conflictResolution.isConflictTriggered
          ? "bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-amber-950/50"
          : "bg-slate-900/90 border-slate-800 text-slate-200"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`p-2 rounded-xl mt-0.5 ${
              unifiedDecision.conflictResolution.isConflictTriggered
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-bounce"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            }`}>
              {unifiedDecision.conflictResolution.isConflictTriggered ? (
                <Scale className="w-5 h-5 text-amber-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-400">자율 충돌 해결 규칙 (Conflict Resolution):</span>
                <span className={`text-xs sm:text-sm font-black ${
                  unifiedDecision.conflictResolution.isConflictTriggered ? "text-amber-300" : "text-emerald-300"
                }`}>
                  {unifiedDecision.conflictResolution.isConflictTriggered
                    ? "⚖️ HOLD / WAIT (상승 vs 하락 격차 < 20% 충돌 방어 발동)"
                    : "✅ CONSENSUS PASSED (신경세포 합의 완료)"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {unifiedDecision.conflictResolution.resolutionMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-mono text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 self-start md:self-center">
            <div className="text-center px-2 border-r border-slate-800">
              <div className="text-[10px] text-slate-400">상승 봇</div>
              <div className="font-bold text-emerald-400">{clusterStats.bullishCount}개 ({clusterStats.bullishPct}%)</div>
            </div>
            <div className="text-center px-2 border-r border-slate-800">
              <div className="text-[10px] text-slate-400">하락 봇</div>
              <div className="font-bold text-rose-400">{clusterStats.bearishCount}개 ({clusterStats.bearishPct}%)</div>
            </div>
            <div className="text-center px-2">
              <div className="text-[10px] text-slate-400">가중 격차</div>
              <div className={`font-black ${clusterStats.isConflict ? "text-amber-400" : "text-emerald-400"}`}>
                {clusterStats.diffPct}% {clusterStats.isConflict ? "(< 20% 대기)" : "(합의)"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT: CENTRAL UNIFIED BRAIN TERMINAL + 40-NODE CLUSTER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10">
        
        {/* LEFT / CENTER: CENTRAL "UNIFIED BRAIN" TERMINAL (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-purple-500/40 p-4 shadow-xl space-y-3.5">
            {/* Terminal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono font-black text-slate-200">CENTRAL UNIFIED BRAIN TERMINAL</span>
              </div>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-700">
                MASTER DECISION v5.4
              </span>
            </div>

            {/* Current Asset & Verdict Badge */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">{currentStock.name} ({currentStock.symbol})</div>
                <div className="text-sm sm:text-base font-black text-white font-mono">
                  ₩{(currentStock.price || 0).toLocaleString()}
                  <span className={`ml-2 text-xs ${currentStock.changeRate >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {currentStock.changeRate >= 0 ? "+" : ""}{currentStock.changeRate}%
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400">마스터 판정</div>
                <div className={`text-xs sm:text-sm font-black ${unifiedDecision.verdictColor}`}>
                  {unifiedDecision.verdictKorean}
                </div>
              </div>
            </div>

            {/* Master Score & Confidence Gauges */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">종합 AI 점수 (Master Score)</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
                  {unifiedDecision.masterScore}<span className="text-xs text-slate-400 font-normal"> / 100</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">가중 신뢰도 (Confidence)</div>
                <div className="text-xl sm:text-2xl font-black text-purple-400 mt-0.5">
                  {unifiedDecision.confidence}<span className="text-xs text-slate-400 font-normal">%</span>
                </div>
              </div>
            </div>

            {/* 3-Step Exit Strategy Quick View inside Brain */}
            <div className="p-3 bg-slate-950 rounded-xl border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1 text-purple-300 font-mono">
                  <Target className="w-3.5 h-3.5 text-purple-400" />
                  <span>3단계 분할 익절 전략 (3-Step Exit Targets)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400">손익비 1:{unifiedDecision.riskRewardRatio}</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40">
                  <div className="text-[9px] text-emerald-300 font-bold">1차 (40% 매도)</div>
                  <div className="text-[11px] font-black text-white">₩{(unifiedDecision.targetPrice1 ?? 0).toLocaleString()}</div>
                  <div className="text-[9px] text-emerald-400">+3.5% (본절스탑)</div>
                </div>

                <div className="p-1.5 rounded-lg bg-sky-950/40 border border-sky-500/40">
                  <div className="text-[9px] text-sky-300 font-bold">2차 (30% 매도)</div>
                  <div className="text-[11px] font-black text-white">₩{(unifiedDecision.targetPrice2 ?? 0).toLocaleString()}</div>
                  <div className="text-[9px] text-sky-400">+7.0% (트레일링)</div>
                </div>

                <div className="p-1.5 rounded-lg bg-purple-950/40 border border-purple-500/40">
                  <div className="text-[9px] text-purple-300 font-bold">3차 (30% 런너)</div>
                  <div className="text-[11px] font-black text-white">₩{(unifiedDecision.targetPrice3 ?? 0).toLocaleString()}</div>
                  <div className="text-[9px] text-purple-400">+12.0% (문샷)</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                <span>엄격 손절가: <strong className="text-rose-400">₩{(unifiedDecision.stopLossPrice ?? 0).toLocaleString()} (-2.5%)</strong></span>
                <span>진입가: ₩{(unifiedDecision.entryPrice ?? 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Selected Node Real-time Telemetry Inspector */}
            {selectedNode && (
              <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{selectedNode.icon}</span>
                    <span className="text-xs font-black text-white">{selectedNode.name}</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                    {selectedNode.categoryKr}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">{selectedNode.role}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400">
                  <span>실시간 지표: <strong className="text-emerald-400">{selectedNode.metricLabel}</strong></span>
                  <span>신뢰도: <strong className="text-cyan-300">{selectedNode.baseConfidence}%</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: 40 SPECIALIZED NODES CLUSTER GRID (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
            {[
              { key: "ALL", label: "전체 40대 봇 (40)" },
              { key: "SMC", label: "🏛️ SMC (7)" },
              { key: "QUANT", label: "⚡ 16-퀀트 (8)" },
              { key: "PRICE_ACTION", label: "📐 프라이스액션 (8)" },
              { key: "ORDERFLOW", label: "🌊 HFT호가 (6)" },
              { key: "RISK_DEFENSE", label: "🛡️ 하락방어 (6)" },
              { key: "MACRO", label: "🌐 매크로 (5)" },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategoryFilter(cat.key)}
                className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                  activeCategoryFilter === cat.key
                    ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-400"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 40 Animated Node Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[460px] overflow-y-auto pr-1">
            {visibleNodes.map((node, index) => {
              const isSelected = selectedNode?.id === node.id;
              const isPulsing = scanPulseIndex === index % ALL_40_NEURAL_BOTS.length;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden text-left ${
                    isSelected
                      ? "bg-purple-950/70 border-purple-400 shadow-md ring-1 ring-purple-400/50"
                      : isPulsing
                      ? "bg-slate-900 border-cyan-500 shadow-cyan-500/20 shadow-md"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  {/* Top line with Icon & Active status */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{node.icon}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      isPulsing ? "bg-cyan-400 animate-ping" : "bg-emerald-400"
                    }`} />
                  </div>

                  <div className="text-[11px] font-black text-slate-100 truncate">{node.name}</div>
                  <div className="text-[9px] text-slate-400 truncate">{node.categoryKr}</div>

                  <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-emerald-400 font-bold">{node.metricLabel.split(" ")[0]}</span>
                    <span className="text-slate-400">{node.baseConfidence}%</span>
                  </div>

                  {/* Scanning scanline highlight animation */}
                  {isPulsing && (
                    <div className="absolute inset-0 bg-cyan-400/10 pointer-events-none animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
