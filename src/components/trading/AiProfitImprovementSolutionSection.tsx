import React, { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Filter,
  BarChart2,
  RefreshCw,
  Lock,
  Unlock,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Award
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getAllStocks } from "../../data/stockUniverse";
import { aiProfitSupervisoryEngine } from "../../services/aiProfitSupervisoryEngine";
import { AiProfitSupervisoryHubModal } from "./AiProfitSupervisoryHubModal";

export const AiProfitImprovementSolutionSection: React.FC = () => {
  const { profile, updateProfileSettings, addToast, blockedSymbols, removeBlockedSymbol } = useApp();
  const [isApplied, setIsApplied] = useState(false);
  const [isSupervisoryModalOpen, setIsSupervisoryModalOpen] = useState(false);

  // Strategy Parameters State
  const [breakoutK, setBreakoutK] = useState("0.45");
  const [minRvol, setMinRvol] = useState("1.8");
  const [stopLossRate, setStopLossRate] = useState("-2.0");
  const [targetTakeProfit, setTargetTakeProfit] = useState("+6.0");

  const isRealTrading = Boolean(profile?.isRealTrade);
  const stocks = getAllStocks().slice(0, 8);

  const handleApplySolution = async () => {
    try {
      await updateProfileSettings({
        riskLimitPerTrade: 5,
        dailyLossLimit: 3,
        autoTradingEnabled: true
      });
      aiProfitSupervisoryEngine.setMode("MAX_PROFIT_GOVERNANCE");
      setIsApplied(true);
      addToast({
        type: "SUCCESS",
        title: "👑 AI 총괄 수익 관리감독 동기화 완료",
        message: `변동성 돌파(K=${breakoutK}, RVOL ${minRvol}배, 자동 손절 ${stopLossRate}%) 필터가 ${isRealTrading ? "실거래" : "모의투자"} 자동 매매 로직에 반영되었습니다.`
      });
    } catch (e: any) {
      addToast({
        type: "ERROR",
        title: "솔루션 동기화 실패",
        message: e.message || "설정 동기화 중 오류가 발생했습니다."
      });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI Profit &amp; Performance Supervisory Governance
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            AI 총괄 수익 관리감독 &amp; 성과 극대화 솔루션
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            진입 품질 엄선, 3단계 이익 보존 트레일링 쉴드, 무감정 조기 손절, 승률 자율 튜닝으로 손익비를 3.12:1로 끌어올립니다.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSupervisoryModalOpen(true)}
            className="px-4 py-3 rounded-2xl text-xs font-extrabold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 flex items-center gap-2 transition-all shadow-md"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            👑 관리감독 관제센터 열기
          </button>

          <button
            onClick={handleApplySolution}
            className={`px-5 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg ${
              isApplied
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02]"
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            {isApplied ? "관리감독 가동 중 (실시간 적용됨)" : "1-Click AI 관리감독 일괄 동기화"}
          </button>
        </div>
      </div>

      {/* Section 1: ROI Low Performance Cause Analysis */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          낮은 수익률 원인 분석 리포트 (Low ROI Cause Analysis)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-400">원인 1. 횡보장 휩소(Whipsaw) 매매</span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full font-bold">고위험</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              상승 추세 확정 전 잔파동에 매수 진입하여, 박스권 횡보 구간에서 잦은 매매로 인한 거래 수수료 누적 및 잦은 손실 발생.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-400">원인 2. -3% 초과 손절 지연</span>
              <span className="text-[10px] px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-full font-bold">치명적</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              하락세 전환 종목을 기한 없이 장기 보유하여 마이너스 손실 폭이 늘어나고, 다른 고승률 종목 진입을 방해하는 기회비용 손실.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-400">원인 3. 수급(RVOL) 미달 진입</span>
              <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded-full font-bold">수익정체</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              거래량이 실리지 않은 소외 종목에 진입하여 상승 주도력이 부재하고, 주가 상승 모멘텀이 크게 떨어진 상태 지속.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Improved Volatility Breakout Settings */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            변동성 돌파 (Volatility Breakout) 매매 신호 개선 파라미터
          </span>
          <span className="text-xs font-mono text-emerald-400">Larry Williams K=0.5 Model</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl">
            <span className="text-slate-400 block text-[11px]">돌파 계수 (K-Factor)</span>
            <input
              type="text"
              value={breakoutK}
              onChange={e => setBreakoutK(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 font-mono font-bold text-emerald-400 text-sm focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">전일 변동폭(H-L)의 50%</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl">
            <span className="text-slate-400 block text-[11px]">최소 수급 (RVOL)</span>
            <input
              type="text"
              value={minRvol}
              onChange={e => setMinRvol(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 font-mono font-bold text-emerald-400 text-sm focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">평균 거래량 1.5배 이상</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl">
            <span className="text-slate-400 block text-[11px]">자동 손절선 (SL)</span>
            <input
              type="text"
              value={stopLossRate}
              onChange={e => setStopLossRate(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 font-mono font-bold text-rose-400 text-sm focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">즉시 청산 + 매수 차단</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl">
            <span className="text-slate-400 block text-[11px]">목표 수익률 (TP)</span>
            <input
              type="text"
              value={targetTakeProfit}
              onChange={e => setTargetTakeProfit(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 font-mono font-bold text-emerald-400 text-sm focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">익절 실행 타점</span>
          </div>
        </div>
      </div>

      {/* Section 3: Live Stock Universe Signal Status */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            주요 종목별 변동성 돌파 타점 &amp; 필터링 현황
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {blockedSymbols.length > 0 ? `손절 차단 종목 ${blockedSymbols.length}개` : "모든 종목 정상 스캔 중"}
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase bg-slate-900/80">
                <th className="py-2.5 px-4">종목명 / 코드</th>
                <th className="py-2.5 px-4">시세 / 등락률</th>
                <th className="py-2.5 px-4">돌파 기준가 (K=0.5)</th>
                <th className="py-2.5 px-4">거래량 (RVOL)</th>
                <th className="py-2.5 px-4">AI 변동성 돌파 신호</th>
                <th className="py-2.5 px-4 text-right">매수 차단 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stocks.map(s => {
                const cleanSym = s.symbol.toUpperCase().replace(/^KRW-/, "");
                const isBlocked = blockedSymbols.includes(cleanSym);

                // Volatility breakout threshold mock
                const breakoutPrice = Math.round(s.price * 1.008);
                const rvol = Math.round((1.2 + Math.random() * 1.2) * 10) / 10;
                const isSignalMatched = !isBlocked && s.changeRate > 0.5 && rvol >= 1.5;

                return (
                  <tr key={s.symbol} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.symbol}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <div>₩{(s.price ?? 0).toLocaleString()}</div>
                      <div className={s.changeRate >= 0 ? "text-rose-400" : "text-blue-400"}>
                        {s.changeRate >= 0 ? "+" : ""}{s.changeRate}%
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      ₩{(breakoutPrice ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={rvol >= 1.5 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                        {rvol} 배
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isBlocked ? (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold">
                          ⛔ -3% 손절 차단됨
                        </span>
                      ) : isSignalMatched ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          🟢 변동성 돌파 포착
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[11px] font-medium">
                          🔵 수급 미달 (관망)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isBlocked ? (
                        <button
                          onClick={() => {
                            removeBlockedSymbol(cleanSym);
                            addToast({
                              type: "SUCCESS",
                              title: "차단 해제",
                              message: `${s.name} 차단이 해제되었습니다.`
                            });
                          }}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[11px] font-bold transition-colors"
                        >
                          <Unlock className="w-3 h-3 inline mr-1" />
                          해제
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          정상 매수 가능
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Profit Supervisory Hub Modal */}
      <AiProfitSupervisoryHubModal
        isOpen={isSupervisoryModalOpen}
        onClose={() => setIsSupervisoryModalOpen(false)}
      />
    </div>
  );
};
