import React from "react";
import { 
  X, 
  Scale, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3, 
  CheckCircle2, 
  Plus, 
  Award, 
  Activity, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Layers, 
  GitCompare, 
  Building2,
  ExternalLink,
  Target
} from "lucide-react";
import { StockIntelligenceItem } from "./SmartThemeSearchModal";

interface AiStockCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyword: string;
  stocks: StockIntelligenceItem[];
  onRemoveStock: (symbol: string) => void;
  onOpenChart: (stock: any) => void;
  onRegisterTarget: (stock: any) => void;
  isInWatchlist: (symbol: string) => boolean;
}

export const AiStockCompareModal: React.FC<AiStockCompareModalProps> = ({
  isOpen,
  onClose,
  keyword,
  stocks,
  onRemoveStock,
  onOpenChart,
  onRegisterTarget,
  isInWatchlist
}) => {
  if (!isOpen || stocks.length === 0) return null;

  // Find best score for highlighting winners
  const highestAiScore = Math.max(...stocks.map(s => s.ai_score || 0));
  const highestRelatedScore = Math.max(...stocks.map(s => s.related_score || 0));
  const highestGain = Math.max(...stocks.map(s => s.changePct || 0));
  const highestVolumeRatio = Math.max(...stocks.map(s => s.volume_ratio || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-cyan-500/40 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:px-6 bg-gradient-to-r from-zinc-900 via-zinc-900 to-cyan-950/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>'{keyword}'</span>
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    AI 다차원 퀀트 비교 매트릭스
                  </span>
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-800">
                  {stocks.length}개 종목 비교
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                AI Score, 시가총액 규모, 수급 점수, 거래량 폭발 지수 및 목표가를 한눈에 정밀 대조합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COMPARISON BODY: SCROLLABLE MATRIX */}
        <div className="flex-1 overflow-auto p-5 sm:p-6 space-y-6">
          
          {/* COMPARISON CARDS / GRID TABLE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map((st, idx) => {
              const isRegistered = isInWatchlist(st.symbol);
              const isTopAi = st.ai_score === highestAiScore;
              const isUp = (st.changePct || 0) >= 0;
              const capCat = (st as any).capGroup || (st.price && st.price >= 100000 ? "LARGE" : "MID");
              const capLabel = capCat === "LARGE" ? "🏙️ 대형주 (5조+)" : capCat === "MID" ? "🏢 중형주 (5천억~5조)" : "🚀 소형주 (5천억 미만)";

              return (
                <div
                  key={st.symbol}
                  className={`bg-zinc-900/90 border rounded-2xl p-4.5 space-y-4 relative flex flex-col justify-between transition ${
                    isTopAi
                      ? "border-cyan-500/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {/* Remove badge */}
                  <button
                    onClick={() => onRemoveStock(st.symbol)}
                    className="absolute top-3 right-3 p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                    title="비교에서 제거"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="space-y-3">
                    {/* Top Identity */}
                    <div className="pr-6">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                          #{idx + 1}
                        </span>
                        <h3 className="text-base font-black text-white truncate">{st.name}</h3>
                        <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                          {st.symbol}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {st.market}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {capLabel}
                        </span>
                      </div>
                    </div>

                    {/* Price & Change Banner */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/90 flex items-center justify-between font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">현재가</span>
                        <span className="text-base font-black text-white">
                          {st.price ? (st.price ?? 0).toLocaleString() : "-"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 block">실시간 등락</span>
                        <span className={`text-sm font-bold flex items-center justify-end ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {isUp ? "+" : ""}{st.changePct?.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* AI Score & Key Matrix Breakdown */}
                    <div className="space-y-2 text-xs">
                      <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 space-y-1.5 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-cyan-400" /> AI 종합 Score:
                          </span>
                          <span className="text-cyan-300 font-black text-sm">
                            {st.ai_score}점 ({st.ai_grade}등급)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, st.ai_score)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">키워드 연관도</span>
                          <span className="text-amber-300 font-bold">{st.related_score}점</span>
                          <span className="text-[9px] text-zinc-400 block truncate">({st.related_grade})</span>
                        </div>
                        <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">거래량 폭발</span>
                          <span className="text-rose-400 font-bold">{st.volume_ratio}X 급증</span>
                          <span className="text-[9px] text-zinc-400 block truncate">20일 평균 대비</span>
                        </div>
                      </div>

                      <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800 space-y-1 text-[11px]">
                        <div className="flex justify-between text-zinc-300">
                          <span className="text-zinc-500">외인/기관 수급:</span>
                          <span className="text-emerald-400 font-bold font-mono">
                            {st.investor_flow?.foreigner || "순매수"}
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span className="text-zinc-500">RSI / 추세:</span>
                          <span className="text-cyan-300 font-bold font-mono">
                            RSI {st.technical_analysis?.rsi || 62} ({st.technical_analysis?.trend || "BULLISH"})
                          </span>
                        </div>
                      </div>

                      {/* Trading Targets if available */}
                      {st.trading_targets && (
                        <div className="bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-800/40 text-[11px] font-mono space-y-1">
                          <div className="flex justify-between text-cyan-200">
                            <span className="text-zinc-400">1차 목표가:</span>
                            <span className="font-bold text-amber-300">{st.trading_targets.target1}</span>
                          </div>
                          <div className="flex justify-between text-cyan-200">
                            <span className="text-zinc-400">손절 기준선:</span>
                            <span className="font-bold text-rose-400">{st.trading_targets.stopLoss}</span>
                          </div>
                        </div>
                      )}

                      {/* AI Summary Short */}
                      <p className="text-[11px] text-zinc-300 leading-relaxed bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800 line-clamp-3">
                        💡 {st.ai_summary}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                    <button
                      onClick={() => onRegisterTarget(st)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                        isRegistered
                          ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                          : "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500"
                      }`}
                    >
                      {isRegistered ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>등록됨</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>타깃 등록</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onOpenChart(st)}
                      className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>차트</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SUMMARY RECOMMENDATION BANNER */}
          <div className="bg-gradient-to-r from-cyan-950/60 via-zinc-900 to-blue-950/60 border border-cyan-800/60 rounded-2xl p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                <Target className="w-4 h-4 text-amber-300" />
                <span>AI 퀀트 포트폴리오 배분 권고안:</span>
              </div>
              <p className="text-zinc-300">
                대형주(LARGE) 50%를 지지 기반으로 설정하고, 고성장 중형주(MID) 및 스몰캡 50%를 눌림목 분할 매수하는 바벨(Barbell) 전략을 권장합니다.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition cursor-pointer shrink-0"
            >
              비교창 닫기
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
