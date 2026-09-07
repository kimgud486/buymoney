import React, { useState, useEffect } from "react";
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Zap, 
  CheckCircle2, 
  Play,
  Volume2
} from "lucide-react";
import { useApp } from "../../context/AppContext";

export interface SignalAlert {
  id: string;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  type: "LONG" | "SHORT";
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  expectedProfitPct: number;
  aiWinConfidence: number;
  rationale: string;
}

const DEMO_PUSH_SIGNALS: SignalAlert[] = [
  {
    id: "push-1",
    symbol: "277810",
    name: "레인보우로보틱스",
    market: "KOREA",
    type: "LONG",
    currentPrice: 168400,
    targetPrice: 198000,
    stopLoss: 161000,
    expectedProfitPct: 17.58,
    aiWinConfidence: 94.8,
    rationale: "로봇 테마 기관 수급 4일 연속 유입 + 5일선 정배열 급반등 롱 포지션 포착"
  },
  {
    id: "push-2",
    symbol: "252670",
    name: "KODEX 200선물인버스2X",
    market: "KOREA",
    type: "SHORT",
    currentPrice: 2280,
    targetPrice: 2590,
    stopLoss: 2180,
    expectedProfitPct: 13.59,
    aiWinConfidence: 92.4,
    rationale: "코스피200 선물 고점 헤드앤숄더 돌파 이탈 -> 숏 인버스 타점 확정"
  },
  {
    id: "push-3",
    symbol: "KRW-BTC",
    name: "비트코인",
    market: "BTC",
    type: "LONG",
    currentPrice: 94800000,
    targetPrice: 112000000,
    stopLoss: 91000000,
    expectedProfitPct: 18.14,
    aiWinConfidence: 95.2,
    rationale: "온체인 숏 스퀴즈 발생 및 24시간 최고가 롱 돌파 시그널"
  },
  {
    id: "push-4",
    symbol: "NVDA",
    name: "엔비디아 (NVIDIA)",
    market: "US",
    type: "LONG",
    currentPrice: 128.5,
    targetPrice: 154.0,
    stopLoss: 121.0,
    expectedProfitPct: 19.84,
    aiWinConfidence: 93.7,
    rationale: "Blackwell 칩 실적 가이던스 상향 및 볼린저밴드 상방 돌파"
  }
];

export const AiSignalPushNotificationOverlay: React.FC = () => {
  const { executeTrade, addToast } = useApp();
  const [activeAlert, setActiveAlert] = useState<SignalAlert | null>(null);
  const [progress, setProgress] = useState<number>(100);

  // Auto trigger first signal after 4 seconds to demonstrate push notification
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerRandomSignal();
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Countdown progress bar when activeAlert is visible
  useEffect(() => {
    if (!activeAlert) return;

    setProgress(100);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 2) {
          clearInterval(interval);
          setActiveAlert(null);
          return 0;
        }
        return prev - 2;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [activeAlert]);

  const triggerRandomSignal = () => {
    const randomIndex = Math.floor(Math.random() * DEMO_PUSH_SIGNALS.length);
    setActiveAlert({
      ...DEMO_PUSH_SIGNALS[randomIndex],
      id: `alert-${Date.now()}`
    });
  };

  const handleExecuteOneClick = async (alertItem: SignalAlert) => {
    try {
      const side = alertItem.type === "LONG" ? "BUY" : "SELL";
      const actionTitle = alertItem.type === "LONG" ? "🚀 롱 (LONG 매수)" : "📉 숏 (SHORT 인버스)";

      await executeTrade(
        alertItem.symbol,
        alertItem.name,
        alertItem.market,
        side,
        1,
        alertItem.currentPrice,
        `AI 푸시 알림 1-Click 실행`,
        alertItem.rationale,
        true
      );

      addToast({
        type: "SUCCESS",
        title: `✅ ${actionTitle} 1-Click 주문 체결 완료!`,
        message: `${alertItem.name} (${alertItem.symbol}) ${actionTitle} 주문이 원장 등록되었습니다.`
      });

      setActiveAlert(null);
    } catch (err: any) {
      addToast({
        type: "CRITICAL",
        title: "주문 집행 실패",
        message: err?.message || "주문 처리 중 문제가 발생했습니다."
      });
    }
  };

  return (
    <>
      {/* MANUAL TEST TRIGGER FLOATING BUTTON (MOBILE & DESKTOP) */}
      <div className="fixed bottom-20 right-4 z-40">
        <button
          type="button"
          onClick={triggerRandomSignal}
          className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-full text-xs transition cursor-pointer flex items-center gap-2 shadow-2xl ring-2 ring-amber-300/50 active:scale-95 min-h-[44px]"
          title="AI 롱/숏 실시간 감지 알림 테스트"
        >
          <Bell className="w-4 h-4 text-slate-950 animate-bounce" />
          <span className="hidden sm:inline">AI 롱/숏 알림 테스트</span>
        </button>
      </div>

      {/* PUSH NOTIFICATION TOAST BANNER OVERLAY */}
      {activeAlert && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[420px] z-[100] animate-in slide-in-from-top-6 duration-300 font-sans">
          <div className={`p-4 sm:p-5 rounded-3xl border shadow-2xl relative overflow-hidden text-slate-100 ${
            activeAlert.type === "LONG"
              ? "bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border-emerald-500/80 ring-2 ring-emerald-500/40"
              : "bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 border-rose-500/80 ring-2 ring-rose-500/40"
          }`}>
            {/* PROGRESS COUNTDOWN BAR */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
              <div 
                className={`h-full transition-all duration-300 ${activeAlert.type === "LONG" ? "bg-emerald-400" : "bg-rose-400"}`} 
                style={{ width: `${progress}%` }} 
              />
            </div>

            {/* TOP HEADER */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 text-xs font-black">
                  <Bell className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>AI Realtime Signal Alert</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                  {activeAlert.market}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SIGNAL CONTENT BODY */}
            <div className="pt-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black border flex items-center gap-1 ${
                      activeAlert.type === "LONG"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}>
                      {activeAlert.type === "LONG" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span>{activeAlert.type === "LONG" ? "🚀 LONG 롱 감지" : "📉 SHORT 숏 감지"}</span>
                    </span>
                    <h3 className="text-base font-black text-white">{activeAlert.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">({activeAlert.symbol})</p>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 block">AI 승률 확신</span>
                  <div className="flex items-center justify-end gap-1 font-extrabold text-amber-300 text-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeAlert.aiWinConfidence}%</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 leading-tight">
                {activeAlert.rationale}
              </p>

              {/* METRICS & 1-CLICK ACTION */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
                <div className="text-xs font-mono">
                  <span className="text-slate-400 block text-[10px]">기대 수익률</span>
                  <span className={`font-black text-sm ${activeAlert.type === "LONG" ? "text-emerald-400" : "text-rose-400"}`}>
                    +{activeAlert.expectedProfitPct}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteOneClick(activeAlert)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black text-white transition cursor-pointer flex items-center gap-2 shadow-xl active:scale-95 min-h-[44px] ${
                    activeAlert.type === "LONG"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40"
                      : "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border border-rose-400/40"
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>{activeAlert.type === "LONG" ? "🚀 롱 (LONG) 1-Click 실행" : "📉 숏 (SHORT) 1-Click 실행"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
