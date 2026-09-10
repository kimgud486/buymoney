import React, { useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle2, CircleDollarSign, ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";

const money = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "NO DATA";
  return `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString("ko-KR")}원`;
};

const safeNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const OperationsStatusMonitor: React.FC = () => {
  const {
    positions = [],
    trades = [],
    orders = [],
    brokerApiStatus,
    isLiveTradingActive,
    apiEnvironmentMode,
    isKillSwitchActive,
    profile,
  } = useApp() as any;

  const snapshot = useMemo(() => {
    const now = new Date();
    const todayKst = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const todaysVerifiedRealTrades = (Array.isArray(trades) ? trades : []).filter((trade: any) => {
      if (!trade?.timestamp) return false;
      const parsed = new Date(trade.timestamp);
      if (Number.isNaN(parsed.getTime())) return false;
      const tradeDay = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(parsed);
      return (
        tradeDay === todayKst &&
        trade.isRealTrade === true &&
        trade.executionType === "REAL_BROKER" &&
        trade.verificationStatus === "VERIFIED_BROKER"
      );
    });

    const realizedValues = todaysVerifiedRealTrades
      .map((trade: any) => safeNumber(trade.netProfit) ?? safeNumber(trade.pnl))
      .filter((value: number | null): value is number => value !== null);
    const realizedPnl = realizedValues.length > 0
      ? realizedValues.reduce((sum: number, value: number) => sum + value, 0)
      : null;

    const usablePositions = (Array.isArray(positions) ? positions : []).filter((position: any) =>
      safeNumber(position?.quantity) !== null &&
      safeNumber(position?.avgPrice) !== null &&
      safeNumber(position?.currentPrice) !== null
    );
    const unrealizedPnl = usablePositions.length > 0
      ? usablePositions.reduce((sum: number, position: any) => {
          const qty = safeNumber(position.quantity) ?? 0;
          const avg = safeNumber(position.avgPrice) ?? 0;
          const current = safeNumber(position.currentPrice) ?? 0;
          return sum + (current - avg) * qty;
        }, 0)
      : null;

    const pendingOrders = (Array.isArray(orders) ? orders : []).filter((order: any) => order?.status === "PENDING").length;
    const filledOrders = (Array.isArray(orders) ? orders : []).filter((order: any) => order?.status === "FILLED").length;

    const brokerStates = [brokerApiStatus?.korea, brokerApiStatus?.upbit].filter(Boolean);
    const brokerHealthy = brokerStates.length > 0 && brokerStates.every((state: string) => state === "CONNECTED");
    const liveEnabled = isLiveTradingActive === true && apiEnvironmentMode === "PRODUCTION";
    const approvalRequired = profile?.disableTradeGuardPrompt !== true;
    const riskGateOpen = !isKillSwitchActive && brokerHealthy && liveEnabled && approvalRequired;

    const executionState = isKillSwitchActive
      ? "STOPPED"
      : pendingOrders > 0
        ? "ORDER_PENDING"
        : liveEnabled && brokerHealthy
          ? "READY"
          : "SAFE_IDLE";

    return {
      realizedPnl,
      unrealizedPnl,
      pendingOrders,
      filledOrders,
      brokerHealthy,
      liveEnabled,
      approvalRequired,
      riskGateOpen,
      executionState,
      todayTradeCount: todaysVerifiedRealTrades.length,
    };
  }, [positions, trades, orders, brokerApiStatus, isLiveTradingActive, apiEnvironmentMode, isKillSwitchActive, profile]);

  const stateLabel: Record<string, string> = {
    READY: "실거래 준비",
    ORDER_PENDING: "주문 처리중",
    STOPPED: "중지됨",
    SAFE_IDLE: "안전 대기",
  };

  return (
    <section data-testid="operations-status-monitor" className="border-b border-slate-800 bg-slate-950/95 px-3 py-2 text-slate-100">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-2 text-[11px]">
        <div className="mr-1 flex items-center gap-1.5 font-bold text-cyan-300">
          <Activity className="h-3.5 w-3.5" />
          실거래 운영 모니터
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
          <span className="text-slate-400">Execution </span>
          <strong>{stateLabel[snapshot.executionState] ?? snapshot.executionState}</strong>
        </div>

        <div className={`rounded border px-2 py-1 ${snapshot.riskGateOpen ? "border-emerald-700 bg-emerald-950/40" : "border-amber-700 bg-amber-950/30"}`}>
          <span className="text-slate-400">Risk Gate </span>
          <strong className="inline-flex items-center gap-1">
            {snapshot.riskGateOpen ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {snapshot.riskGateOpen ? "OPEN" : "BLOCKED"}
          </strong>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
          <CircleDollarSign className="mr-1 inline h-3 w-3 text-emerald-400" />
          <span className="text-slate-400">오늘 실현손익 </span>
          <strong>{money(snapshot.realizedPnl)}</strong>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
          <span className="text-slate-400">미실현손익 </span>
          <strong>{money(snapshot.unrealizedPnl)}</strong>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
          <span className="text-slate-400">주문 </span>
          <strong>대기 {snapshot.pendingOrders} · 체결 {snapshot.filledOrders}</strong>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
          <ShieldCheck className="mr-1 inline h-3 w-3 text-cyan-400" />
          <span className="text-slate-400">브로커 </span>
          <strong>{snapshot.brokerHealthy ? "CONNECTED" : "NOT READY"}</strong>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
          <span className="text-slate-400">확인창 </span>
          <strong>{snapshot.approvalRequired ? "필수" : "우회 설정 감지"}</strong>
        </div>

        <div className="ml-auto text-[10px] text-slate-500">
          오늘 검증 체결 {snapshot.todayTradeCount}건 · 값이 없으면 NO DATA
        </div>
      </div>
    </section>
  );
};

export default OperationsStatusMonitor;
