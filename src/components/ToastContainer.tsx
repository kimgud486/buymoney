import React from "react";
import { useApp } from "../context/AppContext";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X, 
  BellOff,
  Bell,
  Trash2,
  Clock
} from "lucide-react";

const renderSafeString = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (val.message && typeof val.message === "string") return val.message;
    if (val.name && typeof val.name === "string") return val.name;
    if (val.symbol && typeof val.symbol === "string") return val.symbol;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, clearAllToasts, isToastMuted, toggleToastMute } = useApp() as any;

  if (isToastMuted) {
    return (
      <div className="fixed bottom-3 right-3 z-50 pointer-events-auto">
        <button
          type="button"
          onClick={toggleToastMute}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-full text-zinc-300 hover:text-white text-[11px] font-medium shadow-lg backdrop-blur-md cursor-pointer transition transform active:scale-95"
          title="알림 차단 해제"
        >
          <BellOff className="h-3.5 w-3.5 text-amber-400" />
          <span>알림 차단됨 (터치하여 켜기)</span>
        </button>
      </div>
    );
  }

  if (!toasts || toasts.length === 0) return null;

  return (
    <div 
      className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 flex flex-col gap-2 max-w-[380px] sm:max-w-[420px] w-full pointer-events-none px-2"
      id="aistock-toast-notification-system"
    >
      {/* Toast Top Controller Bar */}
      <div className="pointer-events-auto flex items-center justify-between bg-slate-950/95 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-zinc-400 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <Bell className="h-3 w-3 text-indigo-400 animate-pulse" />
          <span className="font-semibold text-zinc-200">실시간 거래 & 시스템 알림 ({toasts.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleToastMute}
            className="flex items-center gap-1 text-zinc-400 hover:text-amber-300 transition cursor-pointer"
            title="모든 알림 차단하기"
          >
            <BellOff className="h-3 w-3" />
            <span>차단</span>
          </button>
          <span className="text-zinc-700">|</span>
          <button
            type="button"
            onClick={() => clearAllToasts?.()}
            className="flex items-center gap-1 text-zinc-400 hover:text-rose-300 transition cursor-pointer"
            title="모든 알림 닫기"
          >
            <Trash2 className="h-3 w-3" />
            <span>모두 닫기</span>
          </button>
        </div>
      </div>

      {toasts.map((toast: any) => {
        const isSuccess = toast.type === "SUCCESS";
        const isError = toast.type === "ERROR";
        const isWarning = toast.type === "WARNING";

        const bgClass = isSuccess 
          ? "bg-slate-950/95 border-emerald-500/60 text-white shadow-xl ring-1 ring-emerald-500/30"
          : isError
          ? "bg-slate-950/95 border-rose-500/70 text-white shadow-xl ring-1 ring-rose-500/30"
          : isWarning
          ? "bg-slate-950/95 border-amber-500/60 text-white shadow-xl ring-1 ring-amber-500/30"
          : "bg-slate-950/95 border-indigo-500/60 text-white shadow-xl ring-1 ring-indigo-500/30";

        const iconComponent = isSuccess ? (
          <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        ) : isError ? (
          <div className="p-1 bg-rose-500/20 text-rose-400 rounded-full shrink-0">
            <XCircle className="h-4 w-4" />
          </div>
        ) : isWarning ? (
          <div className="p-1 bg-amber-500/20 text-amber-400 rounded-full shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
        ) : (
          <div className="p-1 bg-indigo-500/20 text-indigo-400 rounded-full shrink-0">
            <Info className="h-4 w-4" />
          </div>
        );

        // Transaction status determination badge
        const isApiKeyError = toast.title?.includes("API Key") || toast.title?.includes("인증") || toast.message?.includes("AppKey") || toast.message?.includes("AccessKey");
        const isPurchaseFail = toast.title?.includes("실패") || toast.title?.includes("거부") || toast.title?.includes("차단");
        const isFundFail = toast.title?.includes("부족") || toast.message?.includes("잔고") || toast.message?.includes("예수금");

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border rounded-xl p-3 transition-all duration-200 transform translate-y-0 scale-100 flex flex-col space-y-2 ${bgClass} backdrop-blur-md`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                {iconComponent}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-[12px] font-black tracking-tight text-white">{renderSafeString(toast.title)}</h4>
                    
                    {/* Explicit Status Badges */}
                    {isApiKeyError && (
                      <span className="px-1.5 py-0.2 bg-rose-500/30 text-rose-300 border border-rose-500/50 rounded text-[9px] font-mono font-bold">
                        🔑 API Key 오류
                      </span>
                    )}
                    {isFundFail && (
                      <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded text-[9px] font-mono font-bold">
                        ⚠️ 잔고 부족
                      </span>
                    )}
                    {isPurchaseFail && !isApiKeyError && !isFundFail && (
                      <span className="px-1.5 py-0.2 bg-rose-500/30 text-rose-300 border border-rose-500/50 rounded text-[9px] font-mono font-bold">
                        ❌ 주문 실패
                      </span>
                    )}

                    <span className="text-[9px] text-zinc-400 font-mono flex items-center gap-0.5 ml-auto">
                      <Clock className="h-2.5 w-2.5" />
                      {renderSafeString(toast.timestamp)}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-200 font-sans leading-relaxed break-words">
                    {renderSafeString(toast.message)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-zinc-400 hover:text-white p-1 rounded transition cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Transaction Order Status Bar */}
            {toast.orderInfo && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    toast.orderInfo.side === "BUY" 
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}>
                    {toast.orderInfo.side === "BUY" ? "매수" : "매도"}
                  </span>
                  <span className="font-bold text-white truncate max-w-[100px]">{renderSafeString(toast.orderInfo.name)}</span>
                  <span className="text-zinc-400">({renderSafeString(toast.orderInfo.symbol)})</span>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-200 shrink-0">
                  <span>{(toast.orderInfo.qty ?? 0).toLocaleString()}{toast.orderInfo.market === "BTC" ? "코인" : "주"}</span>
                  <span>@</span>
                  <span className="font-bold text-cyan-300">
                    {(toast.orderInfo.price ?? 0).toLocaleString()}{toast.orderInfo.market === "US" ? "$" : "원"}
                  </span>
                  {toast.orderInfo.status && (
                    <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                      toast.orderInfo.status === "FAILED"
                        ? "bg-rose-500/30 text-rose-300 border border-rose-500/40"
                        : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                    }`}>
                      {toast.orderInfo.status === "FAILED" ? "체결거부/실패" : "체결성공"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
