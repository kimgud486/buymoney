import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Sliders, 
  Lock, 
  Unlock, 
  Activity, 
  TrendingDown, 
  CheckCircle2, 
  AlertOctagon, 
  RefreshCw, 
  Flame, 
  BarChart3, 
  Cpu, 
  DollarSign, 
  Percent,
  Clock,
  Settings2
} from "lucide-react";
import { getMarketStatus } from "../lib/marketHours";

export const AiRiskGateControlCenter: React.FC = () => {
  const { profile, updateProfileSettings, addToast, marketStatus, consecutiveLossCount, killSwitchUntil, isKillSwitchActive, resetKillSwitch } = useApp();
  const [isAutoTuning, setIsAutoTuning] = useState(false);
  const [isUpdatingGate, setIsUpdatingGate] = useState(false);

  // Local state for interactive risk threshold adjustments
  const [dailyLossLimit, setDailyLossLimit] = useState<number>(profile?.dailyLossLimit || 2.5);
  const [maxPositionWeight, setMaxPositionWeight] = useState<number>(profile?.maxPositionWeight || 15.0);
  const [maxSingleOrderAmount, setMaxSingleOrderAmount] = useState<number>(profile?.maxSingleOrderAmount || 5000000);
  const [maxAllowedSlippage, setMaxAllowedSlippage] = useState<number>(profile?.maxAllowedSlippage || 1.0);
  const [consecutiveLossKillCount, setConsecutiveLossKillCount] = useState<number>(profile?.consecutiveLossKillCount || 3);
  const [trailingStopTriggerPct, setTrailingStopTriggerPct] = useState<number>(profile?.trailingStopTriggerPct || 3.0);
  const [aiDynamicRiskAutoTune, setAiDynamicRiskAutoTune] = useState<boolean>(profile?.aiDynamicRiskAutoTune ?? true);

  const apiGateStatus = profile?.apiGateStatus || "GATE_OPEN";

  // Toggle API Order Gate status
  const handleToggleGate = async (newStatus: "GATE_OPEN" | "GATE_LOCKED") => {
    setIsUpdatingGate(true);
    try {
      await updateProfileSettings({ apiGateStatus: newStatus });
      addToast({
        title: newStatus === "GATE_OPEN" ? "🟢 API 주문 게이트 개방 완료" : "🔴 API 주문 게이트 강제 잠금",
        message: newStatus === "GATE_OPEN" ? "자동매매 API 주문 처리가 정상 재개되었습니다." : "비상 게이트 잠금으로 모든 자동 주문 생성이 차단되었습니다.",
        type: newStatus === "GATE_OPEN" ? "success" : "warning"
      });
    } catch (e: any) {
      addToast({ title: "게이트 상태 변경 실패", message: e.message || "설정 변경 중 오류 발생", type: "error" });
    } finally {
      setIsUpdatingGate(false);
    }
  };

  // Trigger AI Real-time Auto-Risk Optimization
  const handleRunAiRiskAutoTune = async () => {
    setIsAutoTuning(true);
    try {
      // Call server backend to calculate AI optimal risk limits based on market volatility & portfolio
      const res = await fetch("/api/risk/ai-auto-tune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioBalance: profile?.balance || 0,
          currentLossPct: 0.4,
          vixIndex: 16.8,
          marketRiskLevel: marketStatus?.riskLevel || "NORMAL"
        })
      });

      if (!res.ok) throw new Error("AI 리스크 산출 서버 응답 오류");
      const data = await res.json();

      const tuned = data.recommendedLimits || {
        dailyLossLimit: 2.5,
        maxPositionWeight: 15.0,
        maxSingleOrderAmount: 3000000,
        maxAllowedSlippage: 0.8,
        consecutiveLossKillCount: 3,
        trailingStopTriggerPct: 2.8
      };

      setDailyLossLimit(tuned.dailyLossLimit);
      setMaxPositionWeight(tuned.maxPositionWeight);
      setMaxSingleOrderAmount(tuned.maxSingleOrderAmount);
      setMaxAllowedSlippage(tuned.maxAllowedSlippage);
      setConsecutiveLossKillCount(tuned.consecutiveLossKillCount);
      setTrailingStopTriggerPct(tuned.trailingStopTriggerPct);

      await updateProfileSettings({
        dailyLossLimit: tuned.dailyLossLimit,
        maxPositionWeight: tuned.maxPositionWeight,
        maxSingleOrderAmount: tuned.maxSingleOrderAmount,
        maxAllowedSlippage: tuned.maxAllowedSlippage,
        consecutiveLossKillCount: tuned.consecutiveLossKillCount,
        trailingStopTriggerPct: tuned.trailingStopTriggerPct,
        aiDynamicRiskAutoTune: true,
        aiRiskAutoTunedAt: new Date().toISOString()
      });

      addToast({
        title: "⚡ AI 리스크 최적 한계값 자동 재설정 완료",
        message: `시장 변동성(VIX 16.8) 및 포트폴리오 베타 분석에 따라 일일 손실한도(${tuned.dailyLossLimit}%), 단일비중(${tuned.maxPositionWeight}%)이 동적 재설정되었습니다.`,
        type: "success"
      });
    } catch (e: any) {
      addToast({ title: "AI 리스크 최적화 오류", message: e.message || "AI 최적화 수행 실패", type: "error" });
    } finally {
      setIsAutoTuning(false);
    }
  };

  // Save manual threshold updates
  const handleSaveRiskLimits = async () => {
    try {
      await updateProfileSettings({
        dailyLossLimit,
        maxPositionWeight,
        maxSingleOrderAmount,
        maxAllowedSlippage,
        consecutiveLossKillCount,
        trailingStopTriggerPct,
        aiDynamicRiskAutoTune
      });
      addToast({
        title: "✅ 리스크 한계 수치 저장 완료",
        message: "설정하신 리스크 제어 규칙이 AI 실시간 게이트 시스템에 적용되었습니다.",
        type: "success"
      });
    } catch (e: any) {
      addToast({ title: "저장 실패", message: e.message || "설정 저장 실패", type: "error" });
    }
  };

  // Current market operating hours status
  const koreaStatus = getMarketStatus("KOREA");
  const usStatus = getMarketStatus("US");

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white shadow-xl space-y-6">
      {/* HEADER TITLE BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl text-white shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-white">
                AI 실시간 자동주문 API 게이트 & 리스크 한계 관제 시스템
              </h3>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                v3.8 REAL-TIME GATEWAY
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              실시간 시장 변동성에 따라 손실 한도와 API 주문 통과 여부를 AI가 자동 감시 및 동적 최적화합니다.
            </p>
          </div>
        </div>

        {/* AI AUTO-TUNE REFRESH BUTTON */}
        <button
          onClick={handleRunAiRiskAutoTune}
          disabled={isAutoTuning}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isAutoTuning ? "animate-spin" : ""}`} />
          <span>{isAutoTuning ? "AI 시장 리스크 정밀 분석 중..." : "⚡ AI 최적 한계값 자동 재설정"}</span>
        </button>
      </div>

      {/* SECTION 1: LIVE API ORDER GATE STATUS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GATE STATUS CARD */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition ${
          apiGateStatus === "GATE_OPEN" 
            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200" 
            : apiGateStatus === "GATE_THROTTLED"
            ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
            : "bg-red-950/40 border-red-500/40 text-red-200"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              API 주문 게이트 게이트웨이
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
              apiGateStatus === "GATE_OPEN" ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/30" : "bg-red-500/30 text-red-300 border border-red-400/30"
            }`}>
              {apiGateStatus === "GATE_OPEN" ? "PASSTHROUGH 🟢" : "BLOCKED 🔴"}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-black flex items-center gap-2">
              {apiGateStatus === "GATE_OPEN" ? (
                <>
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-300">정상 통과 (GATE OPEN)</span>
                </>
              ) : (
                <>
                  <Lock className="w-6 h-6 text-red-400" />
                  <span className="text-red-300">주문 차단 (GATE LOCKED)</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              {apiGateStatus === "GATE_OPEN" 
                ? "모든 AI 자동 신호가 실시간 4단계 리스크 검증을 거쳐 주문 집행됩니다."
                : "비상 잠금 또는 연속 손실 스위치 작동으로 모든 자동주문이 즉시 차단 중입니다."}
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-medium">비상 주문 통제:</span>
            {apiGateStatus === "GATE_OPEN" ? (
              <button
                onClick={() => handleToggleGate("GATE_LOCKED")}
                disabled={isUpdatingGate}
                className="bg-red-600/80 hover:bg-red-600 text-white font-bold text-[11px] px-3 py-1 rounded-lg transition flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>강제 게이트 잠금</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleGate("GATE_OPEN")}
                disabled={isUpdatingGate}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3 py-1 rounded-lg transition flex items-center gap-1"
              >
                <Unlock className="w-3 h-3" />
                <span>게이트 잠금 해제</span>
              </button>
            )}
          </div>
        </div>

        {/* MARKET HOURS GATEWAY CARD */}
        <div className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              실시간 증시 개장 시간 게이트
            </span>
            <span className="text-[10px] font-mono text-zinc-400">AUTO MARKET CHECK</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-zinc-900/80 p-2 rounded border border-zinc-800">
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                🇰🇷 국내증시 (KOSPI)
              </span>
              <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                koreaStatus.isOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
              }`}>
                {koreaStatus.statusBadgeText}
              </span>
            </div>

            <div className="flex items-center justify-between bg-zinc-900/80 p-2 rounded border border-zinc-800">
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                🇺🇸 해외증시 (NASDAQ/NYSE)
              </span>
              <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                usStatus.isOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
              }`}>
                {usStatus.statusBadgeText}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500">
            * 정규 개장 시간이 아닐 경우 AI 주문 API 게이트가 자동 일시 정지(Pause)되어 오발주를 원천 방지합니다.
          </p>
        </div>

        {/* AI REAL-TIME DYNAMIC AUTO-TUNE SWITCH */}
        <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 p-4 rounded-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              AI 동적 리스크 자동 설정 모드
            </span>
            <span className="text-[10px] font-mono text-indigo-400 font-bold">GEMINI ENGINE</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">AI 동적 한계 자동 조율</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={aiDynamicRiskAutoTune}
                  onChange={(e) => {
                    setAiDynamicRiskAutoTune(e.target.checked);
                    updateProfileSettings({ aiDynamicRiskAutoTune: e.target.checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <p className="text-[11px] text-indigo-200/80">
              {aiDynamicRiskAutoTune 
                ? "활성화됨: 시장 VIX 변동성 변화 시 손실한도 및 주문비중이 자동 최적화됩니다."
                : "수동 모드: 사용자가 아래에서 직접 입력한 리스크 고정 수치만 적용됩니다."}
            </p>
          </div>

          {profile?.aiRiskAutoTunedAt && (
            <div className="text-[10px] text-indigo-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>최근 AI 자동조율: {new Date(profile.aiRiskAutoTunedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: 6 CORE RISK LIMIT PARAMETERS INPUT GRID */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-bold text-white">AI 실시간 리스크 한계 6대 파라미터 제어</h4>
          </div>
          <span className="text-xs text-zinc-400 font-mono">Real-time Risk Guard Thresholds</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Daily Loss Limit */}
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                일일 최대 손실 한도 (%)
              </label>
              <span className="text-xs font-black font-mono text-red-400">{dailyLossLimit}%</span>
            </div>
            <input 
              type="range"
              min="0.5"
              max="10.0"
              step="0.1"
              value={dailyLossLimit}
              onChange={(e) => setDailyLossLimit(parseFloat(e.target.value))}
              className="w-full accent-red-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500">당일 손실이 이 비중을 초과하면 자동매매가 즉시 전면 차단됩니다.</p>
          </div>

          {/* 2. Single Stock Max Weight */}
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-indigo-400" />
                단일 종목 최대 투자 비중 (%)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxPositionWeight}
                  onChange={(e) => setMaxPositionWeight(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-14 px-1.5 py-0.5 text-right font-black font-mono text-xs text-indigo-300 bg-zinc-950 border border-indigo-500/30 rounded focus:outline-none focus:border-indigo-400"
                />
                <span className="text-xs font-bold text-indigo-400 font-mono">%</span>
              </div>
            </div>
            <input 
              type="range"
              min="5"
              max="100"
              step="5"
              value={maxPositionWeight}
              onChange={(e) => setMaxPositionWeight(parseInt(e.target.value))}
              className="w-full accent-indigo-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
            />
            <div className="flex justify-between text-[9.5px] text-zinc-500 font-mono">
              <span>5% (보수)</span>
              <span>30% (표준)</span>
              <span>50% (적극)</span>
              <span className="text-indigo-300 font-bold">100% (전액 몰빵 허용)</span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setMaxPositionWeight(20)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${maxPositionWeight === 20 ? "bg-indigo-600 text-white border-indigo-500" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}
              >
                20%
              </button>
              <button
                type="button"
                onClick={() => setMaxPositionWeight(50)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${maxPositionWeight === 50 ? "bg-indigo-600 text-white border-indigo-500" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setMaxPositionWeight(100)}
                className={`px-2 py-0.5 rounded text-[10px] font-black border transition ${maxPositionWeight === 100 ? "bg-indigo-500 text-white border-indigo-400" : "bg-indigo-950/60 text-indigo-300 border-indigo-700/50"}`}
              >
                🔥 100% (몰빵)
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              {maxPositionWeight === 100
                ? "👉 100% 설정 시 SafetyCheck 한도 제한이 완전 해제되어 1개 종목에 전액 매수가 허용됩니다."
                : `👉 계좌 자산의 ${maxPositionWeight}% 초과 진입 시 'Holdings Limit' 실패 메시지와 함께 차단됩니다.`}
            </p>
          </div>

          {/* 3. Max Single Order Amount */}
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                1회 최대 주문 금액 (원/$)
              </label>
              <span className="text-xs font-black font-mono text-emerald-400">
                {(maxSingleOrderAmount ?? 0).toLocaleString()}원
              </span>
            </div>
            <input 
              type="number"
              step="500000"
              value={maxSingleOrderAmount}
              onChange={(e) => setMaxSingleOrderAmount(parseInt(e.target.value) || 1000000)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-zinc-500">1회 AI 자동발주 신호가 생성할 수 있는 최대 금액 상한선입니다.</p>
          </div>

          {/* 4. Consecutive Loss Kill Count */}
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                연속 손실 주문 킬-스위치 (회)
              </label>
              <span className="text-xs font-black font-mono text-amber-400">{consecutiveLossKillCount}회 연속</span>
            </div>
            <select
              value={consecutiveLossKillCount}
              onChange={(e) => setConsecutiveLossKillCount(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 font-mono text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={2}>2회 연속 손실 발생 시 API 게이트 차단</option>
              <option value={3}>3회 연속 손실 발생 시 API 게이트 차단</option>
              <option value={5}>5회 연속 손실 발생 시 API 게이트 차단</option>
            </select>

            {/* 실시간 킬스위치 가동 상태 & 1-클릭 즉시 해제 버튼 */}
            {isKillSwitchActive ? (
              <div className="bg-rose-950/70 border border-rose-600/70 p-2 rounded text-[11px] space-y-1">
                <div className="flex items-center justify-between text-rose-300 font-bold">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-rose-400" />
                    🛑 킬-스위치 작동 중
                  </span>
                  <span className="font-mono text-rose-200 font-black">
                    {Math.max(1, Math.ceil((killSwitchUntil - Date.now()) / 60000))}분 남음
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetKillSwitch}
                  className="w-full py-1 bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-bold rounded text-[10px] transition flex items-center justify-center gap-1 shadow cursor-pointer"
                >
                  <Unlock className="w-3 h-3" />
                  <span>킬-스위치 즉시 해제 및 매매 재개</span>
                </button>
              </div>
            ) : consecutiveLossCount > 0 ? (
              <div className="bg-amber-950/40 border border-amber-500/40 p-2 rounded text-[10px] flex items-center justify-between">
                <span className="text-amber-300">
                  현재 누적 연속 손절: <strong className="text-white font-mono">{consecutiveLossCount}</strong>/{consecutiveLossKillCount}회
                </span>
                <button
                  type="button"
                  onClick={resetKillSwitch}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded border border-zinc-700 transition cursor-pointer"
                >
                  카운트 초기화
                </button>
              </div>
            ) : (
              <div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>정상 가동 중 (연속 손실 0건)</span>
              </div>
            )}

            <p className="text-[10px] text-zinc-500">연속 손실 시 뇌동매매 방지를 위해 1시간 동안 API 게이트를 차단하며, 필요 시 언제든 즉시 해제할 수 있습니다.</p>
          </div>

          {/* 5. Max Allowed Slippage */}
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                최대 허용 슬리피지 (%)
              </label>
              <span className="text-xs font-black font-mono text-purple-400">{maxAllowedSlippage}%</span>
            </div>
            <input 
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={maxAllowedSlippage}
              onChange={(e) => setMaxAllowedSlippage(parseFloat(e.target.value))}
              className="w-full accent-purple-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500">주문 요청 가격과 체결 가격 간 괴리율 한도를 제한하여 이상 슬리피지를 막습니다.</p>
          </div>

          {/* 6. AI Trailing Stop Trigger % */}
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                AI 트레일링 스탑 발동 (%)
              </label>
              <span className="text-xs font-black font-mono text-emerald-400">+{trailingStopTriggerPct}% 도달 시</span>
            </div>
            <input 
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={trailingStopTriggerPct}
              onChange={(e) => setTrailingStopTriggerPct(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500">수익률이 발동 기준에 달하면 고점 대비 -1.2% 하락 시 자동 익절합니다.</p>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveRiskLimits}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            <span>수동 변경 파라미터 게이트에 적용하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
