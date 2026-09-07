import React from "react";
import { AgentProfile } from "../../types/stockAiTradingFloor";
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  Cpu, 
  Activity, 
  TrendingUp, 
  ShieldAlert, 
  Sparkles,
  Layers,
  Scale
} from "lucide-react";

interface AgentDetailInspectModalProps {
  agent: AgentProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AgentDetailInspectModal: React.FC<AgentDetailInspectModalProps> = ({
  agent,
  isOpen,
  onClose
}) => {
  if (!isOpen || !agent) return null;

  const getStatusBadge = (status: AgentProfile["status"]) => {
    switch (status) {
      case "CONFIRMED":
        return <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>🟢 승인 완료</span>;
      case "ANALYZING":
        return <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 animate-spin"></span>🟡 데이터 정밀 분석 중</span>;
      case "DEBATING":
        return <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>🟣 AI 토론실 격론 중</span>;
      case "DECIDING":
        return <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-black flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>👑 최종 매매 판정 중</span>;
      case "WARNING":
        return <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400"></span>🔴 리스크 경고</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold">⚪ 대기 상태</span>;
    }
  };

  const getDepartmentName = (dept: AgentProfile["department"]) => {
    switch (dept) {
      case "MARKET": return "거시 경제 & 시장 총괄실";
      case "TECHNICAL": return "기술적 차트 & 패턴 분석실";
      case "FLOW": return "외국인·기관 수급 추적실";
      case "INTELLIGENCE": return "AI 뉴스 & 공시 분석실";
      case "BULL_TEAM": return "상승 낙관 분석팀";
      case "BEAR_TEAM": return "하락 리스크 경고팀";
      case "RISK_COMMITTEE": return "리스크 관리 위원회";
      case "CIO": return "AI 최고투자책임자(CIO) 의장석";
      default: return "전문 분석실";
    }
  };

  const getDepartmentColor = (dept: AgentProfile["department"]) => {
    switch (dept) {
      case "MARKET": return "from-blue-600 to-indigo-700 border-blue-500/40 text-blue-100";
      case "TECHNICAL": return "from-cyan-600 to-teal-700 border-cyan-500/40 text-cyan-100";
      case "FLOW": return "from-amber-600 to-orange-700 border-amber-500/40 text-amber-100";
      case "INTELLIGENCE": return "from-emerald-600 to-green-700 border-emerald-500/40 text-emerald-100";
      case "BULL_TEAM": return "from-emerald-600 to-teal-800 border-emerald-500/40 text-emerald-100";
      case "BEAR_TEAM": return "from-rose-600 to-red-800 border-rose-500/40 text-rose-100";
      case "RISK_COMMITTEE": return "from-orange-600 to-amber-800 border-orange-500/40 text-orange-100";
      case "CIO": return "from-purple-600 via-indigo-600 to-cyan-600 border-purple-400 text-purple-100";
      default: return "from-slate-700 to-slate-800 border-slate-600 text-slate-100";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl w-full max-w-2xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 상단 헤더 */}
        <div className={`p-5 bg-gradient-to-r ${getDepartmentColor(agent.department)} border-b flex items-start justify-between gap-3 relative`}>
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-slate-950/60 border border-white/20 flex items-center justify-center text-3xl shadow-inner shrink-0">
              {agent.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black tracking-tight">{agent.name}</h3>
                <span className="px-2.5 py-0.5 rounded-md bg-black/40 text-white text-xs font-bold border border-white/20">
                  {getDepartmentName(agent.department)}
                </span>
              </div>
              <p className="text-sm text-slate-100/90 font-medium mt-1">
                {agent.roleTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 text-slate-300 hover:text-white transition cursor-pointer border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm font-sans flex-1">
          {/* 실시간 상태 및 현재 수행 태스크 */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-400">실시간 분석관 상태</span>
              {getStatusBadge(agent.status)}
            </div>
            <div className="text-sm text-cyan-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800 font-medium">
              <span className="text-slate-400 block text-xs font-bold mb-1">현재 집중 분석 태스크:</span>
              {agent.currentTask}
            </div>
          </div>

          {/* 주요 판단 지표 및 점수 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
              <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-400" />
                <span>주요 판단 지표</span>
              </div>
              <div className="text-base font-black text-white mt-1.5">{agent.primaryMetric}</div>
              <div className="text-xs text-emerald-400 font-bold mt-1">{agent.currentValue}</div>
            </div>

            <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
              <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-amber-400" />
                <span>가중치 및 종합 점수</span>
              </div>
              <div className="text-base font-black text-amber-400 mt-1.5">점수: {agent.score}점 / 100점</div>
              <div className="text-xs text-slate-300 font-bold mt-1">의사결정 가중치: {agent.weight}배</div>
            </div>
          </div>

          {/* 30일 실전 성과표 */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
                <Award className="w-4 h-4 text-amber-400" />
                <span>30일 백테스트 및 실전 검증 성과표</span>
              </div>
              <span className="text-xs text-slate-400">총 {agent.signalsCount30D}회 신호 검증</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium mb-1">30일 적중률</span>
                <span className="text-emerald-400 font-black text-base">{agent.precision30D}%</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium mb-1">수익 손익비</span>
                <span className="text-cyan-400 font-black text-base">{agent.profitFactor}배</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium mb-1">신뢰도 등급</span>
                <span className="text-amber-400 font-black text-base">최우수 (A+)</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-xs font-bold">최적 적중 환경</span>
                <span className="text-slate-200 font-medium">{agent.bestCondition}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-xs font-bold">진입 주의 환경</span>
                <span className="text-slate-300 font-medium">{agent.weakCondition}</span>
              </div>
            </div>
          </div>

          {/* AI 분석관 심층 근거 발언 */}
          <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>AI 분석관 최종 심층 판정 근거</span>
            </span>
            <p className="text-sm text-slate-100 leading-relaxed bg-slate-900 p-3.5 rounded-lg border border-slate-800 font-medium">
              "{agent.reasoningText}"
            </p>
          </div>
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>에이전트 고유번호: {agent.id}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition cursor-pointer"
          >
            확인 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
