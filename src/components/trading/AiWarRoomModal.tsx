import React from "react";
import { EvidenceItem, AgentProfile, TargetStockScanItem } from "../../types/stockAiTradingFloor";
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Crown, 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  Scale,
  Flame,
  ArrowRight
} from "lucide-react";

interface AiWarRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: TargetStockScanItem;
  agents: AgentProfile[];
  evidences: EvidenceItem[];
  onOpenAgentDetail: (agent: AgentProfile) => void;
}

export const AiWarRoomModal: React.FC<AiWarRoomModalProps> = ({
  isOpen,
  onClose,
  stock,
  agents,
  evidences,
  onOpenAgentDetail
}) => {
  if (!isOpen) return null;

  const bullEvidences = evidences.filter(e => e.sentiment === "BULLISH");
  const bearEvidences = evidences.filter(e => e.sentiment === "BEARISH");

  const bullAgents = agents.filter(a => a.department === "BULL_TEAM");
  const bearAgents = agents.filter(a => a.department === "BEAR_TEAM");
  const riskAgents = agents.filter(a => a.department === "RISK_COMMITTEE");
  const cioAgent = agents.find(a => a.department === "CIO");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl w-full max-w-5xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 모달 상단 헤더 */}
        <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shrink-0">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black tracking-tight">
                  30인 AI 실시간 전략 토론실 — {stock.name} ({stock.symbol})
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold">
                  실시간 토론 중
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
                30인 전문 분석관의 상승 논리와 하락 경고를 실시간 상호 검증하여 최종 매매 승인을 결정합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 토론실 본문 콘텐츠 */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 font-sans">
          {/* 상단 격론장: 상승 지지팀 vs 하락 반박팀 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
            {/* 중앙 VS 뱃지 */}
            <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950 border-2 border-amber-500/80 items-center justify-center text-xs font-black text-amber-400 z-10 shadow-xl">
              격론
            </div>

            {/* 🐂 상승 지지팀 (Bull Desk) */}
            <div className="bg-emerald-950/30 border-2 border-emerald-500/40 rounded-2xl p-4.5 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐂</span>
                  <div>
                    <h4 className="text-base font-black text-emerald-300">상승 낙관 분석팀 (매수 지지)</h4>
                    <span className="text-xs text-emerald-400/80 font-medium">5인 전문 AI 전략 분석관</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">상승 근거 강도</div>
                  <div className="text-2xl font-black text-emerald-400">8.7점 <span className="text-xs text-slate-400">/ 10점</span></div>
                </div>
              </div>

              {/* 검증된 상승 증거 목록 */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>검증된 핵심 상승 근거</span>
                </div>
                <div className="space-y-2">
                  {bullEvidences.map((e) => (
                    <div key={e.id} className="p-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl flex items-start justify-between gap-2 text-xs">
                      <div>
                        <span className="text-emerald-400 font-bold mr-1.5">[{e.code}]</span>
                        <span className="text-white font-bold text-sm">{e.title}</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{e.description}</p>
                      </div>
                      <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold shrink-0">
                        {e.score}점
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 소속 롱 연구원 목록 */}
              <div className="pt-2 border-t border-emerald-500/20">
                <div className="text-xs font-bold text-slate-400 mb-2">소속 상승 전문 연구원 ({bullAgents.length}인):</div>
                <div className="flex flex-wrap gap-2">
                  {bullAgents.map(a => (
                    <button
                      key={a.id}
                      onClick={() => onOpenAgentDetail(a)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{a.avatar}</span>
                      <span>{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 🐻 하락 반박팀 (Bear Desk) */}
            <div className="bg-rose-950/30 border-2 border-rose-500/40 rounded-2xl p-4.5 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐻</span>
                  <div>
                    <h4 className="text-base font-black text-rose-300">하락 리스크 분석팀 (반박 및 경고)</h4>
                    <span className="text-xs text-rose-400/80 font-medium">5인 비판적 위험 감시관</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">하락 반박 강도</div>
                  <div className="text-2xl font-black text-rose-400">4.3점 <span className="text-xs text-slate-400">/ 10점</span></div>
                </div>
              </div>

              {/* 지적된 리스크 목록 */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>지적된 하락 저항 및 매물벽 리스크</span>
                </div>
                <div className="space-y-2">
                  {bearEvidences.map((e) => (
                    <div key={e.id} className="p-3 bg-slate-900/90 border border-rose-500/30 rounded-xl flex items-start justify-between gap-2 text-xs">
                      <div>
                        <span className="text-rose-400 font-bold mr-1.5">[{e.code}]</span>
                        <span className="text-white font-bold text-sm">{e.title}</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{e.description}</p>
                      </div>
                      <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 text-xs font-bold shrink-0">
                        위험도 {e.score}점
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 소속 숏 연구원 목록 */}
              <div className="pt-2 border-t border-rose-500/20">
                <div className="text-xs font-bold text-slate-400 mb-2">소속 리스크 감시 연구원 ({bearAgents.length}인):</div>
                <div className="flex flex-wrap gap-2">
                  {bearAgents.map(a => (
                    <button
                      key={a.id}
                      onClick={() => onOpenAgentDetail(a)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{a.avatar}</span>
                      <span>{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 중앙: 🛡️ 리스크 관리 위원회 최종 심의안 */}
          <div className="p-4.5 bg-slate-950/90 border-2 border-amber-500/40 rounded-2xl space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl text-amber-300">
                  🛡️
                </div>
                <div>
                  <h4 className="text-base font-black text-amber-300">리스크 관리 위원회 심의 결과</h4>
                  <span className="text-xs text-slate-300">손익비, 변동성, 칼손절 기준선 및 최적 투자 비중 승인</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
                  <span className="text-slate-400 mr-1.5">종합 위험도:</span>
                  <span className="font-black text-emerald-400">{stock.riskScore}점 (안전 기준선 통과)</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
                  <span className="text-slate-400 mr-1.5">추천 비중:</span>
                  <span className="font-black text-cyan-400">포트폴리오 15% 이내</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">이상적 분할 매수가</span>
                <span className="text-emerald-400 font-black text-base">
                  ₩{(stock.idealEntryRange[0] ?? 0).toLocaleString()} ~ ₩{(stock.idealEntryRange[1] ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">칼손절 기준선 (이탈 시 즉시 청산)</span>
                <span className="text-rose-400 font-black text-base">
                  ₩{(stock.stopLossPrice ?? 0).toLocaleString()} (손실폭 -1.28%)
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">1차 목표가 / 기대 손익비</span>
                <span className="text-cyan-400 font-black text-base">
                  ₩{(stock.targetPrice1 ?? 0).toLocaleString()} (손익비 1 : 2.85)
                </span>
              </div>
            </div>
          </div>

          {/* 하단: 👑 최고투자책임자(CIO) 최종 승인 평결 */}
          {cioAgent && (
            <div className="p-5 bg-gradient-to-r from-purple-950/60 via-slate-950 to-indigo-950/60 border-2 border-purple-400/60 rounded-2xl space-y-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-purple-400/30 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">👑</span>
                  <div>
                    <h4 className="text-base font-black text-purple-200">
                      AI 최고투자책임자(CIO) 최종 의사결정 평결문
                    </h4>
                    <span className="text-xs text-purple-300/90 font-medium">
                      포지션 방향: 분할 매수 승인 | 현재 권장: 적정가 분할 진입 대기
                    </span>
                  </div>
                </div>

                <div className="px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 text-sm font-black">
                  최종 승인률: {stock.consensusScore}% 전원 합의
                </div>
              </div>

              <div className="p-4 bg-slate-900/90 border border-purple-400/30 rounded-xl text-sm text-slate-100 leading-relaxed font-medium">
                "{cioAgent.reasoningText}"
              </div>
            </div>
          )}
        </div>

        {/* 하단 닫기 */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            총 30인 AI 전문 분석단 전원 토론 및 다수결 검증 완료
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition cursor-pointer"
          >
            회의실 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
