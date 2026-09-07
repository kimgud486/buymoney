import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  Zap, 
  Sliders, 
  RefreshCw, 
  HelpCircle, 
  TrendingDown, 
  TrendingUp, 
  ExternalLink,
  PlusCircle,
  X,
  Sparkles,
  Layers,
  ArrowRight
} from "lucide-react";
import { BlockedSymbolDetail, KillSwitchMode } from "../../types";

interface SmartSafetyGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartSafetyGovernanceModal: React.FC<SmartSafetyGovernanceModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    blockedSymbolDetails,
    blockCooldownMinutes,
    setBlockCooldownMinutes,
    removeBlockedSymbol,
    clearBlockedSymbols,
    addBlockedSymbol,
    killSwitchUntil,
    isKillSwitchActive,
    killSwitchMode,
    consecutiveLossCount,
    triggerKillSwitch,
    resetKillSwitch,
    gracefulKillSwitchRecovery,
    addToast,
    setSelectedSymbol
  } = useApp();

  const [activeTab, setActiveTab] = useState<"BLOCKED" | "KILL_SWITCH" | "GUIDE">("BLOCKED");
  const [manualSymbolInput, setManualSymbolInput] = useState("");
  const [manualNameInput, setManualNameInput] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const handleManualBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSymbolInput.trim()) return;
    const cleanSym = manualSymbolInput.trim().toUpperCase().replace(/^KRW-/, "");
    const cleanName = manualNameInput.trim() || cleanSym;

    addBlockedSymbol(cleanSym, "사용자 수동 리스크 차단 등록", {
      name: cleanName,
      triggerSource: "사용자 수동 차단",
      lossPct: 0
    });

    addToast({
      type: "SUCCESS",
      title: "🛡️ 종목 안전 차단 등록 완료",
      message: `[${cleanName}] 종목이 ${blockCooldownMinutes}분 동안 AI 스캔/매수 차단 목록에 등록되었습니다.`
    });

    setManualSymbolInput("");
    setManualNameInput("");
  };

  const handleStartGracefulRecovery = async () => {
    setIsRecovering(true);
    try {
      await gracefulKillSwitchRecovery();
    } catch (e: any) {
      addToast({
        type: "ERROR",
        title: "복구 실패",
        message: e?.message || "킬-스위치 복구 중 오류가 발생했습니다."
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const remainingKillSwitchSecs = isKillSwitchActive 
    ? Math.max(0, Math.ceil((killSwitchUntil - currentTime) / 1000))
    : 0;

  const formatRemainingTime = (unblockAt: number) => {
    const diffMs = unblockAt - currentTime;
    if (diffMs <= 0) return "즉시 해제 대기 중";
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}분 ${secs < 10 ? '0' : ''}${secs}초 남음`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 text-zinc-100 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/90 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-indigo-950/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isKillSwitchActive
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                : blockedSymbolDetails.length > 0
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
            }`}>
              {isKillSwitchActive ? (
                <Lock className="w-5 h-5" />
              ) : blockedSymbolDetails.length > 0 ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  AI 세이프티 &amp; 리스크 거버넌스 관제 센터
                </h2>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded border border-indigo-500/40">
                  GOVERNANCE HUB
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                -3% 손절 차단 이력 자동 만료 쿨다운 및 킬-스위치 단계별 안전 해제 프로토콜
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Safety Status HUD Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-zinc-900/60 border-b border-zinc-800/80 text-xs">
          {/* Status 1: Blocked Symbols */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              손절 차단 종목:
            </span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded ${
              blockedSymbolDetails.length > 0
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-zinc-800 text-zinc-400"
            }`}>
              {blockedSymbolDetails.length}개 차단 중
            </span>
          </div>

          {/* Status 2: Kill-Switch Status */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
              {isKillSwitchActive ? <Lock className="w-4 h-4 text-rose-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
              킬-스위치 상태:
            </span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
              isKillSwitchActive
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            }`}>
              {isKillSwitchActive ? `${killSwitchMode === 'HARD_HALT' ? '🚨 하드 정지' : '🟡 소프트 가드'} (${Math.ceil(remainingKillSwitchSecs / 60)}분)` : "🟢 정상 감시 중"}
            </span>
          </div>

          {/* Status 3: Consecutive Loss Count */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
              <RotateCcw className="w-4 h-4 text-indigo-400" />
              연속 손절 카운트:
            </span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded ${
              consecutiveLossCount > 0
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-zinc-800 text-zinc-400"
            }`}>
              {consecutiveLossCount} / 3회
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-800 px-4 pt-2 gap-2 bg-zinc-950 text-xs font-bold">
          <button
            onClick={() => setActiveTab("BLOCKED")}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "BLOCKED"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>-3% 손절 차단 목록 ({blockedSymbolDetails.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("KILL_SWITCH")}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "KILL_SWITCH"
                ? "border-rose-400 text-rose-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>킬-스위치 정밀 제어</span>
          </button>

          <button
            onClick={() => setActiveTab("GUIDE")}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "GUIDE"
                ? "border-indigo-400 text-indigo-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>원인 분석 &amp; 솔루션 가이드</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: BLOCKED SYMBOLS */}
          {activeTab === "BLOCKED" && (
            <div className="space-y-4">
              
              {/* Cooldown Settings & Batch Unblock Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-zinc-200">손절 후 자동 쿨다운 시간 설정:</span>
                  <select
                    value={blockCooldownMinutes}
                    onChange={(e) => {
                      const mins = Number(e.target.value);
                      setBlockCooldownMinutes(mins);
                      addToast({
                        type: "SUCCESS",
                        title: "쿨다운 시간 변경",
                        message: `손절 차단 쿨다운이 ${mins}분으로 설정되었습니다.`
                      });
                    }}
                    className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value={15}>15분 (초단타 빠른 복귀)</option>
                    <option value={30}>30분 (표준 안전 권장)</option>
                    <option value={60}>1시간 (변동성 안정화)</option>
                    <option value={120}>2시간 (보수적 방어)</option>
                    <option value={1440}>24시간 (당일 완전 차단)</option>
                  </select>
                </div>

                {blockedSymbolDetails.length > 0 && (
                  <button
                    onClick={() => {
                      clearBlockedSymbols();
                      addToast({
                        type: "SUCCESS",
                        title: "🟢 전체 차단 일괄 해제 완료",
                        message: "모든 종목의 손절 차단 이력이 즉시 초기화되어 AI 자율 스캔 대상에 복귀되었습니다."
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>전체 차단 종목 일괄 해제</span>
                  </button>
                )}
              </div>

              {/* Blocked Symbols List */}
              {blockedSymbolDetails.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/60 space-y-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-zinc-200">현재 손절 차단된 종목이 없습니다.</p>
                  <p className="text-xs text-zinc-400">모든 관심/유니버스 종목이 정상적으로 AI 매매 스캔 및 주문 집행 대상에 포함되어 있습니다.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-zinc-400 flex items-center justify-between">
                    <span>차단 중인 종목 목록 ({blockedSymbolDetails.length}건)</span>
                    <span className="text-[11px] text-zinc-500">시간 만료 시 자동 해제 또는 수동 주문 시 즉시 해제</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {blockedSymbolDetails.map((item) => {
                      const isExpired = item.unblockAt <= currentTime;
                      const marketBadge = item.market === 'BTC' ? '🪙 업비트' : item.market === 'US' ? '🇺🇸 미국' : '🇰🇷 국내';

                      return (
                        <div
                          key={item.symbol}
                          className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-sm text-white">{item.name}</span>
                                  <span className="text-xs text-zinc-400 font-mono">({item.symbol})</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                                    {marketBadge}
                                  </span>
                                  {item.lossPct !== undefined && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                                      손실 {item.lossPct.toFixed(2)}%
                                    </span>
                                  )}
                                  <span className="text-[10px] text-zinc-400">
                                    {item.triggerSource || "AI 자동 손절"}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  removeBlockedSymbol(item.symbol);
                                  addToast({
                                    type: "SUCCESS",
                                    title: "차단 해제 완료",
                                    message: `[${item.name}] 종목의 차단이 해제되어 즉시 스캔 대상에 복귀되었습니다.`
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 hover:text-rose-300 text-zinc-400 border border-zinc-700 transition cursor-pointer"
                                title="차단 즉시 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="text-[11px] text-zinc-400 mt-2 bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80">
                              사유: {item.reason}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1 text-amber-400 font-mono text-[11px]">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>{formatRemainingTime(item.unblockAt)}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedSymbol(item.symbol);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                              >
                                <span>차트 조회</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => {
                                  removeBlockedSymbol(item.symbol);
                                  addToast({
                                    type: "SUCCESS",
                                    title: "차단 해제 완료",
                                    message: `[${item.name}] 종목이 즉시 스캔 대상에 복귀되었습니다.`
                                  });
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow"
                              >
                                <Unlock className="w-2.5 h-2.5" />
                                <span>즉시 해제</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Manual Add Block Form */}
              <form onSubmit={handleManualBlock} className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs">
                <div className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  <span>위험 종목 수동 차단 추가 (블랙리스트 수동 등록)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="티커 심볼 (예: 005930, AAPL, BTC)"
                    value={manualSymbolInput}
                    onChange={(e) => setManualSymbolInput(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono flex-1 min-w-[140px] focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="종목명 (선택)"
                    value={manualNameInput}
                    onChange={(e) => setManualNameInput(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs flex-1 min-w-[120px] focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition cursor-pointer"
                  >
                    차단 등록
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: KILL-SWITCH MANAGEMENT */}
          {activeTab === "KILL_SWITCH" && (
            <div className="space-y-4 text-xs">
              
              {/* Kill Switch Big Alert Status Card */}
              <div className={`p-4 rounded-xl border ${
                isKillSwitchActive
                  ? "bg-rose-950/40 border-rose-500/60 text-rose-100"
                  : "bg-emerald-950/30 border-emerald-500/40 text-emerald-100"
              } space-y-3`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isKillSwitchActive ? "bg-rose-600 text-white animate-pulse" : "bg-emerald-600 text-white"}`}>
                      {isKillSwitchActive ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {isKillSwitchActive 
                          ? `🚨 킬-스위치 발동 중 (${killSwitchMode === 'HARD_HALT' ? '하드 비상 정지' : '소프트 가드'})`
                          : "🟢 자율 매매 안전 게이트 정상 작동 중"}
                      </h3>
                      <p className="text-[11px] text-zinc-300 mt-0.5">
                        {isKillSwitchActive
                          ? `신규 매수가 차단되어 있습니다. (남은 시간: ${Math.ceil(remainingKillSwitchSecs / 60)}분 ${remainingKillSwitchSecs % 60}초)`
                          : "연속 손절 3회 발생 시 자동으로 1시간 동안 신규 매수가 동결됩니다."}
                      </p>
                    </div>
                  </div>

                  {isKillSwitchActive && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleStartGracefulRecovery}
                        disabled={isRecovering}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition flex items-center gap-1.5 shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRecovering ? "animate-spin" : ""}`} />
                        <span>3단계 안전 복구 프로토콜 시작</span>
                      </button>
                      <button
                        onClick={resetKillSwitch}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition cursor-pointer border border-zinc-700"
                      >
                        강제 즉시 해제
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Kill Switch Trigger Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* Soft Guard Card */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      소프트 가드 (Soft Guard)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                      추천 모드
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    신규 자율 매수만 일시 동결하며, **기존 보유 포지션의 목표가 익절(+2~5%) 및 손절(-3%) 감시는 정상 가동**됩니다.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">지속 시간: 60분</span>
                    <button
                      onClick={() => triggerKillSwitch("SOFT_GUARD", 60, "사용자 수동 소프트 가드 발동")}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      소프트 가드 가동
                    </button>
                  </div>
                </div>

                {/* Hard Emergency Halt Card */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-rose-500" />
                      하드 비상 킬-스위치 (Emergency Halt)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">
                      비상 정지
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    시장 급락, 통신 장애, 연속 손실 등 위기 시 모든 신규 주문과 봇 통신을 즉시 완전 동결합니다.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">지속 시간: 120분</span>
                    <button
                      onClick={() => triggerKillSwitch("HARD_HALT", 120, "사용자 수동 하드 비상 킬스위치 가동")}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      하드 비상 정지 가동
                    </button>
                  </div>
                </div>
              </div>

              {/* 3-Step Recovery Explanation */}
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>3단계 안전 복구 프로토콜 (Graceful Recovery Flow)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
                    <span className="font-bold text-indigo-200">1단계: API 무결성 검증</span>
                    <p className="text-zinc-400 text-[10px]">한국투자/업비트/토스 핑 테스트 및 세션 유효성 확인</p>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
                    <span className="font-bold text-indigo-200">2단계: 잔고/슬리피지 동기화</span>
                    <p className="text-zinc-400 text-[10px]">실제 보유 계좌 데이터와 대시보드 무결성 동기화</p>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
                    <span className="font-bold text-indigo-200">3단계: 자율매매 안전 복귀</span>
                    <p className="text-zinc-400 text-[10px]">킬스위치 락 해제 및 4단계 안티-페이크아웃 스캔 재개</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GUIDE & FAQ */}
          {activeTab === "GUIDE" && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Q1. -3% 자동 손절 후 왜 추가 매수가 차단되나요?
                </h4>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  급락세가 지속되는 종목을 봇이 '저점'으로 착각하여 **끝없이 추가 매수(물타기)하다가 계좌 잔고가 파탄나는 현상을 방지**하기 위한 필수 안전장치입니다. 차단된 종목은 기본 30분 쿨다운 동안 봇 진입이 차단됩니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  Q2. 사용자가 직접 수동으로 사고 싶을 때는 어떻게 되나요?
                </h4>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  **사용자의 직접 투자 의사를 최우선으로 인정**합니다. 원클릭 매수, 스마트 주문, 스캘핑 콘솔 등에서 사용자가 직접 주문을 누르면 **과거 손절 차단 이력이 즉시 자동 해제**되며 주문이 정상 체결됩니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="font-bold text-rose-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-rose-400" />
                  Q3. 킬-스위치가 켜지면 보유 종목도 매도되지 않나요?
                </h4>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  기본적으로 **소프트 가드**가 작동하여 "신규 매수"만 막고, 이미 가지고 있는 종목의 **+3% 익절 청산 및 -3% 추가 손절 방어는 계속 정상 작동**하여 보유 자산을 보호합니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3 text-xs">
          <div className="text-zinc-400 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>AI 실시간 안전 거버넌스 활성화됨</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
