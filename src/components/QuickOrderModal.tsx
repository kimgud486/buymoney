import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useModalScrollLock } from "../hooks/useModalScrollLock";
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Calculator, 
  Sparkles, 
  ArrowRight, 
  Briefcase,
  Sliders
} from "lucide-react";
import { formatStockQty } from "../lib/formatter";
import { 
  getKRXTickSize, 
  roundToKRXTick, 
  calculateEstimatedFeeAndTax 
} from "../lib/stockTickRules";

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
  initialName?: string;
  initialPrice?: number;
  initialMarket?: 'KOREA' | 'US' | 'BTC';
  initialSide?: 'BUY' | 'SELL';
  // Aliases
  stockCode?: string;
  stockName?: string;
  currentPrice?: number;
  orderType?: 'BUY' | 'SELL';
  isRealTradingMode?: boolean;
}

export const QuickOrderModal: React.FC<QuickOrderModalProps> = ({
  isOpen,
  onClose,
  initialSymbol,
  initialName,
  initialPrice,
  initialMarket = 'KOREA',
  initialSide = 'BUY',
  stockCode,
  stockName,
  currentPrice,
  orderType: passedOrderType,
  isRealTradingMode = false
}) => {
  useModalScrollLock(isOpen);
  const symbol = stockCode || initialSymbol || "005930";
  const name = stockName || initialName || "삼성전자";
  const basePrice = currentPrice || initialPrice || 70000;
  const initSide = (passedOrderType as 'BUY' | 'SELL') || initialSide || 'BUY';

  const { profile, positions, executeTrade, addToast } = useApp();

  const isCrypto = initialMarket === 'BTC' || symbol.startsWith('KRW-') || symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL' || symbol === 'XRP';
  const unitLabel = isCrypto ? (symbol.replace(/^KRW-/, '')) : (initialMarket === 'US' ? '주' : '주');

  const [side, setSide] = useState<'BUY' | 'SELL'>(initSide);
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('MARKET');
  const [qtyStr, setQtyStr] = useState<string>("10");
  const [priceStr, setPriceStr] = useState<string>(String(basePrice));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<'QTY' | 'CURRENCY_AMOUNT'>(initialMarket === 'US' || isCrypto ? 'CURRENCY_AMOUNT' : 'QTY');
  const [currencyAmountStr, setCurrencyAmountStr] = useState<string>(initialMarket === 'US' ? "10" : "50000");

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      setSide(initSide);
      setPriceStr(String(basePrice));
      if (initialMarket === 'US') {
        setInputMode('CURRENCY_AMOUNT');
        setCurrencyAmountStr("10");
        const defQty = basePrice > 0 ? Number((10 / basePrice).toFixed(4)) : 0.0778;
        setQtyStr(String(defQty));
      } else if (isCrypto) {
        setInputMode('CURRENCY_AMOUNT');
        setCurrencyAmountStr("50000");
        const defQty = basePrice > 0 ? Number(Math.max(0.00000001, (50000 / basePrice)).toFixed(8)) : 0.001;
        setQtyStr(String(defQty));
      } else {
        setInputMode('QTY');
        setQtyStr("10");
        setCurrencyAmountStr("50000");
      }
      setOrderType('MARKET');
    }
  }, [isOpen, symbol, basePrice, initSide, isCrypto, initialMarket]);

  const isReal = Boolean(profile?.isRealTrade || isRealTradingMode);
  const hasKoreaKey = Boolean(profile?.koreaAppKey && profile?.koreaAccountNo);
  const hasUpbitKey = Boolean(profile?.upbitAccessKey);
  const hasTargetKey = initialMarket === 'BTC' ? hasUpbitKey : hasKoreaKey;

  const qty = parseFloat(qtyStr) || 0;
  const rawPrice = parseFloat(priceStr) || 0;

  const handleOpenApiConnect = () => {
    window.dispatchEvent(new CustomEvent("open-api-connect-modal", { 
      detail: initialMarket === 'BTC' ? 'upbit' : 'korea' 
    }));
  };

  const setQty = (valOrFn: number | ((prev: number) => number)) => {
    const current = parseFloat(qtyStr) || 0;
    const nextVal = typeof valOrFn === 'function' ? valOrFn(current) : valOrFn;
    const precision = isCrypto ? 8 : 4;
    setQtyStr(String(Number(nextVal.toFixed(precision))));
  };

  const setPrice = (valOrFn: number | ((prev: number) => number)) => {
    const current = parseFloat(priceStr) || 0;
    const nextVal = typeof valOrFn === 'function' ? valOrFn(current) : valOrFn;
    setPriceStr(String(nextVal));
  };

  if (!isOpen) return null;

  // Find existing position in holdings
  const existingPos = positions.find(p => p.symbol === symbol);
  const userBalance = profile?.balance || 0;
  const currencyUnit = initialMarket === 'KOREA' ? '원' : initialMarket === 'US' ? '$' : '원';

  // Calculations
  const currentTotalHoldingQty = existingPos?.quantity || 0;
  const currentAvgPrice = existingPos?.avgPrice || 0;
  const currentEvalPnl = existingPos ? (basePrice - currentAvgPrice) * currentTotalHoldingQty : 0;
  const currentPnlPct = existingPos && currentAvgPrice > 0 ? ((basePrice - currentAvgPrice) / currentAvgPrice) * 100 : 0;

  // Order Calculations with Professional Broker Fee & Tax Engine
  const effectivePrice = orderType === 'MARKET' ? basePrice : rawPrice;
  const orderAmount = qty * effectivePrice;
  const feeAndTax = calculateEstimatedFeeAndTax(
    initialMarket === 'US' ? 'US' : initialMarket === 'BTC' ? 'BTC' : 'KOREA',
    side,
    orderAmount
  );
  const estFee = feeAndTax.fee;
  const estTax = feeAndTax.tax;
  const totalCost = side === 'BUY' ? orderAmount + estFee : Math.max(0, orderAmount - estFee - estTax);

  // Max Buyable Qty (High-precision crypto fractional supported up to 8 decimals)
  const maxBuyableQty = effectivePrice > 0 
    ? (isCrypto ? Number((userBalance / effectivePrice).toFixed(8)) : Number((userBalance / effectivePrice).toFixed(4))) 
    : 0;
  // Max Sellable Qty
  const maxSellableQty = currentTotalHoldingQty;

  // Post Trade Simulations
  const postTradeQty = side === 'BUY' 
    ? Number((currentTotalHoldingQty + qty).toFixed(8)) 
    : Math.max(0, Number((currentTotalHoldingQty - qty).toFixed(8)));

  const postTradeAvgPrice = side === 'BUY' && postTradeQty > 0
    ? Math.round(((currentTotalHoldingQty * currentAvgPrice) + (qty * effectivePrice)) / postTradeQty)
    : currentAvgPrice;

  const postBalance = side === 'BUY' 
    ? Math.max(0, userBalance - totalCost) 
    : userBalance + totalCost;

  // Quick Qty Selector
  const handleQuickQty = (amount: number) => {
    const minVal = isCrypto ? 0.00000001 : 0.0001;
    const precision = isCrypto ? 8 : 4;
    setQty(prev => Math.max(minVal, Number((prev + amount).toFixed(precision))));
  };

  const handleQuickPercent = (pct: number) => {
    if (side === 'BUY') {
      const rawQty = (maxBuyableQty * pct) / 100;
      const targetQty = isCrypto 
        ? Number(rawQty.toFixed(8)) 
        : (rawQty >= 1 ? Math.floor(rawQty) : Number(rawQty.toFixed(4)));
      setQty(Math.max(isCrypto ? 0.00000001 : 0.0001, targetQty));
    } else {
      const rawQty = (maxSellableQty * pct) / 100;
      const targetQty = isCrypto 
        ? Number(rawQty.toFixed(8)) 
        : (rawQty >= 1 ? Math.floor(rawQty) : Number(rawQty.toFixed(4)));
      setQty(Math.max(isCrypto ? 0.00000001 : 0.0001, targetQty));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) {
      alert("주문 수량을 0보다 크게 입력해 주세요 (소수점 주문 가능).");
      return;
    }

    if (side === 'BUY' && totalCost > userBalance) {
      alert(`[예수금 부족] ${name} (${symbol}) 매수 불가\n\n- 주문 수량: ${formatStockQty(qty, isCrypto)}${unitLabel}\n- 총 주문 금액: ₩${Math.round(totalCost).toLocaleString()}${currencyUnit}\n- 현재 가용 예수금: ₩${Math.round(userBalance).toLocaleString()}${currencyUnit}\n\n계좌에 현금을 충전하시거나 주문 수량을 낮춰주세요.`);
      return;
    }

    if (side === 'SELL' && qty > currentTotalHoldingQty) {
      alert(`보유 수량(${formatStockQty(currentTotalHoldingQty, isCrypto)}${unitLabel})보다 많은 수량을 매도할 수 없습니다.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const sideText = side === 'BUY' ? '추가 매수' : '보유 매도';
      const orderTypeText = orderType === 'MARKET' ? '시장가' : `지정가(${(effectivePrice ?? 0).toLocaleString()}${currencyUnit})`;
      
      await executeTrade(
        symbol,
        name,
        initialMarket,
        side,
        qty,
        effectivePrice,
        `간편 매매 팝업 (${sideText})`,
        `실제 거래 앱 간편 주문 팝업을 통하여 ${name}(${symbol}) ${formatStockQty(qty, isCrypto)}${unitLabel}를 ${orderTypeText}로 즉시 체결 완료하였습니다.`,
        true
      );

      addToast({
        type: 'SUCCESS',
        title: `${name} ${side === 'BUY' ? '매수' : '매도'} 주문 완료`,
        message: `${formatStockQty(qty, isCrypto)}${unitLabel}가 평단가 ${(effectivePrice ?? 0).toLocaleString()}${currencyUnit}에 성공적으로 체결되었습니다.`,
        orderInfo: {
          symbol,
          name,
          side,
          qty,
          price: effectivePrice,
          market: initialMarket,
          status: 'FILLED'
        }
      });

      onClose();
    } catch (err: any) {
      console.error("Quick order execution failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-zinc-900 dark:text-white font-sans max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-zinc-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${side === 'BUY' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {side === 'BUY' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                  {initialMarket}
                </span>
                <span className="text-xs text-zinc-400 font-mono">{symbol}</span>
                {isReal ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    실거래 연동
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    모의투자 시뮬레이션
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold tracking-tight text-white mt-0.5">
                {name} <span className="font-mono text-zinc-300 text-sm">₩{(basePrice ?? 0).toLocaleString()}</span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Real Trading API Key Missing Warning Banner */}
        {isReal && !hasTargetKey && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 p-3 px-5 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                <strong>[{initialMarket === 'BTC' ? '업비트' : '한국투자증권'} API 미연동]</strong> API Key 연동 필요 (미연동 시 가상 체결)
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenApiConnect}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] transition shrink-0 cursor-pointer"
            >
              API Key 연동
            </button>
          </div>
        )}

        {/* Current Holding Banner */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 p-3.5 px-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <Briefcase className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-bold">현재 보유 잔고:</span>
            {existingPos ? (
              <span className="font-mono font-bold text-zinc-900 dark:text-white">
                {formatStockQty(currentTotalHoldingQty, isCrypto)}{unitLabel} (평단가: {Math.round(currentAvgPrice ?? 0).toLocaleString()}{currencyUnit})
              </span>
            ) : (
              <span className="text-zinc-400">미보유 종목</span>
            )}
          </div>

          {existingPos && (
            <div className="text-right">
              <span className={`font-mono font-bold ${currentEvalPnl >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {currentEvalPnl >= 0 ? '+' : ''}{Math.round(currentEvalPnl ?? 0).toLocaleString()}{currencyUnit} ({currentPnlPct >= 0 ? '+' : ''}{(currentPnlPct ?? 0).toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto">
          {/* Side Tabs (Buy / Sell) */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`py-2.5 text-xs font-black rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                side === 'BUY'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 hover:bg-zinc-200/60 dark:hover:bg-zinc-700'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>매수 (추가 매수)</span>
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`py-2.5 text-xs font-black rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                side === 'SELL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 hover:bg-zinc-200/60 dark:hover:bg-zinc-700'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              <span>매도 (수량 매도)</span>
            </button>
          </div>

          {/* Order Type Selector */}
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setOrderType('MARKET')}
              className={`flex-1 py-1.5 font-bold rounded text-center transition cursor-pointer ${
                orderType === 'MARKET' ? 'bg-zinc-900 dark:bg-indigo-600 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              시장가 (즉시 체결)
            </button>
            <button
              type="button"
              onClick={() => setOrderType('LIMIT')}
              className={`flex-1 py-1.5 font-bold rounded text-center transition cursor-pointer ${
                orderType === 'LIMIT' ? 'bg-zinc-900 dark:bg-indigo-600 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              지정가 (가격 직접 지정)
            </button>
          </div>

          {/* Limit Price Input if LIMIT */}
          {orderType === 'LIMIT' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">지정가 단가 ({currencyUnit})</label>
                {initialMarket === 'KOREA' && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    KRX 호가단위: ₩{getKRXTickSize(rawPrice || basePrice).toLocaleString()}원
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cur = rawPrice || basePrice;
                    const tick = initialMarket === 'KOREA' ? getKRXTickSize(cur) : (initialMarket === 'US' ? 0.01 : 100);
                    setPrice(p => Math.max(tick, roundToKRXTick(p - tick)));
                  }}
                  className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition cursor-pointer text-zinc-700 dark:text-zinc-200"
                >
                  -1호가
                </button>
                <input
                  type="number"
                  step="any"
                  value={priceStr}
                  onChange={(e) => setPriceStr(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-zinc-900 dark:text-white text-center focus:border-zinc-900 dark:focus:border-indigo-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    const cur = rawPrice || basePrice;
                    const tick = initialMarket === 'KOREA' ? getKRXTickSize(cur) : (initialMarket === 'US' ? 0.01 : 100);
                    setPrice(p => roundToKRXTick(p + tick));
                  }}
                  className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition cursor-pointer text-zinc-700 dark:text-zinc-200"
                >
                  +1호가
                </button>
              </div>
            </div>
          )}

          {/* Quantity / Currency Amount Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                <span>
                  {inputMode === 'CURRENCY_AMOUNT' 
                    ? `주문 금액 (${initialMarket === 'US' ? '달러 $' : '원화 KRW'})` 
                    : `주문 수량 (${unitLabel})`}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                  소수점 매수 지원
                </span>
              </label>
              
              <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('CURRENCY_AMOUNT');
                    const defAmt = initialMarket === 'US' ? 10 : 50000;
                    const curAmt = Math.round(qty * effectivePrice) || defAmt;
                    setCurrencyAmountStr(String(curAmt));
                  }}
                  className={`px-2 py-0.5 rounded transition cursor-pointer ${
                    inputMode === 'CURRENCY_AMOUNT'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {initialMarket === 'US' ? '$ 금액 지정' : '₩ 원화 금액'}
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('QTY')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer ${
                    inputMode === 'QTY'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {unitLabel} 수량
                </button>
              </div>
            </div>

            {/* Quick Adjustment Steppers */}
            {inputMode === 'CURRENCY_AMOUNT' ? (
              <div className="space-y-1.5">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-zinc-400">
                    {initialMarket === 'US' ? '$' : '₩'}
                  </span>
                  <input
                    type="number"
                    step={initialMarket === 'US' ? '1' : '1000'}
                    min={initialMarket === 'US' ? '1' : '1000'}
                    placeholder={initialMarket === 'US' ? '10' : '50000'}
                    value={currencyAmountStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCurrencyAmountStr(val);
                      const amt = parseFloat(val) || 0;
                      if (effectivePrice > 0) {
                        const decimals = isCrypto ? 8 : 4;
                        const convertedQty = Number((amt / effectivePrice).toFixed(decimals));
                        setQtyStr(String(convertedQty));
                      }
                    }}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-sm font-mono font-black text-indigo-600 dark:text-indigo-300 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                
                {/* Preset Amount Buttons */}
                <div className="grid grid-cols-5 gap-1">
                  {(initialMarket === 'US' ? [10, 25, 50, 100, 500] : [10000, 50000, 100000, 500000, 1000000]).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setCurrencyAmountStr(String(amt));
                        if (effectivePrice > 0) {
                          const decimals = isCrypto ? 8 : 4;
                          const convertedQty = Number((amt / effectivePrice).toFixed(decimals));
                          setQtyStr(String(convertedQty));
                        }
                      }}
                      className="py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded text-[11px] font-bold text-zinc-700 dark:text-zinc-200 transition cursor-pointer text-center font-mono"
                    >
                      {initialMarket === 'US' ? `$${amt}` : (amt >= 10000 ? `${amt / 10000}만` : `${(amt ?? 0).toLocaleString()}원`)}
                    </button>
                  ))}
                </div>

                {/* Fractional Share Calculation Preview */}
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">소수점 환산 수량:</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-300">
                    {formatStockQty(qty, isCrypto)} {unitLabel}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickQty(-1)}
                    className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition cursor-pointer text-zinc-700 dark:text-zinc-200"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    step="any"
                    value={qtyStr}
                    onChange={(e) => setQtyStr(e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-zinc-900 dark:text-white text-center focus:border-zinc-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickQty(1)}
                    className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition cursor-pointer text-zinc-700 dark:text-zinc-200"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickQty(10)}
                    className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition cursor-pointer text-zinc-700 dark:text-zinc-200"
                  >
                    +10
                  </button>
                </div>
              </div>
            )}

            {/* Quick Percentage Buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickPercent(pct)}
                  className="py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-zinc-200 dark:border-zinc-700 rounded text-xs font-bold transition cursor-pointer font-mono"
                >
                  {pct === 100 ? '최대(100%)' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Preview Card */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 p-4 rounded-xl space-y-2.5 text-xs font-sans">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 pb-2">
              <span className="text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1">
                <Calculator className="h-3.5 w-3.5 text-indigo-500" />
                <span>총 주문 추산 금액</span>
              </span>
              <span className="text-sm font-black font-mono text-zinc-900 dark:text-white">
                {Math.round(totalCost ?? 0).toLocaleString()}{currencyUnit}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span>주문 수량 × 단가</span>
                <span className="font-mono">{formatStockQty(qty, isCrypto)}{unitLabel} × {(effectivePrice ?? 0).toLocaleString()}{currencyUnit}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>예상 수수료 & 제세금</span>
                <span className="font-mono">{((estFee || 0) + (estTax || 0)).toLocaleString()}{currencyUnit}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                <span>체결 후 예수금 잔액</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {Math.round(postBalance).toLocaleString()}{currencyUnit}
                </span>
              </div>
              {existingPos && (
                <div className="flex justify-between font-bold">
                  <span>체결 후 보유 수량</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {formatStockQty(postTradeQty, isCrypto)}{unitLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (side === 'BUY' && totalCost > userBalance)}
              className={`flex-2 py-3 px-4 rounded-xl text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                side === 'BUY'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
              }`}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{side === 'BUY' ? '즉시 매수 주문 집행' : '즉시 매도 주문 집행'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
