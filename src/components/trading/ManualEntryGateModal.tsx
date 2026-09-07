// AISTOCK v12.4 Manual Entry Gate Modal Component
// Allows user to inspect ANY symbol (in scanner or typed/selected manually),
// views Missing Reason Analysis, Pre-Scanner Alert, 100-Pt Score, and executes BUY decision.

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Radar,
  Flame,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Zap,
  BarChart3,
  Layers,
  Activity,
  ArrowRight
} from "lucide-react";
import { MissingReasonAnalyzerV124, ManualEntryAnalysisResult } from "../../services/v12_4/MissingReasonAnalyzerV124";
import { UnifiedBuyGateV121, CandidateBuySignalV121 } from "../../services/v12_1/UnifiedBuyGateV121";
import { globalExecutionStateMachine } from "../../services/v11/ExecutionStateMachine";

interface ManualEntryGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
  initialName?: string;
  initialMarket?: "KOREA" | "US" | "BTC";
  initialPrice?: number;
  onExecuteOrderSuccess?: (orderId: string) => void;
}

export const ManualEntryGateModal: React.FC<ManualEntryGateModalProps> = ({
  isOpen,
  onClose,
  initialSymbol = "005930",
  initialName = "삼성전자",
  initialMarket = "KOREA",
  initialPrice = 75000,
  onExecuteOrderSuccess
}) => {
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [name, setName] = useState<string>(initialName);
  const [market, setMarket] = useState<"KOREA" | "US" | "BTC">(initialMarket);
  const [price, setPrice] = useState<number>(initialPrice);

  const [analysisResult, setAnalysisResult] = useState<ManualEntryAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionMessage, setExecutionMessage] = useState<string>("");

  const analyzer = new MissingReasonAnalyzerV124();

  useEffect(() => {
    if (isOpen) {
      setSymbol(initialSymbol);
      setName(initialName);
      setMarket(initialMarket);
      setPrice(initialPrice);
      runAnalysis(initialSymbol, initialName, (initialMarket || "KOREA") as "KOREA" | "US" | "BTC", initialPrice);
    }
  }, [isOpen, initialSymbol, initialName, initialMarket, initialPrice]);

  const runAnalysis = (sym: string, nm: string, mkt: "KOREA" | "US" | "BTC", prc: number) => {
    setIsAnalyzing(true);
    setExecutionMessage("");
    setTimeout(() => {
      const res = analyzer.analyzeSymbol(sym, nm, mkt, prc);
      setAnalysisResult(res);
      setIsAnalyzing(false);
    }, 250);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;
    const cleanSym = symbol.trim().toUpperCase();
    setIsAnalyzing(true);
    setExecutionMessage("");

    try {
      const res = await fetch(`/api/market/v13/snapshot/${encodeURIComponent(cleanSym)}`);
      let snapshot: any = null;
      if (res.ok) {
        snapshot = await res.json();
      }

      if (snapshot && snapshot.dataValid === true && snapshot.currentPrice > 0) {
        setPrice(snapshot.currentPrice);
        setName(snapshot.name || cleanSym);
        setMarket(snapshot.market || "KOREA");

        const analysis = analyzer.analyzeSymbol(
          snapshot.symbol || cleanSym,
          snapshot.name || cleanSym,
          snapshot.market || "KOREA",
          snapshot.currentPrice,
          [],
          snapshot.candles
        );

        setAnalysisResult(analysis);
      } else {
        const isUs = /^[A-Z]{1,5}$/.test(cleanSym);
        const calculatedMarket: "KOREA" | "US" | "BTC" = isUs ? "US" : "KOREA";
        setMarket(calculatedMarket);
        setName(cleanSym);

        const fallbackAnalysis = analyzer.analyzeSymbol(
          cleanSym,
          cleanSym,
          calculatedMarket,
          0,
          [],
          []
        );
        setAnalysisResult(fallbackAnalysis);
        setExecutionMessage("🚨 실제 시세 및 OHLCV 캔들을 확인할 수 없어 매수가 즉시 차단되었습니다.");
      }
    } catch (error: any) {
      setAnalysisResult(null);
      setExecutionMessage("🚨 실제 시세를 확인할 수 없어 분석 및 매수를 차단했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteBuy = async () => {
    if (!analysisResult) return;

    if (analysisResult.hardReject.hasHardReject) {
      alert("🚨 하드 리젝트 필터에 의해 매수가 차단되었습니다:\n" + analysisResult.hardReject.rejectDescription);
      return;
    }

    setIsExecuting(true);
    setExecutionMessage("⏳ [v12.1 Unified BUY Gate] 주문 승인 검증 및 KIS 브로커 전송 중...");

    try {
      const buyGate = new UnifiedBuyGateV121("PAPER", false);

      const signal: CandidateBuySignalV121 = {
        symbol: analysisResult.symbol,
        name: analysisResult.name,
        market: analysisResult.market,
        price: analysisResult.currentPrice,
        scannerScore: analysisResult.scannerStatus.scannerScore || analysisResult.scoreBreakdown.totalScore,
        shapeScore: Math.min(100, analysisResult.scoreBreakdown.priceStructure * 7),
        confirmationScore: analysisResult.confidencePct,
        direction: "BULLISH" as const,
        aiReason: analysisResult.aiCommentary,
        discoveryMode: "MANUAL",
        dataValid: !analysisResult.hardReject.hasHardReject && analysisResult.currentPrice > 0,
        dataQuality: "NORMAL"
      };

      const gateRes = await buyGate.processBuyGate(signal, globalExecutionStateMachine);

      if (gateRes.passed && gateRes.orderResult?.success) {
        setExecutionMessage(`✅ [주문 수신 완료] ODNO: ${gateRes.orderResult.orderId} (상태: PENDING)`);
        onExecuteOrderSuccess?.(gateRes.orderResult.orderId);
      } else {
        setExecutionMessage(`❌ [주문 거부] ${gateRes.rejectReason || gateRes.orderResult?.message || "BUY Gate 통과 실패"}`);
      }
    } catch (err: any) {
      setExecutionMessage(`🚨 [주문 오류] ${err?.message || err}`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-2xl w-full text-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Manual Entry Gate v1.0</h2>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  스캐너 밖 종목 직접 매수 검증
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  REAL
                </span>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  PAPER
                </span>
              </div>
              <p className="text-xs text-slate-400">Scanner 미포착 사유 분석 & Pre-Scanner AI 정밀 검증 엔진</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="종목코드 또는 티커 입력 (예: 005930, NVDA, AAPL)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Zap className="w-4 h-4" /> AI 즉시 정밀 검증
            </button>
          </form>
        </div>

        {/* Modal Body */}
        {isAnalyzing ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="inline-block animate-spin text-blue-500">
              <Radar className="w-8 h-8" />
            </div>
            <p className="text-sm">스캐너 미포착 사유 및 100점 점수화 항목 정밀 분석 중...</p>
          </div>
        ) : analysisResult ? (
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Top Symbol Info Bar */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-white">{analysisResult.name}</span>
                  <span className="text-xs font-mono text-slate-400">({analysisResult.symbol})</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                    {analysisResult.market}
                  </span>
                </div>
                <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                  {(analysisResult.currentPrice ?? 0).toLocaleString()} {analysisResult.market === "US" ? "$" : "원"}
                </div>
              </div>

              {/* Entry Decision Badge */}
              <div className="text-right">
                <div className="text-[10px] text-slate-400 mb-0.5">AI Entry Decision</div>
                <div
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold shadow-md ${
                    analysisResult.decisionState === "STRONG BUY"
                      ? "bg-emerald-600 text-white"
                      : analysisResult.decisionState === "BUY"
                      ? "bg-blue-600 text-white"
                      : analysisResult.decisionState === "EARLY BUY"
                      ? "bg-indigo-600 text-white"
                      : analysisResult.decisionState === "WATCH"
                      ? "bg-amber-600 text-white"
                      : "bg-red-900/80 text-red-200 border border-red-700"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  {analysisResult.decisionState} ({analysisResult.confidencePct}%)
                </div>
              </div>
            </div>

            {/* SCANNER STATUS & MISSING REASON BOX */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Radar className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-slate-200">Scanner Status</span>
                </div>
                {analysisResult.scannerStatus.found ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 주도주 스캐너 포착됨 ({analysisResult.scannerStatus.scannerScore}점)
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" /> Scanner 미포착 (Manual Entry)
                  </span>
                )}
              </div>

              {/* Missing Reason Breakdown Grid */}
              {analysisResult.missingReason && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-300 font-medium">
                    🔍 미포착 원인: <span className="text-amber-300">{analysisResult.missingReason.primaryReason}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <div className="text-slate-400">RVOL</div>
                      <div className="font-mono text-white font-semibold">{analysisResult.missingReason.rvolCurrent}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <div className="text-slate-400">거래량 추세</div>
                      <div className="font-semibold text-blue-400">{analysisResult.missingReason.volumeTrend}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <div className="text-slate-400">가격 구조</div>
                      <div className="font-semibold text-emerald-400">{analysisResult.missingReason.priceStructure}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <div className="text-slate-400">VWAP 위치</div>
                      <div className="font-semibold text-indigo-400">{analysisResult.missingReason.vwapStatus}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    💡 {analysisResult.missingReason.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* PRE-SCANNER ALERT BANNER */}
            {analysisResult.preScannerSignal.active && (
              <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-xl p-3 flex items-start gap-3">
                <Flame className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-indigo-300">PRE-SCANNER RADAR SIGNAL (EARLY BUY)</div>
                  <div className="text-slate-300">{analysisResult.preScannerSignal.alertText}</div>
                </div>
              </div>
            )}

            {/* 100-POINT ENTRY SCORE BREAKDOWN */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">AI Entry Score</span>
                </div>
                <div className="text-base font-extrabold font-mono text-emerald-400">
                  {analysisResult.scoreBreakdown.totalScore} <span className="text-xs font-normal text-slate-400">/ 100점</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${analysisResult.scoreBreakdown.totalScore}%` }}
                />
              </div>

              {/* Grid of 10 score metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">시장 상태</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.marketState}/10</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">업종/테마</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.sectorTheme}/10</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">상대강도</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.relativeStrength}/10</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">거래량/RVOL</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.volumeRvol}/12</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">가격구조</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.priceStructure}/15</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">VWAP/EMA</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.vwapEma}/10</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">모멘텀</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.momentumIndicators}/10</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">패턴</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.patterns}/10</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">멀티타임프레임</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.multiTimeframe}/8</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">유동성</div>
                  <div className="font-mono text-white font-bold">{analysisResult.scoreBreakdown.liquiditySpread}/5</div>
                </div>
              </div>
            </div>

            {/* HARD REJECT FILTER status */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-300">Hard Reject Filter (위험 차단)</span>
              </div>
              {analysisResult.hardReject.hasHardReject ? (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> REJECTED ({analysisResult.hardReject.rejectedRule})
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PASS (위험 조건 없음)
                </span>
              )}
            </div>

            {/* AI COMMENTARY */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-blue-400">🤖 AI 분석 소평</div>
              <p>{analysisResult.aiCommentary}</p>
            </div>

            {/* Execution Status Message */}
            {executionMessage && (
              <div className="bg-slate-950 border border-blue-500/40 p-3 rounded-xl text-xs text-blue-300 font-mono">
                {executionMessage}
              </div>
            )}
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
          >
            닫기
          </button>

          <button
            onClick={handleExecuteBuy}
            disabled={isExecuting || !analysisResult || analysisResult.hardReject.hasHardReject}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {analysisResult?.decisionState === "EARLY BUY" ? "EARLY BUY 매수 실행" : "BUY 게이트 매수 실행"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
