import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Layers,
  Coins,
  Clock,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface FractionalStockOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock?: {
    symbol: string;
    name: string;
    price: number;
    market?: string;
    chgPct?: number;
  };
  isWhiteTheme?: boolean;
}

export const FractionalStockOrderModal: React.FC<FractionalStockOrderModalProps> = ({
  isOpen,
  onClose,
  stock,
  isWhiteTheme = false
}) => {
  const { profile, positions, executeTrade, addToast, marketStatus } = useApp();

  // Selected Stock Data
  const defaultStock = {
    symbol: "NVDA",
    name: "엔비디아 (NVIDIA)",
    price: 227.89,
    market: "US",
    chgPct: 2.85
  };

  const activeStock = stock?.symbol ? stock : defaultStock;
  const currentPrice = activeStock.price > 0 ? activeStock.price : 200;

  // Real-time Exchange Rate (KRW/USD)
  const fxRate = marketStatus?.exchangeRate?.value;
  const safeFxRate = fxRate || 1;

  // Order Modes: By Currency Amount ($ or ₩) vs By Fractional Share Quantity
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [inputMode, setInputMode] = useState<'AMOUNT' | 'SHARES'>('AMOUNT');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'KRW'>('USD');
  
  const [usdAmountInput, setUsdAmountInput] = useState<string>('50');
  const [krwAmountInput, setKrwAmountInput] = useState<string>('50000');
  const [sharesInput, setSharesInput] = useState<string>('0.25');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync inputs when switching stock
  useEffect(() => {
    if (activeStock.symbol) {
      if (inputMode === 'AMOUNT') {
        const amt = currencyMode === 'USD' ? (parseFloat(usdAmountInput) || 50) : ((parseFloat(krwAmountInput) || 50000) / fxRate);
        const calculatedShares = Number((amt / currentPrice).toFixed(4));
        setSharesInput(String(Math.max(0.0001, calculatedShares)));
      }
    }
  }, [activeStock.symbol, currentPrice]);

  // Existing Position in holdings
  const currentPosition = useMemo(() => {
    return positions.find(p => p.symbol === activeStock.symbol || p.symbol === `us_${activeStock.symbol.toLowerCase()}`);
  }, [positions, activeStock.symbol]);

  const existingQty = currentPosition?.quantity || 0;
  const existingAvgPrice = currentPosition?.avgPrice || 0;

  // Calculate current effective shares & USD cost
  const { calculatedShares, calculatedUsdCost, calculatedKrwCost } = useMemo(() => {
    let shares = 0;
    let usd = 0;
    let krw = 0;

    if (inputMode === 'AMOUNT') {
      if (currencyMode === 'USD') {
        usd = parseFloat(usdAmountInput) || 0;
        krw = Math.round(usd * fxRate);
        shares = currentPrice > 0 ? Number((usd / currentPrice).toFixed(4)) : 0;
      } else {
        krw = parseFloat(krwAmountInput) || 0;
        usd = Number((krw / fxRate).toFixed(2));
        shares = currentPrice > 0 ? Number((usd / currentPrice).toFixed(4)) : 0;
      }
    } else {
      shares = parseFloat(sharesInput) || 0;
      usd = Number((shares * currentPrice).toFixed(2));
      krw = Math.round(usd * fxRate);
    }

    return {
      calculatedShares: Math.max(0, shares),
      calculatedUsdCost: Math.max(0, usd),
      calculatedKrwCost: Math.max(0, krw)
    };
  }, [inputMode, currencyMode, usdAmountInput, krwAmountInput, sharesInput, currentPrice, fxRate]);

  // Fee calculation (0.25% overseas fractional fee standard)
  const estFeeUsd = Number((calculatedUsdCost * 0.0025).toFixed(2));
  const estTotalUsdCost = orderSide === 'BUY' ? Number((calculatedUsdCost + estFeeUsd).toFixed(2)) : Math.max(0, Number((calculatedUsdCost - estFeeUsd).toFixed(2)));

  // Available Cash Balances
  const liveUsdBalance = profile?.balance ? Number((profile.balance / fxRate).toFixed(2)) : 5000;

  // Post-trade shares simulation
  const postTradeQty = orderSide === 'BUY'
    ? Number((existingQty + calculatedShares).toFixed(4))
    : Math.max(0, Number((existingQty - calculatedShares).toFixed(4)));

  // Handlers for quick presets
  const handleSelectUsdPreset = (amt: number) => {
    setUsdAmountInput(String(amt));
    if (currentPrice > 0) {
      const sh = Number((amt / currentPrice).toFixed(4));
      setSharesInput(String(Math.max(0.0001, sh)));
    }
  };

  const handleSelectKrwPreset = (krw: number) => {
    setKrwAmountInput(String(krw));
    const usd = krw / fxRate;
    if (currentPrice > 0) {
      const sh = Number((usd / currentPrice).toFixed(4));
      setSharesInput(String(Math.max(0.0001, sh)));
    }
  };

  const handleSelectSharesPreset = (sh: number) => {
    setSharesInput(String(sh));
    const usd = sh * currentPrice;
    setUsdAmountInput(String(Number(usd.toFixed(2))));
    setKrwAmountInput(String(Math.round(usd * fxRate)));
  };

  // Submit Fractional Trade
  const handleExecuteTrade = async () => {
    if (calculatedShares <= 0.00001) {
      alert("주문 수량 또는 금액을 0.0001주 이상으로 입력해 주세요.");
      return;
    }

    if (orderSide === 'SELL' && calculatedShares > existingQty) {
      alert(`보유 수량(${existingQty.toFixed(4)}주)을 초과하여 매도할 수 없습니다.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const sideText = orderSide === 'BUY' ? '소수점 매수' : '소수점 매도';
      const orderRationale = `[해외주식 소수점 체결] ${activeStock.name}(${activeStock.symbol}) ${calculatedShares.toFixed(4)}주 ($${calculatedUsdCost.toFixed(2)} / ₩${(calculatedKrwCost ?? 0).toLocaleString()}) 소수점 분할 주문을 체결하였습니다.`;

      await executeTrade(
        activeStock.symbol,
        activeStock.name,
        "US",
        orderSide,
        calculatedShares,
        currentPrice,
        `해외주식 소수점 주문 (${sideText})`,
        orderRationale,
        true
      );

      addToast({
        type: 'SUCCESS',
        title: `미국주식 소수점 ${orderSide === 'BUY' ? '매수' : '매도'} 체결 완료`,
        message: `${activeStock.name} ${calculatedShares.toFixed(4)}주 ($${calculatedUsdCost.toFixed(2)}) 소수점 체결이 성공적으로 완료되었습니다.`
      });

      onClose();
    } catch (err: any) {
      console.error("Fractional trade execution error:", err);
      addToast({
        type: 'ERROR',
        title: '소수점 주문 실패',
        message: err.message || "주문 처리 중 오류가 발생했습니다."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-lg ${
            isWhiteTheme ? "bg-white text-slate-900 border-slate-200" : "bg-[#091424] text-white border-[#172b49]"
          } border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]`}
        >
          {/* 1. MODAL HEADER */}
          <div className={`p-4 px-5 border-b ${isWhiteTheme ? "border-slate-200 bg-slate-50/80" : "border-[#142640] bg-[#07101e]"} flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                orderSide === 'BUY'
                  ? (isWhiteTheme ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60")
                  : (isWhiteTheme ? "bg-rose-100 text-rose-700 border border-rose-300" : "bg-rose-950/80 text-rose-400 border border-rose-800/60")
              }`}>
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black tracking-tight">해외주식 소수점 매매</h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    isWhiteTheme ? "bg-cyan-100 text-cyan-800 border border-cyan-300" : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                  }`}>
                    0.0001주 단위
                  </span>
                </div>
                <p className={`text-[11px] ${isWhiteTheme ? "text-slate-500" : "text-slate-400"} mt-0.5`}>
                  1,000원 또는 $1부터 고가 미국 우량주를 원하는 만큼 분할 매수
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg ${isWhiteTheme ? "hover:bg-slate-200 text-slate-500" : "hover:bg-slate-800 text-slate-400"} transition`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. STOCK SUMMARY CARD & LIVE PRICE */}
          <div className={`px-5 py-3 border-b ${isWhiteTheme ? "border-slate-200 bg-slate-100/50" : "border-[#13233c] bg-[#060c17]"} flex items-center justify-between`}>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">{activeStock.name}</span>
                <span className={`text-xs font-mono px-1.5 py-0.2 rounded font-bold ${
                  isWhiteTheme ? "bg-slate-200 text-slate-800" : "bg-slate-800 text-slate-300"
                }`}>
                  {activeStock.symbol}
                </span>
                <span className="text-[10px] text-blue-500 font-mono font-bold">NASDAQ</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1 font-mono">
                <span className={`text-lg font-black ${isWhiteTheme ? "text-slate-900" : "text-slate-100"}`}>
                  ${(currentPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-xs font-bold ${(activeStock.chgPct || 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {(activeStock.chgPct || 0) >= 0 ? "+" : ""}{activeStock.chgPct}%
                </span>
                <span className={`text-[11px] ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                  (≈ ₩{Math.round(currentPrice * fxRate).toLocaleString()}원)
                </span>
              </div>
            </div>

            <div className={`text-right text-[11px] font-mono ${isWhiteTheme ? "text-slate-600" : "text-slate-400"}`}>
              <div className="flex items-center justify-end gap-1 text-[10px] font-bold">
                <ArrowRightLeft className="w-3 h-3 text-cyan-500" />
                <span>기준환율 <b>1$ = {(fxRate ?? 0).toLocaleString()}원</b></span>
              </div>
              {existingQty > 0 && (
                <div className="mt-1">
                  보유: <b className="text-cyan-500">{existingQty.toFixed(4)}주</b>
                </div>
              )}
            </div>
          </div>

          {/* 3. MODAL BODY (SCROLLABLE) */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">

            {/* Side Selector (Buy vs Sell) */}
            <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl ${isWhiteTheme ? "bg-slate-100 border border-slate-200" : "bg-[#050a14] border border-slate-800"}`}>
              <button
                type="button"
                onClick={() => setOrderSide('BUY')}
                className={`py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1.5 ${
                  orderSide === 'BUY'
                    ? (isWhiteTheme ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-500 text-slate-950 shadow-md")
                    : (isWhiteTheme ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-slate-200")
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>소수점 매수</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderSide('SELL')}
                className={`py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1.5 ${
                  orderSide === 'SELL'
                    ? (isWhiteTheme ? "bg-rose-600 text-white shadow-sm" : "bg-rose-500 text-white shadow-md")
                    : (isWhiteTheme ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-slate-200")
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>소수점 매도 {existingQty > 0 ? `(${existingQty.toFixed(4)}주 보유)` : ""}</span>
              </button>
            </div>

            {/* Input Mode Selector (Amount vs Shares) */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${isWhiteTheme ? "text-slate-800" : "text-slate-200"} flex items-center gap-1`}>
                  <Calculator className="w-3.5 h-3.5 text-cyan-500" />
                  주문 방식
                </span>
              </div>
              <div className={`flex items-center gap-1 p-0.5 rounded-lg text-[11px] font-bold ${
                isWhiteTheme ? "bg-slate-100 border border-slate-200" : "bg-[#060e1b] border border-slate-800"
              }`}>
                <button
                  type="button"
                  onClick={() => setInputMode('AMOUNT')}
                  className={`px-3 py-1 rounded transition ${
                    inputMode === 'AMOUNT'
                      ? (isWhiteTheme ? "bg-cyan-600 text-white shadow-xs" : "bg-cyan-500 text-slate-950 font-black")
                      : (isWhiteTheme ? "text-slate-600" : "text-slate-400")
                  }`}
                >
                  금액 기준 ($ / ₩)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('SHARES')}
                  className={`px-3 py-1 rounded transition ${
                    inputMode === 'SHARES'
                      ? (isWhiteTheme ? "bg-cyan-600 text-white shadow-xs" : "bg-cyan-500 text-slate-950 font-black")
                      : (isWhiteTheme ? "text-slate-600" : "text-slate-400")
                  }`}
                >
                  수량 기준 (주)
                </button>
              </div>
            </div>

            {/* MODE A: AMOUNT BASED ORDER ($ or ₩) */}
            {inputMode === 'AMOUNT' ? (
              <div className="space-y-3">
                {/* Currency toggle for amount mode */}
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                    입력 통화 선택
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setCurrencyMode('USD')}
                      className={`px-2 py-0.5 rounded border transition ${
                        currencyMode === 'USD'
                          ? (isWhiteTheme ? "bg-blue-600 text-white border-blue-600 font-bold" : "bg-blue-500 text-slate-950 border-blue-400 font-bold")
                          : (isWhiteTheme ? "bg-slate-100 text-slate-600 border-slate-300" : "bg-[#091424] text-slate-400 border-slate-800")
                      }`}
                    >
                      USD ($ 달러)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrencyMode('KRW')}
                      className={`px-2 py-0.5 rounded border transition ${
                        currencyMode === 'KRW'
                          ? (isWhiteTheme ? "bg-blue-600 text-white border-blue-600 font-bold" : "bg-blue-500 text-slate-950 border-blue-400 font-bold")
                          : (isWhiteTheme ? "bg-slate-100 text-slate-600 border-slate-300" : "bg-[#091424] text-slate-400 border-slate-800")
                      }`}
                    >
                      KRW (₩ 원화)
                    </button>
                  </div>
                </div>

                {/* Amount Input Box */}
                <div className="relative flex items-center">
                  <span className={`absolute left-3 font-mono font-bold text-base ${isWhiteTheme ? "text-slate-400" : "text-slate-500"}`}>
                    {currencyMode === 'USD' ? '$' : '₩'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={currencyMode === 'USD' ? usdAmountInput : krwAmountInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (currencyMode === 'USD') {
                        setUsdAmountInput(val);
                        const parsed = parseFloat(val) || 0;
                        setKrwAmountInput(String(Math.round(parsed * fxRate)));
                        if (currentPrice > 0) {
                          setSharesInput(String(Number((parsed / currentPrice).toFixed(4))));
                        }
                      } else {
                        setKrwAmountInput(val);
                        const parsedKrw = parseFloat(val) || 0;
                        const usd = parsedKrw / fxRate;
                        setUsdAmountInput(String(Number(usd.toFixed(2))));
                        if (currentPrice > 0) {
                          setSharesInput(String(Number((usd / currentPrice).toFixed(4))));
                        }
                      }
                    }}
                    placeholder={currencyMode === 'USD' ? "50" : "50000"}
                    className={`w-full ${
                      isWhiteTheme
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-600"
                        : "bg-[#050a14] border-slate-800 text-white focus:border-cyan-500"
                    } border rounded-xl pl-9 pr-14 py-2.5 text-base font-mono font-black focus:outline-none transition`}
                  />
                  <span className={`absolute right-3 text-xs font-mono font-bold ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                    {currencyMode}
                  </span>
                </div>

                {/* Quick Presets Grid */}
                <div className="grid grid-cols-6 gap-1.5">
                  {currencyMode === 'USD'
                    ? [10, 25, 50, 100, 250, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleSelectUsdPreset(amt)}
                          className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition ${
                            usdAmountInput === String(amt)
                              ? (isWhiteTheme ? "bg-cyan-600 text-white border-cyan-600 shadow-xs" : "bg-cyan-500 text-slate-950 border-cyan-400 font-black")
                              : (isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700" : "bg-[#071120] hover:bg-[#0f213b] border-slate-800 text-slate-300")
                          }`}
                        >
                          ${amt}
                        </button>
                      ))
                    : [10000, 30000, 50000, 100000, 300000, 500000].map((krw) => (
                        <button
                          key={krw}
                          type="button"
                          onClick={() => handleSelectKrwPreset(krw)}
                          className={`py-1.5 rounded-lg border text-[11px] font-mono font-bold transition ${
                            krwAmountInput === String(krw)
                              ? (isWhiteTheme ? "bg-cyan-600 text-white border-cyan-600 shadow-xs" : "bg-cyan-500 text-slate-950 border-cyan-400 font-black")
                              : (isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700" : "bg-[#071120] hover:bg-[#0f213b] border-slate-800 text-slate-300")
                          }`}
                        >
                          {krw >= 10000 ? `${krw / 10000}만` : `${(krw ?? 0).toLocaleString()}`}
                        </button>
                      ))}
                </div>
              </div>
            ) : (
              /* MODE B: SHARES BASED ORDER */
              <div className="space-y-3">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={sharesInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSharesInput(val);
                      const sh = parseFloat(val) || 0;
                      const usd = sh * currentPrice;
                      setUsdAmountInput(String(Number(usd.toFixed(2))));
                      setKrwAmountInput(String(Math.round(usd * fxRate)));
                    }}
                    placeholder="0.25"
                    className={`w-full ${
                      isWhiteTheme
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-600"
                        : "bg-[#050a14] border-slate-800 text-white focus:border-cyan-500"
                    } border rounded-xl px-4 pr-12 py-2.5 text-base font-mono font-black focus:outline-none transition`}
                  />
                  <span className={`absolute right-3 text-xs font-mono font-bold ${isWhiteTheme ? "text-slate-500" : "text-slate-400"}`}>
                    주
                  </span>
                </div>

                {/* Quick Shares Presets */}
                <div className="grid grid-cols-6 gap-1.5">
                  {[0.01, 0.05, 0.1, 0.25, 0.5, 1.0].map((sh) => (
                    <button
                      key={sh}
                      type="button"
                      onClick={() => handleSelectSharesPreset(sh)}
                      className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition ${
                        sharesInput === String(sh)
                          ? (isWhiteTheme ? "bg-cyan-600 text-white border-cyan-600 shadow-xs" : "bg-cyan-500 text-slate-950 border-cyan-400 font-black")
                          : (isWhiteTheme ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700" : "bg-[#071120] hover:bg-[#0f213b] border-slate-800 text-slate-300")
                      }`}
                    >
                      {sh}주
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. REALTIME ORDER PREVIEW & CONVERSION CARD */}
            <div className={`p-3.5 rounded-xl border ${
              isWhiteTheme ? "bg-cyan-50/70 border-cyan-200 text-slate-800" : "bg-[#07172b] border-cyan-900/60 text-slate-100"
            } space-y-2 font-mono text-xs`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-sans text-cyan-800 dark:text-cyan-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  실시간 환산 주문 견적
                </span>
                <span className="text-[10px] text-slate-500">0.0001주 단위 절사</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-cyan-200/50 dark:border-cyan-800/40">
                <div>
                  <span className="text-[10px] text-slate-500">예상 체결 수량</span>
                  <div className="text-base font-black text-cyan-700 dark:text-cyan-300">
                    {calculatedShares.toFixed(4)}주
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">예상 주문 금액</span>
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    ${calculatedUsdCost.toFixed(2)}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      (₩{(calculatedKrwCost ?? 0).toLocaleString()}원)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-cyan-200/40 dark:border-cyan-800/30 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">소수점 우대 수수료 (0.25%):</span>
                  <span className="font-bold">${estFeeUsd.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">체결 후 보유 수량:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{postTradeQty.toFixed(4)}주</span>
                </div>
              </div>
            </div>

            {/* 5. EDUCATIONAL BENEFITS CALLOUT */}
            <div className={`p-3 rounded-xl border ${
              isWhiteTheme ? "bg-slate-100/80 border-slate-200" : "bg-[#060c18] border-slate-800/80"
            } flex items-start gap-2.5 text-[11px]`}>
              <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className={`font-bold ${isWhiteTheme ? "text-slate-800" : "text-slate-200"}`}>
                  해외주식 소수점 매매 혜택 안내
                </div>
                <p className={`${isWhiteTheme ? "text-slate-600" : "text-slate-400"} leading-relaxed`}>
                  • 주당 수십만~수백만 원에 달하는 미국 주식을 1,000원 단위 소액으로 정기 적립할 수 있습니다.<br />
                  • 모의투자 및 실계좌 환경에서 0.0001주 단위 정밀 체결과 손익 계산이 동일하게 지원됩니다.
                </p>
              </div>
            </div>

          </div>

          {/* 6. MODAL FOOTER WITH SUBMIT ACTION */}
          <div className={`p-4 px-5 border-t ${isWhiteTheme ? "border-slate-200 bg-slate-50/80" : "border-[#142640] bg-[#07101e]"} flex items-center justify-between gap-3`}>
            <div>
              <div className="text-[10px] text-slate-500 font-mono">
                {orderSide === 'BUY' ? '총 결제 금액 (수수료 포함)' : '총 정산 금액'}
              </div>
              <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                ${estTotalUsdCost.toFixed(2)}
                <span className="text-[11px] font-normal text-slate-500 ml-1">
                  (≈ ₩{Math.round(estTotalUsdCost * fxRate).toLocaleString()}원)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
                  isWhiteTheme ? "bg-slate-200 hover:bg-slate-300 text-slate-700" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                } transition`}
              >
                취소
              </button>
              <button
                type="button"
                disabled={isSubmitting || calculatedShares <= 0}
                onClick={handleExecuteTrade}
                className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-1.5 ${
                  orderSide === 'BUY'
                    ? (isWhiteTheme ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black")
                    : (isWhiteTheme ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-rose-500 hover:bg-rose-400 text-white font-black")
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <span>주문 체결 중...</span>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>{calculatedShares.toFixed(4)}주 {orderSide === 'BUY' ? '소수점 매수 실행' : '소수점 매도 실행'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default FractionalStockOrderModal;
