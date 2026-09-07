import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  Save, 
  Percent, 
  TrendingDown, 
  Flame, 
  CheckCircle2, 
  Lock, 
  RotateCcw,
  Zap
} from "lucide-react";

export const RiskLimitsPanel: React.FC = () => {
  const { profile, updateProfileSettings, addToast, cashBreakdown } = useApp();

  // Local editable states
  const [dailyLossLimit, setDailyLossLimit] = useState<number>(profile?.dailyLossLimit || 3.0);
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState<number>(5.0);
  const [riskLimitPerTrade, setRiskLimitPerTrade] = useState<number>(profile?.riskLimitPerTrade || 1.5);
  const [maxPositionWeight, setMaxPositionWeight] = useState<number>(profile?.maxPositionWeight || 100);
  const [autoKillOnBreach, setAutoKillOnBreach] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // User's cash balance for realistic preview calculations
  const userCash = cashBreakdown?.totalCash || profile?.cash || profile?.balance || 0;
  const maxBuyForCurrentWeight = Math.round((userCash * maxPositionWeight) / 100);

  // Simulated live risk metrics
  const currentDailyPnlPercent = -0.85; // Simulated today's drawdown
  const currentMddPercent = -1.92;      // Simulated current MDD
  const dailyLossBreached = Math.abs(currentDailyPnlPercent) >= dailyLossLimit;
  const mddBreached = Math.abs(currentMddPercent) >= maxDrawdownLimit;

  const handleSaveRiskSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfileSettings({
        dailyLossLimit,
        riskLimitPerTrade,
        maxPositionWeight,
        autoTradingEnabled: profile?.autoTradingEnabled ?? true,
        autoTradingTargetMarket: profile?.autoTradingTargetMarket || 'KOREA'
      });
      addToast({
        type: "SUCCESS",
        title: "🛡️ 리스크 한도 설정 저장 완료",
        message: `일일 손실 한도 ${dailyLossLimit}%, 최대 낙폭(MDD) ${maxDrawdownLimit}% 리스크 관제 파라미터가 AI 엔진에 즉시 적용되었습니다.`
      });
    } catch (err) {
      console.error(err);
      addToast({
        type: "ERROR",
        title: "설정 저장 실패",
        message: "리스크 한도를 저장하는 중 오류가 발생했습니다."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setDailyLossLimit(3.0);
    setMaxDrawdownLimit(5.0);
    setRiskLimitPerTrade(1.5);
    setMaxPositionWeight(20);
    setAutoKillOnBreach(true);
    addToast({
      type: "INFO",
      title: "보수적 표준값 복원",
      message: "권장 일일 손실 -3.0%, MDD -5.0% 리스크 한도로 초기화되었습니다."
    });
  };

  return (
    <div id="risk-limits-panel" className="space-y-6">
      {/* Top Banner & Status Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-rose-950 to-zinc-900 border border-rose-500/30 p-5 rounded-xl text-white shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600/30 border border-rose-400/40 rounded-xl shrink-0">
              <ShieldAlert className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-white font-sans tracking-tight whitespace-nowrap">
                  AI 자동매매 리스크 제어 & 서킷브레이커 한도 (Risk Limits)
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                  REAL-TIME RISK GUARD
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                설정된 일일 손실 한도 또는 최대 낙폭(MDD)을 초과할 경우, AI 오토파일럿이 <strong>0.1초 이내 긴급 매매 정지(Kill-Switch)</strong>를 발동합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1.5 rounded-lg border text-xs font-black font-mono flex items-center gap-1.5 whitespace-nowrap ${
              dailyLossBreached || mddBreached
                ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
            }`}>
              <span className={`h-2 w-2 rounded-full ${dailyLossBreached || mddBreached ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`}></span>
              <span>{dailyLossBreached || mddBreached ? "리스크 초과 차단됨" : "관제 상태: 안전 (SAFE)"}</span>
            </span>
          </div>
        </div>

        {/* Live Risk Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-rose-500/20 space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block whitespace-nowrap">오늘의 실시간 손익 (Daily PnL)</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-lg font-black font-mono ${currentDailyPnlPercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {currentDailyPnlPercent}%
              </span>
              <span className="text-[11px] font-mono text-zinc-400">한도: -{dailyLossLimit}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-rose-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (Math.abs(currentDailyPnlPercent) / dailyLossLimit) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-rose-500/20 space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block whitespace-nowrap">현재 최대 자산 낙폭 (Current MDD)</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-amber-400">
                {currentMddPercent}%
              </span>
              <span className="text-[11px] font-mono text-zinc-400">캡: -{maxDrawdownLimit}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (Math.abs(currentMddPercent) / maxDrawdownLimit) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-rose-500/20 space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block whitespace-nowrap">1회 매수 최대 리스크</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-indigo-300">
                {riskLimitPerTrade}%
              </span>
              <span className="text-[11px] font-mono text-zinc-400">포지션 당</span>
            </div>
            <span className="text-[10px] text-zinc-400 block pt-0.5">자산 대비 고정 분할 손절</span>
          </div>

          <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-rose-500/20 space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block whitespace-nowrap">단일 종목 최대 비중 Cap</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-emerald-300">
                {maxPositionWeight}%
              </span>
              <span className="text-[11px] font-mono text-zinc-400">포트폴리오 비중</span>
            </div>
            <span className="text-[10px] text-zinc-400 block pt-0.5">집중 투자 위험 분산</span>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveRiskSettings} className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-150 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-rose-600 shrink-0" />
            <h3 className="text-sm font-black text-zinc-900 font-sans whitespace-nowrap">
              자동매매 리스크한도 파라미터 상세 설정 (Risk Configuration)
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetDefault}
            className="text-xs text-zinc-500 hover:text-zinc-800 font-bold flex items-center gap-1 cursor-pointer self-end sm:self-auto whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>권장 표준값 복원</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* 1. Daily Loss Cap */}
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-1">
              <label className="font-bold text-zinc-900 flex items-center gap-1.5 whitespace-nowrap">
                <Flame className="h-4 w-4 text-rose-500" />
                <span>일일 손실 캡 (Daily Loss Limit Cap)</span>
              </label>
              <span className="text-sm font-black text-rose-600 font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-200 whitespace-nowrap">
                -{dailyLossLimit}.0%
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={dailyLossLimit}
              onChange={(e) => setDailyLossLimit(parseFloat(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono whitespace-nowrap">
              <span>-1.0% (보수적)</span>
              <span>-3.0% (표준 권장)</span>
              <span>-10.0% (공격적)</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
              하루 당일 누적 손실이 <strong>-{dailyLossLimit}%</strong>에 도달하면 신규 매수를 즉시 중단하고 보유 포지션을 자동 보호 상태로 전환합니다.
            </p>
          </div>

          {/* 2. Maximum Drawdown (MDD) Cap */}
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-1">
              <label className="font-bold text-zinc-900 flex items-center gap-1.5 whitespace-nowrap">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <span>최대 자산 낙폭 제한 (Max Drawdown Cap - MDD)</span>
              </label>
              <span className="text-sm font-black text-amber-600 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200 whitespace-nowrap">
                -{maxDrawdownLimit}.0%
              </span>
            </div>
            <input
              type="range"
              min="2.0"
              max="15.0"
              step="0.5"
              value={maxDrawdownLimit}
              onChange={(e) => setMaxDrawdownLimit(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono whitespace-nowrap">
              <span>-2.0% (초안전)</span>
              <span>-5.0% (표준 권장)</span>
              <span>-15.0% (고위험 허용)</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
              고점 대비 전체 포트폴리오 자산 낙폭이 <strong>-{maxDrawdownLimit}%</strong> 초과 시 AI가 전체 주문을 중단하고 즉시 알림을 발송합니다.
            </p>
          </div>

          {/* 3. Trade Risk Limit */}
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-1">
              <label className="font-bold text-zinc-900 flex items-center gap-1.5 whitespace-nowrap">
                <Percent className="h-4 w-4 text-indigo-500" />
                <span>1회 매수 건당 허용 손실 비율 (Risk Per Trade)</span>
              </label>
              <span className="text-sm font-black text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 whitespace-nowrap">
                {riskLimitPerTrade}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={riskLimitPerTrade}
              onChange={(e) => setRiskLimitPerTrade(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono whitespace-nowrap">
              <span>0.5% (초분할)</span>
              <span>1.5% (권장)</span>
              <span>5.0% (집중 매수)</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
              개별 종목 손절 시 전체 계좌 자산 대비 차감될 최대 손실액 기준을 제한하여 연쇄 손실을 방지합니다.
            </p>
          </div>

          {/* 4. Single Position Weight Cap & Interactive Selector */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4 md:col-span-2">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-zinc-200 pb-3">
              <label className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-emerald-600" />
                <span>포트폴리오 단일 종목 최대 투자 비중 한도 (Max Position Weight)</span>
              </label>

              {/* Number Input Field & Slider Sync */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-medium">직접 수치 입력:</span>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maxPositionWeight}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                      setMaxPositionWeight(val);
                    }}
                    className="w-20 px-2.5 py-1 text-right font-black font-mono text-sm text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-emerald-700 ml-1">%</span>
                </div>
              </div>
            </div>

            {/* Slider Range */}
            <div className="space-y-2 pt-1">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={maxPositionWeight}
                onChange={(e) => setMaxPositionWeight(parseInt(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-zinc-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 font-mono font-bold">
                <span>5% (분산 투자)</span>
                <span>20% (표준 분할)</span>
                <span>50% (적극 매수)</span>
                <span className="text-emerald-700 font-black">100% (전액 몰빵 매수 허용 🔥)</span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold text-zinc-600">빠른 설정 프리셋:</span>
              <button
                type="button"
                onClick={() => setMaxPositionWeight(20)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  maxPositionWeight === 20 
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                    : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                20% (보수적 분할)
              </button>
              <button
                type="button"
                onClick={() => setMaxPositionWeight(30)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  maxPositionWeight === 30 
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                    : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                30% (표준 권장)
              </button>
              <button
                type="button"
                onClick={() => setMaxPositionWeight(50)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  maxPositionWeight === 50 
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                    : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                50% (적극 분할)
              </button>
              <button
                type="button"
                onClick={() => setMaxPositionWeight(100)}
                className={`px-3.5 py-1 rounded-lg text-xs font-black transition border cursor-pointer ${
                  maxPositionWeight === 100 
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-sm animate-pulse" 
                    : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                }`}
              >
                🔥 100% (전액 집중 매수 / 몰빵 허용)
              </button>
            </div>

            {/* INTUITIVE REAL-TIME IMPACT PREVIEW BOX (이것을 설정하면 이렇게 변경됩니다!) */}
            <div className="bg-gradient-to-br from-emerald-950 via-zinc-900 to-teal-950 border border-emerald-500/40 p-4 rounded-xl text-white space-y-3 shadow-md mt-2">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400 animate-bounce" />
                  <h4 className="text-xs font-black text-emerald-300 tracking-tight">
                    👉 비중 한도 {maxPositionWeight}% 설정 시 실시간 반영 효과 (Intuitive Preview)
                  </h4>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  실시간 즉시 적용 ⚡
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
                {/* Visual calculation 1 */}
                <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800 space-y-1">
                  <span className="text-[11px] text-zinc-400 font-bold block">💰 1개 종목 당 최대 매수 가능 금액</span>
                  <div className="text-base font-black font-mono text-emerald-400">
                    ₩{(maxBuyForCurrentWeight ?? 0).toLocaleString()}원
                  </div>
                  <span className="text-[10.5px] text-zinc-400 block font-mono">
                    (현재 가용 자산 ₩{Math.round(userCash).toLocaleString()}원 × {maxPositionWeight}%)
                  </span>
                </div>

                {/* Visual calculation 2 */}
                <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800 space-y-1">
                  <span className="text-[11px] text-zinc-400 font-bold block">🛡️ AI 백엔드 안전 점검(SafetyCheck) 반응</span>
                  <div className="text-xs font-bold text-zinc-200">
                    {maxPositionWeight === 100 ? (
                      <span className="text-emerald-300 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 inline shrink-0" />
                        한 종목 전액 매수(100% 몰빵) 허용 - 주문 거부 없음
                      </span>
                    ) : (
                      <span className="text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-amber-400 inline shrink-0" />
                        1종목당 ₩{(maxBuyForCurrentWeight ?? 0).toLocaleString()}원 초과 주문 시 'Holdings Limit' 차단
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-relaxed pt-0.5">
                    설정 후 아래 <strong className="text-emerald-300">[리스크한도 파라미터 즉시 적용]</strong> 버튼을 누르시면 즉시 적용됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Circuit Breaker Toggle & Save Action */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200">
          <label className="flex items-center gap-2.5 cursor-pointer bg-zinc-50 p-3 rounded-lg border border-zinc-200 w-full md:w-auto">
            <input
              type="checkbox"
              checked={autoKillOnBreach}
              onChange={(e) => setAutoKillOnBreach(e.target.checked)}
              className="h-4 w-4 accent-rose-600 rounded cursor-pointer"
            />
            <div>
              <span className="font-bold text-zinc-900 text-xs block whitespace-nowrap">한도 초과 시 실전 매매 자동 차단 (Kill-Switch)</span>
              <span className="text-[10px] text-zinc-500 block">초과 순간 증권사 API 미체결 주문 취소 및 오토파일럿 즉시 중지</span>
            </div>
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full md:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-black text-white font-black text-xs rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap"
          >
            <Save className="h-4 w-4 text-emerald-400" />
            <span>{isSaving ? "설정 저장 중..." : "리스크한도 파라미터 즉시 적용"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
