import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Wallet,
  TrendingUp,
  TrendingDown,
  Calculator,
  Sliders
} from "lucide-react";
import { formatStockQty } from "../lib/formatter";

export interface TradeConfirmationRequest {
  symbol: string;
  name: string;
  market: 'KOREA' | 'US' | 'BTC';
  side: 'BUY' | 'SELL';
  qty: number;
  price: number;
  strategyName?: string;
  aiRationale?: string;
  koreaCash?: number;
  upbitCash?: number;
  onConfirm: (confirmedData?: {
    qty: number;
    price: number;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
  }) => void;
  onCancel: () => void;
}

interface GlobalTradeGuardModalProps {
  pendingTrade: TradeConfirmationRequest | null;
  onClose: () => void;
}

export const GlobalTradeGuardModal: React.FC<GlobalTradeGuardModalProps> = ({ pendingTrade, onClose }) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>(pendingTrade?.side || 'BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [qtyStr, setQtyStr] = useState<string>(String(pendingTrade?.qty || 1));
  const [priceStr, setPriceStr] = useState<string>(String(pendingTrade?.price || 1000));

  const isCrypto = pendingTrade?.market === 'BTC' || pendingTrade?.symbol.startsWith('KRW-') || pendingTrade?.symbol === 'BTC' || pendingTrade?.symbol === 'ETH';
  const unitLabel = isCrypto ? (pendingTrade?.symbol.replace(/^KRW-/, '') || 'COIN') : (pendingTrade?.market === 'US' ? '주' : '주');

  useEffect(() => {
    if (pendingTrade) {
      setSide(pendingTrade.side);
      setOrderType('MARKET');
      setQtyStr(String(pendingTrade.qty || (isCrypto ? 0.01 : 1)));
      setPriceStr(String(pendingTrade.price || 1000));
    }
  }, [pendingTrade, isCrypto]);

  if (!pendingTrade) return null;

  const qty = parseFloat(qtyStr) || 0;
  const rawPrice = parseFloat(priceStr) || 0;

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

  const isUs = pendingTrade.market === 'US';
  const currencyUnit = isCrypto ? 'KRW' : isUs ? '$' : '원';
  const targetBrokerName = isCrypto ? 'Upbit (업비트 가상자산)' : isUs ? '한국투자증권 (KIS 해외)' : '한국투자증권 (KIS)';
  
  const currentCash = isCrypto 
    ? (pendingTrade.upbitCash ?? 0) 
    : (pendingTrade.koreaCash ?? 0);

  const effectivePrice = orderType === 'MARKET' ? pendingTrade.price : rawPrice;
  const totalAmount = qty * effectivePrice;
  const isCashSufficient = side === 'SELL' || currentCash >= totalAmount;

  const handleQuickPercent = (pct: number) => {
    if (side === 'BUY') {
      const budget = currentCash > 0 ? currentCash : 0;
      const rawQty = budget > 0 ? (budget * (pct / 100)) / (effectivePrice || 1) : 0;
      const targetQty = isCrypto 
        ? Number(rawQty.toFixed(8)) 
        : (rawQty >= 1 ? Math.floor(rawQty) : Number(rawQty.toFixed(4)));
      setQty(Math.max(isCrypto ? 0.00000001 : 0.0001, targetQty));
    } else {
      const baseQty = pendingTrade.qty > 0 ? pendingTrade.qty : 10;
      const rawQty = (baseQty * pct) / 100;
      const targetQty = isCrypto 
        ? Number(rawQty.toFixed(8)) 
        : (rawQty >= 1 ? Math.floor(rawQty) : Number(rawQty.toFixed(4)));
      setQty(Math.max(isCrypto ? 0.00000001 : 0.0001, targetQty));
    }
  };

  const handleQuickStep = (delta: number) => {
    const precision = isCrypto ? 8 : 4;
    const minVal = isCrypto ? 0.00000001 : 0.0001;
    setQty(q => Math.max(minVal, Number((q + delta).toFixed(precision))));
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) {
      alert("주문 수량을 0보다 크게 입력해 주세요 (소수점 주문 가능).");
      return;
    }
    if (side === 'BUY' && currentCash < totalAmount) {
      alert(`[예수금 부족] 총 주문 금액(${Math.round(totalAmount).toLocaleString()}${currencyUnit})이 가용 예수금(${Math.round(currentCash).toLocaleString()}${currencyUnit})을 초과하여 매수 주문을 집행할 수 없습니다. 연동 계좌에 현금을 충전하거나 수량을 낮춰주세요.`);
      return;
    }
    pendingTrade.onConfirm({
      qty,
      price: effectivePrice,
      side,
      orderType
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-white font-sans ring-4 ring-indigo-500/20 max-h-[92vh] flex flex-col my-auto">
        
        {/* HEADER BAR */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 px-6 py-4 border-b border-indigo-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className={`p-2 rounded-xl border animate-pulse ${
              side === 'BUY' 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' 
                : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
            }`}>
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  REAL-TIME ORDER CONTROL
                </span>
                <span className="text-[11px] font-bold text-amber-400 font-mono">실시간 주문 수동 설정</span>
              </div>
              <h2 className="text-lg font-black text-indigo-100 tracking-tight mt-0.5 flex items-center gap-1.5">
                <span>{pendingTrade.name}</span>
                <span className="text-xs text-amber-300 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded">
                  {pendingTrade.symbol}
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              pendingTrade.onCancel();
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* BODY CONTENT */}
        <form onSubmit={handleConfirmSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* BUY / SELL MODE TOGGLE */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`py-2.5 text-xs font-black rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                side === 'BUY'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                  : 'text-zinc-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>🔴 매수 (BUY)</span>
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`py-2.5 text-xs font-black rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                side === 'SELL'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-zinc-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              <span>🔵 매도 (SELL)</span>
            </button>
          </div>

          {/* ORDER TYPE SELECTOR (MARKET / LIMIT) */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setOrderType('MARKET')}
              className={`flex-1 py-1.5 font-bold rounded-lg text-center transition cursor-pointer ${
                orderType === 'MARKET'
                  ? 'bg-indigo-600 text-white font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ⚡ 시장가 (즉시 체결)
            </button>
            <button
              type="button"
              onClick={() => setOrderType('LIMIT')}
              className={`flex-1 py-1.5 font-bold rounded-lg text-center transition cursor-pointer ${
                orderType === 'LIMIT'
                  ? 'bg-indigo-600 text-white font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🎯 지정가 (단가 직접 입력)
            </button>
          </div>

          {/* PRICE INPUT BOX (IF LIMIT ORDER) */}
          {orderType === 'LIMIT' && (
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-bold">주문 단가 ({currencyUnit})</span>
                <span className="text-[10px] text-zinc-500 font-mono">현재 시장가: {(pendingTrade.price ?? 0).toLocaleString()}{currencyUnit}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrice(p => Math.max(1, p - (isUs ? 1 : 100)))}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-zinc-300 transition cursor-pointer"
                >
                  -{isUs ? '$1' : '100원'}
                </button>
                <input
                  type="number"
                  step="any"
                  value={priceStr}
                  onChange={(e) => setPriceStr(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-black text-amber-300 text-center focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPrice(p => p + (isUs ? 1 : 100))}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-zinc-300 transition cursor-pointer"
                >
                  +{isUs ? '$1' : '100원'}
                </button>
              </div>
            </div>
          )}

          {/* QUANTITY CONTROLS */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-bold flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                <span>주문 수량 수동 조정 ({unitLabel})</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                <span>가용 예수금: {(currentCash ?? 0).toLocaleString()}{currencyUnit}</span>
              </span>
            </div>

            {isCrypto ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickStep(-0.01)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-zinc-300 transition cursor-pointer font-mono"
                  >
                    -0.01
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStep(-0.001)}
                    className="px-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-zinc-300 transition cursor-pointer font-mono"
                  >
                    -0.001
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    placeholder="0.00000000"
                    value={qtyStr}
                    onChange={(e) => setQtyStr(e.target.value)}
                    className="flex-1 bg-slate-900 border border-indigo-500/50 rounded-lg px-2 py-2 text-sm font-mono font-black text-amber-300 text-center focus:border-indigo-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickStep(0.001)}
                    className="px-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-zinc-300 transition cursor-pointer font-mono"
                  >
                    +0.001
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStep(0.01)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-zinc-300 transition cursor-pointer font-mono"
                  >
                    +0.01
                  </button>
                </div>
                {/* Micro Step Options */}
                <div className="grid grid-cols-4 gap-1">
                  {[-0.1, -0.0001, 0.0001, 0.1].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleQuickStep(step)}
                      className="py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                    >
                      {step > 0 ? `+${step}` : step}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickStep(-1)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-zinc-300 transition cursor-pointer"
                >
                  -1주
                </button>
                <input
                  type="number"
                  step="any"
                  value={qtyStr}
                  onChange={(e) => setQtyStr(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-black text-white text-center focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleQuickStep(1)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-zinc-300 transition cursor-pointer"
                >
                  +1주
                </button>
              </div>
            )}

            {/* QUICK PERCENTAGE BUTTONS */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickPercent(pct)}
                  className="py-1.5 bg-slate-800 hover:bg-indigo-950 hover:border-indigo-500/50 border border-slate-700 text-zinc-300 hover:text-indigo-300 rounded-lg text-xs font-bold transition cursor-pointer font-mono"
                >
                  {pct === 100 ? '🔥 100% (전액)' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* TOTAL COST & CALCULATION SUMMARY */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-zinc-400 font-sans font-semibold flex items-center gap-1">
                <Calculator className="h-3.5 w-3.5 text-indigo-400" />
                <span>총 주문 예상 금액</span>
              </span>
              <span className="text-base font-black text-rose-400">
                {Math.round(totalAmount).toLocaleString()}{currencyUnit}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-zinc-500 font-sans block">적용 단가</span>
                <span className="font-bold text-white">{(effectivePrice ?? 0).toLocaleString()}{currencyUnit}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block">최종 주문 수량</span>
                <span className="font-bold text-indigo-300">{formatStockQty(qty, isCrypto)} {unitLabel}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block">연동 증권사</span>
                <span className="font-bold text-cyan-300">{targetBrokerName}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block">주문 모드</span>
                <span className="font-bold text-amber-300">{orderType === 'MARKET' ? '시장가 (Market)' : '지정가 (Limit)'}</span>
              </div>
            </div>

            {pendingTrade.aiRationale && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-zinc-400 italic">
                <span className="font-sans font-bold text-cyan-400 not-italic block mb-0.5">
                  🤖 {pendingTrade.strategyName || 'AI 퀀트 전략'} 시그널 근거:
                </span>
                "{pendingTrade.aiRationale}"
              </div>
            )}
          </div>

          {!isCashSufficient && (
            <div className="bg-amber-950/80 border border-amber-500/50 rounded-xl p-3 text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                주의: 가용 실예수금({(currentCash ?? 0).toLocaleString()}{currencyUnit})보다 총 주문 금액이 큽니다.
              </span>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className={`w-full py-3.5 px-5 rounded-xl font-black text-xs text-white shadow-xl transition cursor-pointer flex items-center justify-center space-x-2 border ${
              side === 'BUY'
                ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 border-rose-400/50 shadow-rose-900/40'
                : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-blue-400/50 shadow-blue-900/40'
            }`}
          >
            <CheckCircle2 className="h-4.5 w-4.5" />
            <span>
              {pendingTrade.name} {formatStockQty(qty, isCrypto)}{unitLabel} {side === 'BUY' ? '실시간 매수 주문 집행' : '실시간 매도 주문 집행'}
            </span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        </form>

        {/* FOOTER ACTIONS */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-zinc-500 font-mono">
            ⚡ 100% Real Live Trade Control Gate
          </span>
          <button
            type="button"
            onClick={() => {
              pendingTrade.onCancel();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-zinc-400 hover:text-white transition cursor-pointer border border-slate-700"
          >
            주문 취소 (Cancel)
          </button>
        </div>

      </div>
    </div>
  );
};
