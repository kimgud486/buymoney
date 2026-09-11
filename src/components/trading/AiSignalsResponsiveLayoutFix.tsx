import { useEffect } from "react";
import {
  MANUAL_ORDER_LIFECYCLE_EVENT,
  type ManualOrderLifecycleDetail,
} from "../../ui/UiActionExecutor";

const STYLE_ID = "aistock-mobile-runtime-layout-fix";

type HubRuntimeDetail = {
  hasData?: boolean;
  health?: string;
  fresh?: number;
  source?: string;
};

type BrokerTruthDetail = {
  symbol?: string;
  isKoreaSymbol?: boolean;
  enforceKis?: boolean;
  evidenceReady?: boolean;
  readOnlyTruth?: boolean;
  brokerConnected?: boolean;
  brokerProof?: boolean;
  accountVerified?: boolean;
  quoteVerified?: boolean;
  marketKnown?: boolean;
  dataStatus?: string | null;
  marketSession?: string | null;
  updatedAt?: number | null;
  error?: string | null;
};

type LifecycleSnapshot = ManualOrderLifecycleDetail & {
  symbol?: string;
};

type LifecycleVisualState = "done" | "current" | "wait" | "error";

const LIFECYCLE_STEPS = [
  "1. 신호 확인",
  "2. 사용자 확인",
  "3. 주문 접수",
  "4. 부분 체결",
  "5. 체결 완료",
] as const;

function normalizedText(node: Element | null | undefined): string {
  return (node?.textContent || "").replace(/\s+/g, " ").trim();
}

function setTextIfChanged(node: HTMLElement | null | undefined, next: string): void {
  if (!node) return;
  if ((node.textContent || "") !== next) node.textContent = next;
}

function findManualButton(actions: HTMLElement, side: "BUY" | "SELL"): HTMLButtonElement | undefined {
  const target = side === "BUY" ? "매수" : "매도";
  return Array.from(actions.querySelectorAll("button")).find((button) =>
    normalizedText(button).includes(target),
  ) as HTMLButtonElement | undefined;
}

function lifecycleIndex(stage: ManualOrderLifecycleDetail["stage"]): number {
  if (stage === "CONFIRM_REQUIRED" || stage === "CONFIRMED" || stage === "SUBMITTING") return 1;
  if (stage === "ACKNOWLEDGED") return 2;
  if (stage === "PARTIAL") return 3;
  if (stage === "FILLED") return 4;
  return -1;
}

function lifecycleMessage(snapshot: LifecycleSnapshot | null, signalSide: "BUY" | "SELL" | null): string {
  if (!snapshot) {
    if (signalSide === "BUY") return "매수 신호 조건 충족 · 버튼을 누르면 주문 전 확인창이 열립니다.";
    if (signalSide === "SELL") return "매도 신호 조건 충족 · 버튼을 누르면 주문 전 확인창이 열립니다.";
    return "신호 조건을 기다리는 중입니다. 주문은 아직 시작되지 않았습니다.";
  }

  const side = snapshot.side === "BUY" ? "매수" : "매도";
  switch (snapshot.stage) {
    case "CONFIRM_REQUIRED":
      return `${side} 신호 확인됨 · 사용자 최종 확인 대기`;
    case "CONFIRMED":
      return `${side} 사용자 확인 완료 · 주문 전송 준비`;
    case "SUBMITTING":
      return `${side} 주문을 브로커에 전송 중입니다. 아직 체결이 아닙니다.`;
    case "ACKNOWLEDGED":
      return `${side} 주문 처리 결과 수신 · 실제 체결 증거 확인 대기`;
    case "PARTIAL":
      return `${side} 부분 체결 확인 · 남은 수량 체결 여부 추적 중`;
    case "FILLED":
      return `${side} 체결 완료 · 주문번호·체결수량·체결가격 증거 확인됨`;
    case "BLOCKED":
      return `${side} 주문 중단 · ${snapshot.message || snapshot.code || "안전 조건 미충족"}`;
    case "FAILED":
      return `${side} 주문 오류 · ${snapshot.message || snapshot.code || "브로커 처리 실패"}`;
    default:
      return `${side} 주문 상태 확인 중`;
  }
}

