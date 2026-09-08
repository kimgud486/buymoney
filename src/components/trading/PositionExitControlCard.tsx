import React, { useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target
} from "lucide-react";

export type ExitUiState =
  | "BUY"
  | "HOLD"
  | "PROFIT_HOLD"
  | "SELL_WATCH"
  | "SELL"
  | "UNKNOWN";

export interface ExitEvidenceItem {
  key: string;
  label: string;
  active: boolean;
  severity?: "INFO" | "WARNING" | "CRITICAL";
}

export interface PositionExitControlCardProps {
  symbol: string;
  name: string;

  qty: number;

  entryPrice: number;
  currentPrice: number;

  state?: ExitUiState;

  trailingFloor?: number | null;
  hardStop?: number | null;
  defenseSellPrice?: number | null;

  expectedSellLow?: number | null;
  expectedSellMid?: number | null;
  expectedSellHigh?: number | null;

  exitRisk?: number | null;

  evidence?: ExitEvidenceItem[];

  lastEvaluatedAt?: number | null;

  isRealPosition: boolean;

  onPartialSell?: () => void;
  onFullSell?: () => void;
  onOpenChart?: () => void;
}

const fmt = (value?: number | null) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "N/A";
  }

  return `${Math.round(value).toLocaleString()}원`;
};

