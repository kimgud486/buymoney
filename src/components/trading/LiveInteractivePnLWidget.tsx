import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  DollarSign, 
  Bot, 
  Coins, 
  Sparkles, 
  Activity,
  ShieldAlert,
  AlertTriangle,
  Key,
  Pause,
  Play,
  CheckCircle2,
  Lock
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface BotPnLItem {
  id: string;
  name: string;
  category: "TOTAL" | "SMALL" | "MID" | "CRYPTO";
  label: string;
  evaluatedAmount: number;
  pnlAmount: number;
  pnlRate: number;
  activeHoldings: string[];
  status: "ACTIVE" | "BUYING" | "SELLING" | "SCANNING";
}

const MOCK_BOT_PNL: BotPnLItem[] = [
  {
    id: "total",
    name: "종합 통합 포트폴리오",
    category: "TOTAL",
    label: "전체 통합",
    evaluatedAmount: 48920000,
    pnlAmount: 2818000,
    pnlRate: 6.11,
    activeHoldings: ["한화에어로", "레인보우", "삼성전자", "두산에너", "BTC"],
    status: "ACTIVE"
  },
  {
    id: "small",
    name: "소형주 급등 알파 봇",
    category: "SMALL",
    label: "소형주 봇",
    evaluatedAmount: 10104000,
    pnlAmount: 1014000,
    pnlRate: 11.15,
    activeHoldings: ["레인보우로보틱스", "제주반도체"],
    status: "BUYING"
  },
  {
    id: "mid",
    name: "중형주 주도 스윙 봇",
    category: "MID",
    label: "중형주 봇",
    evaluatedAmount: 18647500,
    pnlAmount: 1397500,
    pnlRate: 8.09,
    activeHoldings: ["한화에어로스페이스", "두산에너빌리티"],
    status: "ACTIVE"
  },
  {
    id: "crypto",
    name: "업비트 24H 가상자산 봇",
    category: "CRYPTO",
    label: "업비트 봇",
    evaluatedAmount: 6052500,
    pnlAmount: 166500,
    pnlRate: 2.82,
    activeHoldings: ["비트코인(BTC)", "솔라나(SOL)"],
    status: "SCANNING"
  }
];

interface LiveInteractivePnLWidgetProps {
  onOpenHoldingsModal?: () => void;
  isRealTradingMode?: boolean;
  isAutoTradingActive?: boolean;
  onOpenApiConnectModal?: () => void;
}

