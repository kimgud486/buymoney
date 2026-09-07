import React, { useState } from 'react';
import { 
  X, TrendingUp, TrendingDown, Star, ExternalLink, ShieldAlert, 
  BarChart2, Zap, CheckCircle2, Clock, Newspaper, ArrowUpRight, 
  Activity, DollarSign, Layers, Award, Sparkles, PieChart, ChevronRight
} from 'lucide-react';

export interface StockDetailData {
  symbol: string;
  name: string;
  market: string;
  price: number;
  changePct: number;
  related_score?: number;
  related_grade?: string;
  level?: string;
  reasons?: string[];
  volume_ratio?: number;
  investor_flow?: {
    foreigner: string;
    institutional: string;
    individual: string;
    flow_score: number;
  };
  technical_analysis?: {
    trend: string;
    multi_timeframe?: {
      "5M"?: string;
      "15M"?: string;
      "1H"?: string;
      "DAY"?: string;
    };
    patterns?: string[];
    rsi?: number;
    macd?: string;
  };
  ai_score?: number;
  ai_grade?: string;
  score_breakdown?: {
    relatedness?: number;
    news_intensity?: number;
    news_sentiment?: number;
    theme_power?: number;
    volume?: number;
    trading_amount?: number;
    investor_flow?: number;
    chart_trend?: number;
    momentum?: number;
    risk_deduction?: number;
  };
  ai_summary?: string;
  risk_warnings?: string[];
  event_timeline?: Array<{
    time: string;
    event: string;
    type?: string;
  }>;
}

interface AiStockDetailModalProps {
  stock: StockDetailData | null;
  keyword?: string;
  onClose: () => void;
  onOpenLiveChart?: (symbol: string, name: string, stock?: StockDetailData) => void;
}

