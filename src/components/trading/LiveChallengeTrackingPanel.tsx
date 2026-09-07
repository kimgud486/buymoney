import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sliders,
  Eye,
  Crosshair,
  Award
} from "lucide-react";
import { getMarketStatus } from "../../lib/marketHours";

export interface TrackedAssetPosition {
  symbol: string;
  name: string;
  category: "CRYPTO" | "US_STOCK" | "KR_STOCK";
  marketType: "KOREA" | "US" | "BTC";
  currentPrice: number;
  changePercent: number;
  unit: string;
  exchange: string;
  leverage: string;
  aiScore: number;
  scanStatus: "SCANNING" | "LONG_ACTIVE" | "SHORT_ACTIVE" | "WATCHING" | "RISK_AVOID";
  positionPnlPercent: number;
  positionPnlDollar: number;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  reason: string;
  lastUpdated: string;
}

interface LiveChallengeTrackingPanelProps {
  selectedSymbol?: string;
  onSelectAsset?: (symbol: string) => void;
  onQuickTrade?: (symbol: string, type: "LONG" | "SHORT") => void;
  challengeMode?: "MOCK" | "REAL";
  exchangeRateKRW?: number;
}

const INITIAL_TRACKED_ASSETS: TrackedAssetPosition[] = [
  {
    symbol: "BTC",
    name: "비트코인",
    category: "CRYPTO",
    marketType: "BTC",
    currentPrice: 96420,
    changePercent: 3.85,
    unit: "$",
    exchange: "업비트 / 바이낸스 24H",
    leverage: "10x 핑퐁",
    aiScore: 96,
    scanStatus: "LONG_ACTIVE",
    positionPnlPercent: 4.82,
    positionPnlDollar: 241.0,
    entryPrice: 95100,
    targetPrice: 98500,
    stopLossPrice: 94200,
    reason: "15분봉 SMC 브레이크아웃 + RSI 42 반등 롱 포지션 유지",
    lastUpdated: "방금 전"
  },
  {
    symbol: "ETH",
    name: "이더리움",
    category: "CRYPTO",
    marketType: "BTC",
    currentPrice: 2780,
    changePercent: -1.45,
    unit: "$",
    exchange: "업비트 24H",
    leverage: "10x 핑퐁",
    aiScore: 91,
    scanStatus: "SHORT_ACTIVE",
    positionPnlPercent: 2.15,
    positionPnlDollar: 107.5,
    entryPrice: 2810,
    targetPrice: 2720,
    stopLossPrice: 2840,
    reason: "4시간봉 저항선 피뢰침 음봉 패턴 감지 숏 스캘핑",
    lastUpdated: "1초 전"
  },
  {
    symbol: "NVDA",
    name: "엔비디아",
    category: "US_STOCK",
    marketType: "US",
    currentPrice: 138.5,
    changePercent: 4.21,
    unit: "$",
    exchange: "미국 NASDAQ",
    leverage: "5x CFD",
    aiScore: 98,
    scanStatus: "LONG_ACTIVE",
    positionPnlPercent: 6.12,
    positionPnlDollar: 306.0,
    entryPrice: 135.2,
    targetPrice: 142.0,
    stopLossPrice: 133.5,
    reason: "AI 유동성 수급 폭발 & 돌파 매수 핑퐁 타점",
    lastUpdated: "방금 전"
  },
  {
    symbol: "TSLA",
    name: "테슬라",
    category: "US_STOCK",
    marketType: "US",
    currentPrice: 242.1,
    changePercent: -2.10,
    unit: "$",
    exchange: "미국 NASDAQ",
    leverage: "5x CFD",
    aiScore: 88,
    scanStatus: "WATCHING",
    positionPnlPercent: 0,
    positionPnlDollar: 0,
    entryPrice: 0,
    targetPrice: 250.0,
    stopLossPrice: 235.0,
    reason: "횡보 박스권 하단 지지선 재테스트 감시 중",
    lastUpdated: "3초 전"
  },
  {
    symbol: "005930",
    name: "삼성전자",
    category: "KR_STOCK",
    marketType: "KOREA",
    currentPrice: 61400,
    changePercent: 1.82,
    unit: "원",
    exchange: "국내 KOSPI",
    leverage: "2.5x 미수",
    aiScore: 94,
    scanStatus: "LONG_ACTIVE",
    positionPnlPercent: 3.45,
    positionPnlDollar: 172.5,
    entryPrice: 60200,
    targetPrice: 63500,
    stopLossPrice: 59500,
    reason: "외국인/기관 쌍끌이 순매수 + 과매도 반등 롱",
    lastUpdated: "2초 전"
  },
  {
    symbol: "000660",
    name: "SK하이닉스",
    category: "KR_STOCK",
    marketType: "KOREA",
    currentPrice: 184500,
    changePercent: 3.12,
    unit: "원",
    exchange: "국내 KOSPI",
    leverage: "2.5x 미수",
    aiScore: 95,
    scanStatus: "LONG_ACTIVE",
    positionPnlPercent: 5.20,
    positionPnlDollar: 260.0,
    entryPrice: 181000,
    targetPrice: 192000,
    stopLossPrice: 178000,
    reason: "HBM 수혜 모멘텀 + 상승 깃발형 돌파 패턴",
    lastUpdated: "방금 전"
  },
  {
    symbol: "SOL",
    name: "솔라나",
    category: "CRYPTO",
    marketType: "BTC",
    currentPrice: 194.2,
    changePercent: 5.40,
    unit: "$",
    exchange: "업비트 / 바이낸스",
    leverage: "10x 핑퐁",
    aiScore: 92,
    scanStatus: "SHORT_ACTIVE",
    positionPnlPercent: 1.85,
    positionPnlDollar: 92.5,
    entryPrice: 196.5,
    targetPrice: 188.0,
    stopLossPrice: 199.0,
    reason: "고점 단기 저항선 부근 매도 압력 출현 숏 진입",
    lastUpdated: "4초 전"
  },
  {
    symbol: "086520",
    name: "에코프로비엠",
    category: "KR_STOCK",
    marketType: "KOREA",
    currentPrice: 168000,
    changePercent: -3.45,
    unit: "원",
    exchange: "국내 KOSDAQ",
    leverage: "2.5x 미수",
    aiScore: 78,
    scanStatus: "RISK_AVOID",
    positionPnlPercent: 0,
    positionPnlDollar: 0,
    entryPrice: 0,
    targetPrice: 0,
    stopLossPrice: 0,
    reason: "변동성 지수 급증으로 AI 리스크 관리 모드 대기",
    lastUpdated: "5초 전"
  },
  {
    symbol: "AAPL",
    name: "애플",
    category: "US_STOCK",
    marketType: "US",
    currentPrice: 228.4,
    changePercent: 0.85,
    unit: "$",
    exchange: "미국 NASDAQ",
    leverage: "5x CFD",
    aiScore: 89,
    scanStatus: "WATCHING",
    positionPnlPercent: 0,
    positionPnlDollar: 0,
    entryPrice: 0,
    targetPrice: 235.0,
    stopLossPrice: 222.0,
    reason: "이동평균선 정배열 응축 후 방향성 타점 대기",
    lastUpdated: "2초 전"
  },
  {
    symbol: "028300",
    name: "HLB",
    category: "KR_STOCK",
    marketType: "KOREA",
    currentPrice: 84500,
    changePercent: 4.80,
    unit: "원",
    exchange: "국내 KOSDAQ",
    leverage: "2.5x 미수",
    aiScore: 93,
    scanStatus: "LONG_ACTIVE",
    positionPnlPercent: 4.10,
    positionPnlDollar: 205.0,
    entryPrice: 82800,
    targetPrice: 89000,
    stopLossPrice: 81000,
    reason: "FDA 모멘텀 재점화 및 1분봉 거래 대금 실시간 급증",
    lastUpdated: "방금 전"
  },
  {
    symbol: "DOGE",
    name: "도지코인",
    category: "CRYPTO",
    marketType: "BTC",
    currentPrice: 0.385,
    changePercent: 8.20,
    unit: "$",
    exchange: "업비트 24H",
    leverage: "10x 핑퐁",
    aiScore: 94,
    scanStatus: "LONG_ACTIVE",
    positionPnlPercent: 7.40,
    positionPnlDollar: 370.0,
    entryPrice: 0.368,
    targetPrice: 0.420,
    stopLossPrice: 0.355,
    reason: "트위터/SNS 모멘텀 언급률 350% 폭증 급등타점",
    lastUpdated: "1초 전"
  },
  {
    symbol: "XRP",
    name: "리플",
    category: "CRYPTO",
    marketType: "BTC",
    currentPrice: 1.48,
    changePercent: -0.65,
    unit: "$",
    exchange: "업비트 24H",
    leverage: "10x 핑퐁",
    aiScore: 86,
    scanStatus: "SCANNING",
    positionPnlPercent: 0,
    positionPnlDollar: 0,
    entryPrice: 0,
    targetPrice: 1.55,
    stopLossPrice: 1.42,
    reason: "4시간봉 골든크로스 결합 AI 매수 신호 타점 계산 중",
    lastUpdated: "3초 전"
  }
];

