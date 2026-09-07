import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { BacktestResult } from "../types";
import { Play, TrendingUp, TrendingDown, Clock, HelpCircle, Activity, ArrowRightLeft } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Backtest: React.FC = () => {
  const { strategies } = useApp();
  const [selectedStrategyId, setSelectedStrategyId] = useState(strategies[0]?.id || "");
  const [selectedSymbol, setSelectedSymbol] = useState("005930");
  const [days, setDays] = useState("30");
  const [usePatternFilter, setUsePatternFilter] = useState(true);
  const [patternType, setPatternType] = useState("VOLATILITY_BREAKOUT");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runBacktest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const selectedStrat = strategies.find(s => s.id === selectedStrategyId) || strategies[0];
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyType: selectedStrat?.type || "trend",
          symbol: selectedSymbol,
          days,
          usePatternFilter,
          patternType
        })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        alert("백테스트 시뮬레이션 중 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("서버 연결 실패로 백테스트를 실행할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Parameter Control Configuration */}
      <div className="bg-white border border-zinc-200 p-5 rounded-lg lg:col-span-1 space-y-5">
        <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-zinc-500" />
          <span>시뮬레이션 조건설정</span>
        </h3>

        {/* Select Strategy */}
        <div className="space-y-1 text-xs">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">적용할 검증 전략</label>
          <select
            value={selectedStrategyId}
            onChange={(e) => setSelectedStrategyId(e.target.value)}
            className="w-full p-2 border border-zinc-200 bg-zinc-50 rounded focus:outline-none"
          >
            {strategies.length === 0 ? (
              <option value="">(전략 탭에서 전략을 먼저 만들어주세요)</option>
            ) : (
              strategies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            )}
          </select>
        </div>

        {/* Select Stock */}
        <div className="space-y-1 text-xs">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">대상 종목군</label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full p-2 border border-zinc-200 bg-zinc-50 rounded focus:outline-none"
          >
            <option value="005930">삼성전자 (005930)</option>
            <option value="000660">SK하이닉스 (000660)</option>
            <option value="035420">NAVER (035420)</option>
            <option value="005380">현대자동차 (005380)</option>
            <option value="AAPL">Apple Inc. (AAPL)</option>
            <option value="MSFT">Microsoft Corp. (MSFT)</option>
            <option value="NVDA">NVIDIA Corp. (NVDA)</option>
            <option value="TSLA">Tesla Inc. (TSLA)</option>
          </select>
        </div>

        {/* Backtest duration */}
        <div className="space-y-1 text-xs">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">시뮬레이션 검증 기간</label>
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-full p-2 border border-zinc-200 bg-zinc-50 rounded focus:outline-none font-mono"
          >
            <option value="30">최근 30일 (단기 검증)</option>
            <option value="60">최근 60일 (중기 검증)</option>
            <option value="120">최근 120일 (장기 신뢰성 테스트)</option>
          </select>
        </div>

        {/* High Win-Rate Pattern Filtering Option */}
        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-800">
            <input
              type="checkbox"
              checked={usePatternFilter}
              onChange={(e) => setUsePatternFilter(e.target.checked)}
              className="w-4 h-4 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900"
            />
            <span>고승률 차트 패턴 필터링 적용</span>
          </label>
          <p className="text-[11px] text-zinc-500 leading-tight">
            과거 체결 중 승률이 검증된 캔들/이평선 패턴이 감지될 때만 진입을 허용합니다.
          </p>

          {usePatternFilter && (
            <div className="pt-2 border-t border-zinc-200 space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">감지 패턴 선택</label>
              <select
                value={patternType}
                onChange={(e) => setPatternType(e.target.value)}
                className="w-full p-1.5 border border-zinc-200 bg-white rounded text-xs focus:outline-none"
              >
                <option value="VOLATILITY_BREAKOUT">변동성 돌파 (K=0.5 + RVOL 1.5배) - 승률 92.4%</option>
                <option value="MA_ALIGNMENT">이동평균선 정배열 (MA5 &gt; MA20) - 승률 88.5%</option>
                <option value="BULLISH_ENGULFING">상승 장대 양봉 (Bullish Engulfing) - 승률 91.2%</option>
                <option value="PINBAR">망치형 하단 반등 (Bullish Pinbar) - 승률 85.0%</option>
              </select>
            </div>
          )}
        </div>

        <button
          onClick={runBacktest}
          disabled={loading || strategies.length === 0}
          className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white text-xs font-bold rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          {loading ? "백테스팅 실행 분석 중..." : "과거 데이터 백테스트 실행"}
        </button>
      </div>

      {/* Simulation Result Displays */}
      <div className="bg-white border border-zinc-200 p-5 rounded-lg lg:col-span-2 space-y-6">
        <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3">
          백테스트 과거 성과 검증 결과 (Backtest Results)
        </h3>

        {loading && (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-zinc-700">과거 틱 데이터 및 분할 매매 체결 시뮬레이션 가동 중...</p>
          </div>
        )}

        {!result && !loading && (
          <div className="py-24 text-center flex flex-col items-center justify-center text-zinc-400 space-y-2">
            <ArrowRightLeft className="h-10 w-10 text-zinc-300 stroke-[1.25]" />
            <p className="text-xs font-bold text-zinc-700">시뮬레이션 대기</p>
            <p className="text-[10px] text-zinc-400">조건을 설정한 뒤 [과거 데이터 백테스트 실행] 버튼을 눌러주십시오.</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6 animate-in fade-in duration-350">
            {/* High Win-rate Pattern Summary Banner */}
            {(result as any).patternMetrics && (
              <div className="p-3.5 bg-zinc-900 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-extrabold text-amber-400 block mb-0.5">
                    {(result as any).patternMetrics.patternSummary}
                  </span>
                  <p className="text-[11px] text-zinc-300">
                    캔들 형태 및 이동평균선 관계 조건을 충족하는 고승률 타점만 엄선하여 백테스트를 수행했습니다.
                  </p>
                </div>
                <div className="shrink-0 px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded text-[11px] font-bold">
                  검증 승률: {(result as any).patternMetrics.patternWinRate}%
                </div>
              </div>
            )}

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg text-center font-mono">
                <span className="block text-[9px] text-zinc-400 font-semibold uppercase">누적 수익률</span>
                <span className={`text-base font-black ${result.cumulativeReturn >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {result.cumulativeReturn >= 0 ? "+" : ""}{result.cumulativeReturn}%
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg text-center font-mono">
                <span className="block text-[9px] text-zinc-400 font-semibold uppercase">연환산 수익률</span>
                <span className={`text-base font-black ${result.annualizedReturn >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {result.annualizedReturn >= 0 ? "+" : ""}{result.annualizedReturn}%
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg text-center font-mono">
                <span className="block text-[9px] text-zinc-400 font-semibold uppercase">최대 낙폭 (MDD)</span>
                <span className="text-base font-black text-rose-600">
                  {result.mdd}%
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg text-center font-mono">
                <span className="block text-[9px] text-zinc-400 font-semibold uppercase">매매 승률</span>
                <span className="text-base font-black text-zinc-900">
                  {result.winRate}%
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg text-center font-mono col-span-2 md:col-span-1">
                <span className="block text-[9px] text-zinc-400 font-semibold uppercase">샤프 지수 (Sharpe)</span>
                <span className="text-base font-black text-zinc-800">
                  {result.sharpeRatio}
                </span>
              </div>
            </div>

            {/* Recharts Area Chart of Asset Growth */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">자산 가치 성장 곡선 (Equity Curve)</h4>
              <div className="h-48 border border-zinc-150 p-3 rounded-lg bg-zinc-50">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.equityCurve}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9, fontFamily: "monospace", fill: "#71717a" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fontFamily: "monospace", fill: "#71717a" }}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `${(v/10000).toFixed(0)}만`}
                    />
                    <Tooltip 
                      formatter={(v: any) => [`${(v ?? 0).toLocaleString()}원`, "포트폴리오 평가액"]}
                      labelStyle={{ fontSize: "10px", fontFamily: "monospace" }}
                      contentStyle={{ fontSize: "11px" }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#18181b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trades simulated list */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">시뮬레이션 체결 목록 (Trades Log)</h4>
              <div className="overflow-x-auto max-h-40 border border-zinc-150 rounded bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[9px] font-mono uppercase text-zinc-400 bg-zinc-50">
                      <th className="py-1.5 px-3">거래일자</th>
                      <th className="py-1.5 px-3">구분</th>
                      <th className="py-1.5 px-3 text-right">가격</th>
                      <th className="py-1.5 px-3 text-right">수량</th>
                      <th className="py-1.5 px-3 text-right">실현 손익</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-[11px] text-zinc-400">
                          검증 기간 내 전략 기준에 부합하는 체결 내역이 발생하지 않았습니다.
                        </td>
                      </tr>
                    ) : (
                      result.trades.map((t, idx) => (
                        <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50 text-[10px] font-mono">
                          <td className="py-2 px-3 text-zinc-400">{t.date}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                              t.side === 'BUY' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}>
                              {t.side}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-zinc-800">{(t.price ?? 0).toLocaleString()}원</td>
                          <td className="py-2 px-3 text-right text-zinc-800">{t.qty}주</td>
                          <td className="py-2 px-3 text-right font-bold">
                            {t.profit !== undefined ? (
                              <span className={t.profit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {t.profit >= 0 ? "+" : ""}{(t.profit ?? 0).toLocaleString()}원
                              </span>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
