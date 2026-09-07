import React from "react";
import { X, Shield, Sparkles, Brain, Zap, Cpu, Search, Activity, Sliders, FileText, Building2, Newspaper, Radio, ChevronLeft } from "lucide-react";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";
import { AiMultiBotSecuritiesMasterConsole } from "../AiMultiBotSecuritiesMasterConsole";
import { UnifiedTradingControl } from "../UnifiedTradingControl";
import { AiLiveTradingTotalMasterSystem } from "../AiLiveTradingTotalMasterSystem";
import { MicroCapitalAutoTradingConsole } from "../MicroCapitalAutoTradingConsole";
import { MultiAgentTradingConsole } from "../MultiAgentTradingConsole";
import { UnifiedMasterOmniBrainSuite } from "../UnifiedMasterOmniBrainSuite";
import { CorporateNewsAnalytics } from "../CorporateNewsAnalytics";
import { AiKeywordScanner } from "../AiKeywordScanner";
import { RealtimeStockMarketScanner } from "../RealtimeStockMarketScanner";
import { QuantSetupQualityMatrixEngine } from "../QuantSetupQualityMatrixEngine";
import { StrategySandbox } from "../StrategySandbox";
import { MultiModelSecuritiesConsensusModal } from "../MultiModelSecuritiesConsensusModal";
import { StockAiTradingFloorMasterScreen } from "./StockAiTradingFloorMasterScreen";

export type MasterFeatureKey =
  | "stock_ai_trading_floor"
  | "multi_bot_securities"
  | "unified_trading_control"
  | "live_trading_terminal"
  | "micro_capital_auto"
  | "multi_agent_orchestrator"
  | "omni_brain_suite"
  | "corporate_news_analytics"
  | "keyword_scanner"
  | "orderbook_scanner"
  | "quant_setup_matrix"
  | "strategy_sandbox"
  | "securities_consensus";

export interface MasterFeatureItem {
  key: MasterFeatureKey;
  title: string;
  badge: string;
  description: string;
  icon: any;
  category: "CORE" | "BOT" | "ANALYTICS" | "STRATEGY";
}

export const MASTER_FEATURE_LIST: MasterFeatureItem[] = [
  {
    key: "stock_ai_trading_floor",
    title: "🏢 증권 AI 30인 플로어 (V6.2)",
    badge: "AI TRADING FLOOR",
    description: "30인 AI 증권사 실시간 리서치·워룸 토론·CIO 최종 판정 마스터 스크린",
    icon: Brain,
    category: "CORE"
  },
  {
    key: "multi_bot_securities",
    title: "🏛️ AI MULTI-BOT SECURITIES v7.1",
    badge: "마스터 통합",
    description: "Multi-Bot 증권 관제 콘솔 및 멀티 오케스트레이터 분석",
    icon: Building2,
    category: "CORE"
  },
  {
    key: "unified_trading_control",
    title: "⚡ Unified Trading Control",
    badge: "통합 제어",
    description: "실시간 세력 수급, VWAP 및 AI 매매 집행 통합 컨트롤 스위트",
    icon: Zap,
    category: "CORE"
  },
  {
    key: "live_trading_terminal",
    title: "⚡ AI 실시간 트레이딩 터미널 v7.7",
    badge: "실전 터미널",
    description: "실시간 호가, 틱 파이프라인 및 멀티 스캐닝 자율 트레이딩",
    icon: Activity,
    category: "CORE"
  },
  {
    key: "micro_capital_auto",
    title: "🛡️ 소액 전용 AI 자율매매 관제",
    badge: "소액 전용",
    description: "시드 300만원 이하 소액 자본 리스크 방어 및 안전 자율 매매",
    icon: Shield,
    category: "BOT"
  },
  {
    key: "multi_agent_orchestrator",
    title: "🧠 30-Agent 멀티 오케스트레이터",
    badge: "30-Agent",
    description: "30개 개별 전용 에이전트 분산 협업 및 실시간 컨센서스",
    icon: Cpu,
    category: "BOT"
  },
  {
    key: "omni_brain_suite",
    title: "🧠 AI 뇌통합 마스터 관제",
    badge: "OMNI BRAIN",
    description: "중앙 AI 뇌 신경망 통합 관제 및 퀀트 신호 동기화",
    icon: Brain,
    category: "CORE"
  },
  {
    key: "corporate_news_analytics",
    title: "📰 기업 뉴스 & 주가 영향도 분석",
    badge: "뉴스 AI",
    description: "실시간 뉴스 감성 지수, 주가 영향도 및 모멘텀 정밀 추정",
    icon: Newspaper,
    category: "ANALYTICS"
  },
  {
    key: "keyword_scanner",
    title: "🔍 AI 키워드 종목 발굴 엔진 v50.0",
    badge: "v50.0",
    description: "실시간 뉴스, 공시, 핫 테마 키워드 기반 급등주 탐색 엔진",
    icon: Search,
    category: "ANALYTICS"
  },
  {
    key: "orderbook_scanner",
    title: "⚡ 실시간 호가/수급 스캐너",
    badge: "수급 스캔",
    description: "호가 잔량 분석, RVOL 체결 강도 및 순간 대량 수급 포착",
    icon: Radio,
    category: "ANALYTICS"
  },
  {
    key: "quant_setup_matrix",
    title: "📊 퀀트 세팅 매트릭스",
    badge: "QUANT MATRIX",
    description: "전략별 승률, PF, 손익비 및 알파 퀀트 세팅 품질 평가",
    icon: Sliders,
    category: "STRATEGY"
  },
  {
    key: "strategy_sandbox",
    title: "🧪 AI 전략 샌드박스 v7.6",
    badge: "시뮬레이터",
    description: "파라미터 가상 백테스팅 및 전략 시뮬레이션 테스트베드",
    icon: Sparkles,
    category: "STRATEGY"
  },
  {
    key: "securities_consensus",
    title: "🏛️ AI 4대 증권소 모델 통합 리서치",
    badge: "4대 증권소",
    description: "4대 AI 증권 분석 데스크 가중 컨센서스 및 최종 결론 리포트",
    icon: FileText,
    category: "ANALYTICS"
  }
];

