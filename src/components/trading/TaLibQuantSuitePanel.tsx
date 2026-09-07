import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Layers, 
  Gauge, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  ChevronRight,
  Maximize2
} from "lucide-react";
import { TaLibQuantEngine, TaLibIndicatorResult, PriceBar } from "../../services/taLibQuantEngine";
import { realtimeMarketFeedService, LiveMarketQuote } from "../../services/realtimeMarketFeedService";

interface TaLibQuantSuitePanelProps {
  symbol: string;
  name: string;
  currentPrice: number;
  market?: string;
  customBars?: PriceBar[];
}

export const TaLibQuantSuitePanel: React.FC<TaLibQuantSuitePanelProps> = ({
  symbol,
  name,
  currentPrice: propCurrentPrice,
  market = "KOREA",
  customBars = []
}) => {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "OVERLAP" | "MOMENTUM" | "PATTERNS" | "VOLUME_VOLATILITY">("OVERVIEW");
  const [liveQuote, setLiveQuote] = useState<LiveMarketQuote | undefined>(() => realtimeMarketFeedService.getQuote(symbol));

  useEffect(() => {
    realtimeMarketFeedService.registerSymbol(symbol, market === "US" ? "US" : (symbol === "BTC" || symbol.startsWith("KRW-") ? "UPBIT" : "KOSPI"));
    const unsub = realtimeMarketFeedService.subscribe((quotes) => {
      const q = quotes.get(symbol) || quotes.get(symbol.replace(/^KRW-/, ""));
      if (q && q.price > 0) {
        setLiveQuote(q);
      }
    });
    return () => unsub();
  }, [symbol, market]);

  const effectivePrice = liveQuote?.price || propCurrentPrice;

  // Run full TA-Lib Engine Analysis
  const result: TaLibIndicatorResult = TaLibQuantEngine.runFullAnalysis(customBars, effectivePrice);

  const formatPrice = (val: number) => {
    if (market === "US" || symbol.length <= 5) {
      return `$${(val ?? 0).toLocaleString()}`;
    }
    return `₩${(val ?? 0).toLocaleString()}`;
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold border border-indigo-500/30">
              TA-Lib C-ENGINE v6.0
            </span>
            <span className="text-xs text-slate-400 font-mono">150+ Technical Indicators & Patterns</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            {name} ({symbol}) TA-Lib 정량 수치 연산 종합 검증
          </h2>
        </div>

        {/* OVERALL RATING BADGE */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-bold">TA-Lib 종합 기술 점수</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {result.taLibScore} <span className="text-xs text-slate-500">/ 100</span>
            </div>
          </div>
          <div className={`px-3 py-2 rounded-lg font-bold text-xs sm:text-sm text-center shadow-lg ${
            result.taLibScore >= 70
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20"
              : result.taLibScore >= 50
              ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
              : "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-500/20"
          }`}>
            {result.overallSignalKr}
          </div>
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === "OVERVIEW"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Gauge className="w-4 h-4 text-indigo-400" />
          종합 핵심 서머리
        </button>

        <button
          onClick={() => setActiveTab("MOMENTUM")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === "MOMENTUM"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          모멘텀 & 오실레이터 ({result.rsi14 ? `RSI ${result.rsi14}` : ''})
        </button>

        <button
          onClick={() => setActiveTab("OVERLAP")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === "OVERLAP"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          추세 & 이동평균 (BBands/SMA)
        </button>

        <button
          onClick={() => setActiveTab("PATTERNS")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === "PATTERNS"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Flame className="w-4 h-4 text-rose-400" />
          캔들 패턴 인식 ({result.candlePatterns.length}건 포착)
        </button>

        <button
          onClick={() => setActiveTab("VOLUME_VOLATILITY")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === "VOLUME_VOLATILITY"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          변동성 (ATR) & 수급 (OBV)
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          {/* QUICK INDICATOR METRICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-bold">RSI (14)</div>
              <div className="text-lg font-black font-mono text-white mt-1">
                {result.rsi14} <span className="text-xs font-normal text-slate-400">{result.rsi14 >= 70 ? '(과매수)' : result.rsi14 <= 30 ? '(과매도)' : '(중립/상승)'}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full ${result.rsi14 >= 70 ? 'bg-rose-500' : result.rsi14 <= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${result.rsi14}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-bold">MACD (12,26,9) 히스토그램</div>
              <div className={`text-lg font-black font-mono mt-1 ${result.macdHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.macdHist >= 0 ? `+${result.macdHist}` : result.macdHist}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">Signal: {result.macdSignal}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-bold">볼린저밴드 %B</div>
              <div className="text-lg font-black font-mono text-cyan-400 mt-1">
                {result.bBandsPercentB}%
              </div>
              <div className="text-xs text-slate-500 mt-1">대역폭: {result.bBandsWidth}%</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-bold">변동성 ATR (14)</div>
              <div className="text-lg font-black font-mono text-amber-400 mt-1">
                {formatPrice(result.atr14)}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">NATR: {result.natr14}%</div>
            </div>
          </div>

          {/* RATIONALE REASONS SUMMARY */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              TA-Lib C-Extension 자동 산출근거 브리핑
            </h3>
            <div className="space-y-2">
              {result.summaryRationale.map((rat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{rat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOMENTUM & OSCILLATORS */}
      {activeTab === "MOMENTUM" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="text-xs text-slate-400 font-bold">RSI (14) & MFI (14)</div>
            <div className="text-xl font-black font-mono text-emerald-400">RSI: {result.rsi14} / MFI: {result.mfi14}</div>
            <p className="text-xs text-slate-400">자금 유입지수(MFI)와 모멘텀 강도지수(RSI) 동시 수급 추종</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="text-xs text-slate-400 font-bold">Stochastic (%K, %D)</div>
            <div className="text-xl font-black font-mono text-cyan-400">%K: {result.stochK} / %D: {result.stochD}</div>
            <p className="text-xs text-slate-400">단기 변동성 오실레이터 교차 신호 검증</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="text-xs text-slate-400 font-bold">ADX (14) 추세 강도</div>
            <div className="text-xl font-black font-mono text-amber-400">{result.adx14} pt</div>
            <p className="text-xs text-slate-400">25 이상 시 명확한 추세 형성, 50 이상 초강력 추세</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="text-xs text-slate-400 font-bold">Aroon Up / Down</div>
            <div className="text-xl font-black font-mono text-indigo-400">Up: {result.aroonUp}% / Dn: {result.aroonDown}%</div>
            <p className="text-xs text-slate-400">신규 고점/저점 도달 주기를 통한 추세 시작 포착</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="text-xs text-slate-400 font-bold">CCI (14) & Williams %R</div>
            <div className="text-xl font-black font-mono text-teal-400">CCI: {result.cci14} / %R: {result.williamsR14}</div>
            <p className="text-xs text-slate-400">평균 가격 이격도 및 과매수/과매도 판단</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="text-xs text-slate-400 font-bold">Ultimate Oscillator</div>
            <div className="text-xl font-black font-mono text-purple-400">{result.ultOsc} pt</div>
            <p className="text-xs text-slate-400">단기/중기/장기 3중 타임프레임 가중 통합 오실레이터</p>
          </div>
        </div>
      )}

      {/* TAB 3: OVERLAP & MOVING AVERAGES */}
      {activeTab === "OVERLAP" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-bold">SMA 20일선</div>
              <div className="text-base font-black font-mono text-white mt-1">{formatPrice(result.sma20)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-bold">SMA 50일선</div>
              <div className="text-base font-black font-mono text-white mt-1">{formatPrice(result.sma50)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-bold">EMA 12일선</div>
              <div className="text-base font-black font-mono text-indigo-400 mt-1">{formatPrice(result.ema12)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-bold">KAMA (카우프만 적응 이평)</div>
              <div className="text-base font-black font-mono text-cyan-400 mt-1">{formatPrice(result.kama)}</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-white">볼린저 밴드 (Bollinger Bands 20, 2) 대역</h3>
            <div className="grid grid-cols-3 gap-3 text-center font-mono text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400">하단 지지선 (Lower)</div>
                <div className="text-emerald-400 font-bold text-sm mt-1">{formatPrice(result.bBandsLower)}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400">중앙 기준선 (SMA 20)</div>
                <div className="text-white font-bold text-sm mt-1">{formatPrice(result.bBandsMiddle)}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400">상단 저항선 (Upper)</div>
                <div className="text-rose-400 font-bold text-sm mt-1">{formatPrice(result.bBandsUpper)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CANDLESTICK PATTERNS */}
      {activeTab === "PATTERNS" && (
        <div className="space-y-4">
          {result.candlePatterns.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400 text-sm">
              현재 구간에서 60여 종의 특이 캔들스틱 반전 패턴이 검출되지 않은 일반 수급 구간입니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.candlePatterns.map((p, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{p.nameKr}</span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      p.type === "BULLISH" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}>
                      {p.type === "BULLISH" ? "상승 반전" : "하락 경계"} (+{p.strength}pt)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{p.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: VOLUME & VOLATILITY */}
      {activeTab === "VOLUME_VOLATILITY" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-white">거래량 지표 (OBV / Chaikin)</h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">On Balance Volume (OBV):</span>
                <span className="text-emerald-400 font-bold">{(result.obv ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Chaikin A/D:</span>
                <span className="text-cyan-400 font-bold">{(result.chaikinAD ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chaikin Oscillator:</span>
                <span className="text-indigo-400 font-bold">{result.chaikinOsc}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-white">가격 변환 및 진동 주기 (HT)</h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Typical Price (고+저+종)/3:</span>
                <span className="text-white font-bold">{formatPrice(result.typicalPrice)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Weighted Close (고+저+종*2)/4:</span>
                <span className="text-white font-bold">{formatPrice(result.weightedClosePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hilbert Transform Trend Mode:</span>
                <span className="text-amber-400 font-bold">{result.htTrendMode === 1 ? "추세(Trend) 국면" : "횡보/주기(Cycle) 국면"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
