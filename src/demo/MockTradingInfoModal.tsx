import React from "react";
import { ShieldAlert, AlertTriangle, X, CheckCircle2, FileText, ArrowRight, Sparkles, Cpu } from "lucide-react";

interface MockTradingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReport?: () => void;
  onOpenDashboard?: () => void;
}

export const MockTradingInfoModal: React.FC<MockTradingInfoModalProps> = ({
  isOpen,
  onClose,
  onOpenReport,
  onOpenDashboard
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-800 dark:text-zinc-100 font-sans">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-rose-950 p-5 text-white flex items-start justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-400/40 rounded-xl shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60 uppercase tracking-widest">
                PAPER TRADING ENVIRONMENT
              </span>
              <h2 className="text-base font-black text-white mt-1">
                실거래 모드 전환 제한 안내
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Main Notice Box */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/70 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>실거래 모드 활성화 불가: 현재 모의투자 환경입니다</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed font-medium">
              본 시스템은 투자자의 손실 위험을 방지하고 알고리즘 검증을 위해 <strong>100% 모의투자(Paper Trading)</strong> 전용 환경으로 안전하게 구동됩니다.
            </p>
          </div>

          {/* Key Advantages List */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>현재 제공 중인 모의투자 파이프라인 기능:</span>
            </h4>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-200 dark:border-zinc-700/60 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>네이버 증권 &amp; 업비트 <strong>100% 실시간 진짜 주식/코인 시세</strong> 수신</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-200 dark:border-zinc-700/60 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>AI 뇌엔진 13개 자율매매 알고리즘 <strong>가상 잔고 수수료 체결 연동</strong></span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-200 dark:border-zinc-700/60 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>주간/월간 모의투자 결과 <strong>AI 강약점 분석 리포트 자동 생성</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 dark:bg-zinc-800/80 border-t border-slate-200 dark:border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-2">
          {onOpenReport && (
            <button
              onClick={() => {
                onClose();
                onOpenReport();
              }}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI 투자 리포트 열기</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
          >
            <span>이해했습니다 (모의투자 계속하기)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
