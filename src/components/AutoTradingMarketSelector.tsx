import React, { useId } from "react";
import { useApp } from "../context/AppContext";
import { Bot, CheckCircle2, ShieldCheck, Zap, Globe, Layers, Coins, Save } from "lucide-react";

interface AutoTradingMarketSelectorProps {
  compact?: boolean;
  className?: string;
}

export const AutoTradingMarketSelector: React.FC<AutoTradingMarketSelectorProps> = ({
  compact = false,
  className = ""
}) => {
  const { profile, updateProfileSettings, addToast } = useApp();
  const radioGroupId = useId();

  const isAutoEnabled = profile?.autoTradingEnabled ?? false;
  const currentTarget = profile?.autoTradingTargetMarket || "KOREA";

  const handleToggleAutoTrading = async () => {
    const nextState = !isAutoEnabled;
    await updateProfileSettings({ autoTradingEnabled: nextState });
    addToast({
      type: nextState ? "SUCCESS" : "INFO",
      title: nextState ? "🤖 [자율 매매 시스템 기동]" : "🛑 [자율 매매 시스템 정지]",
      message: nextState
        ? `선택하신 [${currentTarget === "KOREA" ? "국내 주식" : currentTarget === "US" ? "해외 주식" : "업비트 가상자산"}] 자율 매매 엔진이 단일 기동되었습니다. (예수금 0원이어도 가동 유지)`
        : "모든 시장의 자율 매매 기동이 정지되었습니다."
    });
  };

  const handleSelectMarket = async (market: "ALL" | "KOREA" | "US" | "BTC") => {
    await updateProfileSettings({ 
      autoTradingTargetMarket: market,
      autoTradingEnabled: true 
    });
    
    const marketName = market === "ALL"
      ? "🌐 전체 시장 (국내/해외/업비트)"
      : market === "KOREA" 
      ? "🇰🇷 한국투자증권 국내주식" 
      : market === "US" 
      ? "🇺🇸 한국투자증권 해외주식" 
      : "🪙 업비트 가상자산/코인";

    const stoppedMarkets = market === "ALL"
      ? "전 시장 동시 자율 탐색 및 체결"
      : market === "KOREA" 
      ? "해외주식 & 업비트 코인은 제외" 
      : market === "US" 
      ? "국내주식 & 업비트 코인은 제외" 
      : "국내주식 & 해외주식은 제외";

    addToast({
      type: "SUCCESS",
      title: market === "ALL" ? "🎯 [전체 시장 자율 매매 가동 완료]" : "🎯 [단일 자율 매매 독점 기동 완료]",
      message: `${marketName} 자율매매가 기동되었습니다. (${stoppedMarkets})`
    });
  };

  const handleSaveCurrentSetting = async () => {
    await updateProfileSettings({
      autoTradingTargetMarket: currentTarget,
      autoTradingEnabled: true
    });
    const marketName = currentTarget === "ALL" ? "전체 시장" : currentTarget === "KOREA" ? "국내 주식" : currentTarget === "US" ? "해외 주식" : "업비트 가상자산";
    addToast({
      type: "SUCCESS",
      title: "💾 [자율 매매 설정 저장 완료]",
      message: `[${marketName}] 시장 자율 매매 가동 상태가 정상 저장되었습니다. 예수금이 0원이더라도 자율 매매 감시 상태가 가동 중으로 유지됩니다.`
    });
  };

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-white ${className}`}>
        {/* Main Auto Trade Toggle */}
        <button
          type="button"
          onClick={handleToggleAutoTrading}
          className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer border ${
            isAutoEnabled
              ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-sm animate-pulse"
              : "bg-slate-800 hover:bg-slate-700 text-zinc-400 border-slate-700"
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>자율 매매 {isAutoEnabled ? "가동중 (ON)" : "정지 (OFF)"}</span>
        </button>

        {/* Radio Options */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => handleSelectMarket("ALL")}
            className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 transition ${
              currentTarget === "ALL"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs"
                : "text-zinc-400 hover:text-white border border-transparent"
            }`}
          >
            <input
              type="radio"
              name={`compactAutoMarket_${radioGroupId}`}
              checked={currentTarget === "ALL"}
              readOnly
              className="accent-emerald-500 cursor-pointer pointer-events-none"
            />
            <span>🌐 전체</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMarket("KOREA")}
            className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 transition ${
              currentTarget === "KOREA"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs"
                : "text-zinc-400 hover:text-white border border-transparent"
            }`}
          >
            <input
              type="radio"
              name={`compactAutoMarket_${radioGroupId}`}
              checked={currentTarget === "KOREA"}
              readOnly
              className="accent-emerald-500 cursor-pointer pointer-events-none"
            />
            <span>🇰🇷 국내주식</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMarket("US")}
            className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 transition ${
              currentTarget === "US"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-xs"
                : "text-zinc-400 hover:text-white border border-transparent"
            }`}
          >
            <input
              type="radio"
              name={`compactAutoMarket_${radioGroupId}`}
              checked={currentTarget === "US"}
              readOnly
              className="accent-blue-500 cursor-pointer pointer-events-none"
            />
            <span>🇺🇸 해외주식</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMarket("BTC")}
            className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 transition ${
              currentTarget === "BTC"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs"
                : "text-zinc-400 hover:text-white border border-transparent"
            }`}
          >
            <input
              type="radio"
              name={`compactAutoMarket_${radioGroupId}`}
              checked={currentTarget === "BTC"}
              readOnly
              className="accent-amber-500 cursor-pointer pointer-events-none"
            />
            <span>🪙 업비트</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-5 text-white shadow-xl space-y-4 ${className}`}>
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 font-black">
            <Bot className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white font-sans flex items-center gap-2">
                <span>🤖 AI 자율 매매 시스템 시장 관제 기동</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                MARKET SELECT ENGINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              전체 시장 또는 특정 시장(국내주식, 해외주식, 업비트)을 선택하여 자율 매매 시스템을 기동합니다.
            </p>
          </div>
        </div>

        {/* Master ON/OFF Switch Button */}
        <button
          onClick={handleToggleAutoTrading}
          className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer border ${
            isAutoEnabled
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400 shadow-emerald-900/50"
              : "bg-slate-800 hover:bg-slate-700 text-zinc-300 border-slate-700"
          }`}
        >
          <Zap className={`h-4 w-4 ${isAutoEnabled ? "text-amber-300 fill-amber-300 animate-bounce" : "text-zinc-500"}`} />
          <span>자율 매매 전체 시스템: {isAutoEnabled ? "가동중 (ON)" : "전면 정지 (OFF)"}</span>
        </button>
      </div>

      {/* Radio Market Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Option 0: ALL Markets */}
        <div
          onClick={() => handleSelectMarket("ALL")}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden ${
            currentTarget === "ALL"
              ? "bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-950/60"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name={`autoTradingTargetMarketRadio_${radioGroupId}`}
                checked={currentTarget === "ALL"}
                readOnly
                className="h-4 w-4 accent-emerald-500 cursor-pointer pointer-events-none"
              />
              <span className="text-xs font-black text-white flex items-center gap-1">
                <Globe className="h-4 w-4 text-emerald-400" />
                <span>🌐 전체 시장 (통합)</span>
              </span>
            </div>
            {currentTarget === "ALL" && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500 text-slate-950">
                {isAutoEnabled ? "전체 기동중 🟢" : "선택됨 🟡"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 font-mono">
            국내주식 + 해외주식 + 업비트 가상자산 전체 유니버스 동시 자율 탐색 및 매매
          </p>
        </div>

        {/* Option 1: Korea Domestic */}
        <div
          onClick={() => handleSelectMarket("KOREA")}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden ${
            currentTarget === "KOREA"
              ? "bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-950/60"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name={`autoTradingTargetMarketRadio_${radioGroupId}`}
                checked={currentTarget === "KOREA"}
                readOnly
                className="h-4 w-4 accent-emerald-500 cursor-pointer pointer-events-none"
              />
              <span className="text-xs font-black text-white flex items-center gap-1">
                <Layers className="h-4 w-4 text-emerald-400" />
                <span>🇰🇷 국내 주식 (KIS)</span>
              </span>
            </div>
            {currentTarget === "KOREA" && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500 text-slate-950">
                {isAutoEnabled ? "단일 기동중 🟢" : "선택됨 🟡"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 font-mono">
            KOSPI / KOSDAQ 실시간 수급 체결 모니터링 및 한국투자증권 전용 자율 주문
          </p>
        </div>

        {/* Option 2: US Overseas */}
        <div
          onClick={() => handleSelectMarket("US")}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden ${
            currentTarget === "US"
              ? "bg-blue-950/40 border-blue-400 shadow-lg shadow-blue-950/60"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name={`autoTradingTargetMarketRadio_${radioGroupId}`}
                checked={currentTarget === "US"}
                readOnly
                className="h-4 w-4 accent-blue-500 cursor-pointer pointer-events-none"
              />
              <span className="text-xs font-black text-white flex items-center gap-1">
                <Globe className="h-4 w-4 text-blue-400" />
                <span>🇺🇸 해외 주식 (KIS)</span>
              </span>
            </div>
            {currentTarget === "US" && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500 text-slate-950">
                {isAutoEnabled ? "단일 기동중 🔵" : "선택됨 🟡"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 font-mono">
            NYSE / NASDAQ 실시간 모멘텀 추적 및 한국투자증권 해외 실계좌 자율 주문
          </p>
        </div>

        {/* Option 3: Upbit Crypto */}
        <div
          onClick={() => handleSelectMarket("BTC")}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden ${
            currentTarget === "BTC"
              ? "bg-amber-950/40 border-amber-400 shadow-lg shadow-amber-950/60"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name={`autoTradingTargetMarketRadio_${radioGroupId}`}
                checked={currentTarget === "BTC"}
                readOnly
                className="h-4 w-4 accent-amber-500 cursor-pointer pointer-events-none"
              />
              <span className="text-xs font-black text-white flex items-center gap-1">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>🪙 업비트 가상자산</span>
              </span>
            </div>
            {currentTarget === "BTC" && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                {isAutoEnabled ? "단일 기동중 🟠" : "선택됨 🟡"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 font-mono">
            Upbit KRW 마켓 24/7 실시간 체결 호가 수신 및 업비트 API 1:1 자율 주문
          </p>
        </div>

      </div>

      {/* Footer Info Banner & Explicit Save Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-[11px] text-zinc-400 font-mono bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            현재 지정 시장: <strong className="text-emerald-300 font-bold underline">
              {currentTarget === "ALL" ? "🌐 전체 시장" : currentTarget === "KOREA" ? "🇰🇷 국내 주식" : currentTarget === "US" ? "🇺🇸 국외 / 해외 주식" : "🪙 업비트 가상자산"}
            </strong> {currentTarget === "ALL" ? "(통합 가동)" : "(단일 독점 가동)"}
            <span className="ml-2 text-zinc-400 font-normal">| 예수금 0원이어도 자율매매 가동 상태 지속 유지</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveCurrentSetting}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition cursor-pointer border border-emerald-400/50 shrink-0 active:scale-98"
        >
          <Save className="h-4 w-4" />
          <span>자율매매 설정 저장 (시장 지정 및 가동 유지)</span>
        </button>
      </div>

    </div>
  );
};
