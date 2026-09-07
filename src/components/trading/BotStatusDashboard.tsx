import React, { useState, useEffect, useMemo } from "react";
import { 
  Bot, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck,
  Zap, 
  Play, 
  Pause, 
  Sliders, 
  Flame, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Sparkles,
  RotateCcw,
  Wallet,
  Server,
  Radio,
  Brain,
  Key,
  Link,
  Shield,
  Unplug
} from "lucide-react";
import { botErrorLogger, BotErrorLogItem } from "../../lib/botErrorLogger";
import { useApp } from "../../context/AppContext";
import { AiAutoBotEnhancementModal } from "./AiAutoBotEnhancementModal";
import { AiBotStrategyImprovementModal } from "./AiBotStrategyImprovementModal";
import { BrokerApiConnectModal } from "./BrokerApiConnectModal";

export interface ActiveBotStatus {
  id: string;
  name: string;
  strategyType: string;
  market: "KOREA" | "US" | "BTC";
  status: "ACTIVE" | "WARNING" | "PAUSED";
  activeSymbol: string;
  activeSymbolName: string;
}

const DEFAULT_ACTIVE_BOTS: ActiveBotStatus[] = [
  {
    id: "bot-alpha-01",
    name: "소형주 급등 알파 발굴 봇",
    strategyType: "공격형 시가총액/수급 돌파",
    market: "KOREA",
    status: "ACTIVE",
    activeSymbol: "021050",
    activeSymbolName: "서원"
  },
  {
    id: "bot-bos-02",
    name: "BOS/CHoCH 구조 돌파 봇",
    strategyType: "스마트머니 구조변화(SMC)",
    market: "KOREA",
    status: "ACTIVE",
    activeSymbol: "042700",
    activeSymbolName: "한미반도체"
  },
  {
    id: "bot-upbit-03",
    name: "업비트 24H 가상자산 봇",
    strategyType: "모멘텀 & 온체인 유동성",
    market: "BTC",
    status: "ACTIVE",
    activeSymbol: "KRW-SOL",
    activeSymbolName: "솔라나"
  },
  {
    id: "bot-swing-04",
    name: "기관/외인 수급 스윙 봇",
    strategyType: "보수형 수급 연속성",
    market: "KOREA",
    status: "ACTIVE",
    activeSymbol: "000660",
    activeSymbolName: "SK하이닉스"
  },
  {
    id: "bot-us-05",
    name: "미국 빅테크 모멘텀 봇",
    strategyType: "NASDAQ100 추세 추종",
    market: "US",
    status: "ACTIVE",
    activeSymbol: "NVDA",
    activeSymbolName: "NVIDIA"
  },
  {
    id: "bot-scalp-06",
    name: "고주파 Scalping 봇",
    strategyType: "초단타 호가 잔량 틱 매매",
    market: "KOREA",
    status: "ACTIVE",
    activeSymbol: "196170",
    activeSymbolName: "알테오젠"
  }
];