export const LiveInteractivePnLWidget: React.FC<LiveInteractivePnLWidgetProps> = ({
  onOpenHoldingsModal,
  isRealTradingMode = false,
  isAutoTradingActive = true,
  onOpenApiConnectModal
}) => {
  const { profile, positions } = useApp();
  const [activeTab, setActiveTab] = useState<"TOTAL" | "SMALL" | "MID" | "CRYPTO">("TOTAL");

  const dynamicData = React.useMemo<BotPnLItem[]>(() => {
    if (!positions || positions.length === 0) {
      return [
        { id: "total", name: "종합 통합 포트폴리오", category: "TOTAL", label: "전체 통합", evaluatedAmount: 0, pnlAmount: 0, pnlRate: 0, activeHoldings: [], status: "ACTIVE" },
        { id: "small", name: "소형주 급등 알파 봇", category: "SMALL", label: "소형주 봇", evaluatedAmount: 0, pnlAmount: 0, pnlRate: 0, activeHoldings: [], status: "SCANNING" },
        { id: "mid", name: "중형주 주도 스윙 봇", category: "MID", label: "중형주 봇", evaluatedAmount: 0, pnlAmount: 0, pnlRate: 0, activeHoldings: [], status: "SCANNING" },
        { id: "crypto", name: "업비트 24H 가상자산 봇", category: "CRYPTO", label: "업비트 봇", evaluatedAmount: 0, pnlAmount: 0, pnlRate: 0, activeHoldings: [], status: "SCANNING" }
      ];
    }

    const evalAll = positions.reduce((acc, p) => acc + ((p.quantity || 1) * (p.currentPrice || p.avgPrice || 0)), 0);
    const buyAll = positions.reduce((acc, p) => acc + ((p.quantity || 1) * (p.avgPrice || 0)), 0);
    const pnlAll = evalAll - buyAll;
    const rateAll = buyAll > 0 ? (pnlAll / buyAll) * 100 : 0;
    const holdingsAll = positions.map(p => p.name || p.symbol);

    const cryptoPos = positions.filter(p => p.market === "BTC" || p.symbol.startsWith("KRW-"));
    const evalCrypto = cryptoPos.reduce((acc, p) => acc + ((p.quantity || 1) * (p.currentPrice || p.avgPrice || 0)), 0);
    const buyCrypto = cryptoPos.reduce((acc, p) => acc + ((p.quantity || 1) * (p.avgPrice || 0)), 0);
    const pnlCrypto = evalCrypto - buyCrypto;
    const rateCrypto = buyCrypto > 0 ? (pnlCrypto / buyCrypto) * 100 : 0;

    const stockPos = positions.filter(p => p.market !== "BTC" && !p.symbol.startsWith("KRW-"));
    const evalStock = stockPos.reduce((acc, p) => acc + ((p.quantity || 1) * (p.currentPrice || p.avgPrice || 0)), 0);
    const buyStock = stockPos.reduce((acc, p) => acc + ((p.quantity || 1) * (p.avgPrice || 0)), 0);
    const pnlStock = evalStock - buyStock;
    const rateStock = buyStock > 0 ? (pnlStock / buyStock) * 100 : 0;

    return [
      { id: "total", name: "종합 통합 포트폴리오", category: "TOTAL", label: "전체 통합", evaluatedAmount: evalAll, pnlAmount: pnlAll, pnlRate: +rateAll.toFixed(2), activeHoldings: holdingsAll, status: "ACTIVE" },
      { id: "small", name: "소형주 급등 알파 봇", category: "SMALL", label: "소형주 봇", evaluatedAmount: Math.round(evalStock * 0.4), pnlAmount: Math.round(pnlStock * 0.4), pnlRate: +rateStock.toFixed(2), activeHoldings: stockPos.slice(0, 2).map(p => p.name || p.symbol), status: stockPos.length > 0 ? "BUYING" : "SCANNING" },
      { id: "mid", name: "중형주 주도 스윙 봇", category: "MID", label: "중형주 봇", evaluatedAmount: Math.round(evalStock * 0.6), pnlAmount: Math.round(pnlStock * 0.6), pnlRate: +rateStock.toFixed(2), activeHoldings: stockPos.slice(2, 5).map(p => p.name || p.symbol), status: stockPos.length > 0 ? "ACTIVE" : "SCANNING" },
      { id: "crypto", name: "업비트 24H 가상자산 봇", category: "CRYPTO", label: "업비트 봇", evaluatedAmount: evalCrypto, pnlAmount: pnlCrypto, pnlRate: +rateCrypto.toFixed(2), activeHoldings: cryptoPos.map(p => p.name || p.symbol), status: cryptoPos.length > 0 ? "ACTIVE" : "SCANNING" }
    ];
  }, [positions]);

  // Check if real accounts are connected
  const hasKoreaKey = Boolean(profile?.koreaAppKey && profile?.koreaAccountNo);
  const hasUpbitKey = Boolean(profile?.upbitAccessKey);
  const hasTossKey = Boolean(typeof window !== "undefined" && localStorage.getItem("toss_api_key"));
  const isAnyRealAccountConnected = hasKoreaKey || hasUpbitKey || hasTossKey;

  // Real account balance calculation
  const realBalance = isAnyRealAccountConnected
    ? (profile?.balance && profile.balance > 0 ? profile.balance : 0)
    : 0;

  const current = dynamicData.find((d) => d.category === activeTab) || dynamicData[0];
  const isPlus = current.pnlRate >= 0;

  // If Real Trading Mode is ON, but no real accounts are connected
  if (isRealTradingMode && !isAnyRealAccountConnected) {
    return (
      <div className="bg-rose-50/80 rounded-xl border border-rose-200 p-3.5 shadow-xs font-sans text-rose-950">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-rose-200/80">
          <div className="flex items-center gap-1.5 text-xs font-black text-rose-700">
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>실계좌 LIVE 트레이딩 모드</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-200/80 text-rose-800 font-black">
            실계좌 미연결 (0원)
          </span>
        </div>

        <div className="mt-2.5 space-y-2">
          <div className="text-xs text-rose-800 leading-relaxed font-medium">
            현재 <strong className="font-bold">실거래 LIVE 모드</strong>이나, 한국투자증권, 업비트, 토스증권 API가 등록되지 않아 자산 잔고가 <strong>0원</strong>으로 표시됩니다.
          </div>

          {/* Broker Connection Status Badges */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
            <div className="p-1.5 rounded bg-white/80 border border-rose-200 flex flex-col items-center">
              <span className="text-slate-500 font-sans">한국투자증권</span>
              <span className="text-rose-600 font-bold">미연결</span>
            </div>
            <div className="p-1.5 rounded bg-white/80 border border-rose-200 flex flex-col items-center">
              <span className="text-slate-500 font-sans">업비트(UPBIT)</span>
              <span className="text-rose-600 font-bold">미연결</span>
            </div>
            <div className="p-1.5 rounded bg-white/80 border border-rose-200 flex flex-col items-center">
              <span className="text-slate-500 font-sans">토스증권</span>
              <span className="text-rose-600 font-bold">미연결</span>
            </div>
          </div>

          <button
            onClick={onOpenApiConnectModal}
            className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>⚡ 증권사/거래소 실계좌 API 즉시 연결하기</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs font-sans relative">
      {/* Real / Mock & Auto-Trading Status Banner */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>실계좌 LIVE ({isAnyRealAccountConnected ? "연결됨" : "0원"})</span>
            </span>

          {!isAutoTradingActive && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-bold flex items-center gap-1">
              <Pause className="w-2.5 h-2.5 fill-amber-700" />
              <span>매매 정지됨</span>
            </span>
          )}
        </div>

        <button
          onClick={onOpenHoldingsModal}
          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          <span>상세 현황</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold mb-2.5">
        {dynamicData.map((item) => (
          <button
            key={item.category}
            onClick={() => setActiveTab(item.category)}
            className={`flex-1 py-1 rounded transition cursor-pointer text-center ${
              activeTab === item.category
                ? "bg-white text-blue-600 font-black shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Live PnL Main Values */}
      <div className="flex items-center justify-between gap-2 font-mono">
        <div>
          <div className="text-[10px] text-slate-400 font-sans font-medium">
            실계좌 평가 금액
          </div>
          <div className="text-sm font-black text-slate-900">
            {isRealTradingMode 
              ? `${(realBalance ?? 0).toLocaleString()}원`
              : `${(current.evaluatedAmount ?? 0).toLocaleString()}원`
            }
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-sans font-medium">실시간 수익률</div>
          <div
            className={`text-sm font-black transition-transform duration-200 flex items-center justify-end gap-1 ${
              isPlus ? "text-rose-600" : "text-blue-600"
            }`}
          >
            {isPlus ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isPlus ? "+" : ""}{current.pnlRate}%</span>
            <span className="text-[11px] font-bold text-slate-500 font-sans">
              ({isPlus ? "+" : ""}{(current.pnlAmount ?? 0).toLocaleString()}원)
            </span>
          </div>
        </div>
      </div>

      {/* Active Holdings Pills */}
      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
        <span className="text-slate-400 font-medium">운용 종목:</span>
        <div className="flex items-center gap-1 overflow-hidden">
          {current.activeHoldings.map((h, i) => (
            <span key={i} className="px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold truncate">
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* When Auto-Trading is STOPPED, show prominent bottom freeze notice */}
      {!isAutoTradingActive && (
        <div className="mt-2 p-1.5 bg-amber-50 rounded border border-amber-200 text-[10px] text-amber-900 font-medium flex items-center gap-1.5">
          <Pause className="w-3 h-3 text-amber-700 shrink-0 fill-amber-700" />
          <span>자율매매 정지 중 — 모든 봇의 신규 주문이 동결되었습니다.</span>
        </div>
      )}
    </div>
  );
};
