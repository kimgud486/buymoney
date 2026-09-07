import React, { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Power,
  Trash2,
  Filter,
  Brain,
  ShieldCheck,
  Zap,
  Globe,
  PieChart,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { StrictFilterAuditLogCard } from "./StrictFilterAuditLogCard";

export const HomeLiveAutoTradeLogWidget: React.FC = () => {
  const {
    trades,
    decisionLogs,
    positions,
    profile,
    updateProfileSettings,
    clearDecisionLogs,
    syncRealAccountBalance,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<"TRADES" | "DECISIONS" | "POSITIONS" | "FILTER">("FILTER");
  const [filterMarket, setFilterMarket] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [execFilter, setExecFilter] = useState<"ALL" | "REAL" | "PAPER">("ALL");
  const [sideFilter, setSideFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");

  const isAutoActive = profile?.autoTradingEnabled ?? true;
  const currentTargetMkt = profile?.autoTradingTargetMarket || "ALL";
  const isRealTradingActive = Boolean(profile?.isRealTrade === true);

  // Toggle Auto Trading Mode
  const handleToggleAutoTrading = async () => {
    const next = !isAutoActive;
    await updateProfileSettings({ autoTradingEnabled: next });
    addToast({
      type: next ? "SUCCESS" : "WARNING",
      title: next ? "⚡ AI 자율매매 가동" : "🛑 AI 자율매매 일시정지",
      message: next
        ? `전종목(국내/미국/업비트) 실시간 AI 스캔 및 [${isRealTradingActive ? "실거래" : "모의투자"}] 자율 매매 파이프라인이 시작되었습니다.`
        : "AI 자율매매 파이프라인이 정지되었습니다."
    });
  };

  // Switch Target Market
  const handleSetTargetMarket = async (mkt: "ALL" | "KOREA" | "US" | "BTC") => {
    await updateProfileSettings({ autoTradingTargetMarket: mkt });
    addToast({
      type: "INFO",
      title: `🌐 자율매매 스캔 대상 변경`,
      message: `스캔 & 매매 대상이 [${
        mkt === "ALL" ? "전체 (국내+미국+업비트)" : mkt === "KOREA" ? "국내주식" : mkt === "US" ? "미국주식" : "업비트 가상자산"
      }]으로 설정되었습니다.`
    });
  };

  // Sync real brokerage account balance
  const handleSyncRealBalance = async () => {
    try {
      await syncRealAccountBalance("all");
      addToast({
        type: "SUCCESS",
        title: "🔄 잔고 동기화 완료",
        message: isRealTradingActive
          ? "한국투자증권 / 업비트 / 토스 실계좌 잔고가 최신 상태로 동기화되었습니다."
          : "모의투자 가상 잔고 및 시세가 최신 상태로 갱신되었습니다."
      });
    } catch (e: any) {
      addToast({
        type: "ERROR",
        title: "동기화 실패",
        message: e?.message || "잔고 동기화 중 오류가 발생했습니다."
      });
    }
  };

  const allExecutedTrades = [...trades].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredTrades = allExecutedTrades.filter((t) => {
    const matchMkt = filterMarket === "ALL" || t.market === filterMarket;
    const isReal = t.isRealTrade === true || t.executionType === "REAL_BROKER";
    const matchExec = execFilter === "ALL" || (execFilter === "REAL" && isReal) || (execFilter === "PAPER" && !isReal);
    const matchSide = sideFilter === "ALL" || t.side === sideFilter;
    return matchMkt && matchExec && matchSide;
  });

  const filteredDecisions = decisionLogs.filter((d) => {
    if (filterMarket === "ALL") return true;
    return d.market === filterMarket;
  });

  const filteredPositions = positions.filter((p) => {
    if (filterMarket === "ALL") return true;
    return p.market === filterMarket;
  });

  return (
    <div id="home-auto-trading-logs" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5 text-slate-800 font-sans transition">
      
      {/* 1. CARD HEADER (Integrated with Home UI Theme) */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        
        {/* Left Title & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-cyan-400 rounded-xl shadow-xs shrink-0">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <span>AI 자율매매 실시간 체결 &amp; 관제 기록</span>
              </h3>

              {/* Real vs Mock Mode Tag */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-2xs border ${
                isRealTradingActive
                  ? "bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-400/40"
                  : "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400/40"
              }`}>
                {isRealTradingActive ? "🔥 실거래 체결 모드" : "🟢 100% 모의투자 모드"}
              </span>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                isAutoActive 
                  ? "bg-blue-50 text-blue-700 border border-blue-300" 
                  : "bg-slate-100 text-slate-600 border border-slate-300"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoActive ? "bg-blue-500 animate-ping" : "bg-slate-400"}`} />
                {isAutoActive ? "AI 자율매매 가동중" : "일시정지"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRealTradingActive
                ? "실제 증권사/업비트 연동 계좌로 안전 기준(손절 -3.5%, 분할익절 +3.5%)에 맞춰 실거래 체결합니다."
                : "안전한 가상 모의 자산 기반으로 100% 모의 주문(사고팔고)과 AI 탐지 시그널을 실시간 관제 기록합니다."}
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Target Market Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold font-mono">
            <Globe className="w-3.5 h-3.5 text-blue-600 ml-1" />
            <button
              onClick={() => handleSetTargetMarket("ALL")}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${currentTargetMkt === "ALL" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              전체
            </button>
            <button
              onClick={() => handleSetTargetMarket("KOREA")}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${currentTargetMkt === "KOREA" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              국내
            </button>
            <button
              onClick={() => handleSetTargetMarket("US")}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${currentTargetMkt === "US" ? "bg-purple-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              미국
            </button>
            <button
              onClick={() => handleSetTargetMarket("BTC")}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${currentTargetMkt === "BTC" ? "bg-amber-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              업비트
            </button>
          </div>

          {/* Pipeline Master Hub Button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-master-pipeline-modal"))}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            title="AI 뇌엔진 및 13개 자율매매 파이프라인 마스터 설정"
          >
            <Brain className="w-3.5 h-3.5 text-amber-300" />
            <span>🚀 13기능 파이프라인</span>
          </button>

          {/* Toggle Auto Trading */}
          <button
            onClick={handleToggleAutoTrading}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-2xs border ${
              isAutoActive 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" 
                : "bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isAutoActive ? "자율매매 ON" : "자율매매 OFF"}</span>
          </button>

          {/* Real/Mock Balance Sync */}
          <button
            onClick={handleSyncRealBalance}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            title="계좌 잔고 및 호가 즉시 동기화"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>잔고 동기화</span>
          </button>

          {/* Clear Logs */}
          <button
            onClick={clearDecisionLogs}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-300 transition cursor-pointer"
            title="기록 비우기"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 2. STATS SUMMARY BADGES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[10px] font-bold block">총 체결 건수</span>
            <span className="text-sm font-black text-slate-900">{allExecutedTrades.length}건</span>
          </div>
          <Activity className="w-4 h-4 text-blue-600" />
        </div>

        <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between">
          <div>
            <span className="text-rose-600 text-[10px] font-bold block">매수 체결 (BUY)</span>
            <span className="text-sm font-black text-rose-700">{allExecutedTrades.filter(t => t.side === 'BUY').length}건</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-rose-600" />
        </div>

        <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-emerald-600 text-[10px] font-bold block">매도 체결 (SELL)</span>
            <span className="text-sm font-black text-emerald-700">{allExecutedTrades.filter(t => t.side === 'SELL').length}건</span>
          </div>
          <ArrowDownRight className="w-4 h-4 text-emerald-600" />
        </div>

        <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
          <div>
            <span className="text-amber-700 text-[10px] font-bold block">AI 탐지 스캔 기록</span>
            <span className="text-sm font-black text-amber-800">{decisionLogs.length}건</span>
          </div>
          <Brain className="w-4 h-4 text-amber-600" />
        </div>
      </div>

      {/* 3. VIEW TABS & ADVANCED FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab("FILTER")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "FILTER" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 bg-slate-100"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>🛡️ 5대 하드 게이트 분석 필터 카드</span>
          </button>

          <button
            onClick={() => setActiveTab("TRADES")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "TRADES" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 bg-slate-100"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>실시간 사고팔고 체결 기록 ({filteredTrades.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("DECISIONS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "DECISIONS" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 bg-slate-100"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI 전종목 탐지 로그 ({filteredDecisions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("POSITIONS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "POSITIONS" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 bg-slate-100"
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-emerald-400" />
            <span>자율매매 보유 잔고 ({filteredPositions.length})</span>
          </button>
        </div>

        {/* Filter Switchers */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold text-slate-500">
          {activeTab === "TRADES" && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button onClick={() => setSideFilter("ALL")} className={`px-1.5 py-0.5 rounded ${sideFilter === "ALL" ? "bg-slate-800 text-white" : "hover:text-slate-900"}`}>전체</button>
              <button onClick={() => setSideFilter("BUY")} className={`px-1.5 py-0.5 rounded ${sideFilter === "BUY" ? "bg-rose-600 text-white" : "hover:text-slate-900 text-rose-600"}`}>매수만</button>
              <button onClick={() => setSideFilter("SELL")} className={`px-1.5 py-0.5 rounded ${sideFilter === "SELL" ? "bg-emerald-600 text-white" : "hover:text-slate-900 text-emerald-600"}`}>매도만</button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Filter className="w-3 h-3 text-blue-600 ml-1" />
            <button onClick={() => setFilterMarket("ALL")} className={`px-1.5 py-0.5 rounded ${filterMarket === "ALL" ? "bg-slate-800 text-white" : "hover:text-slate-900"}`}>전체시장</button>
            <button onClick={() => setFilterMarket("KOREA")} className={`px-1.5 py-0.5 rounded ${filterMarket === "KOREA" ? "bg-blue-600 text-white" : "hover:text-slate-900 text-blue-700"}`}>국내</button>
            <button onClick={() => setFilterMarket("US")} className={`px-1.5 py-0.5 rounded ${filterMarket === "US" ? "bg-purple-600 text-white" : "hover:text-slate-900 text-purple-700"}`}>미국</button>
            <button onClick={() => setFilterMarket("BTC")} className={`px-1.5 py-0.5 rounded ${filterMarket === "BTC" ? "bg-amber-600 text-white" : "hover:text-slate-900 text-amber-800"}`}>업비트</button>
          </div>
        </div>
      </div>

      {/* 4. LOG RECORD CONTENTS (Clean Modern Dark Terminal Body) */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5">

        {/* TAB 0: 5-GATE AUDIT FILTER CARD */}
        {activeTab === "FILTER" && (
          <StrictFilterAuditLogCard />
        )}

        {/* TAB 1: TRADES (사고팔고 실시간 체결 기록) */}
        {activeTab === "TRADES" && (
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredTrades.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs">
                <Clock className="w-6 h-6 mx-auto mb-1.5 opacity-40 animate-spin text-cyan-400" />
                <p className="font-semibold text-slate-400">실시간 자율매매 체결 내역을 모니터링하고 있습니다...</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  현재 <strong className="text-emerald-400">[{isRealTradingActive ? "실거래 모드" : "모의투자 모드"}]</strong>로 가동 중이며, AI 타점 포착 시 자동 체결됩니다.
                </p>
              </div>
            ) : (
              filteredTrades.map((t, idx) => {
                const isBuy = t.side === "BUY";
                const unit = t.market === "US" ? "$" : "₩";
                const price = Number(t.price) || 0;
                const qty = Number(t.quantity || (t as any).qty) || 0;
                const totalAmount = Number((t as any).totalAmount) || (price * qty) || 0;
                const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : "";

                const isReal = t.isRealTrade === true || t.executionType === "REAL_BROKER";

                return (
                  <div
                    key={`${t.id || 'trade'}_${idx}`}
                    className="p-2.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-between gap-2.5 text-xs font-mono transition shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 shrink-0 ${
                        isBuy 
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" 
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      }`}>
                        {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isBuy ? "매수 체결" : "매도 체결"}
                      </span>

                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                        isReal
                          ? "bg-rose-950 text-rose-300 border border-rose-700"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                      }`}>
                        {isReal ? "🔥 실거래" : "🛡️ 모의투자"}
                      </span>

                      <div>
                        <div className="flex items-center gap-1.5 font-extrabold text-white">
                          <span>{t.name}</span>
                          <span className="text-slate-400 text-[11px]">({t.symbol})</span>
                          <span className="text-[9px] px-1 bg-slate-800 text-cyan-300 rounded font-normal">
                            {t.market}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[280px] sm:max-w-md">
                          {t.strategyName || "AI 자율 파이프라인"} • <span className="text-slate-300">{timeStr}</span>
                          {t.aiRationale && <span className="text-slate-500 ml-1">({t.aiRationale})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-white text-xs">
                        <span className={isBuy ? "text-rose-400" : "text-emerald-400"}>
                          {unit}{price.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1">× {qty}주</span>
                      </div>
                      <div className="text-[10px] text-cyan-300 font-bold">
                        합계: {unit}{Math.round(totalAmount).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: AI DECISION SCAN LOGS (AI 전종목 탐지 로그) */}
        {activeTab === "DECISIONS" && (
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredDecisions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs">
                <Brain className="w-6 h-6 mx-auto mb-1.5 opacity-40 animate-pulse text-cyan-400" />
                <p className="font-semibold text-slate-400">AI 스캔 파이프라인이 전종목 탐지 시그널을 연산 중입니다...</p>
              </div>
            ) : (
              filteredDecisions.map((d, idx) => {
                const unit = d.market === "US" ? "$" : "₩";
                const timeStr = new Date(d.timestamp).toLocaleTimeString();
                const isBuySignal = d.action === "BUY_SIGNAL" || d.action === "STRONG_BUY";

                return (
                  <div
                    key={`${d.id || 'decision'}_${idx}`}
                    className="p-2.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-mono space-y-1 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.2 rounded text-[10px] font-black ${
                          isBuySignal 
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}>
                          {d.action}
                        </span>
                        <span className="font-bold text-white">{d.name} ({d.symbol})</span>
                        <span className="text-[9px] text-slate-400">[{d.market}]</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{timeStr}</span>
                    </div>

                    <p className="text-[11px] text-slate-300 bg-slate-950 p-1.5 rounded border border-slate-800/80">
                      {d.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span>현재가: <strong className="text-white">{unit}{d.currentPrice?.toLocaleString()}</strong></span>
                        <span>목표가: <strong className="text-rose-400">{unit}{d.targetPrice?.toLocaleString()}</strong></span>
                      </div>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        신뢰도 {d.confidence}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: POSITIONS (현재 보유 포트폴리오) */}
        {activeTab === "POSITIONS" && (
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredPositions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs">
                <PieChart className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-emerald-400" />
                <p className="font-semibold text-slate-400">현재 자율매매 보유 포지션이 없습니다.</p>
              </div>
            ) : (
              filteredPositions.map((pos, idx) => {
                const unit = pos.market === "US" ? "$" : "₩";
                const curPrice = Number(pos.currentPrice || pos.avgPrice || 0) || 0;
                const avgPrice = Number(pos.avgPrice || 0) || 0;
                const qty = Number(pos.quantity || (pos as any).shares || 0) || 0;
                const evalVal = Math.round(qty * curPrice) || 0;
                const pnl = Math.round((curPrice - avgPrice) * qty) || 0;
                const pnlRate = avgPrice > 0 && !isNaN(pnl) ? ((curPrice - avgPrice) / avgPrice) * 100 : 0;
                const isPlus = pnl >= 0;

                return (
                  <div
                    key={pos.symbol || idx}
                    className="p-2.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-between gap-2 text-xs font-mono transition"
                  >
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white">
                          {pos.name} <span className="text-slate-400 text-[11px]">({pos.symbol})</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          평단: {unit}{avgPrice.toLocaleString()} • {qty}주 보유
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-white">
                        {unit}{evalVal.toLocaleString()}
                      </div>
                      <div className={`text-[11px] font-bold ${isPlus ? "text-rose-400" : "text-blue-400"}`}>
                        {isPlus ? "+" : ""}{pnl.toLocaleString()} ({isPlus ? "+" : ""}{(isNaN(pnlRate) ? 0 : pnlRate).toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

    </div>
  );
};