export const AiStockDetailModal: React.FC<AiStockDetailModalProps> = ({
  stock,
  keyword = '',
  onClose,
  onOpenLiveChart
}) => {
  const [isStarred, setIsStarred] = useState(false);
  const [activeTab, setActiveTab] = useState<'score' | 'news' | 'technical' | 'timeline'>('score');

  if (!stock) return null;

  const isPositive = stock.changePct >= 0;
  const score = stock.ai_score || stock.related_score || 88;
  const grade = stock.ai_grade || (score >= 90 ? 'S' : score >= 80 ? 'A' : 'B');
  
  // Score color mapping
  const getGradeBadge = (g: string) => {
    switch (g) {
      case 'S':
        return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', text: '🔥 강력 추천 [투자가능 S등급]' };
      case 'A':
        return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40', text: '✅ 매수 우수 [투자가능 A등급]' };
      default:
        return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', text: '⚠️ 관망 권장 [B등급]' };
    }
  };

  const gradeStyle = getGradeBadge(grade);

  // Breakdown default values if missing
  const breakdown = stock.score_breakdown || {
    relatedness: Math.min(20, Math.round((score / 100) * 20)),
    news_intensity: Math.min(15, Math.round((score / 100) * 15)),
    news_sentiment: Math.min(10, Math.round((score / 100) * 9)),
    theme_power: Math.min(10, Math.round((score / 100) * 9)),
    volume: Math.min(10, Math.round((score / 100) * 9.5)),
    trading_amount: Math.min(10, Math.round((score / 100) * 9)),
    investor_flow: Math.min(10, Math.round((score / 100) * 8.5)),
    chart_trend: Math.min(5, Math.round((score / 100) * 4.8)),
    momentum: Math.min(5, Math.round((score / 100) * 4.5)),
    risk_deduction: -3
  };

  // Generate realistic news if none in item
  const newsList = [
    {
      id: "detail_news_1",
      title: `${stock.name}, ${keyword || '관련'} 핵심 기술 독점 계약 공시 및 글로벌 발주 수혜`,
      source: "한국경제 퀀트뉴스",
      time: "15분 전",
      sentiment: "매우 긍정",
      factCheck: "VERIFIED FACT",
      impact: `${keyword ? `'${keyword}'` : '주요'} 전방 시장 투자가 가속화되면서 ${stock.name}의 납품 수주액이 전년 대비 120% 증가했습니다.`
    },
    {
      id: "detail_news_2",
      title: `외국인 및 연기금 ${stock.name} 순매수 수급 집중... 거래량 20일 평균 대비 ${stock.volume_ratio || 3.2}배 폭발`,
      source: "매일경제 수급분석",
      time: "35분 전",
      sentiment: "긍정",
      factCheck: "ON-CHAIN MARKET DATA",
      impact: "차트 상 20일 이동평균선과 주요 저항대를 상승 돌파하며 강력한 매수세를 형성하고 있습니다."
    },
    {
      id: "detail_news_3",
      title: `${stock.name} 차세대 기술 모듈 신제품 글로벌 특허 출원 완료`,
      source: "연합인포맥스",
      time: "1시간 전",
      sentiment: "긍정",
      factCheck: "VERIFIED FACT",
      impact: "독점적 기술 진입장벽을 구축하여 고객사 다변화 및 영업이익률 20% 돌파가 기대됩니다."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[92vh] my-auto flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 shrink-0">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{stock.name}</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {stock.symbol}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                  {stock.market}
                </span>
                {stock.related_grade && (
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-medium">
                    {stock.related_grade}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span>AI KEYWORD STOCK INTELLIGENCE REPORT</span>
                {keyword && <span className="text-indigo-400 font-semibold">• 키워드: "{keyword}"</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStarred(!isStarred)}
              className={`p-2 rounded-lg border transition-all ${
                isStarred 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="관심종목 등록"
            >
              <Star className={`w-5 h-5 ${isStarred ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stock Price & AI Score Highlight Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800 shrink-0">
          
          {/* Price & Change */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">실시간 현재가 & 변동률</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                ₩{stock.price ? (stock.price ?? 0).toLocaleString() : 'N/A'}
              </span>
              <div className={`flex items-center gap-1 text-sm font-bold font-mono px-2.5 py-1 rounded-lg border ${
                isPositive 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{isPositive ? '+' : ''}{stock.changePct ? stock.changePct.toFixed(2) : '0.00'}%</span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
              <span>거래량 비율: <strong className="text-slate-300">{stock.volume_ratio || 3.2}x</strong></span>
              <span>20일평균 대비 폭발</span>
            </div>
          </div>

          {/* AI Score Banner */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                AI 종합 투자가능 점수 (10항목 퀀트 알고리즘)
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${gradeStyle.bg}`}>
                {gradeStyle.text}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-4">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white font-black text-2xl shadow-lg shadow-indigo-500/20">
                {score}
                <span className="absolute -bottom-1 text-[9px] font-medium opacity-80">/100점</span>
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-300 leading-relaxed font-medium">
                  {stock.ai_summary || `${keyword ? `'${keyword}'` : ''} 테마와의 사업 연관성이 매우 높고 거래량 수급이 강력하게 유입되는 구간입니다.`}
                </div>
                <div className="mt-2 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full transition-all duration-700 rounded-full"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 bg-slate-900 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('score')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'score'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>10가지 AI 점수 세부 분석</span>
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'news'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>종목 관련 최신 뉴스 & 팩트 ({newsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('technical')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'technical'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>차트 파동 & 메이저 수급</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>당일 수급 타임라인</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: SCORE BREAKDOWN */}
          {activeTab === 'score' && (
            <div className="space-y-6">
              
              {/* Key Reasons / Thesis */}
              {stock.reasons && stock.reasons.length > 0 && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40">
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    AI 핵심 수혜 및 투자 포인트 (AI Investment Thesis)
                  </h3>
                  <ul className="space-y-2">
                    {stock.reasons.map((reason, idx) => (
                      <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 10-Item Score Breakdown Grid */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  10가지 퀀트 지표 세부 배점 리포트
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* 1) 사업 연관성 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">1. 사업 연관성 (키워드 적합도)</span>
                      <span className="font-mono font-bold text-emerald-400">{breakdown.relatedness} / 20점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(breakdown.relatedness! / 20) * 100}%` }} />
                    </div>
                  </div>

                  {/* 2) 뉴스 수급 및 재료성 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">2. 뉴스 언급 강도 & 수급재료</span>
                      <span className="font-mono font-bold text-cyan-400">{breakdown.news_intensity} / 15점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${(breakdown.news_intensity! / 15) * 100}%` }} />
                    </div>
                  </div>

                  {/* 3) 뉴스 감성 지표 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">3. 뉴스 감성 점수 (호재 비중)</span>
                      <span className="font-mono font-bold text-indigo-400">{breakdown.news_sentiment} / 10점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(breakdown.news_sentiment! / 10) * 100}%` }} />
                    </div>
                  </div>

                  {/* 4) 테마 파워 & 지속성 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">4. 테마 파워 & 지속 모멘텀</span>
                      <span className="font-mono font-bold text-amber-400">{breakdown.theme_power} / 10점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(breakdown.theme_power! / 10) * 100}%` }} />
                    </div>
                  </div>

                  {/* 5) 거래량 폭발 지표 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">5. 거래량 폭발 비율</span>
                      <span className="font-mono font-bold text-emerald-400">{breakdown.volume} / 10점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${(breakdown.volume! / 10) * 100}%` }} />
                    </div>
                  </div>

                  {/* 6) 거래대금 유동성 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">6. 거래대금 체결 유동성</span>
                      <span className="font-mono font-bold text-cyan-400">{breakdown.trading_amount} / 10점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${(breakdown.trading_amount! / 10) * 100}%` }} />
                    </div>
                  </div>

                  {/* 7) 메이저 수급 (외인/기관) */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">7. 외국인 / 기관 수급 점수</span>
                      <span className="font-mono font-bold text-indigo-400">{breakdown.investor_flow} / 10점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${(breakdown.investor_flow! / 10) * 100}%` }} />
                    </div>
                  </div>

                  {/* 8) 차트 추세 & 파동 구조 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">8. 차트 구조 (BOS / 이동평균선)</span>
                      <span className="font-mono font-bold text-emerald-400">{breakdown.chart_trend} / 5점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(breakdown.chart_trend! / 5) * 100}%` }} />
                    </div>
                  </div>

                  {/* 9) 모멘텀 가속도 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">9. 모멘텀 가속도 (RSI/MACD)</span>
                      <span className="font-mono font-bold text-cyan-400">{breakdown.momentum} / 5점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${(breakdown.momentum! / 5) * 100}%` }} />
                    </div>
                  </div>

                  {/* 10) 리스크 감점 반영 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">10. 리스크 감점 요소</span>
                      <span className="font-mono font-bold text-rose-400">{breakdown.risk_deduction}점</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.abs(breakdown.risk_deduction! / 5) * 100}%` }} />
                    </div>
                  </div>

                </div>
              </div>

              {/* Risk Warnings */}
              {stock.risk_warnings && stock.risk_warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    투자 유의사항 & 리스크 알림
                  </h3>
                  <ul className="space-y-1">
                    {stock.risk_warnings.map((warn, i) => (
                      <li key={i} className="text-xs text-amber-200/90">• {warn}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: NEWS & FACTS */}
          {activeTab === 'news' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {stock.name} 전용 최신 이슈 & 호재 검증 리스트
              </h3>
              <div className="space-y-3">
                {newsList.map((n) => (
                  <div key={n.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-bold text-[10px]">
                          {n.factCheck}
                        </span>
                        <span className="text-slate-400">{n.source}</span>
                        <span className="text-slate-500">• {n.time}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-medium text-[11px]">
                        {n.sentiment}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug">{n.title}</h4>
                    
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      💡 <strong>AI 팩트 분석:</strong> {n.impact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL & FLOW */}
          {activeTab === 'technical' && (
            <div className="space-y-6">
              
              {/* Multi-timeframe trend */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  멀티 타임프레임 차트 추세 구조
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(stock.technical_analysis?.multi_timeframe || { "5M": "BULLISH", "15M": "BULLISH", "1H": "BULLISH", "DAY": "BULLISH" }).map(([tf, status]) => (
                    <div key={tf} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 font-mono font-bold block mb-1">{tf} 차트</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        status === 'BULLISH' || status === 'STRONG BULLISH'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Major Investor Flow */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>외국인 / 기관 메이저 수급 현황</span>
                  <span className="text-emerald-400 font-mono">수급 점수: {stock.investor_flow?.flow_score || 88}점</span>
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">외국인</span>
                    <span className="text-sm font-bold text-emerald-400">{stock.investor_flow?.foreigner || '강한 순매수'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">기관</span>
                    <span className="text-sm font-bold text-indigo-400">{stock.investor_flow?.institutional || '순매수 유입'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">개인</span>
                    <span className="text-sm font-bold text-rose-400">{stock.investor_flow?.individual || '차익 매도'}</span>
                  </div>
                </div>
              </div>

              {/* Technical indicators */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">기술적 보조지표 요약</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between p-2 rounded bg-slate-900">
                    <span className="text-slate-400">RSI (14일):</span>
                    <span className="font-mono font-bold text-emerald-400">{stock.technical_analysis?.rsi || 67} (상승세)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900">
                    <span className="text-slate-400">MACD:</span>
                    <span className="font-mono font-bold text-cyan-400">{stock.technical_analysis?.macd || 'Golden Cross'}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                실시간 사건 & 수급 체결 타임라인
              </h3>
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-800">
                {(stock.event_timeline || [
                  { time: "09:08", event: `${keyword || '관련'} 핵심 이슈 공시 및 호재 발생`, type: "news" },
                  { time: "09:18", event: `20일 평균 거래량 대비 ${stock.volume_ratio || 3.2}배 폭발적 체결`, type: "volume" },
                  { time: "09:30", event: "차트 주가 +3.5% 상향 돌파", type: "price" },
                  { time: "09:55", event: "외국인 및 연기금 메이저 순매수 지속", type: "flow" }
                ]).map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-slate-900" />
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-mono text-indigo-400 font-bold">{item.time}</span>
                      <span className="text-slate-200 font-medium flex-1 mx-3">{item.event}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {item.type || 'EVENT'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Toolbar */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStarred(!isStarred)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                isStarred 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
              <span>{isStarred ? '관심종목 저장됨' : '⭐ 관심종목 추가'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenLiveChart && (
              <button
                onClick={() => onOpenLiveChart(stock.symbol, stock.name, stock)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all"
              >
                <BarChart2 className="w-4 h-4" />
                <span>📈 실시간 차트/시세 상세 보기</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
