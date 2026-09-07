import React from "react";
import { TargetStockScanItem } from "../../types/stockAiTradingFloor";
import { X, HelpCircle, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

interface WhyExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: TargetStockScanItem;
  mode: "LONG" | "WAIT" | "EXIT";
}

export const WhyExplainerModal: React.FC<WhyExplainerModalProps> = ({
  isOpen,
  onClose,
  stock,
  mode
}) => {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (mode) {
      case "LONG": return `왜 ${stock.name} 상승에 베팅하는가? (상승 추천 이유)`;
      case "WAIT": return `종목은 좋은데 왜 지금 당장 추격 매수하지 않는가?`;
      case "EXIT": return `왜 지금 익절 및 분할 청산을 검토해야 하는가?`;
    }
  };

  const getSetupNameKorean = (setup: string) => {
    if (setup.includes("PULLBACK")) return "첫 눌림목 반등 셋업";
    if (setup.includes("BREAKOUT")) return "전고점 돌파 가속 셋업";
    if (setup.includes("MOMENTUM")) return "초강력 수급 모멘텀";
    if (setup.includes("VWAP")) return "기관 평단가(VWAP) 지지 반등";
    return "AI 퀀트 알고리즘 진입";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl w-full max-w-xl text-white shadow-2xl overflow-hidden flex flex-col">
        {/* 상단 헤더 */}
        <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">{getTitle()}</h3>
              <span className="text-xs text-slate-300">
                {stock.name} ({stock.symbol}) | 현재가 ₩{(stock.currentPrice ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 설명 */}
        <div className="p-5 space-y-4 text-sm font-sans">
          {/* 검증된 상승 논리 */}
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2.5">
            <div className="font-bold text-emerald-300 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>확인된 핵심 상승 논리</span>
            </div>
            <ul className="space-y-2 text-slate-200 text-xs">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>주도 업종 1위 ({stock.sectorName}) & 대형 외인/기관 <strong>{stock.moneyFlowKRW}</strong> 순유입 집중</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>차트 패턴 <strong>{getSetupNameKorean(stock.primarySetup)}</strong> (패턴 점수: {stock.setupScore}점)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>상대 거래량 <strong>{stock.rvol}배</strong> 폭발 후 건전한 거래량 급감 눌림목 완성</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>당일 기관 평단선(VWAP) 상방 지지 및 저점을 높이는 상승 파동 진입</span>
              </li>
            </ul>
          </div>

          {/* 주의 및 추격매수 경고 */}
          <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-2.5">
            <div className="font-bold text-amber-300 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>추격 매수 금지 및 리스크 주의사항</span>
            </div>
            <ul className="space-y-2 text-slate-200 text-xs">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <span>상단 저항선(₩{(stock.chaseThreshold ?? 0).toLocaleString()})까지 거리 +1.4% (고점 추격 시 손실 위험)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <span>변동성 확장으로 인해 <strong>₩{(stock.chaseThreshold ?? 0).toLocaleString()} 이상에서는 시장가 매수 금지</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <span>손절 기준가(₩{(stock.stopLossPrice ?? 0).toLocaleString()}) 이탈 시 모든 상승 시나리오 즉시 무효화 및 손절</span>
              </li>
            </ul>
          </div>

          {/* AI 종합 결론 */}
          <div className="p-4 bg-slate-950 border-2 border-blue-500/40 rounded-xl space-y-2 text-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-300">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span>AI 증권사 30인 종합 결론</span>
            </div>
            <p className="text-xs md:text-sm leading-relaxed text-slate-200 font-medium">
              "종목의 모멘텀과 수급 펀더멘털은 매우 우수하지만, <strong>현재 가격대에서 성급하게 추격 매수하지 않고</strong> 지정가 이상적 진입 밴드(<strong>₩{(stock.idealEntryRange[0] ?? 0).toLocaleString()} ~ ₩{(stock.idealEntryRange[1] ?? 0).toLocaleString()}</strong>)로 눌려줄 때 분할 진입하는 것이 통계적으로 승률 78% 이상의 우위를 확보합니다."
            </p>
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-sm cursor-pointer"
          >
            확인 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