export const PositionExitControlCard: React.FC<PositionExitControlCardProps> = ({
  symbol,
  name,
  qty,
  entryPrice,
  currentPrice,
  state = "UNKNOWN",
  trailingFloor,
  hardStop,
  defenseSellPrice,
  expectedSellLow,
  expectedSellMid,
  expectedSellHigh,
  exitRisk,
  evidence = [],
  lastEvaluatedAt,
  isRealPosition,
  onPartialSell,
  onFullSell,
  onOpenChart
}) => {
  const pnlPct = useMemo(() => {
    if (
      !Number.isFinite(entryPrice) ||
      !Number.isFinite(currentPrice) ||
      entryPrice <= 0
    ) {
      return null;
    }

    return ((currentPrice - entryPrice) / entryPrice) * 100;
  }, [entryPrice, currentPrice]);

  const activeEvidence = evidence.filter(item => item.active);

  const status = useMemo(() => {
    switch (state) {
      case "HOLD":
        return {
          title: "HOLD",
          message: "현재 매도하지 않음",
          detail: "추세 유지 여부를 다음 완료 봉에서 재평가합니다."
        };

      case "PROFIT_HOLD":
        return {
          title: "PROFIT HOLD",
          message: "수익 추적 유지",
          detail: "Trailing Floor를 올리며 상승 추세를 따라갑니다."
        };

      case "SELL_WATCH":
        return {
          title: "SELL WATCH",
          message: "매도 감시 강화",
          detail: "Exit Evidence가 추가 확인되면 SELL로 전환합니다."
        };

      case "SELL":
        return {
          title: "SELL",
          message: "매도 조건 확인",
          detail: "실제 보유수량과 Broker 상태 확인 후 청산 가능합니다."
        };

      case "BUY":
        return {
          title: "BUY",
          message: "신규 진입 상태",
          detail: "체결 완료 후 HOLD 상태로 전환합니다."
        };

      default:
        return {
          title: "UNKNOWN",
          message: "판단 데이터 부족",
          detail: "실시간 Position Runtime 상태를 확인할 수 없습니다."
        };
    }
  }, [state]);

  const sellConditionText = useMemo(() => {
    if (state === "SELL") {
      return "현재 SELL 조건 충족";
    }

    if (state === "SELL_WATCH") {
      return "추가 Exit Evidence 확인 시 SELL";
    }

    if (state === "PROFIT_HOLD") {
      return "Trailing Floor 이탈 또는 추세 구조 붕괴 시";
    }

    if (state === "HOLD") {
      return "VWAP/EMA/구조 약화가 복수 확인될 때 SELL WATCH";
    }

    return "실제 Position Runtime 데이터 필요";
  }, [state]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 text-white p-4 space-y-4">
      <div className="flex justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <strong>{name}</strong>
            <span className="text-xs text-slate-400">{symbol}</span>

            <span
              className={
                isRealPosition
                  ? "text-[10px] px-2 py-0.5 rounded bg-rose-600 font-bold"
                  : "text-[10px] px-2 py-0.5 rounded bg-slate-700 font-bold"
              }
            >
              {isRealPosition ? "REAL POSITION" : "NOT LIVE VERIFIED"}
            </span>
          </div>

          <div className="text-xs text-slate-400 mt-1">
            보유 {qty} · 매수가 {fmt(entryPrice)}
          </div>
        </div>

        <div className="text-right">
          <div className="font-black text-lg">{fmt(currentPrice)}</div>

          <div
            className={
              pnlPct !== null && pnlPct >= 0
                ? "text-emerald-400 text-sm font-bold"
                : "text-rose-400 text-sm font-bold"
            }
          >
            {pnlPct !== null
              ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`
              : "N/A"}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <strong>{status.title}</strong>
        </div>

        <div className="mt-2 font-bold">{status.message}</div>

        <div className="text-xs text-slate-400 mt-1">{status.detail}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Metric
          label="Trailing Floor"
          value={fmt(trailingFloor)}
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        />

        <Metric
          label="Hard Stop"
          value={fmt(hardStop)}
          icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
        />

        <Metric
          label="Defense Sell"
          value={fmt(defenseSellPrice)}
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
        />
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <Clock className="w-4 h-4 text-cyan-400" />
          언제 매도?
        </div>

        <div className="mt-2 text-sm font-medium text-slate-100">{sellConditionText}</div>

        <div className="mt-2 text-xs text-slate-400">
          다음 판단: 완료 봉 기준 실시간 재평가
        </div>

        {lastEvaluatedAt && (
          <div className="text-[10px] text-slate-500 mt-1">
            최근 평가: {new Date(lastEvaluatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 p-3">
        <div className="flex justify-between">
          <strong className="text-slate-200">Exit Risk</strong>
          <strong className="text-slate-200">
            {typeof exitRisk === "number" ? `${Math.round(exitRisk)} / 100` : "N/A"}
          </strong>
        </div>

        <div className="mt-2 space-y-1">
          {evidence.length === 0 ? (
            <div className="text-xs text-slate-500">Exit Evidence 데이터 없음</div>
          ) : (
            evidence.map(item => (
              <div key={item.key} className="flex justify-between text-xs">
                <span className="text-slate-300">{item.label}</span>

                <span
                  className={
                    item.active ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"
                  }
                >
                  {item.active ? "감지" : "정상"}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="text-[10px] text-slate-500 mt-2">
          활성 Exit Evidence: {activeEvidence.length}
        </div>
      </div>

      {(expectedSellLow || expectedSellMid || expectedSellHigh) && (
        <div className="rounded-xl bg-slate-900 border border-slate-700 p-3">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <Target className="w-4 h-4 text-purple-400" />
            분석 기반 Exit Zone
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            <div>
              <span className="text-slate-400">Low</span>
              <div className="font-bold text-slate-200">{fmt(expectedSellLow)}</div>
            </div>

            <div>
              <span className="text-slate-400">Mid</span>
              <div className="font-bold text-slate-200">{fmt(expectedSellMid)}</div>
            </div>

            <div>
              <span className="text-slate-400">High</span>
              <div className="font-bold text-slate-200">{fmt(expectedSellHigh)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onOpenChart}
          className="rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-slate-200 transition-colors"
        >
          상세 차트
        </button>

        <button
          onClick={onPartialSell}
          disabled={!isRealPosition || qty <= 0}
          className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 py-2 text-xs font-bold text-white transition-colors"
        >
          50% 매도
        </button>

        <button
          onClick={onFullSell}
          disabled={!isRealPosition || qty <= 0}
          className="rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 py-2 text-xs font-bold text-white transition-colors"
        >
          전량 매도
        </button>
      </div>
    </div>
  );
};

const Metric: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
    <div className="flex items-center gap-1 text-xs text-slate-400">
      {icon}
      {label}
    </div>

    <div className="font-black mt-1 text-slate-200">{value}</div>
  </div>
);
