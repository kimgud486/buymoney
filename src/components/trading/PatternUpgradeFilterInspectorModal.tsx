import React, { useState, useMemo } from "react";
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  RefreshCw,
  Activity
} from "lucide-react";
import { PatternUpgradeEngine, PatternUpgradeEvaluation } from "../../services/PatternUpgradeEngine";
import { INITIAL_STOCK_UNIVERSE } from "../../data/stockUniverse";

interface PatternUpgradeFilterInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
}

export const PatternUpgradeFilterInspectorModal: React.FC<PatternUpgradeFilterInspectorModalProps> = ({
  isOpen,
  onClose,
  initialSymbol = "005930"
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [mtfStrictness, setMtfStrictness] = useState<"STRICT_3TIER" | "STANDARD_2TIER">("STRICT_3TIER");
  const [minCvdDeltaPct, setMinCvdDeltaPct] = useState<number>(15);
  const [requireCandleCloseConfirmation, setRequireCandleCloseConfirmation] = useState<boolean>(true);
  const [maxSlippageLimitPct, setMaxSlippageLimitPct] = useState<number>(0.10);

  const currentStock = useMemo(() => {
    return INITIAL_STOCK_UNIVERSE.find(s => s.symbol === selectedSymbol) || INITIAL_STOCK_UNIVERSE[0];
  }, [selectedSymbol]);

  const evaluation: PatternUpgradeEvaluation = useMemo(() => {
    return PatternUpgradeEngine.evaluatePattern(
      currentStock.symbol,
      currentStock.name,
      currentStock.price,
      currentStock.changeRate,
      48,
      currentStock.rvol || 1.6
    );
  }, [currentStock]);

  if (!isOpen) return null;

  const isPassed = evaluation.overallUpgradePassed;
  const trapRisk = evaluation.trapRisk;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-400 font-mono uppercase tracking-wider">
                  ADVANCED ANTI-FAKEOUT SHIELD
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  4대 패턴 강화 엔진 V7
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                가짜 돌파(Fakeout) & 휩쏘 원천 차단 필터 인스펙터
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* 1. STOCK SELECTOR & REAL-TIME EVALUATION BANNER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">진단 종목 선택:</span>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400"
              >
                {INITIAL_STOCK_UNIVERSE.map(stock => (
                  <option key={stock.symbol} value={stock.symbol}>
                    {stock.name} ({stock.symbol}) - {stock.market}
                  </option>
                ))}
              </select>
            </div>

            {/* Pattern Integrity Score Badge */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono">패턴 건전성 신뢰도</span>
                <span className={`text-base font-black font-mono ${
                  evaluation.patternIntegrityScore >= 80 ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {evaluation.patternIntegrityScore} / 100점
                </span>
              </div>

              <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
                trapRisk === "VERY_LOW" 
                  ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                  : trapRisk === "LOW"
                  ? "bg-teal-950/80 border-teal-500/60 text-teal-300"
                  : trapRisk === "MODERATE"
                  ? "bg-amber-950/80 border-amber-500/60 text-amber-300"
                  : "bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse"
              }`}>
                {trapRisk.startsWith("HIGH") ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
                <span>트랩 위험도: {trapRisk}</span>
              </div>
            </div>
          </div>

          {/* 2. THE 4 UPGRADED ANTI-FAKEOUT GATES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* GATE 1: Multi-Timeframe (MTF) Alignment */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">1. MTF 상위 추세 정배열 게이트</h3>
                    <span className="text-[10px] text-slate-400">역추세 단기 반등 함정(Dead Cat Bounce) 원천 차단</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                  evaluation.mtf.mtfConfluencePassed 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  {evaluation.mtf.mtfConfluencePassed ? "PASS" : "FAIL"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 1분봉 패턴:</span>
                  <strong className="text-amber-300">{evaluation.mtf.timeframe1m.pattern}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 5분봉 VWAP/추세:</span>
                  <strong className={evaluation.mtf.timeframe5m.trend.includes("BULLISH") ? "text-emerald-400" : "text-rose-400"}>
                    {evaluation.mtf.timeframe5m.trend} (VWAP {evaluation.mtf.timeframe5m.vwapReclaimed ? "안착" : "이탈"})
                  </strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 15분/일봉 슈퍼트렌드:</span>
                  <strong className="text-emerald-400">{evaluation.mtf.timeframe15mDaily.macroTrend}</strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 font-sans">
                {evaluation.mtf.mtfVerdict}
              </div>
            </div>

            {/* GATE 2: Volume Delta & CVD (Cumulative Volume Delta) */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">2. CVD 순매수 델타 수급 게이트</h3>
                    <span className="text-[10px] text-slate-400">거래량 없는 가짜 돌파(Fakeout) 및 허매수벽 방어</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                  evaluation.volumeDelta.volumeConfirmed 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  {evaluation.volumeDelta.volumeConfirmed ? "PASS" : "FAIL"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 순매수 델타 비율:</span>
                  <strong className={evaluation.volumeDelta.volumeDeltaRatio >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {evaluation.volumeDelta.volumeDeltaRatio >= 0 ? "+" : ""}{evaluation.volumeDelta.volumeDeltaRatio}% ({evaluation.volumeDelta.cvdTrend})
                  </strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 호가창 매수 우위:</span>
                  <strong className="text-amber-300">{evaluation.volumeDelta.orderbookImbalancePct}% 매수잔량 우세</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 가짜 돌파 감지:</span>
                  <strong className={evaluation.volumeDelta.isFakeBreakoutDetected ? "text-rose-400" : "text-emerald-400"}>
                    {evaluation.volumeDelta.isFakeBreakoutDetected ? "🚨 위험 (Fake Breakout)" : "안전 (Normal)"}
                  </strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 font-sans">
                {evaluation.volumeDelta.verdict}
              </div>
            </div>

            {/* GATE 3: Candle Confirmation & Anti-Repaint Rule */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">3. 캔들 종가 확정 & 안티-리페인트</h3>
                    <span className="text-[10px] text-slate-400">형성 중 캔들의 피뢰침 조기 진입 오류 방어</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                  evaluation.candleConfirmation.antiRepaintVerified 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  {evaluation.candleConfirmation.antiRepaintVerified ? "PASS" : "FAIL"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 1분봉 진행률:</span>
                  <strong className="text-amber-300">{evaluation.candleConfirmation.candleClosePercent}% 완료</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 연속 지지 확인 틱:</span>
                  <strong className="text-emerald-400">{evaluation.candleConfirmation.consecutiveSupportTicks}틱 연속 지지</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 꼬리/몸통 비율:</span>
                  <strong className="text-slate-300">{evaluation.candleConfirmation.wickToBodyRatio} (안정)</strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 font-sans">
                {evaluation.candleConfirmation.verdict}
              </div>
            </div>

            {/* GATE 4: Slippage & IOC Smart Order Routing */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">4. 스마트 슬리피지 & IOC 주문 보호</h3>
                    <span className="text-[10px] text-slate-400">실거래 주문 통신 딜레이 및 호가 갭 손실 방지</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                  evaluation.slippageGuard.isSlippageSafe 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  {evaluation.slippageGuard.isSlippageSafe ? "PASS" : "FAIL"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 호가 스프레드:</span>
                  <strong className="text-slate-300">{evaluation.slippageGuard.spreadPct}%</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 예상 체결 슬리피지:</span>
                  <strong className="text-emerald-400">{evaluation.slippageGuard.expectedSlippagePct}% (허용치 {evaluation.slippageGuard.maxAllowedSlippagePct}%)</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">• 주문 라우팅 알고리즘:</span>
                  <strong className="text-amber-300">{evaluation.slippageGuard.orderRoutingType}</strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 font-sans">
                {evaluation.slippageGuard.verdict}
              </div>
            </div>

          </div>

          {/* 3. AI EXECUTION RECOMMENDATION & PARAMETERS CONFIG */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>AI 강화 필터 매매 권고 결과 및 타점</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                evaluation.executionRecommendation.action === "STRONG_BUY_PERMITTED"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : evaluation.executionRecommendation.action === "BUY_PERMITTED_CAUTION"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}>
                {evaluation.executionRecommendation.action}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-slate-400 text-[10px] block">추천 진입 가격</span>
                <span className="text-white font-bold text-sm">
                  ₩{(evaluation.executionRecommendation.recommendedEntryPrice ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-slate-400 text-[10px] block">방어 손절선 (Stop Loss)</span>
                <span className="text-rose-400 font-bold text-sm">
                  ₩{(evaluation.executionRecommendation.recommendedStopLoss ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-slate-400 text-[10px] block">1차 목표 익절가 (Take Profit)</span>
                <span className="text-emerald-400 font-bold text-sm">
                  ₩{(evaluation.executionRecommendation.recommendedTakeProfit ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-300">
              <strong className="text-amber-300 font-sans">AI 진단 총평: </strong>
              <span className="font-sans">{evaluation.executionRecommendation.rationaleKr}</span>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>실시간 자동 매매 시 4대 강화 필터가 24시간 실시간 가동됩니다.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 cursor-pointer shadow-md transition"
          >
            확인 완료
          </button>
        </div>

      </div>
    </div>
  );
};
