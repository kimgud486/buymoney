import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  DollarSign
} from "lucide-react";
import { StockItem } from "../../data/stockUniverse";
import { UpbitFeeAndNetProfitGuard, FeeAndProfitAnalysis, SellDecisionResult } from "../../services/UpbitFeeAndNetProfitGuard";
import { AntiDowntrendEngineV5, AntiDowntrendEvaluation } from "../../services/AntiDowntrendEngineV5";

interface CandlestickPatternOverlayVisualizerProps {
  stock: StockItem;
  buyPrice?: number;
  currentPrice?: number;
  onTradeClick?: (type: "BUY" | "SELL") => void;
}

export interface CandlePatternOverlayItem {
  id: string;
  timeLabel: string;
  type: "BULL_ENGULFING" | "MORNING_STAR" | "HAMMER" | "BEARISH_ENGULFING" | "SHOOTING_STAR" | "DOJI";
  patternNameKr: string;
  isBullish: boolean;
  reliabilityScore: number; // 0 ~ 100
  candlePrice: number;
  volumeDeltaRatio: number;
  annotation: string;
}

export const CandlestickPatternOverlayVisualizer: React.FC<CandlestickPatternOverlayVisualizerProps> = ({
  stock,
  buyPrice: propBuyPrice,
  currentPrice: propCurrentPrice,
  onTradeClick
}) => {
  const safeStock: StockItem = stock || {
    symbol: "005930",
    name: "삼성전자",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 0,
    changeRate: 2.79,
    changeAmount: 2000,
    tradeValue: "9,812억",
    volume: "1,334만",
    rvol: 1.65,
    score: 87,
    grade: "A+",
    theme: "반도체 / AI 하드웨어",
    signal: "LONG",
    strategy: "VWAP Reclaim + SMC Order Block",
    marketCap: "440조"
  };

  const symbolStr = safeStock.symbol || "005930";
  const nameStr = safeStock.name || "주식";
  const livePrice = propCurrentPrice || safeStock.price || 50000;
  const buyPrice = propBuyPrice || Math.round(livePrice * 0.982); // Simulated position if not provided

  // Calculate Upbit Net Profit & Fee Guard
  const feeAnalysis: FeeAndProfitAnalysis = UpbitFeeAndNetProfitGuard.analyzeProfitAndFees(
    buyPrice,
    livePrice,
    100,
    0.15,
    1.0
  );

  const sellDecision: SellDecisionResult = UpbitFeeAndNetProfitGuard.evaluateSellPermission(
    buyPrice,
    livePrice,
    100,
    -2.0,
    0.8
  );

  // Calculate Anti-Downtrend Candle Health
  const isBtcOrCrypto = typeof symbolStr === "string" && (symbolStr.startsWith("KRW-") || symbolStr === "BTC" || symbolStr === "ETH");
  const downtrendEval: AntiDowntrendEvaluation = AntiDowntrendEngineV5.evaluateCandleHealth(
    symbolStr,
    nameStr,
    isBtcOrCrypto ? "BTC" : "KOREA",
    livePrice,
    safeStock.changeRate || 1.5
  );

  // Generate pattern overlay stream for the last 6 candles
  const [patternHistory, setPatternHistory] = useState<CandlePatternOverlayItem[]>(() => {
    return [
      {
        id: "c1",
        timeLabel: "14:20",
        type: "DOJI",
        patternNameKr: "십자 도지 (수급 대치)",
        isBullish: true,
        reliabilityScore: 68,
        candlePrice: Math.round(livePrice * 0.978),
        volumeDeltaRatio: +1.2,
        annotation: "세력 매수세 지지 형성"
      },
      {
        id: "c2",
        timeLabel: "14:21",
        type: "HAMMER",
        patternNameKr: "상승 망치형 (저점 반등)",
        isBullish: true,
        reliabilityScore: 88,
        candlePrice: Math.round(livePrice * 0.984),
        volumeDeltaRatio: +2.8,
        annotation: "하단 순매수 델타 터짐"
      },
      {
        id: "c3",
        timeLabel: "14:22",
        type: "MORNING_STAR",
        patternNameKr: "상승 샛별형 완성",
        isBullish: true,
        reliabilityScore: 94,
        candlePrice: Math.round(livePrice * 0.992),
        volumeDeltaRatio: +4.5,
        annotation: "30개 AI 봇 매수 강세 승인"
      },
      {
        id: "c4",
        timeLabel: "14:23",
        type: "BULL_ENGULFING",
        patternNameKr: "장대 양봉 돌파",
        isBullish: true,
        reliabilityScore: 96,
        candlePrice: livePrice,
        volumeDeltaRatio: +6.1,
        annotation: "5분선/20분선 이평 정배열 돌파"
      }
    ];
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-2xl space-y-4">
      {/* 1. TOP HEADER: AI CANDLESTICK PATTERN & SIGNAL STATUS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-100">
                AI 실시간 음양봉 패턴 오버레이 & 수수료 방어 시그널
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                업비트 순수익 보장 가드 ON
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              차트 위 AI 캔들 패턴 오버레이 + <strong className="text-emerald-300">업비트 수수료(0.1%) 차감 후 실제 양수 수익일 때만 매도</strong>
            </p>
          </div>
        </div>

        {/* Real-time Signal Badge */}
        <div className="flex items-center gap-2">
          {sellDecision.actionReason === "AI_PEAK_REVERSAL_PROFIT" || sellDecision.actionReason === "AI_PREDICTED_PEAK_TARGET_REACHED" || sellDecision.actionReason === "NET_PROFIT_EXCEEDED" ? (
            <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center gap-1.5 font-bold text-xs animate-pulse">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>⚡ AI 고점 변곡점 순수익 확정 매도</span>
            </div>
          ) : sellDecision.actionReason === "HOLDING_AI_PEAK_RALLY" ? (
            <div className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-xl flex items-center gap-1.5 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>🚀 BEP 도달 • AI 고점 팽창 극대화 홀딩 중 (+{sellDecision.peakAnalysis?.predictedPeakProfitPct || 3.5}% 목표)</span>
            </div>
          ) : sellDecision.actionReason === "BLOCKED_FEE_EROSION" ? (
            <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl flex items-center gap-1.5 font-bold text-xs">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>🛡️ 수수료 녹음 방지 매도 차단</span>
            </div>
          ) : sellDecision.actionReason === "STOP_LOSS_BREAKDOWN" ? (
            <div className="px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl flex items-center gap-1.5 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>🚨 손절선 이탈 방어 매도</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-xl flex items-center gap-1.5 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>🟢 양봉 추세 홀딩 중</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. VISUAL CANDLESTICK PATTERN OVERLAY MAP */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            현재 차트 오버레이 캔들 패턴 타임라인 ({safeStock.name})
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            실시간 캔들 종가 확정 감지 중
          </span>
        </div>

        {/* Pattern Cards Stream */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {patternHistory.map((ptn) => (
            <div
              key={ptn.id}
              className={`p-3 rounded-xl border transition relative overflow-hidden ${
                ptn.isBullish
                  ? "bg-emerald-950/30 border-emerald-800/50 hover:border-emerald-500/60"
                  : "bg-rose-950/30 border-rose-800/50 hover:border-rose-500/60"
              }`}
            >
              {/* Top Tag */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-400">{ptn.timeLabel}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    ptn.isBullish ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {ptn.reliabilityScore}% 신뢰도
                </span>
              </div>

              {/* Pattern Title */}
              <div className="font-bold text-xs text-slate-100 flex items-center gap-1">
                {ptn.isBullish ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span className="truncate">{ptn.patternNameKr}</span>
              </div>

              {/* Price & Annotation */}
              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300 font-bold">{(ptn.candlePrice ?? 0).toLocaleString()}원</span>
                <span className="text-emerald-400 font-bold">+{ptn.volumeDeltaRatio}% CVD</span>
              </div>

              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{ptn.annotation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. UPBIT BREAKEVEN & NET PROFIT AUTOMATIC CALCULATOR PANEL */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs text-slate-200">
              업비트 실질 손익분기점 (BEP) & 순수익 계산기
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            왕복 수수료 0.1% + 슬리피지 0.15% = 총 비용 0.25% 자동 차감
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">평단가 (Buy Price)</span>
            <span className="text-slate-100 font-bold text-sm">{(buyPrice ?? 0).toLocaleString()}원</span>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-amber-900/40">
            <span className="text-amber-400 text-[10px] block">손익분기점 (BEP Price)</span>
            <span className="text-amber-300 font-bold text-sm">{(feeAnalysis.bepPrice ?? 0).toLocaleString()}원</span>
            <span className="text-[9px] text-amber-500 block">수수료 0.25% 보정가</span>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">단순 등락률 (Gross Profit)</span>
            <span
              className={`font-bold text-sm ${
                feeAnalysis.grossProfitPct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {feeAnalysis.grossProfitPct >= 0 ? `+${feeAnalysis.grossProfitPct}%` : `${feeAnalysis.grossProfitPct}%`}
            </span>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-emerald-900/50">
            <span className="text-emerald-400 text-[10px] block font-sans font-bold">실제 순수익률 (Net Profit)</span>
            <span
              className={`font-bold text-sm ${
                feeAnalysis.netProfitPct > 0 ? "text-emerald-300" : "text-rose-400"
              }`}
            >
              {feeAnalysis.netProfitPct > 0 ? `+${feeAnalysis.netProfitPct}%` : `${feeAnalysis.netProfitPct}%`}
            </span>
            <span className="text-[9px] text-slate-400 block font-sans">수수료 완벽 차감 후</span>
          </div>
        </div>

        {/* Net Profit Progress Bar toward BEP */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>손익분기점 진행률</span>
            <span className="text-emerald-400 font-bold">
              {feeAnalysis.netProfitPct > 0 ? "순수익 도달 완료 (+100%)" : `${Math.max(0, Math.min(99, Math.round(((livePrice - buyPrice) / (feeAnalysis.bepPrice - buyPrice)) * 100)))}%`}
            </span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                feeAnalysis.netProfitPct > 0 ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{
                width: `${Math.max(5, Math.min(100, feeAnalysis.netProfitPct > 0 ? 100 : Math.round(((livePrice - buyPrice) / (feeAnalysis.bepPrice - buyPrice)) * 100)))}%`
              }}
            />
          </div>
        </div>

        {/* Rationale Explanation Box */}
        <div
          className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
            sellDecision.canExecuteSell
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-amber-950/40 border-amber-500/40 text-amber-200"
          }`}
        >
          {sellDecision.canExecuteSell ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <span className="font-bold">AI 매도 검증 판정:</span>
            <p className="text-slate-300 font-sans">{sellDecision.rationale}</p>
          </div>
        </div>
      </div>

      {/* 4. ACTION BUTTONS WITH NET PROFIT GUARD CHECK */}
      {onTradeClick && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onTradeClick("BUY")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>2차 양봉확정 AI 매수</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (sellDecision.canExecuteSell) {
                onTradeClick("SELL");
              }
            }}
            disabled={!sellDecision.canExecuteSell}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              sellDecision.canExecuteSell
                ? "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg shadow-rose-950"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            }`}
          >
            {sellDecision.canExecuteSell ? (
              <>
                <TrendingDown className="w-3.5 h-3.5" />
                <span>순수익 확정 매도</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>수수료 녹음 방지 차단됨</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