export const LiveChallengeTrackingPanel: React.FC<LiveChallengeTrackingPanelProps> = ({
  selectedSymbol,
  onSelectAsset,
  onQuickTrade,
  challengeMode = "MOCK",
  exchangeRateKRW = 1520
}) => {
  const [assets, setAssets] = useState<TrackedAssetPosition[]>(INITIAL_TRACKED_ASSETS);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"ALL" | "ACTIVE_ONLY" | "LONG_ONLY" | "SHORT_ONLY" | "CRYPTO" | "KR_STOCK" | "US_STOCK">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLiveScanningActive, setIsLiveScanningActive] = useState(true);

  // Live Simulation Updates
  useEffect(() => {
    if (!isLiveScanningActive) return;

    const interval = setInterval(() => {
      setAssets(prev =>
        prev.map(asset => {
          // Fluctuate price slightly
          const changeDelta = (Math.random() - 0.49) * 0.004;
          const newPrice = Math.max(0.01, asset.currentPrice * (1 + changeDelta));
          
          let newPnlPct = asset.positionPnlPercent;
          let newPnlDol = asset.positionPnlDollar;

          if (asset.scanStatus === "LONG_ACTIVE") {
            const diffPct = ((newPrice - asset.entryPrice) / asset.entryPrice) * 100 * 10;
            newPnlPct = Math.round(diffPct * 100) / 100;
            newPnlDol = Math.round(newPnlPct * 50 * 10) / 10;
          } else if (asset.scanStatus === "SHORT_ACTIVE") {
            const diffPct = ((asset.entryPrice - newPrice) / asset.entryPrice) * 100 * 10;
            newPnlPct = Math.round(diffPct * 100) / 100;
            newPnlDol = Math.round(newPnlPct * 50 * 10) / 10;
          }

          // Randomly update AI score slightly
          const scoreDelta = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
          const newScore = Math.min(99, Math.max(70, asset.aiScore + scoreDelta));

          return {
            ...asset,
            currentPrice: Number(newPrice.toFixed(asset.category === "KR_STOCK" ? 0 : asset.currentPrice < 1 ? 4 : 2)),
            positionPnlPercent: newPnlPct,
            positionPnlDollar: newPnlDol,
            aiScore: newScore,
            lastUpdated: "방금 전"
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveScanningActive]);

  // Statistics
  const activePositions = useMemo(() => assets.filter(a => a.scanStatus === "LONG_ACTIVE" || a.scanStatus === "SHORT_ACTIVE"), [assets]);
  const longCount = useMemo(() => assets.filter(a => a.scanStatus === "LONG_ACTIVE").length, [assets]);
  const shortCount = useMemo(() => assets.filter(a => a.scanStatus === "SHORT_ACTIVE").length, [assets]);
  const totalPositionPnLDollar = useMemo(() => activePositions.reduce((sum, a) => sum + a.positionPnlDollar, 0), [activePositions]);
  const avgAiScore = useMemo(() => Math.round(assets.reduce((sum, a) => sum + a.aiScore, 0) / (assets.length || 1)), [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (activeCategoryFilter === "ACTIVE_ONLY") {
        return asset.scanStatus === "LONG_ACTIVE" || asset.scanStatus === "SHORT_ACTIVE";
      }
      if (activeCategoryFilter === "LONG_ONLY") return asset.scanStatus === "LONG_ACTIVE";
      if (activeCategoryFilter === "SHORT_ONLY") return asset.scanStatus === "SHORT_ACTIVE";
      if (activeCategoryFilter === "CRYPTO") return asset.category === "CRYPTO";
      if (activeCategoryFilter === "KR_STOCK") return asset.category === "KR_STOCK";
      if (activeCategoryFilter === "US_STOCK") return asset.category === "US_STOCK";

      return true;
    });
  }, [assets, activeCategoryFilter, searchQuery]);

  return (
    <div className="bg-slate-950 border border-indigo-900/50 rounded-2xl p-4 sm:p-5 text-slate-100 space-y-4 shadow-xl relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-900 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-md text-white">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                <span>📡 AI 마켓 유니버스 실시간 시세 & 스캔 트래킹</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold border ${
                  challengeMode === "REAL" 
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                    : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                }`}>
                  {challengeMode === "REAL" ? "⚡ 실거래 연동 시장 스캐너" : "🧪 모의 시뮬레이션"}
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {challengeMode === "REAL" 
                ? "💡 아래 목록은 AI가 실시간 타점을 탐색 중인 [마켓 관제 유니버스]입니다. (실제 매수하신 보유종목은 상단 [10억 챌린지 실거래 보유 종목]에만 표시됩니다)"
                : "AI가 1초마다 실시간 스캔 중인 유니버스 종목 풀 & 롱/숏 시뮬레이션 타점 현황"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsLiveScanningActive(!isLiveScanningActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
              isLiveScanningActive
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveScanningActive ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
            <span>{isLiveScanningActive ? "실시간 AI 유니버스 스캔 가동 중" : "스캔 일시정지됨"}</span>
          </button>
        </div>
      </div>

      {/* SUMMARY KPI CARDS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
        <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>실시간 스캔 종목</span>
            <Search className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-black font-mono text-white flex items-baseline gap-1">
            <span>{assets.length}</span>
            <span className="text-xs font-normal text-slate-400">개 풀</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            업비트 / KRX / NASDAQ
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>실시간 포지션 보유</span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black font-mono text-white flex items-center gap-2">
            <span className="text-emerald-400">롱 {longCount}</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">숏 {shortCount}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            총 {activePositions.length}개 종목 가동 중
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>포지션 합산 평가손익</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className={`text-lg font-black font-mono ${totalPositionPnLDollar >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {totalPositionPnLDollar >= 0 ? "+" : ""}${totalPositionPnLDollar.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            (약 ₩{Math.round(totalPositionPnLDollar * exchangeRateKRW).toLocaleString()}원)
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>평균 AI 신뢰도 점수</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-black font-mono text-purple-300 flex items-baseline gap-1">
            <span>{avgAiScore}</span>
            <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            SMC & 퀀트 4레이어 검증
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 relative z-10">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto">
          {[
            { key: "ALL", label: `전체 종목 (${assets.length})` },
            { key: "ACTIVE_ONLY", label: `⚡ 보유 포지션 (${activePositions.length})` },
            { key: "LONG_ONLY", label: `🟢 롱 포지션 (${longCount})` },
            { key: "SHORT_ONLY", label: `🔴 숏 포지션 (${shortCount})` },
            { key: "CRYPTO", label: "가상자산" },
            { key: "KR_STOCK", label: "국내주식" },
            { key: "US_STOCK", label: "미국주식" }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveCategoryFilter(tab.key as any)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeCategoryFilter === tab.key
                  ? "bg-indigo-600 text-white font-black shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-48">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="종목명/티커 검색..."
            className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* TRACKED POSITIONS MATRIX CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
        {filteredAssets.length === 0 ? (
          <div className="col-span-full py-10 text-center text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-slate-800/50 space-y-1">
            <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="font-bold">조건에 해당하는 트래킹 종목이 없습니다.</p>
            <p className="text-[11px]">필터 조건을 변경하거나 검색어를 확인해 주세요.</p>
          </div>
        ) : (
          filteredAssets.map(asset => {
            const isSelected = selectedSymbol === asset.symbol;
            const isLong = asset.scanStatus === "LONG_ACTIVE";
            const isShort = asset.scanStatus === "SHORT_ACTIVE";
            const isActive = isLong || isShort;
            const mktStatus = getMarketStatus(asset.marketType);

            return (
              <div
                key={asset.symbol}
                className={`p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between space-y-2.5 ${
                  isSelected
                    ? "bg-gradient-to-b from-slate-900 to-indigo-950/80 border-indigo-400 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400/50"
                    : isActive
                    ? isLong
                      ? "bg-slate-900/90 border-emerald-500/50 hover:border-emerald-400"
                      : "bg-slate-900/90 border-rose-500/50 hover:border-rose-400"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Top Status & Name Bar */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-sm text-white">{asset.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                        {asset.symbol}
                      </span>
                      <span className="text-[9px] font-mono text-indigo-300 bg-indigo-950 border border-indigo-800 px-1 rounded">
                        {asset.leverage}
                      </span>
                      {/* Market Open/Close Indicator */}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        mktStatus.isOpen 
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}>
                        {mktStatus.isOpen ? "🟢 개장 중" : "🔴 장마감"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                      <span>{asset.exchange}</span>
                      <span className="text-slate-600">•</span>
                      <span className={mktStatus.isOpen ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                        {mktStatus.isOpen ? "실시간 체결 가능" : "체결 대기 (장시간 외)"}
                      </span>
                    </div>
                  </div>

                  {/* Scan Status Badge */}
                  <div>
                    {isLong ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 flex items-center gap-1 animate-pulse">
                        <TrendingUp className="w-3 h-3" />
                        <span>LONG 보유중</span>
                      </span>
                    ) : isShort ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-400/50 flex items-center gap-1 animate-pulse">
                        <TrendingDown className="w-3 h-3" />
                        <span>SHORT 보유중</span>
                      </span>
                    ) : asset.scanStatus === "WATCHING" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Eye className="w-3 h-3 text-amber-400" />
                        <span>타점 대기중</span>
                      </span>
                    ) : asset.scanStatus === "RISK_AVOID" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>리스크 관망</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>AI 스캔중</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & PnL Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-slate-400">현재가</div>
                    <div className="font-bold text-slate-100 flex items-baseline gap-1">
                      <span>{asset.unit === "원" ? `₩${(asset.currentPrice ?? 0).toLocaleString()}` : `$${(asset.currentPrice ?? 0).toLocaleString()}`}</span>
                      <span className={`text-[10px] font-bold ${asset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {asset.changePercent >= 0 ? "+" : ""}{asset.changePercent}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400">
                      {isActive ? "포지션 손익" : "AI 신뢰도 점수"}
                    </div>
                    {isActive ? (
                      <div className={`font-black flex items-baseline gap-1 ${asset.positionPnlPercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        <span>{asset.positionPnlPercent >= 0 ? "+" : ""}{asset.positionPnlPercent}%</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          ({asset.positionPnlDollar >= 0 ? "+" : ""}${asset.positionPnlDollar})
                        </span>
                      </div>
                    ) : (
                      <div className="font-black text-purple-300 flex items-baseline gap-1">
                        <span>{asset.aiScore}점</span>
                        <span className="text-[10px] text-purple-400/80 font-normal">SMC Grade A</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Rationale / Reason Statement */}
                <div className="text-[11px] text-slate-300 leading-tight bg-slate-900/80 p-2 rounded-lg border border-slate-800/60 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{asset.reason}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => onSelectAsset && onSelectAsset(asset.symbol)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-400 font-black shadow-xs"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isSelected ? "선택 중 (차트 바인딩)" : "차트 감시"}</span>
                  </button>

                  {onQuickTrade && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onQuickTrade(asset.symbol, "LONG")}
                        disabled={!mktStatus.isOpen}
                        className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          mktStatus.isOpen
                            ? "bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60"
                        }`}
                        title={mktStatus.isOpen ? `${asset.name} 롱 매수 진입` : `${asset.name} 장마감 (주문 불가)`}
                      >
                        롱
                      </button>
                      <button
                        onClick={() => onQuickTrade(asset.symbol, "SHORT")}
                        disabled={!mktStatus.isOpen}
                        className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          mktStatus.isOpen
                            ? "bg-rose-600/30 hover:bg-rose-600 text-rose-300 border-rose-500/40"
                            : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60"
                        }`}
                        title={mktStatus.isOpen ? `${asset.name} 숏 매도 진입` : `${asset.name} 장마감 (주문 불가)`}
                      >
                        숏
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