function lifecycleStates(snapshot: LifecycleSnapshot | null, signalSide: "BUY" | "SELL" | null): LifecycleVisualState[] {
  if (!snapshot) {
    return LIFECYCLE_STEPS.map((_, index) => (index === 0 && signalSide ? "current" : "wait"));
  }

  if (snapshot.stage === "BLOCKED" || snapshot.stage === "FAILED") {
    const failedAt = Math.max(0, lifecycleIndex(snapshot.stage));
    return LIFECYCLE_STEPS.map((_, index) => (index === failedAt ? "error" : "wait"));
  }

  const current = lifecycleIndex(snapshot.stage);
  return LIFECYCLE_STEPS.map((_, index) => {
    if (index < current) return "done";
    if (index === current) return snapshot.stage === "FILLED" ? "done" : "current";
    return "wait";
  });
}

function upsertLifecycleStrip(
  box: HTMLElement,
  techRow: HTMLElement | undefined,
  snapshot: LifecycleSnapshot | null,
  signalSide: "BUY" | "SELL" | null,
): void {
  let strip = box.querySelector('[data-ai-order-lifecycle="true"]') as HTMLElement | null;
  if (!strip) {
    strip = document.createElement("div");
    strip.dataset.aiOrderLifecycle = "true";
    strip.setAttribute("role", "status");
    strip.setAttribute("aria-live", "polite");

    const title = document.createElement("div");
    title.dataset.aiOrderLifecycleTitle = "true";
    title.textContent = "주문 진행 5단계";

    const steps = document.createElement("div");
    steps.dataset.aiOrderLifecycleSteps = "true";
    for (const label of LIFECYCLE_STEPS) {
      const item = document.createElement("div");
      item.dataset.aiOrderLifecycleStep = "true";
      item.dataset.stageState = "wait";
      const dot = document.createElement("span");
      dot.dataset.aiOrderLifecycleDot = "true";
      const text = document.createElement("span");
      text.textContent = label;
      item.append(dot, text);
      steps.appendChild(item);
    }

    const message = document.createElement("div");
    message.dataset.aiOrderLifecycleMessage = "true";
    strip.append(title, steps, message);

    if (techRow) box.insertBefore(strip, techRow);
    else box.appendChild(strip);
  }

  const states = lifecycleStates(snapshot, signalSide);
  const stepNodes = Array.from(strip.querySelectorAll('[data-ai-order-lifecycle-step="true"]')) as HTMLElement[];
  stepNodes.forEach((node, index) => {
    node.dataset.stageState = states[index] || "wait";
  });

  const title = strip.querySelector('[data-ai-order-lifecycle-title="true"]') as HTMLElement | null;
  const sideText = snapshot?.side === "BUY" ? " · 매수" : snapshot?.side === "SELL" ? " · 매도" : signalSide ? ` · ${signalSide === "BUY" ? "매수" : "매도"}` : "";
  setTextIfChanged(title, `주문 진행 5단계${sideText}`);

  const message = strip.querySelector('[data-ai-order-lifecycle-message="true"]') as HTMLElement | null;
  setTextIfChanged(message, lifecycleMessage(snapshot, signalSide));
  if (message) {
    message.dataset.lifecycleError = snapshot?.stage === "BLOCKED" || snapshot?.stage === "FAILED" ? "true" : "false";
  }
}

/**
 * Legacy dashboard truth/readability layer.
 *
 * Fail-closed only: it may disable or relabel controls, but never enables an
 * order button, invents a price/fill, or turns an acknowledgement into a fill.
 */
