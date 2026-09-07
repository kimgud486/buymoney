import React, { useState, useEffect } from "react";
import { 
  Bell, 
  ShieldAlert, 
  TrendingUp, 
  Volume2, 
  VolumeX, 
  Monitor, 
  Check, 
  X, 
  Play, 
  Sliders, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Lock,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { thresholdAlertEngine, ThresholdConfig, ThresholdAlertEvent, BotThresholdRule } from "../../lib/thresholdAlertEngine";
import { aiDynamicBotThresholdEngine } from "../../lib/aiDynamicBotThresholdEngine";

interface ThresholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThresholdSettingsModal: React.FC<ThresholdSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [config, setConfig] = useState<ThresholdConfig>(() => thresholdAlertEngine.getConfig());
  const [history, setHistory] = useState<ThresholdAlertEvent[]>(() => thresholdAlertEngine.getHistory());
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(() => {
    return "Notification" in window ? Notification.permission : "denied";
  });
  const [activeTab, setActiveTab] = useState<"GLOBAL" | "BOTS" | "HISTORY">("GLOBAL");
  const [isSavedToast, setIsSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(thresholdAlertEngine.getConfig());
      setHistory(thresholdAlertEngine.getHistory());
      if ("Notification" in window) {
        setDesktopPermission(Notification.permission);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const perm = await thresholdAlertEngine.requestDesktopPermission();
    setDesktopPermission(perm);
    if (perm === "granted") {
      thresholdAlertEngine.updateConfig({ desktopAlertEnabled: true });
      setConfig(prev => ({ ...prev, desktopAlertEnabled: true }));
    }
  };

  const handleSave = () => {
    thresholdAlertEngine.updateConfig(config);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleAiRecalculate = () => {
    const { adaptedCount, notices } = aiDynamicBotThresholdEngine.adaptAllBotsWithAI("BULL", 1.25);
    setConfig(thresholdAlertEngine.getConfig());
    alert(`🤖 AI가 ${adaptedCount}개 봇의 최신 시장 변동성 반영 커스텀 임계값을 성공적으로 자동 계산 및 연동했습니다!\n\n${notices.slice(0, 3).join("\n")}`);
  };

  const handleTestAlert = () => {
    const event = thresholdAlertEngine.triggerTestAlert();
    setHistory(prev => [event, ...prev]);
  };

  const handleClearHistory = () => {
    thresholdAlertEngine.clearHistory();
    setHistory([]);
  };

  const updateBotRule = (botId: string, updates: Partial<{ enabled: boolean; profitTargetPercent: number; drawdownLimitPercent: number }>) => {
    setConfig(prev => {
      const currentRule = prev.botRules[botId] || {
        botId,
        botName: `봇 #${botId}`,
        enabled: true,
        profitTargetPercent: prev.globalProfitTargetPercent,
        drawdownLimitPercent: prev.globalDrawdownLimitPercent
      };
      return {
        ...prev,
        botRules: {
          ...prev.botRules,
          [botId]: { ...currentRule, ...updates }
        }
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>사용자 정의 임계값 실시간 알림 엔진</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-300 font-mono">
                  LIVE DESKTOP ALERTS
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                AI 봇별 일일 낙폭(Drawdown) 및 목표 수익률(Profit Margin) 돌파 시 데스크톱 알림 & 음향 경보 발송
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("GLOBAL")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "GLOBAL"
                  ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>전역 임계값 설정</span>
            </button>

            <button
              onClick={() => setActiveTab("BOTS")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "BOTS"
                  ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>봇별 커스텀 임계값 ({Object.keys(config.botRules).length})</span>
            </button>

            <button
              onClick={() => setActiveTab("HISTORY")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "HISTORY"
                  ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>발생 알림 내역 ({history.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAiRecalculate}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>🤖 AI 임계값 전체 자동 재계산</span>
            </button>

            <button
              onClick={handleTestAlert}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition cursor-pointer shadow-2xs"
            >
              <Play className="w-3 h-3" />
              <span>테스트 알림 발송</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: GLOBAL THRESHOLDS */}
          {activeTab === "GLOBAL" && (
            <div className="space-y-4">
              {/* Notification Channel Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Desktop Notification Channel */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">브라우저 데스크톱 알림 (OS Push)</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">화면 백그라운드 상태에서도 실시간 팝업 알림 전송</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-600">
                      권한 상태:{" "}
                      <span className={`font-bold font-mono ${desktopPermission === 'granted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {desktopPermission === 'granted' ? '허용됨 (ACTIVE)' : '미허용 (권한 필요)'}
                      </span>
                    </span>

                    {desktopPermission !== 'granted' ? (
                      <button
                        onClick={handleRequestPermission}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-2xs"
                      >
                        알림 권한 허용하기
                      </button>
                    ) : (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.desktopAlertEnabled}
                          onChange={(e) => setConfig({ ...config, desktopAlertEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Sound Alert Channel */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                        {config.soundAlertEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">웹 오디오 신디사이저 음향 경보</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">수익 달성 상승 톤 및 위험 낙폭 하강 경보음 자동 재생</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                    <button
                      onClick={() => thresholdAlertEngine.playAlertSound('PROFIT')}
                      className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>사운드 미리듣기</span>
                    </button>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.soundAlertEnabled}
                        onChange={(e) => setConfig({ ...config, soundAlertEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Threshold Sliders */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-xs">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>기본 전역 임계값 수치 (Global Default Thresholds)</span>
                </h4>

                {/* Drawdown Limit Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <span>일일 최대 허용 낙폭 한도 (Daily Drawdown Limit)</span>
                    </span>
                    <span className="font-mono font-black text-rose-600 text-sm">
                      {config.globalDrawdownLimitPercent.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10.0"
                    max="-0.5"
                    step="0.5"
                    value={config.globalDrawdownLimitPercent}
                    onChange={(e) => setConfig({ ...config, globalDrawdownLimitPercent: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>-10.0% (초보수적)</span>
                    <span>-3.0% (표준 권장)</span>
                    <span>-0.5% (초단타 즉시 경보)</span>
                  </div>
                </div>

                {/* Profit Target Slider */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>일일 목표 수익률 임계치 (Daily Profit Target)</span>
                    </span>
                    <span className="font-mono font-black text-emerald-600 text-sm">
                      +{config.globalProfitTargetPercent.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="20.0"
                    step="0.5"
                    value={config.globalProfitTargetPercent}
                    onChange={(e) => setConfig({ ...config, globalProfitTargetPercent: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>+1.0% (빠른 익절 알림)</span>
                    <span>+5.0% (일반 데이트레이딩)</span>
                    <span>+20.0% (상한가 랠리)</span>
                  </div>
                </div>

                {/* Cooldown Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      동일 봇 중복 알림 쿨다운 (분)
                    </label>
                    <select
                      value={config.cooldownMinutes}
                      onChange={(e) => setConfig({ ...config, cooldownMinutes: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                    >
                      <option value={3}>3분 (매우 민감)</option>
                      <option value={5}>5분 (권장)</option>
                      <option value={10}>10분 (표준)</option>
                      <option value={30}>30분 (장기)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      낙폭 한도 초과 시 비상 매매 일시 정지 (KillSwitch)
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.emergencyStopOnDrawdown}
                        onChange={(e) => setConfig({ ...config, emergencyStopOnDrawdown: e.target.checked })}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-[11px] font-bold text-slate-700">낙폭 도달 시 신규 매수 차단</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PER-BOT CUSTOM THRESHOLDS */}
          {activeTab === "BOTS" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-800">
                각 AI 봇별 운용 전략(단타, 스윙, 헤지, 가상자산)에 맞게 개별 손실 한도와 목표 수익률을 차등 지정할 수 있습니다.
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
                {(Object.values(config.botRules) as BotThresholdRule[]).map((bot) => (
                  <div key={bot.botId} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={bot.enabled}
                        onChange={(e) => updateBotRule(bot.botId, { enabled: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span>{bot.botName}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                            {bot.botId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          개별 감시 {bot.enabled ? "가동 중" : "비활성화"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-[10px] text-slate-500 font-bold">손실한도:</span>
                        <input
                          type="number"
                          step="0.5"
                          max="-0.5"
                          min="-15.0"
                          value={bot.drawdownLimitPercent}
                          onChange={(e) => updateBotRule(bot.botId, { drawdownLimitPercent: parseFloat(e.target.value) || -3.0 })}
                          className="w-16 bg-rose-50 border border-rose-200 rounded p-1 text-xs font-mono font-bold text-rose-700 text-center"
                        />
                        <span className="text-rose-700 font-bold">%</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-[10px] text-slate-500 font-bold">목표수익:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1.0"
                          max="30.0"
                          value={bot.profitTargetPercent}
                          onChange={(e) => updateBotRule(bot.botId, { profitTargetPercent: parseFloat(e.target.value) || 5.0 })}
                          className="w-16 bg-emerald-50 border border-emerald-200 rounded p-1 text-xs font-mono font-bold text-emerald-700 text-center"
                        />
                        <span className="text-emerald-700 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ALERT HISTORY LOGS */}
          {activeTab === "HISTORY" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  최근 트리거된 임계값 돌파 이벤트 기록 (총 {history.length}건)
                </span>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>내역 전체 삭제</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                  발생한 임계값 경보 내역이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => {
                    const isProfit = item.type === "PROFIT_TARGET_HIT";
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                          isProfit
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                            : "bg-rose-50/70 border-rose-200 text-rose-900"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`p-1.5 rounded-lg mt-0.5 ${isProfit ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"}`}>
                            {isProfit ? <TrendingUp className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              <span>{item.botName}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/80 border border-slate-200">
                                {item.timestamp}
                              </span>
                            </div>
                            <p className="text-[11px] mt-0.5 leading-snug">{item.message}</p>
                          </div>
                        </div>

                        <div className="text-right font-mono shrink-0">
                          <div className={`font-black text-sm ${isProfit ? "text-emerald-700" : "text-rose-700"}`}>
                            {item.currentValuePercent > 0 ? `+${item.currentValuePercent.toFixed(2)}%` : `${item.currentValuePercent.toFixed(2)}%`}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            임계치 {item.thresholdPercent > 0 ? `+${item.thresholdPercent}%` : `${item.thresholdPercent}%`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSavedToast && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>임계값 설정이 성공적으로 저장되었습니다!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>설정 저장 및 적용</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
