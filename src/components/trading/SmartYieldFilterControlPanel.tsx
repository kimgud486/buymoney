import React, { useState, useEffect } from "react";
import {
  Sliders,
  Filter,
  Save,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Target,
  Percent,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Activity,
  Layers,
  Zap,
  Info
} from "lucide-react";
import {
  UserFilterSettingsStore,
  UserFilterSettings,
  DEFAULT_USER_FILTER_SETTINGS
} from "../../services/UserFilterSettingsStore";

interface SmartYieldFilterControlPanelProps {
  onSettingsChange?: (settings: UserFilterSettings) => void;
  compact?: boolean;
}

export const SmartYieldFilterControlPanel: React.FC<SmartYieldFilterControlPanelProps> = ({
  onSettingsChange,
  compact = false
}) => {
  const [settings, setSettings] = useState<UserFilterSettings>(() => UserFilterSettingsStore.getSettings());
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  useEffect(() => {
    const unsubscribe = UserFilterSettingsStore.subscribe(newSettings => {
      setSettings(newSettings);
      if (onSettingsChange) onSettingsChange(newSettings);
    });
    return () => unsubscribe();
  }, [onSettingsChange]);

  const updateSetting = <K extends keyof UserFilterSettings>(key: K, value: UserFilterSettings[K]) => {
    const updated = UserFilterSettingsStore.saveSettings({ [key]: value });
    setSettings(updated);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  const handleReset = () => {
    const defaults = UserFilterSettingsStore.resetToDefaults();
    setSettings(defaults);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl ${compact ? "p-3.5" : "p-5"} text-white shadow-xl space-y-4`}>
      {/* Header with Save State & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <span>수익률 및 하락봉 필터 제어 패널</span>
              {isSavedRecently && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  로컬스토리지 저장됨
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">설정한 목표치와 필터 조건이 브라우저에 영구 저장되어 새로고침 후에도 유지됩니다.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
          title="기본값으로 초기화"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>초기화</span>
        </button>
      </div>

      {/* Main Filter Sliders & Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Target Profit Rate Slider */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              최소 목표 수익률
            </span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              +{settings.minTargetProfitRate}%
            </span>
          </div>
          <input
            type="range"
            min="1.5"
            max="12.0"
            step="0.5"
            value={settings.minTargetProfitRate}
            onChange={e => updateSetting("minTargetProfitRate", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>+1.5% (초단타)</span>
            <span>+5.0% (스윙)</span>
            <span>+12.0% (대세)</span>
          </div>
        </div>

        {/* 2. Min Risk/Reward Ratio Slider */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              최소 손익비 (R/R Ratio)
            </span>
            <span className="text-sm font-black text-indigo-300 font-mono">
              {settings.minRiskRewardRatio} : 1
            </span>
          </div>
          <input
            type="range"
            min="1.5"
            max="3.5"
            step="0.1"
            value={settings.minRiskRewardRatio}
            onChange={e => updateSetting("minRiskRewardRatio", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>1.5x (표준)</span>
            <span>2.0x (권장)</span>
            <span>3.5x (극단적 엄격)</span>
          </div>
        </div>

        {/* 3. Max Allowed Stop Loss % */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              최대 허용 손절폭
            </span>
            <span className="text-sm font-black text-rose-400 font-mono">
              -{settings.maxAllowedStopLossPct}%
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="4.0"
            step="0.5"
            value={settings.maxAllowedStopLossPct}
            onChange={e => updateSetting("maxAllowedStopLossPct", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>-1.0% (초타이트)</span>
            <span>-2.5% (안전)</span>
            <span>-4.0% (여유)</span>
          </div>
        </div>
      </div>

      {/* Toggles & Gating Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Anti-Downtrend v5 Toggle */}
        <button
          type="button"
          onClick={() => updateSetting("enableAntiDowntrendV5", !settings.enableAntiDowntrendV5)}
          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
            settings.enableAntiDowntrendV5
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
              : "bg-slate-950/40 border-slate-800 text-slate-500"
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${settings.enableAntiDowntrendV5 ? "text-emerald-400" : "text-slate-600"}`} />
            <span>하락봉 탐지 v5</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${settings.enableAntiDowntrendV5 ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
            {settings.enableAntiDowntrendV5 ? "ON (차단)" : "OFF"}
          </span>
        </button>

        {/* 4-Step Fakeout Shield */}
        <button
          type="button"
          onClick={() => updateSetting("strictFakeoutFilter", !settings.strictFakeoutFilter)}
          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
            settings.strictFakeoutFilter
              ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
              : "bg-slate-950/40 border-slate-800 text-slate-500"
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${settings.strictFakeoutFilter ? "text-indigo-400" : "text-slate-600"}`} />
            <span>4단계 안티-페이크</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${settings.strictFakeoutFilter ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-500"}`}>
            {settings.strictFakeoutFilter ? "ON" : "OFF"}
          </span>
        </button>

        {/* Candle Confirmation */}
        <button
          type="button"
          onClick={() => updateSetting("enableCandleConfirmation", !settings.enableCandleConfirmation)}
          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
            settings.enableCandleConfirmation
              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
              : "bg-slate-950/40 border-slate-800 text-slate-500"
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${settings.enableCandleConfirmation ? "text-cyan-400" : "text-slate-600"}`} />
            <span>캔들 종가 확정</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${settings.enableCandleConfirmation ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-500"}`}>
            {settings.enableCandleConfirmation ? "ON (2틱 지지)" : "OFF"}
          </span>
        </button>

        {/* CVD Positive Delta */}
        <button
          type="button"
          onClick={() => updateSetting("requireOrderbookPositiveDelta", !settings.requireOrderbookPositiveDelta)}
          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
            settings.requireOrderbookPositiveDelta
              ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
              : "bg-slate-950/40 border-slate-800 text-slate-500"
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className={`w-4 h-4 ${settings.requireOrderbookPositiveDelta ? "text-purple-400" : "text-slate-600"}`} />
            <span>세력 CVD 순매수</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${settings.requireOrderbookPositiveDelta ? "bg-purple-500/20 text-purple-300" : "bg-slate-800 text-slate-500"}`}>
            {settings.requireOrderbookPositiveDelta ? "ON (+유입)" : "OFF"}
          </span>
        </button>
      </div>

      {/* Sorting & Scope Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Sort metric */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            정렬 기준:
          </span>
          <div className="flex flex-wrap gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            {[
              { key: "EXPECTED_GAIN", label: "📈 기대수익순" },
              { key: "RR_RATIO", label: "🎯 손익비순" },
              { key: "AI_SCORE", label: "🧠 점수순" },
              { key: "VOLUME", label: "⚡ 거래대금순" }
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => updateSetting("sortMetric", item.key as any)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  settings.sortMetric === item.key
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Market Scope Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">시장 범위:</span>
          <div className="flex gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            {[
              { key: "ALL", label: "전체" },
              { key: "KR_STOCK", label: "국내 주식" },
              { key: "US_STOCK", label: "미국 주식" }
            ].map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => updateSetting("marketScope", m.key as any)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  settings.marketScope === m.key
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
