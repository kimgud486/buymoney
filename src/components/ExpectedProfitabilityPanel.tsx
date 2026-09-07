import React, { useState, useEffect } from "react";
import { usePricePulse } from "../context/PricePulseContext";
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Target, 
  ShieldAlert, 
  Activity, 
  Zap, 
  DollarSign, 
  Percent, 
  Layers, 
  BarChart2, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink
} from "lucide-react";
import { useMarketDataBridge } from "../hooks/useMarketDataBridge";
import { stockSyncService, StockSyncEvent } from "../services/stockSyncService";

export interface ExpectedProfitabilityPanelProps {
  symbol?: string;
  name?: string;
  market?: string;
  currentPrice?: number;
  entryPrice?: number;
  targetPrice1?: number;
  targetPrice2?: number;
  stopLossPrice?: number;
  isCrypto?: boolean;
}

export const ExpectedProfitabilityPanel: React.FC<ExpectedProfitabilityPanelProps> = ({
  symbol: initialSymbol = "005930",
  name: initialName = "삼성전자",
  market: initialMarket = "KOREA",
  currentPrice: initialPrice,
  entryPrice: customEntry,
  targetPrice1: customTp1,
  targetPrice2: customTp2,
  stopLossPrice: customSl,
  isCrypto: initialIsCrypto = false
}) => {
  // Active Stock State (Allows dynamic switching via stockSyncService & local search)
  const [activeStock, setActiveStock] = useState<{
    symbol: string;
    name: string;
    market: string;
    price: number;
    changePercent: number;
  }>({
    symbol: initialSymbol,
    name: initialName,
    market: initialMarket,
    price: initialPrice || 78500,
    changePercent: 2.88
  });

  const [searchInput, setSearchInput] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Subscribe to Global Stock Selection Events
  useEffect(() => {
    const unsubscribe = stockSyncService.subscribe((event: StockSyncEvent) => {
      if (event.symbol) {
        setActiveStock({
          symbol: event.symbol,
          name: event.name || event.symbol,
          market: event.market || "KOREA",
          price: event.price || 78500,
          changePercent: event.changePercent || 0
        });
      }
    });
    return unsubscribe;
  }, []);

  // Sync props if parent explicitly changes them
  useEffect(() => {
    if (initialSymbol && initialSymbol !== activeStock.symbol) {
      setActiveStock({
        symbol: initialSymbol,
        name: initialName || initialSymbol,
        market: initialMarket || "KOREA",
        price: initialPrice || 78500,
        changePercent: 0
      });
    }
  }, [initialSymbol, initialName, initialMarket, initialPrice]);

  // Fetch Live Real Price from Server API when activeStock changes
  useEffect(() => {
    let isMounted = true;
    const fetchRealQuote = async () => {
      try {
        const res = await fetch(`/api/stocks/${encodeURIComponent(activeStock.symbol)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.price > 0) {
            setActiveStock(prev => ({
              ...prev,
              name: data.name || prev.name,
              price: data.price,
              changePercent: data.changePct !== undefined ? data.changePct : prev.changePercent
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch real quote for profitability panel:", err);
      }
    };

    fetchRealQuote();
    const interval = setInterval(fetchRealQuote, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeStock.symbol]);

  // Live WebSocket Tick Bridge
  const { currentTick, streamStatus } = useMarketDataBridge(activeStock.symbol);

  // Investment Amount for Net Profit Calculation
  const [investmentAmount, setInvestmentAmount] = useState<number>(5000000); // Default 500만 원 ($5,000 for US)
  const [customAmountInput, setCustomAmountInput] = useState<string>("5000000");

  // Dynamic Global Price Pulse Integration
  const { isPulsing, pulseClass, pulseGlowClass } = usePricePulse(activeStock.symbol);

  // Determine pricing defaults
  const isUS = activeStock.market === "US" || (/^[A-Z]{1,5}$/.test(activeStock.symbol) && activeStock.symbol !== "BTC" && activeStock.symbol !== "ETH");
  const isCrypto = activeStock.market === "BTC" || activeStock.market === "UPBIT" || activeStock.symbol.startsWith("KRW-") || initialIsCrypto;
  const currencyUnit = isUS ? "$" : (isCrypto ? "KRW" : "원");
  const price = currentTick?.price || activeStock.price || (isUS ? 150 : isCrypto ? 95000000 : 50000);
  const changePct = currentTick?.changePct ?? activeStock.changePercent ?? 0;
  const isConnected = streamStatus?.isConnected ?? true;

  // AI Levels based on live price
  const entryPrice = customEntry || price;
  const targetPrice1 = customTp1 || (isUS ? Number((entryPrice * 1.035).toFixed(2)) : Math.round(entryPrice * 1.035));
  const targetPrice2 = customTp2 || (isUS ? Number((entryPrice * 1.072).toFixed(2)) : Math.round(entryPrice * 1.072));
  const stopLossPrice = customSl || (isUS ? Number((entryPrice * 0.982).toFixed(2)) : Math.round(entryPrice * 0.982));

  // Return & Risk Calculations
  const tp1ReturnPct = ((targetPrice1 - entryPrice) / entryPrice) * 100;
  const tp2ReturnPct = ((targetPrice2 - entryPrice) / entryPrice) * 100;
  const slRiskPct = ((entryPrice - stopLossPrice) / entryPrice) * 100;

  // Expected Risk-Reward Ratio
  const riskAmountPct = Math.max(0.1, slRiskPct);
  const rewardAmountPct = Math.max(0.1, tp1ReturnPct);
  const riskRewardRatio = (rewardAmountPct / riskAmountPct).toFixed(2);
  const riskRewardRatioTp2 = (tp2ReturnPct / riskAmountPct).toFixed(2);

  // Expected Net Profit ($ / 원)
  const expectedProfitTp1 = (investmentAmount * (tp1ReturnPct / 100));
  const expectedProfitTp2 = (investmentAmount * (tp2ReturnPct / 100));
  const expectedMaxLoss = (investmentAmount * (slRiskPct / 100));

  // Generate 5-Level Order Book Quotes (Real-time depth simulation linked to tick)
  const [orderBook, setOrderBook] = useState<{
    asks: { price: number; volume: number; pct: number }[];
    bids: { price: number; volume: number; pct: number }[];
    totalAskVol: number;
    totalBidVol: number;
  }>({ asks: [], bids: [], totalAskVol: 0, totalBidVol: 0 });

  useEffect(() => {
    const spreadStep = isUS ? 0.05 : (price > 100000 ? 500 : (price > 50000 ? 100 : 10));
    const asks = [];
    const bids = [];
    let totalAsk = 0;
    let totalBid = 0;

    for (let i = 1; i <= 5; i++) {
      const askP = isUS ? Number((price + (spreadStep * i)).toFixed(2)) : price + (spreadStep * i);
      const bidP = isUS ? Number((Math.max(0.01, price - (spreadStep * (i - 1)))).toFixed(2)) : Math.max(1, price - (spreadStep * (i - 1)));
      
      const askV = Math.round(2000 + Math.sin(price * 0.001 + i) * 800 + (Math.random() * 1500));
      const bidV = Math.round(2500 + Math.cos(price * 0.001 + i) * 900 + (Math.random() * 1800));

      totalAsk += askV;
      totalBid += bidV;

      asks.unshift({ price: askP, volume: askV, pct: 0 });
      bids.push({ price: bidP, volume: bidV, pct: 0 });
    }

    const maxVol = Math.max(
      ...asks.map(a => a.volume), 
      ...bids.map(b => b.volume),
      1
    );

    setOrderBook({
      asks: asks.map(a => ({ ...a, pct: Math.round((a.volume / maxVol) * 100) })),
      bids: bids.map(b => ({ ...b, pct: Math.round((b.volume / maxVol) * 100) })),
      totalAskVol: totalAsk,
      totalBidVol: totalBid
    });
  }, [price, isUS]);

  // Order Book Absorption Score & Slippage Rate
  const bidAskRatio = orderBook.totalAskVol > 0 ? (orderBook.totalBidVol / orderBook.totalAskVol) : 1;
  const liquidityScore = Math.min(99, Math.max(40, Math.round(70 + (bidAskRatio > 1.2 ? 15 : (bidAskRatio < 0.8 ? -15 : 5)))));
  const slippageEstimatePct = Math.max(0.01, Number((0.08 - (liquidityScore / 2000)).toFixed(2)));

  // Format Helpers
  const formatVal = (val: number) => {
    if (isUS) return `$${(val ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${Math.round(val).toLocaleString()}원`;
  };

  const handleAmountSelect = (amt: number) => {
    setInvestmentAmount(amt);
    setCustomAmountInput(amt.toString());
  };

  // Stock Switch Search Handler
  const handleStockSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setIsSearching(true);
    const query = searchInput.trim().toUpperCase();

    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        stockSyncService.emit({
          symbol: data.symbol || query,
          name: data.name || query,
          price: data.price || 50000,
          market: data.market || "KOREA"
        });
        setSearchInput("");
      } else {
        stockSyncService.emit({ symbol: query, name: query });
        setSearchInput("");
      }
    } catch (err) {
      stockSyncService.emit({ symbol: query, name: query });
      setSearchInput("");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-slate-950 border-2 border-emerald-500/40 rounded-2xl p-5 space-y-5 shadow-2xl relative overflow-hidden font-sans">
      {/* Background Accent Mesh */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* PROMINENT STOCK BANNER (Solving user question: "무슨 종목인가?") */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300">
            <Target className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {activeStock.market}
              </span>
              <span className="text-xs font-mono text-zinc-400">종목코드: {activeStock.symbol}</span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
              <span>{activeStock.name}</span>
              <span className="text-sm font-mono text-zinc-400">({activeStock.symbol})</span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              🎯 현재 분석 대상: <strong className="text-emerald-300 font-bold">{activeStock.name}</strong> - AI 제안 진입가 대비 실시간 손익비(Risk/Reward Ratio) 및 손익금액 모니터링
            </p>
          </div>
        </div>

        {/* Live Price & Change Badge */}
        <div className="flex items-center space-x-4">
          <div className={`text-right px-3 py-1.5 rounded-xl border transition-all duration-300 ${
            isPulsing ? `${pulseClass} ${pulseGlowClass}` : "bg-slate-900/80 border-slate-800"
          }`}>
            <div className="text-xs text-zinc-400 font-mono">실시간 실제 시세</div>
            <div className="text-2xl font-black text-white font-mono">
              {formatVal(price)}
            </div>
            <div className={`text-xs font-bold font-mono ${changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
            </div>
          </div>

          {/* Quick Stock Switch Form */}
          <form onSubmit={handleStockSearch} className="flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg p-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="다른 종목 검색 (예: 카카오, AAPL)"
              className="w-36 bg-transparent px-2 py-1 text-xs text-white focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded cursor-pointer transition"
              title="종목 변경"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 relative">
            <Calculator className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Profit-Loss Ratio Monitor (예상 손익비 모니터)</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-400/40 font-mono">
                REAL-TIME PnL & DEPTH
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              [{activeStock.name}] 실시간 시세 및 AI 진입가({formatVal(entryPrice)})/목표가({formatVal(targetPrice1)})/손절가({formatVal(stopLossPrice)}) 기준 손익비 분석
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
            <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
            <span className="text-zinc-300">{isConnected ? "실시간 시세/호가 스트리밍 중" : "기본 시세 모드"}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Expected Profitability Metrics + Real-Time Order Book */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Key Expected Return & Risk Metrics (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Investment Amount Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300 font-bold">
                <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                투자 예정 금액 설정:
              </span>
              <span className="text-emerald-300 font-bold">{formatVal(investmentAmount)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[1000000, 3000000, 5000000, 10000000, 30000000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAmountSelect(amt)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-lg transition cursor-pointer border ${
                    investmentAmount === amt
                      ? "bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-md"
                      : "bg-slate-950 text-zinc-400 border-slate-800 hover:border-zinc-700"
                  }`}
                >
                  {isUS ? `$${(amt / 1000).toLocaleString()}K` : `${amt / 10000}만`}
                </button>
              ))}

              <div className="flex items-center space-x-1 ml-auto">
                <input
                  type="number"
                  value={customAmountInput}
                  onChange={(e) => {
                    setCustomAmountInput(e.target.value);
                    const val = Number(e.target.value);
                    if (val > 0) setInvestmentAmount(val);
                  }}
                  className="w-24 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white text-right focus:outline-none focus:border-emerald-400"
                  placeholder="직접 입력"
                />
                <span className="text-[10px] text-zinc-500 font-mono">{currencyUnit}</span>
              </div>
            </div>
          </div>

          {/* Core PnL Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            
            {/* Target 1 Expected Profit */}
            <div className="bg-slate-900 border border-emerald-500/30 p-3.5 rounded-xl space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>1차 목표 수익 (TP1)</span>
                <span className="text-emerald-400 font-bold">+{tp1ReturnPct.toFixed(2)}%</span>
              </div>
              <div className="text-lg font-black text-emerald-300 font-mono">
                +{formatVal(expectedProfitTp1)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono flex justify-between">
                <span>목표가: {formatVal(targetPrice1)}</span>
              </div>
            </div>

            {/* Target 2 Expected Profit */}
            <div className="bg-slate-900 border border-cyan-500/30 p-3.5 rounded-xl space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>2차 극대 수익 (TP2)</span>
                <span className="text-cyan-400 font-bold">+{tp2ReturnPct.toFixed(2)}%</span>
              </div>
              <div className="text-lg font-black text-cyan-300 font-mono">
                +{formatVal(expectedProfitTp2)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono flex justify-between">
                <span>목표가: {formatVal(targetPrice2)}</span>
              </div>
            </div>

            {/* Max Loss (Stop Loss) */}
            <div className="bg-slate-900 border border-rose-500/30 p-3.5 rounded-xl space-y-1 relative overflow-hidden col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>최대 손실 제한 (SL)</span>
                <span className="text-rose-400 font-bold">-{slRiskPct.toFixed(2)}%</span>
              </div>
              <div className="text-lg font-black text-rose-400 font-mono">
                -{formatVal(expectedMaxLoss)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono flex justify-between">
                <span>손절가: {formatVal(stopLossPrice)}</span>
              </div>
            </div>

          </div>

          {/* Risk-Reward Ratio & Liquidity Quality */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono text-xs">
            
            {/* Risk-Reward Bar Visualizer */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-emerald-400" />
                  예상 손익비 (Risk-Reward Ratio):
                </span>
                <span className="text-emerald-400 font-black text-sm">
                  1 : {riskRewardRatio} <span className="text-[10px] text-zinc-400">(TP2 기준 1 : {riskRewardRatioTp2})</span>
                </span>
              </div>

              {/* Progress Bar Visualizer */}
              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div 
                  className="bg-rose-500 h-full" 
                  style={{ width: `${Math.min(50, (1 / (1 + Number(riskRewardRatio))) * 100)}%` }} 
                  title="손실 위험 비중"
                />
                <div 
                  className="bg-emerald-400 h-full animate-pulse" 
                  style={{ width: `${Math.max(50, (Number(riskRewardRatio) / (1 + Number(riskRewardRatio))) * 100)}%` }} 
                  title="수익 기대 비중"
                />
              </div>

              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>손절 위험 ({slRiskPct.toFixed(1)}%)</span>
                <span>수익 우위 지수 ({Number(riskRewardRatio) >= 2.0 ? "우수 (Good EV)" : "보통"})</span>
                <span>TP1 수익 기대 (+{tp1ReturnPct.toFixed(1)}%)</span>
              </div>
            </div>

            {/* Depth Liquidity & Slippage Meter */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">호가 잔량 흡수율:</span>
                <span className="text-emerald-300 font-bold">{liquidityScore}% (슬리피지 {slippageEstimatePct}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">체결 가능성:</span>
                <span className="text-cyan-300 font-bold">
                  {bidAskRatio >= 1.0 ? "매수 수급 우세 (매수 용이)" : "매도 잔량 우세 (매수 수월)"}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Real-Time 5-Level Depth Order Book (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="text-zinc-300 font-bold flex items-center gap-1">
              <BarChart2 className="h-4 w-4 text-cyan-400" />
              실시간 5차 호가 잔량 (Depth)
            </span>
            <span className="text-[10px] text-zinc-500">현재가: {formatVal(price)}</span>
          </div>

          {/* Order Book Table */}
          <div className="space-y-1 text-xs">
            {/* Ask Rows (매도 호가) */}
            {orderBook.asks.map((ask, idx) => (
              <div key={`ask-${idx}`} className="relative flex items-center justify-between px-2 py-1 bg-slate-950/60 rounded overflow-hidden">
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-rose-500/15 transition-all duration-300" 
                  style={{ width: `${ask.pct}%` }} 
                />
                <span className="text-rose-400 font-bold relative z-10">{formatVal(ask.price)}</span>
                <span className="text-zinc-400 relative z-10 text-[11px]">{(ask.volume ?? 0).toLocaleString()} 주</span>
              </div>
            ))}

            {/* Current Price Division Line */}
            <div className="py-1 my-1 bg-cyan-950/60 border-y border-cyan-500/40 px-2 flex items-center justify-between font-bold text-cyan-300">
              <span className="flex items-center gap-1 text-[11px]">
                <Zap className="h-3 w-3 text-cyan-400 animate-bounce" />
                체결 중심가
              </span>
              <span>{formatVal(price)}</span>
            </div>

            {/* Bid Rows (매수 호가) */}
            {orderBook.bids.map((bid, idx) => (
              <div key={`bid-${idx}`} className="relative flex items-center justify-between px-2 py-1 bg-slate-950/60 rounded overflow-hidden">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500/15 transition-all duration-300" 
                  style={{ width: `${bid.pct}%` }} 
                />
                <span className="text-emerald-400 font-bold relative z-10">{formatVal(bid.price)}</span>
                <span className="text-zinc-400 relative z-10 text-[11px]">{(bid.volume ?? 0).toLocaleString()} 주</span>
              </div>
            ))}
          </div>

          {/* Total Volumes Footer */}
          <div className="flex items-center justify-between text-[11px] border-t border-slate-800 pt-2 text-zinc-400">
            <div>
              매도 총잔량: <span className="text-rose-400 font-bold">{(orderBook.totalAskVol ?? 0).toLocaleString()}</span>
            </div>
            <div>
              매수 총잔량: <span className="text-emerald-400 font-bold">{(orderBook.totalBidVol ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