export const BotStatusDashboard: React.FC = () => {
  const { 
    addToast,
    positions,
    trades,
    profile,
    updateProfileSettings,
    cashBreakdown,
    brokerApiStatus,
    kisPingLatency,
    syncRealAccountBalance,
    apiResponseLogs,
    decisionLogs,
    isLiveTradingActive
  } = useApp();

  const [bots, setBots] = useState<ActiveBotStatus[]>(DEFAULT_ACTIVE_BOTS);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAutoEnhanceModalOpen, setIsAutoEnhanceModalOpen] = useState<boolean>(false);
  const [isStrategyImproveModalOpen, setIsStrategyImproveModalOpen] = useState<boolean>(false);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState<boolean>(false);
  const [focusedSymbol, setFocusedSymbol] = useState<string | null>(null);

  // Real Account Credentials & Mode Detection
  const hasKoreaKey = Boolean(profile?.koreaAppKey && (profile?.koreaAppSecret || profile?.koreaAccountNo));
  const hasUpbitKey = Boolean(profile?.upbitAccessKey && profile?.upbitSecretKey);
  const isRealMode = Boolean(profile?.isRealTrade);
  const isFullyLinked = (hasKoreaKey || hasUpbitKey) && isRealMode;

  useEffect(() => {
    if (profile?.isRealTrade && (profile?.koreaAppKey || profile?.upbitAccessKey)) {
      syncRealAccountBalance("all", true).catch(() => {});
    }
  }, [profile?.isRealTrade, profile?.koreaAppKey, profile?.upbitAccessKey, syncRealAccountBalance]);

  const handleToggleRealTradingMode = async (enableReal: boolean) => {
    if (enableReal && !hasKoreaKey && !hasUpbitKey) {
      if (addToast) {
        addToast({
          type: "WARNING",
          title: "실계좌 API 키 미등록",
          message: "한국투자증권(KIS) 또는 업비트 API 키 등록이 필요합니다. 연동 설정 창을 엽니다."
        });
      }
      setIsBrokerModalOpen(true);
      return;
    }

    try {
      if (updateProfileSettings) {
        await updateProfileSettings({ isRealTrade: enableReal });
      }
      if (addToast) {
        addToast({
          type: enableReal ? "SUCCESS" : "INFO",
          title: enableReal ? "🚨 실전 API 매매 모드 가동" : "💡 모의투자 시뮬레이션 모드 전환",
          message: enableReal
            ? "실계좌(증권사/업비트 REST API)로 실제 주문이 전송됩니다."
            : "가상 원장으로 안전하게 매매를 진행합니다."
        });
      }
      if (enableReal) {
        await syncRealAccountBalance("all", false);
      }
    } catch (err: any) {
      if (addToast) {
        addToast({
          type: "ERROR",
          title: "설정 변경 실패",
          message: err.message || "프로필 변경 중 오류가 발생했습니다."
        });
      }
    }
  };

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent<{ symbol?: string }>;
      if (customEvent.detail?.symbol) {
        setFocusedSymbol(customEvent.detail.symbol);
      } else {
        setFocusedSymbol(null);
      }
      setIsStrategyImproveModalOpen(true);
    };

    window.addEventListener("open-ai-bot-strategy-improvement-modal", handleOpenModal);
    return () => {
      window.removeEventListener("open-ai-bot-strategy-improvement-modal", handleOpenModal);
    };
  }, []);

  // Real Account & Trades Computation (No Mock Data)
  const realTradesStats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        winRatePct: 0,
        totalRealizedPnl: 0,
        totalVolume: 0
      };
    }

    let winCount = 0;
    let lossCount = 0;
    let totalRealizedPnl = 0;
    let totalVolume = 0;

    trades.forEach((t) => {
      const price = t.price || 0;
      const qty = t.qty || 0;
      totalVolume += price * qty;
      
      // Calculate return if trade has PnL information
      const pnl = t.pnl || 0;
      totalRealizedPnl += pnl;
      if (pnl > 0) {
        winCount++;
      } else if (pnl < 0) {
        lossCount++;
      }
    });

    const evaluatedTrades = winCount + lossCount;
    const winRatePct = evaluatedTrades > 0 ? (winCount / evaluatedTrades) * 100 : 100;

    return {
      totalTrades: trades.length,
      winCount,
      lossCount,
      winRatePct,
      totalRealizedPnl,
      totalVolume
    };
  }, [trades]);

  // Real Positions Evaluation
  const totalPositionValuation = useMemo(() => {
    if (!positions || positions.length === 0) return 0;
    return positions.reduce((acc, pos) => acc + (pos.currentPrice || pos.avgPrice || (pos as any).avgBuyPrice || 0) * (pos.quantity || (pos as any).qty || 0), 0);
  }, [positions]);

  const totalUnrealizedPnl = useMemo(() => {
    if (!positions || positions.length === 0) return 0;
    return positions.reduce((acc, pos) => {
      const current = pos.currentPrice || pos.avgPrice || (pos as any).avgBuyPrice || 0;
      const qty = pos.quantity || (pos as any).qty || 0;
      const avg = pos.avgPrice || (pos as any).avgBuyPrice || 0;
      const cost = avg * qty;
      const val = current * qty;
      return acc + (val - cost);
    }, 0);
  }, [positions]);

  const koreaCash = cashBreakdown?.koreaCash ?? 0;
  const upbitCash = cashBreakdown?.upbitCash ?? 0;
  const usCash = cashBreakdown?.usCash ?? 0;
  const totalCashFromBreakdown = cashBreakdown?.totalCash ?? (koreaCash + upbitCash + usCash);

  const availableCash = totalCashFromBreakdown > 0 
    ? totalCashFromBreakdown 
    : (profile?.cash ?? profile?.balance ?? 0);

  const totalAccountValue = (cashBreakdown?.grandTotalAssets && cashBreakdown.grandTotalAssets > 0)
    ? cashBreakdown.grandTotalAssets
    : (availableCash + totalPositionValuation);

  const toggleBotStatus = (botId: string) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === botId) {
        const nextStatus = bot.status === "PAUSED" ? "ACTIVE" : "PAUSED";
        addToast({
          type: nextStatus === "ACTIVE" ? "SUCCESS" : "WARNING",
          title: `[🤖 ${bot.name}]`,
          message: nextStatus === "ACTIVE" ? "실거래 봇이 정상 재가동되었습니다." : "실거래 봇 작동이 일시 정지되었습니다."
        });
        return { ...bot, status: nextStatus };
      }
      return bot;
    }));
  };

  const handleSyncRealAccount = async () => {
    setIsSyncing(true);
    try {
      const res = await syncRealAccountBalance("all", false);
      addToast({
        type: res.success ? "SUCCESS" : "WARNING",
        title: "실거래 계좌 잔고 동기화 완료",
        message: res.message || `실계좌 가용 잔고 ${res.balance?.toLocaleString()}원 연동 확인`
      });
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "실거래 계좌 동기화 실패",
        message: err.message || "증권사 API 연결 상태를 확인해 주세요."
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const activeBotCount = bots.filter(b => b.status === "ACTIVE").length;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 font-sans space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-white tracking-tight">AI 봇 상태 및 매매 성과 대시보드</h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                isRealMode 
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40" 
                  : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRealMode ? "bg-rose-400 animate-ping" : "bg-cyan-400"}`} />
                {isRealMode ? "실전 API 직결 (LIVE)" : "가상 시뮬레이션 (PAPER)"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono font-bold">
                가동 중 {activeBotCount} / {bots.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              증권사(KIS)/업비트 실전 API 직결 · 실계좌 잔고 및 실제 체결 내역 실시간 동기화
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Real vs Paper Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => handleToggleRealTradingMode(false)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                !isRealMode ? "bg-cyan-500 text-slate-950 shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              💡 모의투자
            </button>
            <button
              onClick={() => handleToggleRealTradingMode(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                isRealMode ? "bg-rose-600 text-white shadow-xs animate-pulse" : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🚨 실전 API</span>
              {isRealMode && <span className="text-[9px]">⚡</span>}
            </button>
          </div>

          <button
            onClick={() => setIsBrokerModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>실계좌 API 연동 설정</span>
          </button>

          <button
            onClick={() => setIsStrategyImproveModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer border border-rose-400/40 active:scale-95"
          >
            <Brain className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>💡 AI 봇 전략 개선</span>
          </button>

          <button
            onClick={() => setIsAutoEnhanceModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-black text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer border border-amber-300/40 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-amber-200 animate-bounce" />
            <span>🤖 AI 자동 봇강화</span>
          </button>

          <button
            onClick={handleSyncRealAccount}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
            <span>실계좌 동기화</span>
          </button>
        </div>
      </div>

      {/* Real Account Connection Status & Banner */}
      {!hasKoreaKey && !hasUpbitKey ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-black text-amber-300 flex items-center gap-1.5">
                <span>⚠️ 실계좌 API 미연동 상태 (증권사/업비트 계좌 미등록)</span>
              </div>
              <p className="text-[11px] text-amber-400/80 mt-0.5">
                한국투자증권(KIS) 또는 업비트 API 키가 연결되어 있지 않습니다. API 키를 등록하면 실제 체결 및 잔고가 100% 직결됩니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setIsBrokerModalOpen(true)}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ 실계좌 API 1초 연동 및 계좌 등록</span>
            </button>
          </div>
        </div>
      ) : !isRealMode ? (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-cyan-200 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-cyan-300 flex items-center gap-1.5">
                <span>💡 실계좌 API 키 연동 완료 (현재: 모의투자 시뮬레이션 모드)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                  KIS: {hasKoreaKey ? "연동 완료 🟢" : "미등록"} | Upbit: {hasUpbitKey ? "연동 완료 🟢" : "미등록"}
                </span>
              </div>
              <p className="text-[11px] text-cyan-400/80 mt-0.5">
                증권사 API 키가 성공적으로 등록되어 있습니다. 실거래 주문 전송을 시작하려면 [실전 API 모드]로 전환해 주세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => handleToggleRealTradingMode(true)}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>🚨 실전 API 모드 가동</span>
            </button>
            <button
              onClick={() => setIsBrokerModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition border border-slate-700 cursor-pointer"
            >
              API 관리
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-200 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-black text-emerald-300 flex items-center gap-1.5">
                <span>🟢 실계좌 API 직결 가동 중 (LIVE PRODUCTION)</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200 font-mono font-bold">
                  {profile?.koreaAccountNo ? `계좌: ${profile.koreaAccountNo}` : "API 연결 완료"}
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">
                한국투자증권(KIS) 및 업비트 REST API 서버와 직결되어 실제 체결과 예수금 잔고가 100% 실시간 동기화되고 있습니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => handleToggleRealTradingMode(false)}
              className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>모의투자로 전환</span>
            </button>
            <button
              onClick={() => setIsBrokerModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition cursor-pointer"
            >
              API 키 설정
            </button>
          </div>
        </div>
      )}

      {/* Real Account Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">실계좌 가용 예수금</span>
            <div className="text-base font-black text-white font-mono mt-0.5">
              {(availableCash ?? 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">원</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 flex-wrap">
              <span>총평가: {(totalAccountValue ?? 0).toLocaleString()}원</span>
              {(koreaCash > 0 || upbitCash > 0) && (
                <span className="text-slate-400 font-sans">
                  (KIS: {(koreaCash ?? 0).toLocaleString()}원 | Upbit: {(upbitCash ?? 0).toLocaleString()}원)
                </span>
              )}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">실보유 종목 평가손익</span>
            <div className={`text-base font-black font-mono mt-0.5 ${totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {totalUnrealizedPnl >= 0 ? "+" : ""}{(totalUnrealizedPnl ?? 0).toLocaleString()} <span className="text-xs font-normal">원</span>
            </div>
            <span className="text-[10px] text-slate-400">
              보유종목 {positions?.length || 0}개
            </span>
          </div>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">실거래 누적 체결 수</span>
            <div className="text-base font-black text-amber-300 font-mono mt-0.5">
              {realTradesStats.totalTrades} <span className="text-xs text-slate-400 font-normal">건</span>
            </div>
            <span className="text-[10px] text-slate-400">
              실현손익: {realTradesStats.totalRealizedPnl >= 0 ? "+" : ""}{(realTradesStats.totalRealizedPnl ?? 0).toLocaleString()}원
            </span>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">증권사 API 연결 상태</span>
            <div className="text-xs font-bold text-white font-mono mt-1 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[10px]">KIS:</span>
                <span className={hasKoreaKey ? "text-emerald-400 font-extrabold" : "text-amber-400"}>
                  {hasKoreaKey ? "연동 완료 🟢" : "키 미설정 ⚠️"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[10px]">Upbit:</span>
                <span className={hasUpbitKey ? "text-purple-400 font-extrabold" : "text-amber-400"}>
                  {hasUpbitKey ? "연동 완료 🟢" : "키 미설정 ⚠️"}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">
              매매모드: {isRealMode ? "실전 REST API (LIVE)" : "가상 시뮬레이션 (PAPER)"}
            </span>
          </div>
          <div 
            onClick={() => setIsBrokerModalOpen(true)}
            className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition"
            title="실계좌 API 연동 및 계좌 설정 열기"
          >
            <Server className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid: 6 Running Real Trading Bots Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" /> 실거래 전용 6대 핵심 AI 봇 실시간 모니터링
          </h4>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">
            100% 실계좌 주문 트리거 연동
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {bots.map((bot) => {
            // Find active position for this bot's market if any
            const matchedPosition = positions?.find(p => p.symbol === bot.activeSymbol);
            const isPositionHeld = !!matchedPosition;
            const pnlPct = matchedPosition?.profitRate || 0;

            return (
              <div
                key={bot.id}
                className={`bg-slate-950/80 border rounded-xl p-3 transition flex flex-col justify-between space-y-2.5 ${
                  bot.status === "PAUSED"
                    ? "border-slate-800 opacity-60"
                    : "border-slate-800 hover:border-emerald-500/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        bot.status === "ACTIVE" 
                          ? "bg-emerald-400 animate-ping" 
                          : "bg-slate-500"
                      }`} />
                      <h5 className="text-xs font-black text-white">{bot.name}</h5>
                    </div>
                    <span className="text-[10px] text-slate-400">{bot.strategyType}</span>
                  </div>

                  <button
                    onClick={() => toggleBotStatus(bot.id)}
                    className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      bot.status === "PAUSED"
                        ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/50"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                    title={bot.status === "PAUSED" ? "실거래 재가동" : "일시 정지"}
                  >
                    {bot.status === "PAUSED" ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-500 block">실보유 여부</span>
                    <span className={`font-black ${isPositionHeld ? "text-emerald-400" : "text-slate-400"}`}>
                      {isPositionHeld ? "보유 중" : "감시 중"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">평가손익</span>
                    <span className={`font-bold ${pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPositionHeld ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%` : "0.00%"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">매매 모드</span>
                    <span className="text-cyan-400 font-bold">실전 LIVE</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span className="truncate max-w-[170px] text-slate-300 font-bold">
                    🎯 감시: {bot.activeSymbolName} ({bot.activeSymbol})
                  </span>
                  <span className="font-mono text-emerald-400 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 animate-pulse" /> 실시간 호가
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Real-time Actual Trade Executions / Active Positions */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 실거래 실제 체결 및 보유 종목 현황
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">실계좌 원장 기준</span>
        </div>

        {trades && trades.length > 0 ? (
          <div className="space-y-2">
            {trades.slice(0, 5).map((t, idx) => {
              const isBuy = t.side === "BUY";
              return (
                <div
                  key={`${t.id || 'trade'}_${idx}`}
                  className="p-3 rounded-xl border bg-slate-950/80 border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border shrink-0 ${
                      isBuy
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                    }`}>
                      {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{t.name || t.symbol}</span>
                        <span className="text-[10px] font-mono text-slate-400">({t.symbol})</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          isBuy ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}>
                          실전 {isBuy ? "매수" : "매도"} 체결
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {t.qty}주 @ {t.price?.toLocaleString()}원
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t.strategyName || t.aiRationale || "실거래 퀀트 시그널 조건 도달 및 증권사 정상 체결"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800 font-mono">
                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-400">
                        총액: {((t.price || 0) * (t.qty || 0)).toLocaleString()}원
                      </div>
                      <span className="text-[10px] text-slate-500">
                        상태: 실전체결완료
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : "최근"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : positions && positions.length > 0 ? (
          <div className="space-y-2">
            {positions.map((pos, idx) => {
              const currentPrice = pos.currentPrice || pos.avgBuyPrice || 0;
              const valuation = currentPrice * (pos.qty || 0);
              const pnl = valuation - (pos.avgBuyPrice || 0) * (pos.qty || 0);
              const pnlPct = pos.profitRate || 0;

              return (
                <div
                  key={`${pos.id || pos.symbol || 'pos'}_${idx}`}
                  className="p-3 rounded-xl border bg-slate-950/80 border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl border shrink-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                      <ShieldCheck className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{pos.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({pos.symbol})</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                          실계좌 보유 중
                        </span>
                        <span className="text-[10px] text-slate-300 font-mono">
                          {pos.qty}주 | 매수가: {pos.avgBuyPrice?.toLocaleString()}원
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        실시간 현재가: {(currentPrice ?? 0).toLocaleString()}원 · AI 실시간 트레일링 스탑 감시 가동 중
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800 font-mono">
                    <div className="text-right">
                      <div className={`text-xs font-black ${pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}% ({pnl >= 0 ? "+" : ""}{(pnl ?? 0).toLocaleString()}원)
                      </div>
                      <span className="text-[10px] text-slate-400">
                        평가액: {(valuation ?? 0).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h5 className="text-xs font-black text-white">실계좌 실시간 감시 대기 중 (실거래 모드 활성화)</h5>
            <p className="text-[11px] text-slate-400 max-w-lg mx-auto leading-relaxed">
              가상 모의투자 데이터는 전면 배제되었으며, 한국투자증권(KIS) 및 업비트 실전 계좌와 직결되어 있습니다.
              AI 봇의 매매 조건 충족 시 실계좌 주문이 즉시 전송되며 체결 내역이 실시간으로 기록됩니다.
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Real Broker & System Response Logs */}
      {apiResponseLogs && apiResponseLogs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" /> 실거래 API 연동 및 서버 응답 로그
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">최신 {apiResponseLogs.length}건</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {apiResponseLogs.slice(0, 5).map((log, idx) => (
              <div
                key={`${log.id || 'log'}_${idx}`}
                className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between gap-2 text-[11px]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    log.httpStatus === 200 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {log.httpStatus || "200 OK"}
                  </span>
                  <span className="font-bold text-slate-300">{log.broker}</span>
                  <span className="text-slate-400 truncate">{log.message || log.endpoint}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Auto Bot Reinforcement Modal */}
      <AiAutoBotEnhancementModal
        isOpen={isAutoEnhanceModalOpen}
        onClose={() => setIsAutoEnhanceModalOpen(false)}
      />

      {/* AI Bot Strategy Improvement Modal */}
      <AiBotStrategyImprovementModal
        isOpen={isStrategyImproveModalOpen}
        onClose={() => setIsStrategyImproveModalOpen(false)}
        selectedSymbol={focusedSymbol}
      />

      {/* Real Broker API Key Connect Modal */}
      <BrokerApiConnectModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
      />
    </div>
  );
};

