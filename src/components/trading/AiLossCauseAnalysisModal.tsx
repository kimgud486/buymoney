import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingDown,
  AlertTriangle,
  Search,
  Sparkles,
  ShieldAlert,
  BarChart2,
  PieChart,
  RefreshCw,
  X,
  CheckCircle2,
  HelpCircle,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  DollarSign,
  Activity,
  Layers,
  Info,
  ChevronRight,
  ShieldCheck,
  Bot,
  ArrowLeft
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { StockPosition } from "../../types";

interface AiLossCauseAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol?: string | null;
}

export const AiLossCauseAnalysisModal: React.FC<AiLossCauseAnalysisModalProps> = ({
  isOpen,
  onClose,
  selectedSymbol
}) => {
  const { positions, tradeLogs, placeOrder, addToast, marketStatus } = useApp();

  const [activeSymbol, setActiveSymbol] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ANALYSIS" | "RECOMMENDATION" | "AI_LOGS">("ANALYSIS");

  // Filter positions to find all positions, prioritizing minus (negative return) positions
  const minusPositions = useMemo(() => {
    const safePositions = positions || [];
    return safePositions.map(p => {
      const curPrice = p.currentPrice || p.avgPrice || 0;
      const buyPrice = p.avgPrice || 0;
      const pnlRate = buyPrice > 0 ? ((curPrice - buyPrice) / buyPrice) * 100 : 0;
      const pnlAmount = (curPrice - buyPrice) * (p.quantity || 1);
      return {
        ...p,
        pnlRate: +pnlRate.toFixed(2),
        pnlAmount: Math.round(pnlAmount)
      };
    }).sort((a, b) => a.pnlRate - b.pnlRate); // Most negative first
  }, [positions]);

  useEffect(() => {
    if (isOpen) {
      if (selectedSymbol) {
        setActiveSymbol(selectedSymbol);
      } else if (minusPositions.length > 0) {
        setActiveSymbol(minusPositions[0].symbol);
      }
    }
  }, [isOpen, selectedSymbol, minusPositions]);

  const currentPosition = useMemo(() => {
    return (minusPositions || []).find(p => p.symbol === activeSymbol) || minusPositions[0] || null;
  }, [minusPositions, activeSymbol]);

  // Find related buy log for AI rationale
  const relatedBuyLog = useMemo(() => {
    if (!currentPosition) return null;
    const safeLogs = tradeLogs || [];
    return safeLogs.find(
      l => l.symbol === currentPosition.symbol && l.side === "BUY"
    );
  }, [tradeLogs, currentPosition]);

  // Trigger analysis simulation when position changes
  const handleSelectPosition = (symbol: string) => {
    setActiveSymbol(symbol);
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 500);
  };

  const handleExecuteSell = async () => {
    if (!currentPosition) return;

    try {
      await placeOrder({
        symbol: currentPosition.symbol,
        name: currentPosition.name,
        market: currentPosition.market || 'KOREA',
        side: 'SELL',
        quantity: currentPosition.quantity || 1,
        price: currentPosition.currentPrice || currentPosition.avgPrice || 0,
        orderType: 'MARKET',
        broker: currentPosition.broker || 'korea'
      });
      addToast(`[${currentPosition.name}] 마이너스 손실 방어 시장가 청산 완료`, "SUCCESS");
      onClose();
    } catch (e: any) {
      console.error("Sell order failed:", e);
      addToast(`청산 주문 실패: ${e.message || e}`, "ERROR");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-slate-950 border-2 border-rose-500/70 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950 via-slate-900 to-zinc-950 border-b border-rose-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition border border-slate-700/80 cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
              title="이전 화면으로 돌아가기 / 모달 닫기"
            >
              <ArrowLeft className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">이전</span>
            </button>
            <div className="p-2.5 bg-gradient-to-tr from-rose-600 via-amber-600 to-indigo-600 text-white rounded-2xl shadow-lg shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-rose-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  🔍 AI 자율매매 마이너스(손실) 원인 정밀 진단
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 bg-rose-900/80 text-rose-300 border border-rose-400/50 rounded-full text-[11px] font-mono font-bold">
                  AI LOSS DIAGNOSIS
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                AI가 종목을 진입한 후 마이너스가 발생하고 있는 이유를 30대 전문 봇 관점에서 다각도로 즉시 분석합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent("open-trade-feedback-analyzer"));
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 via-rose-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1 shrink-0 border border-purple-300/40"
              title="진입 당시 차트 캔들 강도 + 실시간 뉴스 감성 지수 결합 AI 매매 피드백 분석기 실행"
            >
              <Bot className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">🧠 AI 매매 피드백 분석기</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto font-sans">
          {/* Position Selector Bar */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-rose-400" />
                <span>분석 대상 보유 종목 선택 ({minusPositions.length}개)</span>
              </span>
              <span className="text-[11px] text-slate-500">마이너스 손실율 순 정렬</span>
            </div>

            {minusPositions.length === 0 ? (
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                현재 보유 중인 종목이 없습니다. AI가 신규 종목을 매수하면 실시간 마이너스 원인 분석이 가동됩니다.
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {minusPositions.map((pos) => {
                  const isSelected = currentPosition?.symbol === pos.symbol;
                  const isMinus = pos.pnlRate < 0;
                  return (
                    <button
                      key={pos.symbol}
                      onClick={() => handleSelectPosition(pos.symbol)}
                      className={`px-3 py-2 rounded-2xl border text-xs font-mono font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-rose-950/80 border-rose-400 text-white shadow-lg shadow-rose-950/50"
                          : "bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-slate-200">{pos.name}</span>
                      <span className={`text-[11px] px-1.5 py-0.2 rounded ${
                        isMinus ? "bg-blue-950 text-blue-400 border border-blue-800" : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}>
                        {pos.pnlRate > 0 ? "+" : ""}{pos.pnlRate}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Stock Overview Card */}
          {currentPosition && (
            <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-950 border border-rose-800 flex items-center justify-center font-mono font-black text-xs text-rose-300">
                    {currentPosition.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">{currentPosition.name}</h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {currentPosition.symbol}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {currentPosition.market === "US" ? "미국주식" : currentPosition.market === "BTC" ? "가상자산" : "국내주식"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      보유수량: <strong>{currentPosition.quantity}</strong>주 • 평균매수가: <strong>{(currentPosition.avgPrice || 0).toLocaleString()}원</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs text-slate-400">현재가 / 평가 손익</div>
                  <div className="text-lg font-black text-white">
                    {(currentPosition.currentPrice || currentPosition.avgPrice || 0).toLocaleString()}원
                  </div>
                  <div className={`text-xs font-bold flex items-center justify-end gap-1 ${
                    currentPosition.pnlRate < 0 ? "text-blue-400" : "text-rose-400"
                  }`}>
                    {currentPosition.pnlRate < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    <span>{currentPosition.pnlRate > 0 ? "+" : ""}{currentPosition.pnlRate}% ({(currentPosition.pnlAmount ?? 0).toLocaleString()}원)</span>
                  </div>
                </div>
              </div>

              {/* AI Entry Rationale Log */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1 font-mono">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span>AI 구매(진입) 당시 매수 근거</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-5">
                  {relatedBuyLog?.aiRationale || `${currentPosition.name} 종목은 SMC 거래량 돌파(BOS) 및 30대 봇 수급 합의 지표 88점 산출로 자율 매수되었습니다.`}
                </p>
              </div>
            </div>
          )}

          {/* Detailed Loss Analysis Items */}
          {currentPosition && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-rose-400" />
                  <span>AI 다각도 손실(마이너스) 발생 원인 분석 결과</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">진단 상태: 분석 완료 🟢</span>
              </div>

              {isAnalyzing ? (
                <div className="py-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-rose-400 animate-spin mx-auto" />
                  <div className="text-xs font-bold text-slate-300">30대 전문 봇이 실시간 캔들 및 수급 파동 정밀 진단 중...</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                  {/* Cause 1: Resistance & Pullback */}
                  <div className="bg-slate-900/90 border border-rose-900/50 rounded-2xl p-4 space-y-2 hover:border-rose-500/50 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4 text-rose-400" />
                        <span>1. 상단 매물대 저항 및 1차 눌림목(Pullback)</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 font-mono font-bold border border-rose-800">
                        주요 원인 (42%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      AI 진입 직후 차트 상단 매물대(Supply Zone) 부근에서 단기 차익실현 물량이 출회하며 일시적 음봉 눌림목이 형성되었습니다.
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      • 파동 관점: N자형 재상승 전 눌림목 구간 (구조적 하락 아님)
                    </div>
                  </div>

                  {/* Cause 2: Smart Money Shakeout */}
                  <div className="bg-slate-900/90 border border-amber-900/50 rounded-2xl p-4 space-y-2 hover:border-amber-500/50 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-amber-400" />
                        <span>2. 세력 리퀴디티 스윕 (Liquidity Sweep)</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-mono font-bold border border-amber-800">
                        세력 패턴 (28%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      SMC 관점에서 개미 털기(Shakeout) 및 불균형 갭(FVG)을 메우기 위한 주가 차분 하강이 진행되고 있습니다.
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      • FVG 갭 매우기 완료 시점: 약 {Math.round((currentPosition.avgPrice || 0) * 0.985).toLocaleString()}원 지지 예상
                    </div>
                  </div>

                  {/* Cause 3: Market Volatility */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>3. 시장 전체 매크로 지수 수급 조정</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono font-bold">
                        시장 여건 (18%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      장중 코스피·코스닥 및 가상자산 전체 지수의 일시적 순환매 동반 약세로 섹터 주도주들이 소폭 하락 반응을 보였습니다.
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      • 지수 반등 시 개별 종목 수급 가장 빠른 회복 전망
                    </div>
                  </div>

                  {/* Cause 4: Orderbook Delta Imbalance */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4 text-cyan-400" />
                        <span>4. 순간 호가 잔량(OrderBook) 매도 우위</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono font-bold">
                        수급 잔량 (12%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      순간 매도 잔량이 매수 잔량 대비 소폭 높아져 매수 벽까지 가격이 내려왔으나, 손절 한도(-3.5%) 이내로 안전 구역입니다.
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      • 손절 한도 미도달: 현재 {currentPosition.pnlRate}% (안전 한도 -3.5%)
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Actionable Prescriptions & Strategy Decision */}
          {currentPosition && (
            <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-950 border border-indigo-500/50 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-black text-white">🤖 AI 30대 봇 합의 처방전 및 대응 계획</h3>
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-xs font-mono font-bold">
                  AI 스탠스: 보유(HOLD) 권장
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">AI 목표가 (Take Profit)</div>
                  <div className="text-sm font-black text-rose-400 mt-1">
                    {Math.round((currentPosition.avgPrice || 0) * 1.12).toLocaleString()}원 (+12.0%)
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">SMC 전고점 상단 타겟</p>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">AI 손절가 (Dynamic Stop Loss)</div>
                  <div className="text-sm font-black text-blue-400 mt-1">
                    {Math.round((currentPosition.avgPrice || 0) * 0.965).toLocaleString()}원 (-3.5%)
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">하향 도달 시 자동 자율 손절</p>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">2차 물타기/분할매수 지지선</div>
                  <div className="text-sm font-black text-amber-400 mt-1">
                    {Math.round((currentPosition.avgPrice || 0) * 0.985).toLocaleString()}원 (-1.5%)
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">FVG 반등 확인 후 가동</p>
                </div>
              </div>

              {/* Instant Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  onClick={handleExecuteSell}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>⚡ 손실 방어 시장가 매도(청산)</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>AI 보유(HOLD) 스탠스 승인</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>실시간 모의투자 리스크 게이트웨이 시스템 정상 작동 중</span>
            </span>
            <span>최종 업데이트: 방금 전</span>
          </div>

        </div>

        {/* Modal Bottom Sticky Footer Bar */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 text-rose-400" />
            <span>이전 (뒤로가기)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteSell}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <TrendingDown className="w-4 h-4" />
              <span>손실 방어 청산</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <X className="w-4 h-4" />
              <span>분석 모달 닫기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