export default function AiSignalsResponsiveLayoutFix() {
  useEffect(() => {
    let latestHub: HubRuntimeDetail = {};
    let latestBroker: BrokerTruthDetail = {};
    let latestLifecycle: LifecycleSnapshot | null = null;
    let lifecycleSymbol = "";
    let scheduled = false;
    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      styleEl.textContent = `
        [data-ai-signals-panel="true"],
        [data-ai-signals-box="true"],
        [data-ai-signals-state-row="true"],
        [data-ai-signals-stock-row="true"],
        [data-ai-signals-tech-row="true"],
        [data-ai-order-lifecycle="true"],
        [data-trade-log-panel="true"],
        [data-v11-console="true"] {
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        [data-ai-signals-panel="true"] { overflow: hidden !important; }
        [data-ai-signals-box="true"] { display: grid !important; gap: 10px !important; line-height: 1.35 !important; }
        [data-ai-signals-state-row="true"], [data-ai-signals-stock-row="true"], [data-ai-signals-tech-row="true"] { width: 100% !important; }
        [data-ai-signals-stock-row="true"] > * { min-width: 0 !important; }
        [data-ai-signals-stock-name="true"] { overflow-wrap: anywhere !important; }

        [data-ai-price-waiting="true"] {
          font-size: 11px !important;
          line-height: 1.25 !important;
          white-space: nowrap !important;
          opacity: 0.78 !important;
        }

        [data-ai-order-lifecycle="true"] {
          border: 1px solid rgba(14, 165, 233, 0.22);
          background: rgba(14, 165, 233, 0.045);
          border-radius: 10px;
          padding: 9px;
          display: grid;
          gap: 7px;
        }

        [data-ai-order-lifecycle-title="true"] {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .02em;
          color: rgb(8 145 178);
        }

        [data-ai-order-lifecycle-steps="true"] {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 5px;
        }

        [data-ai-order-lifecycle-step="true"] {
          min-width: 0;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 7px;
          padding: 6px 5px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 9px;
          line-height: 1.2;
          color: rgb(100 116 139);
          background: rgba(148, 163, 184, 0.05);
        }

        [data-ai-order-lifecycle-dot="true"] {
          width: 7px;
          height: 7px;
          min-width: 7px;
          border-radius: 999px;
          background: rgb(148 163 184);
        }

        [data-ai-order-lifecycle-step="true"][data-stage-state="done"] {
          border-color: rgba(16, 185, 129, 0.35);
          color: rgb(5 150 105);
          background: rgba(16, 185, 129, 0.07);
          font-weight: 800;
        }
        [data-ai-order-lifecycle-step="true"][data-stage-state="done"] [data-ai-order-lifecycle-dot="true"] { background: rgb(16 185 129); }

        [data-ai-order-lifecycle-step="true"][data-stage-state="current"] {
          border-color: rgba(14, 165, 233, 0.45);
          color: rgb(3 105 161);
          background: rgba(14, 165, 233, 0.09);
          font-weight: 900;
        }
        [data-ai-order-lifecycle-step="true"][data-stage-state="current"] [data-ai-order-lifecycle-dot="true"] {
          background: rgb(14 165 233);
          box-shadow: 0 0 0 3px rgba(14,165,233,.12);
        }

        [data-ai-order-lifecycle-step="true"][data-stage-state="error"] {
          border-color: rgba(244, 63, 94, 0.4);
          color: rgb(190 18 60);
          background: rgba(244, 63, 94, 0.08);
          font-weight: 900;
        }
        [data-ai-order-lifecycle-step="true"][data-stage-state="error"] [data-ai-order-lifecycle-dot="true"] { background: rgb(244 63 94); }

        [data-ai-order-lifecycle-message="true"] {
          font-size: 10px;
          line-height: 1.4;
          color: rgb(71 85 105);
          overflow-wrap: anywhere;
        }
        [data-ai-order-lifecycle-message="true"][data-lifecycle-error="true"] { color: rgb(190 18 60); font-weight: 700; }

        [data-ai-truth-note="true"] {
          border: 1px solid rgba(245, 158, 11, 0.28);
          background: rgba(245, 158, 11, 0.06);
          border-radius: 8px;
          padding: 7px 9px;
          font-size: 10px;
          line-height: 1.45;
          color: rgb(180 83 9);
        }

        [data-trade-log-empty="true"] {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 86px !important;
          padding: 16px 10px !important;
          text-align: center !important;
          font-size: 11px !important;
          line-height: 1.45 !important;
          opacity: 0.72 !important;
        }

        @media (max-width: 640px) {
          [data-ai-signals-panel="true"], [data-trade-log-panel="true"], [data-v11-console="true"] { overflow: hidden !important; }
          [data-ai-signals-box="true"] { padding: 12px !important; }
          [data-ai-signals-state-row="true"] { display: grid !important; grid-template-columns: minmax(0, 1fr) auto !important; gap: 6px 10px !important; align-items: center !important; }
          [data-ai-signals-stock-row="true"] { display: grid !important; grid-template-columns: minmax(0, 1fr) !important; gap: 10px !important; }
          [data-ai-signals-stock-name="true"] { display: block !important; width: 100% !important; white-space: normal !important; overflow: visible !important; text-overflow: clip !important; }
          [data-ai-signals-actions="true"] { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; width: 100% !important; gap: 8px !important; }
          [data-ai-signals-actions="true"] > button { width: 100% !important; min-width: 0 !important; min-height: 40px !important; white-space: normal !important; line-height: 1.25 !important; padding: 8px 6px !important; }
          [data-ai-signals-actions="true"] > button:first-child:nth-last-child(3) { grid-column: 1 / -1 !important; }
          [data-ai-signals-tech-row="true"] { display: grid !important; grid-template-columns: minmax(0, 1fr) !important; gap: 6px !important; }
          [data-ai-signals-tech-row="true"] > :first-child { display: flex !important; flex-wrap: wrap !important; gap: 4px 6px !important; min-width: 0 !important; }
          [data-ai-order-lifecycle-steps="true"] { grid-template-columns: minmax(0, 1fr); }
          [data-ai-order-lifecycle-step="true"] { min-height: 30px; font-size: 10px; }
          [data-v11-engine-actions="true"] { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; width: 100% !important; }
          [data-v11-engine-actions="true"] > button { min-width: 0 !important; justify-content: center !important; white-space: normal !important; text-align: center !important; }
          [data-v11-pipeline-steps="true"] { display: grid !important; grid-template-columns: minmax(0, 1fr) !important; overflow-x: visible !important; gap: 7px !important; }
          [data-v11-pipeline-steps="true"] > span { display: none !important; }
        }
      `;
      document.head.appendChild(styleEl);
    }

    const repairAiSignals = () => {
      const aiHeading = Array.from(document.querySelectorAll("h2")).find(
        (node) => normalizedText(node) === "AI SIGNALS",
      ) as HTMLElement | undefined;
      if (!aiHeading) return;

      const header = aiHeading.parentElement as HTMLElement | null;
      const panel = header?.parentElement as HTMLElement | null;
      const box = header?.nextElementSibling as HTMLElement | null;
      if (!panel || !box) return;

      panel.dataset.aiSignalsPanel = "true";
      box.dataset.aiSignalsBox = "true";

      const rows = Array.from(box.children).filter((child) => {
        const el = child as HTMLElement;
        return !el.dataset.aiTruthNote && !el.dataset.aiOrderLifecycle;
      }) as HTMLElement[];
      const stateRow = rows[0];
      const stockRow = rows[1];
      const techRow = rows[2];

      let state = "NO_TRADE";
      let waitingForPrice = false;

      if (stateRow) {
        stateRow.dataset.aiSignalsStateRow = "true";
        const stateMatch = normalizedText(stateRow.firstElementChild).match(/STATE:\s*([A-Z_]+)/i);
        if (stateMatch) state = stateMatch[1].toUpperCase();

        const priceNode = stateRow.lastElementChild as HTMLElement | null;
        const normalizedPrice = normalizedText(priceNode).replace(/\s+/g, "");
        waitingForPrice = /^(₩|\$)?0(?:\.0+)?$/.test(normalizedPrice) || normalizedPrice === "시세수신대기";
        if (priceNode && waitingForPrice) {
          setTextIfChanged(priceNode, "시세 수신 대기");
          priceNode.dataset.aiPriceWaiting = "true";
        } else if (priceNode) {
          delete priceNode.dataset.aiPriceWaiting;
        }
      }

      const selectedSymbol = String(latestBroker.symbol || "").trim().toUpperCase();
      const enforceKis = latestBroker.enforceKis === true && /^\d{6}$/.test(selectedSymbol);
      const brokerReady = !enforceKis || latestBroker.evidenceReady === true;
      const feedReady = latestHub.hasData === true && !waitingForPrice;
      const lifecycleForSymbol = latestLifecycle && lifecycleSymbol === selectedSymbol ? latestLifecycle : null;

      let signalSide: "BUY" | "SELL" | null = null;

      if (stockRow) {
        stockRow.dataset.aiSignalsStockRow = "true";
        const stockName = stockRow.children[0] as HTMLElement | undefined;
        const actions = stockRow.children[1] as HTMLElement | undefined;
        if (stockName) stockName.dataset.aiSignalsStockName = "true";

        if (actions) {
          actions.dataset.aiSignalsActions = "true";
          const buy = findManualButton(actions, "BUY");
          const sell = findManualButton(actions, "SELL");

          if (enforceKis && !brokerReady) {
            if (buy) buy.disabled = true;
            if (sell) sell.disabled = true;
          }

          const buyReady = Boolean(buy && !buy.disabled && state === "BUY" && feedReady && brokerReady);
          const sellReady = Boolean(sell && !sell.disabled && state === "SELL" && feedReady && brokerReady);
          signalSide = buyReady ? "BUY" : sellReady ? "SELL" : null;

          if (buy) {
            setTextIfChanged(
              buy,
              enforceKis && !brokerReady
                ? "매수 잠금 · 실계좌 검증 대기"
                : !feedReady
                  ? "매수 잠금 · 시세 대기"
                  : buyReady
                    ? "매수 확인"
                    : "매수 조건 대기",
            );
            buy.title = buyReady
              ? "매수 신호가 확인되었습니다. 클릭하면 최종 확인창이 열리며, 확인 후에만 주문 요청이 전송됩니다."
              : "신호·실시간 시세·브로커 증거가 모두 확인되기 전에는 주문을 시작하지 않습니다.";
          }

          if (sell) {
            setTextIfChanged(
              sell,
              enforceKis && !brokerReady
                ? "매도 잠금 · 실계좌 검증 대기"
                : !feedReady
                  ? "매도 잠금 · 시세 대기"
                  : sellReady
                    ? "매도 확인"
                    : "매도 조건 대기",
            );
            sell.title = sellReady
              ? "매도 신호가 확인되었습니다. 클릭하면 최종 확인창이 열리며, 확인 후에만 주문 요청이 전송됩니다."
              : "신호·실시간 시세·브로커 증거가 모두 확인되기 전에는 주문을 시작하지 않습니다.";
          }
        }
      }

      if (techRow) {
        techRow.dataset.aiSignalsTechRow = "true";
        if (!feedReady) {
          const scoreValue = Array.from(techRow.querySelectorAll("span")).find((node) =>
            /(?:0\s*\/\s*100|계산\s*중|계산\s*대기|데이터\s*수신\s*대기)/.test(normalizedText(node)),
          ) as HTMLElement | undefined;
          setTextIfChanged(scoreValue, "데이터 수신 대기");
        }

        const validationNode = techRow.lastElementChild as HTMLElement | null;
        setTextIfChanged(
          validationNode,
          enforceKis && !brokerReady
            ? "실계좌·계좌·시세 증거 검증 대기 · 주문 잠금"
            : !feedReady
              ? "실시간 시세 검증 대기"
              : state === "BUY"
                ? "매수 신호 확인 · 주문 전 사용자 확인 필요"
                : state === "SELL"
                  ? "매도 신호 확인 · 주문 전 사용자 확인 필요"
                  : "NO_TRADE · 신호 조건 대기",
        );
      }

      upsertLifecycleStrip(box, techRow, lifecycleForSymbol, signalSide);

      let truthNote = box.querySelector('[data-ai-truth-note="true"]') as HTMLElement | null;
      if (!truthNote) {
        truthNote = document.createElement("div");
        truthNote.dataset.aiTruthNote = "true";
        box.appendChild(truthNote);
      }
      setTextIfChanged(
        truthNote,
        enforceKis && !brokerReady
          ? "🔒 국내 주문 잠금: KIS 연결·실계좌·계좌·실시간 시세 증거가 모두 확인되기 전에는 주문이 시작되지 않습니다."
          : "✅ 주문 접수와 체결은 다릅니다. 체결 완료는 증권사 주문번호 + 실제 체결수량 + 실제 체결가격이 확인된 경우에만 표시합니다.",
      );
    };

    const repairTradeLog = () => {
      const tradeHeading = Array.from(document.querySelectorAll("h2")).find(
        (node) => normalizedText(node) === "TRADE LOG",
      ) as HTMLElement | undefined;
      if (!tradeHeading) return;

      const panel = tradeHeading.parentElement?.parentElement as HTMLElement | null;
      if (!panel) return;
      panel.dataset.tradeLogPanel = "true";

      const scrollArea = Array.from(panel.querySelectorAll("div")).find((node) =>
        String((node as HTMLElement).className).includes("max-h-44") &&
        String((node as HTMLElement).className).includes("overflow-y-auto"),
      ) as HTMLElement | undefined;
      if (!scrollArea) return;

      const realRows = Array.from(scrollArea.children).filter(
        (child) => !(child as HTMLElement).dataset.tradeLogEmpty,
      );
      const empty = scrollArea.querySelector('[data-trade-log-empty="true"]') as HTMLElement | null;

      if (realRows.length === 0 && !empty) {
        const node = document.createElement("div");
        node.dataset.tradeLogEmpty = "true";
        node.textContent = "아직 증권사 주문번호·체결수량·체결가격이 확인된 실제 체결 내역이 없습니다.";
        scrollArea.appendChild(node);
      } else if (realRows.length > 0 && empty) {
        empty.remove();
      }
    };

    const repairV11Console = () => {
      const title = Array.from(document.querySelectorAll("h2")).find((node) =>
        normalizedText(node).includes("AISTOCK 24 v11 자율 실행 엔진"),
      ) as HTMLElement | undefined;
      if (!title) return;

      const titleWrap = title.parentElement as HTMLElement | null;
      const identity = titleWrap?.parentElement as HTMLElement | null;
      const top = identity?.parentElement as HTMLElement | null;
      const root = top?.parentElement as HTMLElement | null;
      if (root) root.dataset.v11Console = "true";
      if (top) top.dataset.v11EngineTop = "true";

      const actions = top?.lastElementChild as HTMLElement | null;
      if (actions && actions.querySelectorAll("button").length >= 2) actions.dataset.v11EngineActions = "true";

      const steps = root
        ? Array.from(root.querySelectorAll("div")).find((node) => {
            const text = normalizedText(node);
            return String((node as HTMLElement).className).includes("overflow-x-auto") &&
              text.includes("1. 마켓 스캐너") && text.includes("5. 잔고/청산 관리");
          }) as HTMLElement | undefined
        : undefined;
      if (steps) steps.dataset.v11PipelineSteps = "true";
    };

    const repairAll = () => {
      scheduled = false;
      repairAiSignals();
      repairTradeLog();
      repairV11Console();
    };

    const scheduleRepair = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(repairAll);
    };

    const handleHubStatus = (event: Event) => {
      latestHub = ((event as CustomEvent<HubRuntimeDetail>).detail || {}) as HubRuntimeDetail;
      scheduleRepair();
    };

    const handleBrokerTruth = (event: Event) => {
      const next = ((event as CustomEvent<BrokerTruthDetail>).detail || {}) as BrokerTruthDetail;
      const previousSymbol = String(latestBroker.symbol || "").trim().toUpperCase();
      const nextSymbol = String(next.symbol || "").trim().toUpperCase();
      latestBroker = next;
      if (previousSymbol && nextSymbol && previousSymbol !== nextSymbol) {
        latestLifecycle = null;
        lifecycleSymbol = "";
      }
      scheduleRepair();
    };

    const handleManualLifecycle = (event: Event) => {
      const detail = (event as CustomEvent<ManualOrderLifecycleDetail>).detail;
      if (!detail) return;
      latestLifecycle = { ...detail, symbol: String(latestBroker.symbol || "").trim().toUpperCase() };
      lifecycleSymbol = latestLifecycle.symbol || "";
      scheduleRepair();
    };

    scheduleRepair();
    const observer = new MutationObserver(scheduleRepair);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", scheduleRepair);
    window.addEventListener("aistock-runtime-hub-status", handleHubStatus as EventListener);
    window.addEventListener("aistock-broker-truth-status", handleBrokerTruth as EventListener);
    window.addEventListener(MANUAL_ORDER_LIFECYCLE_EVENT, handleManualLifecycle as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleRepair);
      window.removeEventListener("aistock-runtime-hub-status", handleHubStatus as EventListener);
      window.removeEventListener("aistock-broker-truth-status", handleBrokerTruth as EventListener);
      window.removeEventListener(MANUAL_ORDER_LIFECYCLE_EVENT, handleManualLifecycle as EventListener);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}
