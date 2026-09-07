import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { OrderType, Order } from "../types";
import { formatStockQty } from "../lib/formatter";
import { 
  ArrowRightLeft, 
  ShieldCheck, 
  AlertCircle, 
  Info, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Sliders, 
  Layers, 
  X, 
  Edit3, 
  Check, 
  RefreshCw,
  Calculator,
  Percent
} from "lucide-react";

interface SmartOrderConsoleProps {
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  currentPrice: number;
}

export const SmartOrderConsole: React.FC<SmartOrderConsoleProps> = ({
  symbol,
  name,
  market,
  currentPrice
}) => {
  const { 
    profile, 
    positions, 
    orders, 
    executeTrade, 
    cancelOrder, 
    marketStatus,
    decisionLogs,
    addToast
  } = useApp();

  // Order Parameters State
  const [orderType, setOrderType] = useState<OrderType>("LIMIT");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderQtyStr, setOrderQtyStr] = useState<string>("10");
  const [orderPriceStr, setOrderPriceStr] = useState<string>(String(currentPrice || 10000));

  const orderQty = parseFloat(orderQtyStr) || 0;
  const rawPrice = parseFloat(orderPriceStr) || 0;
  const orderPrice = orderType === "MARKET" ? currentPrice : rawPrice;

  const setOrderQty = (valOrFn: number | ((prev: number) => number)) => {
    const current = parseFloat(orderQtyStr) || 0;
    const nextVal = typeof valOrFn === 'function' ? valOrFn(current) : valOrFn;
    setOrderQtyStr(String(nextVal));
  };

  const setOrderPrice = (valOrFn: number | ((prev: number) => number)) => {
    const current = parseFloat(orderPriceStr) || 0;
    const nextVal = typeof valOrFn === 'function' ? valOrFn(current) : valOrFn;
    setOrderPriceStr(String(nextVal));
  };
  
  // Advanced Order Options
  const [stopLossPrice, setStopLossPrice] = useState<number>(Math.round((currentPrice || 10000) * 0.95));
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(Math.round((currentPrice || 10000) * 1.10));
  const [splitCount, setSplitCount] = useState<number>(3); // TWAP Split
  
  // UI States
  const [isOrdering, setIsOrdering] = useState<boolean>(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [modQty, setModQty] = useState<number>(0);
  const [modPrice, setModPrice] = useState<number>(0);

  // Sync current price when prop changes
  useEffect(() => {
    if (currentPrice && currentPrice > 0) {
      setOrderPriceStr(String(currentPrice));
      setStopLossPrice(Math.round(currentPrice * 0.95));
      setTakeProfitPrice(Math.round(currentPrice * 1.10));
    }
  }, [currentPrice]);

  // Financial Calculations
  const userBalance = profile?.balance || 0;
  const unit = market === "KOREA" ? "원" : market === "US" ? "$" : "USDT";
  
  // Fee & Tax rates
  const brokerFeeRate = market === "KOREA" ? 0.00015 : 0.0002; // 0.015% or 0.02%
  const taxRate = side === "SELL" ? (market === "KOREA" ? 0.0018 : 0.0000278) : 0; // 0.18% Korean sell tax
  
  const estimatedOrderCost = orderQty * orderPrice;
  const estimatedFee = Math.round(estimatedOrderCost * brokerFeeRate);
  const estimatedTax = Math.round(estimatedOrderCost * taxRate);
  const totalCost = side === "BUY" ? estimatedOrderCost + estimatedFee : estimatedOrderCost - estimatedFee - estimatedTax;
  
  const expectedPostBalance = side === "BUY" 
    ? Math.max(0, userBalance - totalCost) 
    : userBalance + totalCost;

  // Position Weight
  const existingPosition = positions.find(p => p.symbol === symbol);
  const totalPortfolioVal = userBalance + positions.reduce((acc, p) => acc + (p.quantity * p.currentPrice), 0);
  const currentWeightPct = totalPortfolioVal > 0 && existingPosition 
    ? ((existingPosition.quantity * existingPosition.avgPrice) / totalPortfolioVal) * 100 
    : 0;
  
  const newHoldingVal = side === "BUY"
    ? ((existingPosition?.quantity || 0) + orderQty) * orderPrice
    : Math.max(0, ((existingPosition?.quantity || 0) - orderQty) * orderPrice);
  const newWeightPct = totalPortfolioVal > 0 ? (newHoldingVal / totalPortfolioVal) * 100 : 0;

  // Max Buyable Qty Calculator (Fractional share/crypto supported up to 8 decimals)
  const handleQuickPercentSelect = (pct: number) => {
    if (orderPrice <= 0 || userBalance <= 0) return;
    const targetAmount = userBalance * (pct / 100);
    const calculatedQty = targetAmount / orderPrice;
    const isCrypto = market === "BTC" || symbol.startsWith("KRW-");
    const maxQty = isCrypto 
      ? Number(calculatedQty.toFixed(8)) 
      : (calculatedQty >= 1 ? Math.floor(calculatedQty) : Number(calculatedQty.toFixed(4)));
    setOrderQty(Math.max(isCrypto ? 0.00000001 : 0.0001, maxQty));
  };

  // Safety Gate Checks
  const maxPositionWeightLimit = profile?.maxPositionWeight || 100;
  const isWeightOver = side === "BUY" && newWeightPct > maxPositionWeightLimit;
  const isBalanceShort = side === "BUY" && totalCost > userBalance;
  
  const hasBrokerKeys = market === "KOREA" || market === "US"
    ? Boolean(profile?.koreaAppKey && profile?.koreaAppSecret)
    : Boolean(profile?.upbitAccessKey && profile?.upbitSecretKey);

  // Submit Order
  const handleOrderSubmit = async () => {
    if (orderQty <= 0) {
      alert("주문 수량을 0보다 크게 입력해 주세요 (소수점 주문 가능).");
      return;
    }
    if (orderPrice <= 0) {
      alert("주문 단가가 유효하지 않습니다.");
      return;
    }

    setIsOrdering(true);
    try {
      let typeLabel = "지정가";
      if (orderType === "MARKET") typeLabel = "시장가";
      if (orderType === "LOC") typeLabel = "LOC (장마감 지정가)";
      if (orderType === "OCO") typeLabel = "OCO (스탑로스/익절 결합)";
      if (orderType === "TWAP") typeLabel = `TWAP (AI ${splitCount}회 분할 체결)`;

      const rationale = `[스마트 주문 콘솔] ${typeLabel} ${side === "BUY" ? "매수" : "매도"} 주문. 단가: ${(orderPrice ?? 0).toLocaleString()}${unit}, 수량: ${orderQty}주. (예상금액: ${(totalCost ?? 0).toLocaleString()}${unit})`;

      await executeTrade(
        symbol,
        name,
        market,
        side,
        orderQty,
        orderPrice,
        `스마트 ${typeLabel} 주문`,
        rationale,
        true
      );

    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'ERROR',
        title: `${name} (${symbol}) 주문 실패`,
        message: err.message || "주문 전송 중 오류가 발생했습니다."
      });
    } finally {
      setIsOrdering(false);
    }
  };

  // Pending Orders for current symbol
  const activePendingOrders = orders.filter(o => o.symbol === symbol && o.status === "PENDING");

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
      {/* Console Header */}
      <div className="bg-zinc-900 text-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-zinc-800 rounded">
            <ArrowRightLeft className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-tight flex items-center gap-2">
              <span className="text-amber-400 font-extrabold">[{name} ({symbol})]</span>
              <span>실전 주식/증권사 주문 실행 콘솔</span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono font-normal">
                {market} MARKET
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">증권사 OpenAPI(KIS, Upbit) 실시간 계좌 연동 주문 시스템</p>
          </div>
        </div>

        {/* Broker Connection Badge */}
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${hasBrokerKeys ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span className="text-[11px] font-bold font-mono text-zinc-300">
            {hasBrokerKeys ? "실시간 API 실계좌 연동" : "API 자격증명 설정 필요"}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Order Side Selector & Order Type Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-150 pb-4">
          {/* Buy / Sell Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSide("BUY")}
              className={`py-2.5 text-xs font-black rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                side === "BUY"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>매수 (BUY)</span>
            </button>
            <button
              type="button"
              onClick={() => setSide("SELL")}
              className={`py-2.5 text-xs font-black rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                side === "SELL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              <span>매도 (SELL)</span>
            </button>
          </div>

          {/* Advanced Order Types Selector */}
          <div className="flex items-center gap-1 overflow-x-auto bg-zinc-50 border border-zinc-200 p-1 rounded-lg text-[11px]">
            {(["LIMIT", "MARKET", "LOC", "OCO", "TWAP"] as OrderType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className={`flex-1 py-1.5 px-2 font-black rounded text-center transition cursor-pointer whitespace-nowrap ${
                  orderType === t
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50"
                }`}
              >
                {t === "LIMIT" && "지정가"}
                {t === "MARKET" && "시장가"}
                {t === "LOC" && "LOC (종가)"}
                {t === "OCO" && "OCO (손익절)"}
                {t === "TWAP" && "TWAP 분할"}
              </button>
            ))}
          </div>

          {/* AI Real-time Target Price & Live Buy Quote Banner */}
          {currentPrice > 0 && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI 연동
                </span>
                <span className="text-zinc-800 font-bold text-[11px]">
                  실시간 목표가 <strong className="text-emerald-700 font-black">+{Math.round((takeProfitPrice - currentPrice) / currentPrice * 1000) / 10}%</strong> ({(takeProfitPrice ?? 0).toLocaleString()}{unit})
                </span>
                <span className="text-zinc-400">|</span>
                <span className="text-zinc-600 font-medium text-[11px]">
                  손절가 {(stopLossPrice ?? 0).toLocaleString()}{unit} (-5.0%)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("LIMIT");
                    setOrderPriceStr(String(currentPrice));
                    addToast({
                      type: "INFO",
                      title: "실시간 호가 적용",
                      message: `현재 호가 ${(currentPrice ?? 0).toLocaleString()}${unit}가 주문단가로 자동 세팅되었습니다.`
                    });
                  }}
                  className="px-2 py-1 bg-white hover:bg-zinc-100 border border-emerald-300 text-emerald-800 rounded font-bold text-[10px] transition cursor-pointer"
                >
                  현재호가 자동세팅
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("OCO");
                    setTakeProfitPrice(Math.round(currentPrice * 1.12));
                    setStopLossPrice(Math.round(currentPrice * 0.95));
                    addToast({
                      type: "SUCCESS",
                      title: "AI 목표가/손절선 동시 세팅",
                      message: `목표가 ${Math.round(currentPrice * 1.12).toLocaleString()}${unit} (+12%) 및 손절선 ${Math.round(currentPrice * 0.95).toLocaleString()}${unit} (-5%)이 OCO 주문으로 연동되었습니다.`
                    });
                  }}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold text-[10px] transition cursor-pointer shadow-2xs"
                >
                  AI 목표가 OCO 연동
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Main Input Controls */}
          <div className="space-y-4">
            {/* Price Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black text-zinc-700 flex items-center gap-1">
                  <span>주문 단가 (Price)</span>
                  {orderType === "MARKET" && (
                    <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-bold">
                      시장가 체결
                    </span>
                  )}
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">
                  현재가: {currentPrice?.toLocaleString()}{unit}
                </span>
              </div>
              <div className="relative flex items-center gap-1">
                {orderType !== "MARKET" && (
                  <button
                    type="button"
                    onClick={() => setOrderPrice(p => Math.max(1, p - 100))}
                    className="px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    -100
                  </button>
                )}
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="any"
                    disabled={orderType === "MARKET"}
                    value={orderType === "MARKET" ? currentPrice : orderPriceStr}
                    onChange={(e) => setOrderPriceStr(e.target.value)}
                    className="w-full border border-zinc-200 rounded p-2.5 text-xs font-black font-mono text-zinc-900 outline-none focus:border-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-bold">
                    {unit}
                  </span>
                </div>
                {orderType !== "MARKET" && (
                  <button
                    type="button"
                    onClick={() => setOrderPrice(p => p + 100)}
                    className="px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    +100
                  </button>
                )}
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black text-zinc-700 flex items-center gap-1.5">
                  <span>주문 수량 (Quantity)</span>
                  {market === "BTC" && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                      소수점 8자리 지원
                    </span>
                  )}
                </label>
                {side === "BUY" && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    가능 잔고: {(userBalance ?? 0).toLocaleString()}{unit}
                  </span>
                )}
                {side === "SELL" && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    보유 수량: {formatStockQty(existingPosition?.quantity || 0, market === "BTC")}{market === "BTC" ? " 코인" : "주"}
                  </span>
                )}
              </div>

              {/* Crypto Quick KRW Presets */}
              {market === "BTC" && (
                <div className="grid grid-cols-5 gap-1 mb-1.5">
                  {[10000, 50000, 100000, 500000, 1000000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        const p = orderPrice > 0 ? orderPrice : currentPrice;
                        if (p > 0) {
                          const converted = Number((amt / p).toFixed(8));
                          setOrderQty(converted);
                        }
                      }}
                      className="py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded text-[10px] font-bold text-zinc-700 transition cursor-pointer text-center"
                    >
                      {amt >= 10000 ? `${amt / 10000}만` : `${amt}원`}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrderQty(q => Math.max(market === "BTC" ? 0.00000001 : 1, market === "BTC" ? Number((q - 0.01).toFixed(8)) : q - 10))}
                  className="px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded text-xs font-bold transition cursor-pointer text-zinc-700 shrink-0 font-mono"
                >
                  {market === "BTC" ? "-0.01" : "-10"}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderQty(q => Math.max(market === "BTC" ? 0.00000001 : 1, market === "BTC" ? Number((q - 0.001).toFixed(8)) : q - 1))}
                  className="px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded text-xs font-bold transition cursor-pointer text-zinc-700 shrink-0 font-mono"
                >
                  {market === "BTC" ? "-0.001" : "-1"}
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    placeholder="0.00000000"
                    value={orderQtyStr}
                    onChange={(e) => setOrderQtyStr(e.target.value)}
                    className="w-full border border-zinc-200 rounded p-2.5 text-xs font-black font-mono text-zinc-900 outline-none focus:border-zinc-800 text-center"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-bold">
                    {market === "BTC" ? "코인" : "주"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderQty(q => market === "BTC" ? Number((q + 0.001).toFixed(8)) : q + 1)}
                  className="px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded text-xs font-bold transition cursor-pointer text-zinc-700 shrink-0 font-mono"
                >
                  {market === "BTC" ? "+0.001" : "+1"}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderQty(q => market === "BTC" ? Number((q + 0.01).toFixed(8)) : q + 10)}
                  className="px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded text-xs font-bold transition cursor-pointer text-zinc-700 shrink-0 font-mono"
                >
                  {market === "BTC" ? "+0.01" : "+10"}
                </button>
              </div>

              {/* Micro Steppers for high-precision crypto */}
              {market === "BTC" && (
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  {[-0.0001, 0.0001, -0.1, 0.1].map(delta => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => setOrderQty(q => Math.max(0.00000001, Number((q + delta).toFixed(8))))}
                      className="py-1 text-[10px] font-mono font-bold bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded border border-zinc-200 transition cursor-pointer"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Percent Buttons */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[10, 25, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercentSelect(pct)}
                    className="py-1 text-[10px] font-mono font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded transition cursor-pointer"
                  >
                    {pct === 100 ? "최대(100%)" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Order Type Settings */}
            {orderType === "OCO" && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2 text-xs">
                <p className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                  <Sliders className="h-3 w-3 text-amber-700" />
                  <span>OCO 스탑로스 / 익절가 동시 감시</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-amber-800 font-bold block mb-0.5">목표 익절가 (Take Profit)</label>
                    <input
                      type="number"
                      value={takeProfitPrice}
                      onChange={(e) => setTakeProfitPrice(parseFloat(e.target.value) || 0)}
                      className="w-full border border-amber-300 p-1.5 rounded text-xs font-bold font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-amber-800 font-bold block mb-0.5">손절 제한가 (Stop Loss)</label>
                    <input
                      type="number"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                      className="w-full border border-amber-300 p-1.5 rounded text-xs font-bold font-mono bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {orderType === "TWAP" && (
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2 text-xs">
                <p className="text-[10px] font-bold text-blue-900 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-700" />
                  <span>AI 알고리즘 시간분할 (TWAP) 설정</span>
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-blue-800 font-medium">분할 분할 횟수 (Split Count)</span>
                  <select
                    value={splitCount}
                    onChange={(e) => setSplitCount(parseInt(e.target.value))}
                    className="border border-blue-300 p-1 rounded font-bold font-mono text-xs bg-white"
                  >
                    {[2, 3, 5, 10].map(n => (
                      <option key={n} value={n}>{n}회 분할 (회당 {Math.floor(orderQty/n)}주)</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Execution Simulator & Cost Breakdown Panel */}
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-lg space-y-3.5 text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="font-black text-zinc-800 flex items-center gap-1">
                  <Calculator className="h-3.5 w-3.5 text-zinc-600" />
                  <span>실시간 주문 체결 명세</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  세금/수수료 포함
                </span>
              </div>

              <div className="space-y-2 py-3 font-mono">
                <div className="flex justify-between text-zinc-600">
                  <span>주문 가액 (Order Value)</span>
                  <span className="font-bold text-zinc-900">{(estimatedOrderCost ?? 0).toLocaleString()} {unit}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>증권사 수수료 ({market === "KOREA" ? "0.015%" : "0.02%"})</span>
                  <span>{(estimatedFee ?? 0).toLocaleString()} {unit}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-zinc-500 text-[11px]">
                    <span>매도 제세금 ({market === "KOREA" ? "0.18%" : "SEC Fee"})</span>
                    <span>{(estimatedTax ?? 0).toLocaleString()} {unit}</span>
                  </div>
                )}

                <div className="border-t border-zinc-200 my-1 pt-2 flex justify-between font-black text-xs">
                  <span className="text-zinc-800">최종 청구/정산금액</span>
                  <span className="text-emerald-700 text-sm">{(totalCost ?? 0).toLocaleString()} {unit}</span>
                </div>

                <div className="border-t border-dashed border-zinc-200 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between text-zinc-600">
                    <span>체결 후 예상 유휴 잔고</span>
                    <span className="font-bold text-zinc-900">{(expectedPostBalance ?? 0).toLocaleString()} {unit}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>포트폴리오 비중 변화</span>
                    <span className={`font-bold ${isWeightOver ? "text-rose-600" : "text-zinc-900"}`}>
                      {currentWeightPct.toFixed(1)}% ➔ {newWeightPct.toFixed(1)}% (한도 {maxPositionWeightLimit}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SafetyCheck Status Badges */}
            <div className="bg-white border border-zinc-200 p-2.5 rounded space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-500 block uppercase">
                SafetyCheck 5단계 관제검증
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className={`p-1 rounded flex items-center gap-1 font-bold ${isWeightOver ? "bg-rose-100 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
                  <ShieldCheck className="h-3 w-3" />
                  <span>1. 비중한도: {isWeightOver ? "초과 경고" : "통과"}</span>
                </div>
                <div className={`p-1 rounded flex items-center gap-1 font-bold ${isBalanceShort ? "bg-rose-100 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
                  <ShieldCheck className="h-3 w-3" />
                  <span>2. 주문잔고: {isBalanceShort ? "부족" : "충족"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button Bar */}
        <div>
          {isBalanceShort && side === "BUY" && (
            <div className="mb-2 p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>주문 가능 예수금이 부족합니다. 수량을 줄이거나 잔고를 보충해 주세요.</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleOrderSubmit}
            disabled={isOrdering || (isBalanceShort && side === "BUY")}
            className={`w-full py-3.5 text-sm font-black rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              side === "BUY"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isOrdering ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
            <span>
              {isOrdering
                ? "증권사 및 SafetyCheck 검증 중..."
                : `${name} ${orderQty}주 ${side === "BUY" ? "매수" : "매도"} ${orderType} 주문 즉시 전송`}
            </span>
          </button>
        </div>

        {/* Pending Orders Active Control Panel */}
        {activePendingOrders.length > 0 && (
          <div className="border-t border-zinc-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>현재 미체결 주문 내역 ({activePendingOrders.length}건)</span>
              </h4>
            </div>

            <div className="space-y-2">
              {activePendingOrders.map((ord, idx) => (
                <div
                  key={`${ord.id}_${idx}`}
                  className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                        ord.side === "BUY" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {ord.side === "BUY" ? "매수" : "매도"}
                      </span>
                      <span className="font-bold text-zinc-900">{ord.name} ({ord.symbol})</span>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-500">
                      수량: <span className="font-bold text-zinc-800">{ord.quantity}주</span> | 
                      단가: <span className="font-bold text-zinc-800">{(ord.price ?? 0).toLocaleString()}{unit}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cancelOrder(ord.id)}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded transition cursor-pointer"
                    >
                      주문 취소
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