interface MasterFeatureModalHubProps {
  activeKey: MasterFeatureKey | null;
  onClose: () => void;
  initialSymbol?: string;
}

export const MasterFeatureModalHub: React.FC<MasterFeatureModalHubProps> = ({
  activeKey,
  onClose,
  initialSymbol = "005930"
}) => {
  useModalScrollLock(Boolean(activeKey));

  if (!activeKey) return null;

  const currentFeature = MASTER_FEATURE_LIST.find((f) => f.key === activeKey);

  // If securities_consensus is selected, pass proper props
  if (activeKey === "securities_consensus") {
    return (
      <MultiModelSecuritiesConsensusModal
        isOpen={true}
        onClose={onClose}
        initialSymbol={initialSymbol}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hub Header Bar */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="이전 화면으로 돌아가기"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>이전</span>
            </button>

            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>{currentFeature?.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold border border-blue-500/30">
                  {currentFeature?.badge}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{currentFeature?.description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Console Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-900 p-2 sm:p-4 text-slate-100 font-sans">
          {activeKey === "stock_ai_trading_floor" && <StockAiTradingFloorMasterScreen />}
          {activeKey === "multi_bot_securities" && <AiMultiBotSecuritiesMasterConsole />}
          {activeKey === "unified_trading_control" && <UnifiedTradingControl />}
          {activeKey === "live_trading_terminal" && <AiLiveTradingTotalMasterSystem />}
          {activeKey === "micro_capital_auto" && <MicroCapitalAutoTradingConsole />}
          {activeKey === "multi_agent_orchestrator" && <MultiAgentTradingConsole />}
          {activeKey === "omni_brain_suite" && <UnifiedMasterOmniBrainSuite initialSymbol={initialSymbol} />}
          {activeKey === "corporate_news_analytics" && <CorporateNewsAnalytics />}
          {activeKey === "keyword_scanner" && <AiKeywordScanner />}
          {activeKey === "orderbook_scanner" && <RealtimeStockMarketScanner />}
          {activeKey === "quant_setup_matrix" && <QuantSetupQualityMatrixEngine />}
          {activeKey === "strategy_sandbox" && <StrategySandbox />}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>이전으로</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black transition cursor-pointer shadow-md"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
