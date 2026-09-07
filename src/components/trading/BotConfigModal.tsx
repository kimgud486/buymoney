import React, { useState } from "react";
import { Bot, X, Sliders, Play, Pause, AlertTriangle, ShieldCheck, Zap, Sparkles, CheckCircle2, ChevronUp, Cpu, RefreshCw } from "lucide-react";
import { BotPresetItem, saveCustomBot, upgradeBotPreset } from "../../data/botPresets";
import { aiDynamicBotThresholdEngine, BotCustomThreshold } from "../../lib/aiDynamicBotThresholdEngine";

interface BotConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: BotPresetItem | null;
  onUpdateBot: (updated: BotPresetItem) => void;
}

export const BotConfigModal: React.FC<BotConfigModalProps> = ({
  isOpen,
  onClose,
  bot,
  onUpdateBot
}) => {
  const [currentBot, setCurrentBot] = useState<BotPresetItem | null>(bot);
  const [status, setStatus] = useState<"ONLINE" | "SCANNING" | "DETECTED" | "IDLE" | "REINFORCED">(bot?.status || "ONLINE");
  const [operationalState, setOperationalState] = useState<"ACTIVE" | "PAUSED" | "BUYING" | "SELLING">("ACTIVE");
  const [riskLevel, setRiskLevel] = useState<"AGGRESSIVE" | "BALANCED" | "CONSERVATIVE">("BALANCED");
  const [targetProfit, setTargetProfit] = useState("8.5%");
  const [stopLoss, setStopLoss] = useState("-2.5%");
  const [maxAllocation, setMaxAllocation] = useState("20,000,000원");
  const [minConfidence, setMinConfidence] = useState(85);
  const [autoAiAdaptation, setAutoAiAdaptation] = useState(true);
  const [aiNotice, setAiNotice] = useState<string>("");

  React.useEffect(() => {
    if (bot) {
      setCurrentBot(bot);
      setStatus(bot.status);

      const threshold = aiDynamicBotThresholdEngine.getBotThreshold(bot.id, bot.category || "CORE", bot.name);
      setOperationalState(threshold.operationalState);
      setRiskLevel(threshold.riskLevel);
      setTargetProfit(`${threshold.targetProfitPercent}%`);
      setStopLoss(`${threshold.stopLossPercent}%`);
      setMaxAllocation(`${(threshold.maxAllocationKRW ?? 0).toLocaleString()}원`);
      setMinConfidence(threshold.minConfidence);
      setAutoAiAdaptation(threshold.autoAiAdaptation);
      setAiNotice(threshold.lastAiAdaptationNotice || "AI 적응형 임계값 파이프라인 연동 중");
    }
  }, [bot]);

  const handleUpgradeBot = () => {
    if (!currentBot) return;
    const upgraded = upgradeBotPreset(currentBot.id);
    if (upgraded) {
      setCurrentBot(upgraded);
      setStatus("REINFORCED");
      onUpdateBot(upgraded);
      alert(`⚡ [${upgraded.name}] LV.${upgraded.level || 2} 강화 완료!\n- 승률: ${upgraded.winRate}%\n- Profit Factor: ${upgraded.pf}\n- 응답 속도: ${upgraded.latencyMs}ms`);
    }
  };

  const handleRecalculateAiThreshold = () => {
    if (!currentBot) return;
    const currentThreshold = aiDynamicBotThresholdEngine.getBotThreshold(currentBot.id, currentBot.category || "CORE", currentBot.name);
    const adapted = aiDynamicBotThresholdEngine.calculateAiAdaptedThreshold(
      currentThreshold,
      currentBot.category || "CORE",
      "BULL",
      1.2
    );

    setTargetProfit(`${adapted.targetProfitPercent}%`);
    setStopLoss(`${adapted.stopLossPercent}%`);
    setMinConfidence(adapted.minConfidence);
    setRiskLevel(adapted.riskLevel);
    setAiNotice(adapted.lastAiAdaptationNotice || "AI 상황별 자동 계산 완료");

    aiDynamicBotThresholdEngine.updateBotThreshold(currentBot.id, adapted);
    alert(`🤖 [${currentBot.name}] AI 상황별 맞춤 임계값 재계산 완료!\n- 익절: +${adapted.targetProfitPercent}%\n- 손절: ${adapted.stopLossPercent}%\n- 최소신뢰도: ${adapted.minConfidence}점\n- 피드백: ${adapted.lastAiAdaptationNotice}`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBot) return;

    const numTp = parseFloat(targetProfit.replace(/[^0-9.-]/g, "")) || 8.5;
    const numSl = parseFloat(stopLoss.replace(/[^0-9.-]/g, "")) || -2.5;
    const numAlloc = parseInt(maxAllocation.replace(/[^0-9]/g, ""), 10) || 20000000;

    const updatedThreshold: Partial<BotCustomThreshold> = {
      botId: currentBot.id,
      botName: currentBot.name,
      autoAiAdaptation,
      operationalState,
      riskLevel,
      targetProfitPercent: numTp,
      stopLossPercent: numSl < 0 ? numSl : -numSl,
      minConfidence,
      maxAllocationKRW: numAlloc,
      lastAiAdaptationNotice: autoAiAdaptation ? aiNotice : "사용자 수동 임계값 고정 모드"
    };

    aiDynamicBotThresholdEngine.updateBotThreshold(currentBot.id, updatedThreshold);

    const updatedBot: BotPresetItem = {
      ...currentBot,
      status: operationalState === "PAUSED" ? "IDLE" : status,
      statusText: operationalState === "ACTIVE" ? (currentBot.reinforced ? `LV.${currentBot.level || 2} 강화 가동중` : "정상 가동") : operationalState === "BUYING" ? "매수 집행중" : operationalState === "SELLING" ? "매도 분할청산" : "일시 중단"
    };

    saveCustomBot(updatedBot);
    onUpdateBot(updatedBot);
    alert(`[${currentBot.name}] 봇 커스텀 임계값이 저장되어 실시간 파이프라인에 100% 반영되었습니다.`);
    onClose();
  };

  if (!isOpen || !bot || !currentBot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{bot.name} 설정 제어</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {bot.categoryLabel} 알고리즘 파라미터 및 위험 감수 수준을 실시간 조정합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto font-sans text-xs">
          {/* AI DYNAMIC THRESHOLD ADAPTATION TOGGLE & BANNER */}
          <div className="p-3.5 bg-gradient-to-r from-blue-600/10 via-indigo-500/5 to-slate-50 border border-blue-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600 animate-pulse" />
                <span className="font-black text-slate-900 text-xs">AI 상황별 커스텀 임계값 자동 조정</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAiAdaptation}
                  onChange={(e) => setAutoAiAdaptation(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              {autoAiAdaptation
                ? `🤖 [AI 자동변경 ON] 시장 국면(상승/박스/하락) 및 RVOL 수급 변동성에 맞춰 봇 임계값이 실시간 자동 최적화됩니다.`
                : `🔒 [수동 고정 모드] 아래 설정한 지정 임계값을 상시 고정하여 적용합니다.`}
            </p>

            {autoAiAdaptation && (
              <div className="flex items-center justify-between pt-1 border-t border-blue-100">
                <span className="text-[10px] text-blue-700 font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                  {aiNotice}
                </span>
                <button
                  type="button"
                  onClick={handleRecalculateAiThreshold}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>AI 즉시 재계산</span>
                </button>
              </div>
            )}
          </div>

          {/* AI BOT LEVEL & POWER UPGRADE BANNER */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs font-black text-xs flex items-center justify-center">
                LV.{currentBot.level || 1}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 text-xs">{currentBot.name}</span>
                  {currentBot.reinforced && (
                    <span className="px-1.5 py-0.2 text-[9px] font-black bg-amber-500 text-white rounded-md">
                      강화됨
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  승률 {currentBot.winRate}% | PF {currentBot.pf} | 응답 {currentBot.latencyMs}ms
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpgradeBot}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>LV.{(currentBot.level || 1) + 1} 레벨업</span>
            </button>
          </div>

          {/* Operational State Switcher (Active / Paused / Buying / Selling) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">운용 상태 모드 (Operational State)</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { key: "ACTIVE", label: "활성 (ACTIVE)", color: "bg-emerald-500 text-white" },
                { key: "BUYING", label: "매수중 (BUYING)", color: "bg-rose-500 text-white" },
                { key: "SELLING", label: "매도중 (SELLING)", color: "bg-blue-600 text-white" },
                { key: "PAUSED", label: "중단 (PAUSED)", color: "bg-slate-700 text-white" }
              ].map((s) => (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => setOperationalState(s.key as any)}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                    operationalState === s.key
                      ? `${s.color} border-transparent shadow-xs`
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Level Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">위험 감수 수준 (Risk Tolerance Level)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "AGGRESSIVE", label: "공격형 (고수익/소형주)", sub: "RVOL 3x+ 돌파" },
                { key: "BALANCED", label: "중립형 (균형/중형주)", sub: "20일선 눌림목" },
                { key: "CONSERVATIVE", label: "안정형 (대형 우량)", sub: "저PBR/가치 퀀트" }
              ].map((r) => (
                <button
                  type="button"
                  key={r.key}
                  onClick={() => setRiskLevel(r.key as any)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    riskLevel === r.key
                      ? "bg-blue-50 border-blue-400 ring-1 ring-blue-300"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold text-slate-900 text-[11px]">{r.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{r.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* TP and SL Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">목표 익절 기준 (Take Profit)</label>
              <input
                type="text"
                value={targetProfit}
                onChange={(e) => setTargetProfit(e.target.value)}
                className="w-full p-2.5 bg-emerald-50/50 border border-emerald-300 rounded-xl font-bold font-mono text-emerald-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">자동 손절 기준 (Stop Loss)</label>
              <input
                type="text"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full p-2.5 bg-rose-50/50 border border-rose-300 rounded-xl font-bold font-mono text-rose-700"
              />
            </div>
          </div>

          {/* Max Allocation & Min AI Score */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">최대 운용 한도 (Max Allocation)</label>
              <input
                type="text"
                value={maxAllocation}
                onChange={(e) => setMaxAllocation(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">AI 최소 신뢰 점수</label>
              <select
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value={90}>S+ 등급만 (90점 이상)</option>
                <option value={85}>S 등급 이상 (85점 이상)</option>
                <option value={80}>A 등급 이상 (80점 이상)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-xl shadow-md transition cursor-pointer"
          >
            설정값 즉시 엔진 반영 및 저장
          </button>
        </form>
      </div>
    </div>
  );
};
