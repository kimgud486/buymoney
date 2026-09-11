import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Target,
  Zap,
  Flame,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Award,
  Cpu,
  Brain
} from "lucide-react";
import { ExplainableTradeIdea } from "../scanner/ExplainableOpportunityScannerEngine";

export const ExplainableOpportunityScanner: React.FC = () => {
  const [market, setMarket] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [isYesOnlyMode, setIsYesOnlyMode] = useState<boolean>(true);
  const [ideas, setIdeas] = useState<ExplainableTradeIdea[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scannedAt, setScannedAt] = useState<string>("");
  const [totalScanned, setTotalScanned] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [selectedIdea, setSelectedIdea] = useState<ExplainableTradeIdea | null>(null);
  const [aiGeneratingSymbol, setAiGeneratingSymbol] = useState<string | null>(null);

  const fetchScannerResults = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isYesOnlyMode
        ? `/api/yes-only-scanner?market=${market}&aiExplain=true`
        : `/api/explainable-scanner?market=${market}&aiExplain=true`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.topIdeas)) {
          setIdeas(data.topIdeas);
          setScannedAt(data.scannedAt || new Date().toLocaleTimeString("ko-KR"));
          setTotalScanned(data.totalScanned || 29);
          setRejectedCount(data.rejectedCount || (data.totalScanned - data.topIdeas.length));
        }
      }
    } catch (err) {
      console.warn("[ExplainableScanner] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [market, isYesOnlyMode]);

  useEffect(() => {
    fetchScannerResults();
  }, [fetchScannerResults]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchScannerResults();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchScannerResults]);

  const requestAiDeepExplanation = async (idea: ExplainableTradeIdea) => {
    setAiGeneratingSymbol(idea.symbol);
    try {
      const prompt = `[AI Explainable Profit Opportunity Scanner]
종목: ${idea.name}(${idea.symbol})
Opportunity Score: ${idea.score}/100 [${idea.grade}]
구매판단: ${idea.wouldBuy ? "YES ✅" : "NO ❌"}
상승근거: ${idea.bullishReasons.join(" / ")}
위험요인: ${idea.riskReasons.join(" / ")}

위 데이터를 바탕으로 매매자에게 3줄 요약으로 왜 포착되었고, 현재 시점 추격하면 안 되는 이유 및 무효화 가격을 명확히 설명해줘.`;

      const res = await fetch("/api/ai/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: idea.symbol,
          prompt,
          currentPrice: idea.price
        })
      });

      if (res.ok) {
        const data = await res.json();
        const summaryText = data.analysis || data.text || "AI 정밀 해설 완료.";
        setIdeas((prev) =>
          prev.map((item) => (item.symbol === idea.symbol ? { ...item, aiSummary: summaryText } : item))
        );
      }
    } catch (err) {
      console.warn("AI Explanation request error:", err);
    } finally {
      setAiGeneratingSymbol(null);
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "S":
        return "bg-purple-900/80 text-purple-300 border-purple-500/50 shadow-purple-900/50";
      case "A+":
        return "bg-emerald-900/80 text-emerald-300 border-emerald-500/50 shadow-emerald-900/50";
      case "A":
        return "bg-teal-900/80 text-teal-300 border-teal-500/50 shadow-teal-900/50";
      case "B":
        return "bg-blue-900/80 text-blue-300 border-blue-500/50 shadow-blue-900/50";
      default:
        return "bg-gray-800 text-gray-400 border-gray-700";
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case "STRONG_BUY_CANDIDATE":
        return { text: "🔥 STRONG BUY CANDIDATE", cls: "bg-red-500/20 text-red-400 border-red-500/40" };
      case "BUY_CANDIDATE":
        return { text: "🟢 BUY CANDIDATE", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" };
      case "WATCH_FOR_ENTRY":
        return { text: "🔵 WATCH FOR ENTRY", cls: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" };
      case "WATCH":
        return { text: "🟡 WATCH", cls: "bg-amber-500/20 text-amber-400 border-amber-500/40" };
      default:
        return { text: "🔴 AVOID / NO SETUP", cls: "bg-gray-800 text-gray-400 border-gray-700" };
    }
  };

  return (
    <div id="explainable-scanner-container" className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Brain className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                AI Explainable Profit Opportunity Scanner
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 rounded-full">
                TOP 5
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              수학적 퀀트 스캐너와 Signal Validation Gate로 검증한 설명 가능한 주도주 매수 후보 분석
            </p>
          </div>

          {/* Market Filters & Control */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsYesOnlyMode(!isYesOnlyMode)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                isYesOnlyMode
                  ? "bg-gradient-to-r from-red-900/80 to-amber-900/80 text-amber-200 border-amber-500/50 shadow-amber-900/30 ring-1 ring-amber-500/30"
                  : "bg-slate-950 text-slate-400 border-slate-800"
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${isYesOnlyMode ? "text-amber-400 fill-amber-400" : ""}`} />
              YES ONLY 모드 {isYesOnlyMode ? "ON (🔥 82점+)" : "OFF (전체 랭킹)"}
            </button>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(["ALL", "KOREA", "US", "BTC"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarket(m)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    market === m
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m === "ALL" ? "전체" : m === "KOREA" ? "국내주식" : m === "US" ? "미국주식" : "가상자산"}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
                autoRefresh
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800"
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoRefresh ? "text-emerald-400 fill-emerald-400" : ""}`} />
              실시간 {autoRefresh ? "ON" : "OFF"}
            </button>

            <button
              onClick={fetchScannerResults}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Scan Status Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              15초 동기화
            </span>
            <span>스캔 시각: <strong className="text-slate-200">{scannedAt || "실시간 감시 중..."}</strong></span>
            {totalScanned > 0 && (
              <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-mono">
                총 {totalScanned}개 종목 스캔 → <strong className="text-emerald-400">{ideas.length}개 YES 통과</strong>, <span className="text-rose-400">{rejectedCount}개 탈락</span>
              </span>
            )}
          </div>
          <div className="text-slate-500 italic">
            * YES ONLY 스캐너는 15개 하드조건(Score≥82, RVOL≥1.5, EMA정배열, VWAP상단) 통과 종목만 엄격 표시합니다.
          </div>
        </div>
      </div>

      {/* TOP 5 Opportunity Grid */}
      {loading && ideas.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">실시간 시장 수급, VWAP, 캔들 패턴 및 YES ONLY 15대 검증조건 계산 중...</p>
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-10 text-center space-y-4 shadow-2xl backdrop-blur-md">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            <ShieldCheck className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-100">현재 모든 검증을 통과한 YES 종목 없음</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              위험 및 약세 종목의 무분별한 매수를 차단하여 원금을 엄격히 보호하고 있습니다.
              <br />
              (YES 승인 조건: Profit Opportunity Score 82점 이상 + Signal Gate 100% 통과 + RVOL 1.5배 이상)
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => setIsYesOnlyMode(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
            >
              전체 종목 랭킹 보기 (NO / WATCH 포함)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ideas.map((idea, index) => {
            const dec = getDecisionBadge(idea.decision);
            const isSelected = selectedIdea?.symbol === idea.symbol;
            const itemKey = idea.id || `${idea.market}-${idea.symbol}-${index}`;

            return (
              <div
                key={itemKey}
                className={`bg-slate-900/90 border rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  idea.wouldBuy
                    ? "border-emerald-500/40 hover:border-emerald-500/70 shadow-emerald-950/20"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Header Card Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-indigo-400 shadow-inner">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-white tracking-tight">{idea.name}</h2>
                          <span className="text-xs text-slate-400 font-mono">({idea.symbol})</span>
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                            {idea.market}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-base font-bold font-mono text-slate-100">
                            {idea.price.toLocaleString()} {idea.market === "US" ? "$" : "원"}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              idea.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {idea.changePct >= 0 ? `+${idea.changePct}%` : `${idea.changePct}%`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score & Grade Circle */}
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Opportunity Score</div>
                        <div className="text-2xl font-black font-mono text-indigo-300">{idea.score}<span className="text-xs text-slate-500 font-normal">/100</span></div>
                      </div>
                      <span className={`px-3 py-1 text-sm font-black rounded-xl border shadow-lg ${getGradeBadge(idea.grade)}`}>
                        {idea.grade}
                      </span>
                    </div>
                  </div>

                  {/* Decision Tag & Would Buy Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${dec.cls}`}>
                      {dec.text}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">나라면 구매하겠는가?</span>
                      {idea.wouldBuy ? (
                        <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          YES ✅
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 font-bold text-xs rounded-lg flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          NO ❌
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thesis Narrative */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 leading-relaxed font-sans">
                    <span className="font-semibold text-indigo-400 mr-1.5">AI 분석 Thesis:</span>
                    {idea.thesis}
                  </div>
                </div>

                {/* Key Technical Indicators Grid */}
                <div className="grid grid-cols-4 gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 text-center font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500">RSI (14)</div>
                    <div className={`text-xs font-bold ${idea.rsi >= 52 && idea.rsi <= 68 ? "text-emerald-400" : idea.rsi > 78 ? "text-rose-400" : "text-slate-300"}`}>
                      {idea.rsi}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">RVOL</div>
                    <div className={`text-xs font-bold ${idea.rvol >= 1.5 ? "text-indigo-400" : "text-slate-300"}`}>
                      {idea.rvol}x
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">ATR 변동성</div>
                    <div className="text-xs font-bold text-slate-300">{idea.atrPct}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">캔들 패턴</div>
                    <div className="text-[11px] font-semibold text-emerald-300 truncate" title={idea.pattern}>
                      {idea.pattern}
                    </div>
                  </div>
                </div>

                {/* Bullish & Risk Reasons Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Bullish Reasons */}
                  <div className="bg-emerald-950/15 border border-emerald-900/30 rounded-xl p-3 space-y-1.5">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      왜 포착되었는가? (상승 근거)
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {idea.bullishReasons.slice(0, 4).map((r, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Risk Reasons */}
                  <div className="bg-amber-950/15 border border-amber-900/30 rounded-xl p-3 space-y-1.5">
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      위험 요인 및 주의점
                    </div>
                    {idea.riskReasons.length > 0 ? (
                      <ul className="space-y-1 text-slate-300 text-[11px]">
                        {idea.riskReasons.slice(0, 3).map((r, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">특이 위험 요인 미감지 (Signal Gate 통과)</p>
                    )}
                  </div>
                </div>

                {/* Price Execution Targets Bar */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium border-b border-slate-800 pb-1.5">
                    <span className="flex items-center gap-1 text-indigo-300">
                      <Target className="w-3.5 h-3.5" />
                      매수 진입 구간 (Entry Zone):
                    </span>
                    <strong className="text-emerald-400 font-mono">
                      {idea.entryLow.toLocaleString()} ~ {idea.entryHigh.toLocaleString()} {idea.market === "US" ? "$" : "원"}
                    </strong>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-center pt-0.5">
                    <div className="bg-rose-950/30 border border-rose-900/30 p-1.5 rounded-lg">
                      <span className="text-[10px] text-rose-400 block font-sans">손절가 (Stop)</span>
                      <strong className="text-rose-300">{idea.stop.toLocaleString()}</strong>
                    </div>
                    <div className="bg-emerald-950/30 border border-emerald-900/30 p-1.5 rounded-lg">
                      <span className="text-[10px] text-emerald-400 block font-sans">목표1 (Target 1)</span>
                      <strong className="text-emerald-300">{idea.target1.toLocaleString()}</strong>
                    </div>
                    <div className="bg-indigo-950/30 border border-indigo-900/30 p-1.5 rounded-lg">
                      <span className="text-[10px] text-indigo-400 block font-sans">목표2 (Target 2)</span>
                      <strong className="text-indigo-300">{idea.target2.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="text-rose-400 font-semibold mr-1">무효화 조건:</span>
                    {idea.invalidation}
                  </div>
                </div>

                {/* Gemini AI Deep Explanation Section */}
                {idea.aiSummary ? (
                  <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3 space-y-1.5 text-xs text-indigo-200">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      Gemini AI 정밀 종합 해설
                    </div>
                    <p className="whitespace-pre-line leading-relaxed text-[11px] text-indigo-100">{idea.aiSummary}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => requestAiDeepExplanation(idea)}
                    disabled={aiGeneratingSymbol === idea.symbol}
                    className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${aiGeneratingSymbol === idea.symbol ? "animate-spin" : ""}`} />
                    {aiGeneratingSymbol === idea.symbol ? "AI 정밀 해설 생성 중..." : "AI 정밀 종합 해설 요청"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default ExplainableOpportunityScanner;
