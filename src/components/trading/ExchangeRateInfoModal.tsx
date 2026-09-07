import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  ArrowRightLeft,
  Calculator,
  Globe2,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  Sparkles,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ExchangeRateInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExchangeRateInfoModal: React.FC<ExchangeRateInfoModalProps> = ({
  isOpen,
  onClose
}) => {
  const { marketStatus, positions } = useApp();

  // Exchange rate data - No fake fallbacks
  const hasFxRate = Boolean(marketStatus?.exchangeRate && typeof marketStatus.exchangeRate.value === 'number' && marketStatus.exchangeRate.value > 0);
  const fxRate = hasFxRate ? (marketStatus?.exchangeRate?.value as number) : undefined;
  const safeFxRate = fxRate || 1;
  const fxChange = marketStatus?.exchangeRate?.change ?? 0;
  const fxPct = marketStatus?.exchangeRate?.pct ?? 0;
  const isDown = fxChange < 0;

  // Currency Converter State
  const [calcMode, setCalcMode] = useState<'USD_TO_KRW' | 'KRW_TO_USD'>('USD_TO_KRW');
  const [usdInput, setUsdInput] = useState<string>('100');
  const [krwInput, setKrwInput] = useState<string>('1384500');

  // Stock Simulation State
  const [simTicker, setSimTicker] = useState<string>('NVDA');
  const [simPriceUsd, setSimPriceUsd] = useState<string>('128.5');
  const [simShares, setSimShares] = useState<string>('10');

  // US Positions analysis
  const usPositions = useMemo(() => {
    return positions.filter(p => p.market === 'US' || p.broker === 'us' || p.symbol?.startsWith('us_'));
  }, [positions]);

  const usHoldingsSummary = useMemo(() => {
    let totalUsdCost = 0;
    let totalUsdEval = 0;

    usPositions.forEach(p => {
      const curP = p.currentPrice || p.avgPrice;
      totalUsdCost += p.quantity * p.avgPrice;
      totalUsdEval += p.quantity * curP;
    });

    const totalKrwCost = totalUsdCost * fxRate;
    const totalKrwEval = totalUsdEval * fxRate;
    const usdPnl = totalUsdEval - totalUsdCost;
    const krwPnl = totalKrwEval - totalKrwCost;
    const returnRate = totalUsdCost > 0 ? (usdPnl / totalUsdCost) * 100 : 0;

    return {
      totalUsdCost,
      totalUsdEval,
      totalKrwCost,
      totalKrwEval,
      usdPnl,
      krwPnl,
      returnRate
    };
  }, [usPositions, fxRate]);

  // Converter Handlers
  const handleUsdChange = (val: string) => {
    setUsdInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setKrwInput(Math.round(num * fxRate).toLocaleString());
    } else {
      setKrwInput('0');
    }
  };

  const handleKrwChange = (val: string) => {
    const clean = val.replace(/,/g, '');
    setKrwInput(clean);
    const num = parseFloat(clean);
    if (!isNaN(num) && num >= 0) {
      setUsdInput((num / fxRate).toFixed(2));
    } else {
      setUsdInput('0');
    }
  };

  // Stock Simulation calculation
  const simCostUsd = (parseFloat(simPriceUsd) || 0) * (parseFloat(simShares) || 0);
  const simCostKrw = Math.round(simCostUsd * fxRate);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] my-auto"
        id="exchange-rate-info-modal"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-b border-emerald-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">실시간 원/달러 (USD/KRW) 환율 관제 센터</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  라이브 실시간
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                네이버 외환 및 글로벌 FX 실시간 시세 연동 · 미국 주식 달러 평단가 자동 환산
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            id="btn-close-exchange-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(92vh-80px)]">
          {/* 1. HERO FX RATE BANNER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white border border-slate-700 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
                  <Globe2 className="w-4 h-4" />
                  <span>외환(FX) 기준가: 미국 달러 / 대한민국 원 (USD/KRW)</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                    ₩{(fxRate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-bold text-slate-300">/ 1 USD</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs font-bold">
                  <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg ${isDown ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                    {isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    <span>{isDown ? '' : '+'}{fxChange.toFixed(2)}원 ({isDown ? '' : '+'}{fxPct.toFixed(2)}%)</span>
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    전일 종가 대비 {isDown ? '원화 강세(환율 하락)' : '달러 강세(환율 상승)'}
                  </span>
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-right">
                  <div className="text-[10px] text-slate-400">외환 시장 상태</div>
                  <div className="text-xs font-bold text-emerald-300">
                    {fxRate > 1400 ? "고환율 경계 구간" : fxRate > 1350 ? "환율 안정화 박스권" : "원화 안정 강세"}
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-right">
                  <div className="text-[10px] text-slate-400">외국인 수급 영향</div>
                  <div className="text-xs font-bold text-cyan-300">
                    {isDown ? "외인 순매수 유입 우호적" : "환율 변동성 주시 구간"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. REAL-TIME CURRENCY CONVERTER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">실시간 양방향 통화 계산기</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                적용 환율: $1 = ₩{(fxRate ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* USD Input */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  미국 달러 ($ USD)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    value={usdInput}
                    onChange={(e) => handleUsdChange(e.target.value)}
                    placeholder="0.00"
                    step="any"
                    className="w-full pl-7 pr-3 py-2 text-sm font-black font-mono bg-transparent text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* KRW Input */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  대한민국 원 (₩ KRW)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-bold text-sm">₩</span>
                  <input
                    type="text"
                    value={krwInput}
                    onChange={(e) => handleKrwChange(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 text-sm font-black font-mono bg-transparent text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-bold mr-1">빠른 달러 설정:</span>
              {[50, 100, 500, 1000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleUsdChange(String(amt))}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-700 transition cursor-pointer"
                >
                  ${(amt ?? 0).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* 3. US STOCK BUY & FX SIMULATOR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">미국 주식 달러 평단가 ⇄ 원화 환산 시뮬레이터</h3>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  종목명 / 티커
                </label>
                <input
                  type="text"
                  value={simTicker}
                  onChange={(e) => setSimTicker(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs font-bold font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  placeholder="예: NVDA"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  주당 매수가 ($)
                </label>
                <input
                  type="number"
                  value={simPriceUsd}
                  onChange={(e) => setSimPriceUsd(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  placeholder="128.5"
                  step="0.1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  매수 수량 (주)
                </label>
                <input
                  type="number"
                  value={simShares}
                  onChange={(e) => setSimShares(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  placeholder="10"
                />
              </div>
            </div>

            {/* Simulation Result Card */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {simTicker} {simShares}주 총 매수 금액 (달러 & 원화):
                </div>
                <div className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                  ${(simCostUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-2">
                    (₩{(simCostKrw ?? 0).toLocaleString()}원)
                  </span>
                </div>
              </div>
              <div className="text-right text-[11px] font-mono text-slate-500">
                1주당 원화 평단가: <strong>₩{Math.round((parseFloat(simPriceUsd) || 0) * fxRate).toLocaleString()}원</strong>
              </div>
            </div>
          </div>

          {/* 4. CURRENT USER US HOLDINGS FX SUMMARY */}
          {usPositions.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    현재 보유 미국 주식 환산 현황 ({usPositions.length}종목)
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  총 평가: ${usHoldingsSummary.totalUsdEval.toFixed(2)} (₩{Math.round(usHoldingsSummary.totalKrwEval).toLocaleString()}원)
                </span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {usPositions.map((pos, idx) => {
                  const curP = pos.currentPrice || pos.avgPrice;
                  const itemUsdCost = pos.quantity * pos.avgPrice;
                  const itemUsdEval = pos.quantity * curP;
                  const itemKrwEval = Math.round(itemUsdEval * fxRate);
                  const pnlRate = itemUsdCost > 0 ? ((itemUsdEval - itemUsdCost) / itemUsdCost) * 100 : 0;
                  const isPlus = pnlRate >= 0;

                  return (
                    <div
                      key={`${pos.id || pos.symbol}_${idx}`}
                      className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-sans">
                          <span>{pos.name}</span>
                          <span className="text-[10px] px-1 bg-indigo-50 text-indigo-700 rounded">
                            {pos.symbol}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {pos.quantity}주 | 달러 평단: <strong className="text-slate-800 dark:text-slate-200">${pos.avgPrice.toFixed(2)}</strong> (₩{Math.round(pos.avgPrice * fxRate).toLocaleString()}원)
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-slate-900 dark:text-white">
                          ${itemUsdEval.toFixed(2)} <span className="text-[11px] font-normal text-slate-500">(₩{(itemKrwEval ?? 0).toLocaleString()}원)</span>
                        </div>
                        <div className={`text-[11px] font-bold ${isPlus ? 'text-rose-500' : 'text-sky-500'}`}>
                          {isPlus ? '+' : ''}{pnlRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. MACRO FX INSIGHTS */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">💡 주식 투자자를 위한 환율 매매 팁 (FX & Stock Guide)</div>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                • <strong>미국 주식 실질 수익률</strong> = [주가 변동률 (%)] + [환율 변동률 (%)] 입니다. 달러가 오르면(원화 약세) 미국 주식의 원화 환산 수익률이 추가로 상승(환차익)합니다.<br />
                • <strong>국내 증시 외인 수급</strong>: 원/달러 환율이 하락 안정세(원화 강세)를 보일 때 외국인 투자자의 KOSPI/KOSDAQ 순매수 유입 가능성이 높아집니다.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            자동 업데이트 주기: 30초마다 실시간 외환 호가 반영
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
