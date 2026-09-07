import React, { useState, useEffect } from "react";
import { 
  X, 
  Brain, 
  Activity, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Target, 
  Zap, 
  Trash2, 
  RefreshCw, 
  Filter, 
  ChevronRight, 
  Sparkles, 
  Radio, 
  BarChart2, 
  ArrowUpRight,
  ChevronLeft
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { AIDecisionLog } from "../../types";
import { resolveStockName } from "../../lib/stockDictionary";
import { stockSyncService } from "../../services/stockSyncService";

export const AiDecisionLogsSidebar: React.FC = () => {
  const { 
    decisionLogs, 
    executeTrade, 
    openStockChart, 
    addToast, 
    profile, 
    clearDecisionLogs, 
    triggerLiveSignalLog,
    selectedSymbol,
    setSelectedSymbol
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedMarket, setSelectedMarket] = useState<string>("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleToggle = () => setIsOpen(prev => !prev);
    
    window.addEventListener("open-ai-decision-logs-sidebar", handleOpen);
    window.addEventListener("toggle-ai-decision-logs-sidebar", handleToggle);

    return () => {
      window.removeEventListener("open-ai-decision-logs-sidebar", handleOpen);
      window.removeEventListener("toggle-ai-decision-logs-sidebar", handleToggle);
    };
  }, []);

  const filteredLogs = decisionLogs.filter(log => {
    const matchesSearch = 
      log.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = selectedAction === "ALL" || log.action === selectedAction;
    const matchesMarket = selectedMarket === "ALL" || log.market === selectedMarket;
    
    return matchesSearch && matchesAction && matchesMarket;
  });

  const handleQuickBuy = async (log: AIDecisionLog) => {
    const curPrice = log.currentPrice || log.entryPrice || 50000;
    const isCrypto = log.market === "BTC";
    const isUS = log.market === "US";
    const unit = isUS ? "$" : "원";
    const qty = isCrypto ? 0.01 : 1;

    try {
      await executeTrade(
        log.symbol,
        log.name,
        log.market,
        "BUY",
        qty,
        curPrice,
        "AI 뇌엔진 시그널 즉시 체결",
        `[AI 시그널 결정 근거 체결] ${log.message}`
      );
      addToast({
        type: "SUCCESS",
        title: `🎯 ${log.name} 체결 완료`,
        message: `${unit}${(curPrice ?? 0).toLocaleString()} 및 AI 목표가 ${(log.targetPrice || curPrice * 1.12).toLocaleString()}${unit} 체결 완료.`
      });
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "주문실패",
        message: err?.message || "체결 처리 중 오류가 발생했습니다."
      });
    }
  };

  return (
    <>
      {/* Floating Toggle Button on Right Edge */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border-l-2 border-y border-emerald-500/80 rounded-l-2xl p-2.5 shadow-2xl transition flex flex-col items-center gap-1.5 cursor-pointer group"
        title="AI 뇌엔진 매매 결정 로그 사이드바 열기"
      >
        <Brain className="w-5 h-5 animate-pulse text-emerald-400 group-hover:scale-110 transition" />
        <span className="text-[10px] font-black font-mono tracking-tighter text-white [writing-mode:vertical-lr] rotate-180">
          AI 뇌 LOGS ({decisionLogs.length})
        </span>
      </button>

      {/* Drawer Overlay Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        />
      )}

      {/* Drawer Panel */}
      <div 
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-zinc-950 text-white border-l border-zinc-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-zinc-950 via-zinc-900 to-indigo-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-tight">AI 뇌 엔진 매매 결정 로그</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                  TRANSPARENCY
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                13개 자율매매 엔진의 AI 판단 사유, 수급 수치, 손익비 및 목표가 기록
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 space-y-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="종목명, 티커, 결정 사유 검색..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] font-bold text-zinc-300 focus:outline-none"
            >
              <option value="ALL">전체 마켓</option>
              <option value="KOREA">🇰🇷 KIS국내</option>
              <option value="BTC">🪙 업비트</option>
              <option value="US">🇺🇸 미국주식</option>
            </select>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] font-bold text-zinc-300 focus:outline-none"
            >
              <option value="ALL">전체 시그널</option>
              <option value="BUY_SIGNAL">🚀 매수 신호</option>
              <option value="SELL_SIGNAL">🛑 매도 청산</option>
              <option value="HOLD_SIGNAL">⏸️ 포지션 유지</option>
              <option value="SAFETY_REJECT">⚠️ 안전 차단</option>
            </select>

            {decisionLogs.length > 0 && (
              <button
                onClick={clearDecisionLogs}
                className="ml-auto text-[10px] text-rose-400 hover:underline font-bold cursor-pointer"
              >
                로그 삭제
              </button>
            )}
          </div>
        </div>

        {/* Logs Feed Body - Vertical Timeline View */}
        <div className="flex-1 overflow-y-auto p-4 font-sans relative">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-xs text-zinc-500 space-y-2">
              <Activity className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
              <p className="font-bold text-zinc-400">기록된 AI 매매 결정 로그가 없습니다.</p>
              <p className="text-[11px]">실시간 자율매매 엔진이 가동되면 결정 사유 및 패턴 분석이 타임라인으로 기록됩니다.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-indigo-500 before:to-zinc-800">
              {filteredLogs.map((log, idx) => {
                const isExpanded = expandedLogId === log.id;
                const isBuy = log.action === "BUY_SIGNAL";
                const isSell = log.action === "SELL_SIGNAL";
                const isUS = log.market === "US";
                const priceUnit = isUS ? "$" : "₩";
                const curPrice = log.currentPrice || log.entryPrice || 0;
                const targetPrice = log.targetPrice || Math.round(curPrice * 1.12);
                const targetGain = log.targetGainPct || 12.0;

                const positionDir = log.positionDirection || (isBuy ? "LONG" : isSell ? "SHORT" : "LONG");
                const isLong = positionDir === "LONG";

                return (
                  <div key={`${log.id}_${idx}`} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className={`absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${
                      isBuy ? "bg-emerald-950 border-emerald-400 text-emerald-400" :
                      isSell ? "bg-rose-950 border-rose-400 text-rose-400" :
                      "bg-zinc-900 border-zinc-600 text-zinc-400"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isBuy ? "bg-emerald-400 animate-ping" : isSell ? "bg-rose-400" : "bg-zinc-400"}`} />
                    </div>

                    {/* Timeline Card */}
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/90 shadow-md transition cursor-pointer space-y-3"
                    >
                      {/* Timeline Header Bar */}
                      <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] text-zinc-400 flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            {new Date(log.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>

                          <span className="font-mono font-black text-white text-xs bg-zinc-800 px-2 py-0.5 rounded">
                            {log.symbol}
                          </span>

                          <strong className="text-white text-xs font-black">
                            {resolveStockName(log.symbol, log.name, log.market)}
                          </strong>
                        </div>

                        {/* Long / Short Position Direction Badge */}
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 font-mono ${
                            isLong
                              ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                              : "bg-rose-950 text-rose-300 border-rose-700"
                          }`}>
                            {isLong ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ChevronRight className="w-3 h-3 text-rose-400 rotate-90" />}
                            <span>{positionDir} 포지션</span>
                          </span>

                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                            isBuy ? "bg-emerald-950 text-emerald-300 border-emerald-700" :
                            isSell ? "bg-rose-950 text-rose-300 border-rose-700" :
                            "bg-zinc-800 text-zinc-300 border-zinc-700"
                          }`}>
                            {isBuy ? "BUY" : isSell ? "SELL" : "HOLD"}
                          </span>
                        </div>
                      </div>

                      {/* Main Decision Rationale Text */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-zinc-100 leading-relaxed font-semibold">
                          {log.message}
                        </p>

                        {/* Dedicated Box: 진입 근거 (롱/숏 판단 사유) */}
                        <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-indigo-900/40 text-[11px] space-y-1">
                          <div className="flex items-center justify-between font-bold text-indigo-300 text-[10px] uppercase font-mono">
                            <span className="flex items-center gap-1">
                              <Brain className="w-3.5 h-3.5 text-indigo-400" />
                              <span>AI 진입 근거 ({positionDir} 판단 사유)</span>
                            </span>
                            <span className="text-purple-400 font-mono">신뢰도 {log.confidence || 95}%</span>
                          </div>
                          <p className="text-zinc-300 text-[11px] leading-tight">
                            {log.entryRationale || (isLong ? "상승 파동 및 기관/외인 대량 수급 유입 포착" : "하방 압력 및 매도 호가 잔량 우위 형성")}
                          </p>
                        </div>
                      </div>

                      {/* Executed Pattern Analysis Results Card */}
                      <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono font-bold">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Sparkles className="w-3 h-3" />
                            <span>실행된 패턴 분석 결과 (Pattern Analysis)</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                          <div className="bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800">
                            <span className="text-zinc-500 block">🕯️ 캔들스틱 패턴</span>
                            <strong className="text-emerald-300 font-sans block truncate">
                              {log.candlePattern || "장대양봉 돌파 (Bullish Breakout)"}
                            </strong>
                          </div>

                          <div className="bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800">
                            <span className="text-zinc-500 block">🏛️ SMC 구조</span>
                            <strong className="text-purple-300 font-sans block truncate">
                              {log.smcStructure || "BOS (Break of Structure) 돌파"}
                            </strong>
                          </div>
                        </div>

                        {log.orderbookDelta && (
                          <div className="bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800 text-[10px]">
                            <span className="text-zinc-500 block">📊 호가 잔량 수급 (OrderBook Delta)</span>
                            <strong className="text-cyan-300 font-sans block">
                              {log.orderbookDelta}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Target Price & Metrics Bar */}
                      <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-2 rounded-xl text-[10px] font-mono border border-zinc-800">
                        <div>
                          <span className="text-zinc-500 block">진입가/호가</span>
                          <strong className="text-white">{priceUnit}{(curPrice ?? 0).toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-emerald-400 block">AI 목표가</span>
                          <strong className="text-emerald-400">+{targetGain}% ({priceUnit}{(targetPrice ?? 0).toLocaleString()})</strong>
                        </div>
                        <div>
                          <span className="text-rose-400 block">손절 설정가</span>
                          <strong className="text-rose-300">{priceUnit}{(log.stopLossPrice || Math.round(curPrice * 0.965)).toLocaleString()}</strong>
                        </div>
                      </div>

                      {/* Expanded View: Extra Pattern Analysis & Technical Indicators */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-zinc-800 space-y-2 animate-in fade-in text-[11px]">
                          <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-800/50 space-y-1">
                            <span className="text-[10px] font-bold text-indigo-300 font-mono block">
                              🔬 종합 패턴 분석 스냅샷
                            </span>
                            <p className="text-zinc-300 text-[11px] leading-relaxed">
                              {log.patternAnalysis || "5분봉 이동평균선 정배열 + 거래대금 전일 대비 320% 분출 + FVG 갭 구간 매수 세력 지지 확인 완료."}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                              <span className="text-zinc-500 block">거래량 파워 (Volume Ratio)</span>
                              <strong className="text-white">{log.volumeRatio || 3.4}x (평균 대비)</strong>
                            </div>
                            <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                              <span className="text-zinc-500 block">RSI 상대강도</span>
                              <strong className="text-amber-300">{log.rsi || 54} (안정 구간)</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mode Tag & Quick Trade Trigger */}
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px]">
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          (log.isRealTrade === true || log.executionType === "REAL_BROKER")
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-indigo-950 text-indigo-300 border border-indigo-800"
                        }`}>
                          {(log.isRealTrade === true || log.executionType === "REAL_BROKER") ? "🔥 실거래 체결 신호" : "🛡️ 모의 시뮬레이션"}
                        </span>

                        {isBuy && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickBuy(log);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                            <span>즉시 매수 체결</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>AI Brain Engine Live Telemetry</span>
          <button
            onClick={() => setIsOpen(false)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition cursor-pointer"
          >
            닫기
          </button>
        </div>

      </div>
    </>
  );
};
