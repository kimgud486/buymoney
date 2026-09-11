import { useEffect } from "react";

const STYLE_ID = "aistock-mobile-runtime-layout-fix";

type HubRuntimeDetail = {
  hasData?: boolean;
  health?: string;
  fresh?: number;
  source?: string;
};

function normalizedText(node: Element | null | undefined): string {
  return (node?.textContent || "").replace(/\s+/g, " ").trim();
}

/**
 * Mobile/readability repair layer for the legacy dashboard panels.
 *
 * Important: this component changes presentation labels only. It never invents
 * a market price, never marks an order as filled, and never unlocks trading.
 */
export default function AiSignalsResponsiveLayoutFix() {
  useEffect(() => {
    let latestHub: HubRuntimeDetail = {};
    let repairing = false;
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
        [data-trade-log-panel="true"],
        [data-v11-console="true"] {
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        [data-ai-signals-panel="true"] {
          overflow: hidden !important;
        }

        [data-ai-signals-box="true"] {
          display: grid !important;
          gap: 10px !important;
          line-height: 1.35 !important;
        }

        [data-ai-signals-state-row="true"],
        [data-ai-signals-stock-row="true"],
        [data-ai-signals-tech-row="true"] {
          width: 100% !important;
        }

        [data-ai-signals-stock-row="true"] > * {
          min-width: 0 !important;
        }

        [data-ai-signals-stock-name="true"] {
          overflow-wrap: anywhere !important;
        }

        [data-ai-price-waiting="true"] {
          font-size: 11px !important;
          line-height: 1.25 !important;
          white-space: nowrap !important;
          opacity: 0.78 !important;
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

        [data-v11-pipeline-steps="true"] {
          scrollbar-width: thin;
        }

        @media (max-width: 640px) {
          [data-ai-signals-panel="true"],
          [data-trade-log-panel="true"],
          [data-v11-console="true"] {
            overflow: hidden !important;
          }

          [data-ai-signals-box="true"] {
            padding: 12px !important;
          }

          [data-ai-signals-state-row="true"] {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto !important;
            align-items: center !important;
            column-gap: 10px !important;
            row-gap: 6px !important;
          }

          [data-ai-signals-state-row="true"] > :first-child {
            min-width: 0 !important;
            overflow-wrap: anywhere !important;
          }

          [data-ai-signals-state-row="true"] > :last-child {
            white-space: nowrap !important;
            text-align: right !important;
          }

          [data-ai-signals-stock-row="true"] {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          [data-ai-signals-stock-name="true"] {
            display: block !important;
            width: 100% !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }

          [data-ai-signals-actions="true"] {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            width: 100% !important;
            gap: 8px !important;
          }

          [data-ai-signals-actions="true"] > button {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 38px !important;
            white-space: normal !important;
            line-height: 1.25 !important;
            padding: 8px 6px !important;
          }

          [data-ai-signals-actions="true"] > button:first-child:nth-last-child(3) {
            grid-column: 1 / -1 !important;
          }

          [data-ai-signals-tech-row="true"] {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            align-items: start !important;
            gap: 6px !important;
          }

          [data-ai-signals-tech-row="true"] > :first-child {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 4px 6px !important;
            min-width: 0 !important;
            overflow-wrap: anywhere !important;
          }

          [data-ai-signals-tech-row="true"] > :last-child {
            width: 100% !important;
            white-space: normal !important;
          }

          [data-v11-engine-top="true"] {
            align-items: stretch !important;
          }

          [data-v11-engine-actions="true"] {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            width: 100% !important;
          }

          [data-v11-engine-actions="true"] > button {
            min-width: 0 !important;
            justify-content: center !important;
            white-space: normal !important;
            text-align: center !important;
          }

          [data-v11-pipeline-steps="true"] {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            align-items: stretch !important;
            overflow-x: visible !important;
            gap: 7px !important;
          }

          [data-v11-pipeline-steps="true"] > span {
            display: none !important;
          }

          [data-v11-pipeline-steps="true"] > div {
            width: 100% !important;
            justify-content: flex-start !important;
            min-height: 34px !important;
          }
        }
      `;
      document.head.appendChild(styleEl);
    }

    const repairAiSignals = () => {
      const headings = Array.from(document.querySelectorAll("h2"));
      const aiHeading = headings.find((node) => normalizedText(node) === "AI SIGNALS") as HTMLElement | undefined;
      if (!aiHeading) return;

      const header = aiHeading.parentElement as HTMLElement | null;
      const panel = header?.parentElement as HTMLElement | null;
      const box = header?.nextElementSibling as HTMLElement | null;
      if (!panel || !box) return;

      panel.dataset.aiSignalsPanel = "true";
      box.dataset.aiSignalsBox = "true";

      const rows = Array.from(box.children) as HTMLElement[];
      const stateRow = rows[0];
      const stockRow = rows[1];
      const techRow = rows[2];

      let state = "NO_TRADE";
      if (stateRow) {
        stateRow.dataset.aiSignalsStateRow = "true";
        const stateText = normalizedText(stateRow.firstElementChild);
        const stateMatch = stateText.match(/STATE:\s*([A-Z_]+)/i);
        if (stateMatch) state = stateMatch[1].toUpperCase();

        const priceNode = stateRow.lastElementChild as HTMLElement | null;
        const normalizedPrice = normalizedText(priceNode).replace(/\s+/g, "");
        const zeroLikePrice = /^(₩|\$)?0(?:\.0+)?$/.test(normalizedPrice);
        if (priceNode && zeroLikePrice) {
          priceNode.textContent = "시세 수신 대기";
          priceNode.dataset.aiPriceWaiting = "true";
        } else if (priceNode) {
          delete priceNode.dataset.aiPriceWaiting;
        }
      }

      if (stockRow) {
        stockRow.dataset.aiSignalsStockRow = "true";
        const stockName = stockRow.children[0] as HTMLElement | undefined;
        const actions = stockRow.children[1] as HTMLElement | undefined;
        if (stockName) stockName.dataset.aiSignalsStockName = "true";
        if (actions) {
          actions.dataset.aiSignalsActions = "true";
          const buttons = Array.from(actions.querySelectorAll("button")) as HTMLButtonElement[];
          const buy = buttons.find((button) => normalizedText(button).includes("매수"));
          const sell = buttons.find((button) => normalizedText(button).includes("매도"));
          if (buy) buy.textContent = buy.disabled || state !== "BUY" ? "매수 조건 대기" : "매수 실행";
          if (sell) sell.textContent = sell.disabled || state !== "SELL" ? "매도 조건 대기" : "매도 실행";
        }
      }

      if (techRow) {
        techRow.dataset.aiSignalsTechRow = "true";
        const statePriceNode = stateRow?.lastElementChild as HTMLElement | null;
        const waitingForPrice = statePriceNode?.dataset.aiPriceWaiting === "true";
        if (waitingForPrice) {
          const spans = Array.from(techRow.querySelectorAll("span")) as HTMLElement[];
          const scoreValue = spans.find((node) => /(?:0\s*\/\s*100|계산\s*중|계산\s*대기)/.test(normalizedText(node)));
          if (scoreValue) scoreValue.textContent = "데이터 수신 대기";
        }

        const validationNode = techRow.lastElementChild as HTMLElement | null;
        if (validationNode) {
          validationNode.textContent = state === "BUY"
            ? "매수 조건 충족 · 주문 전 확인 필요"
            : state === "SELL"
              ? "매도 조건 충족 · 주문 전 확인 필요"
              : "신호 검증 대기";
        }
      }
    };

    const repairTradeLog = () => {
      const headings = Array.from(document.querySelectorAll("h2"));
      const tradeHeading = headings.find((node) => normalizedText(node) === "TRADE LOG") as HTMLElement | undefined;
      if (!tradeHeading) return;

      const header = tradeHeading.parentElement as HTMLElement | null;
      const panel = header?.parentElement as HTMLElement | null;
      if (!panel) return;
      panel.dataset.tradeLogPanel = "true";

      const allDivs = Array.from(panel.querySelectorAll("div")) as HTMLElement[];
      const scrollArea = allDivs.find((node) =>
        node.className.includes("max-h-44") && node.className.includes("overflow-y-auto"),
      );
      if (!scrollArea) return;

      const realRows = Array.from(scrollArea.children).filter(
        (child) => !(child as HTMLElement).dataset.tradeLogEmpty,
      );
      const existingEmpty = scrollArea.querySelector('[data-trade-log-empty="true"]') as HTMLElement | null;

      if (realRows.length === 0 && !existingEmpty) {
        const empty = document.createElement("div");
        empty.dataset.tradeLogEmpty = "true";
        empty.textContent = "아직 증권사에서 확인된 실제 체결 내역이 없습니다.";
        scrollArea.appendChild(empty);
      } else if (realRows.length > 0 && existingEmpty) {
        existingEmpty.remove();
      }
    };

    const repairV11Console = () => {
      const h2s = Array.from(document.querySelectorAll("h2"));
      const title = h2s.find((node) => normalizedText(node).includes("AISTOCK 24 v11 자율 실행 엔진")) as HTMLElement | undefined;
      if (!title) return;

      const titleWrap = title.parentElement as HTMLElement | null;
      const identity = titleWrap?.parentElement as HTMLElement | null;
      const top = identity?.parentElement as HTMLElement | null;
      const consoleRoot = top?.parentElement as HTMLElement | null;
      if (consoleRoot) consoleRoot.dataset.v11Console = "true";
      if (top) top.dataset.v11EngineTop = "true";

      const actions = top?.lastElementChild as HTMLElement | null;
      if (actions && actions.querySelectorAll("button").length >= 2) {
        actions.dataset.v11EngineActions = "true";
      }

      const candidateDivs = consoleRoot ? Array.from(consoleRoot.querySelectorAll("div")) : [];
      const steps = candidateDivs.find((node) => {
        const text = normalizedText(node);
        return text.includes("1. 마켓 스캐너") && text.includes("2. 통합 패턴분석") && text.includes("5. 잔고/청산 관리");
      }) as HTMLElement | undefined;
      if (steps) steps.dataset.v11PipelineSteps = "true";

      const statusBadge = titleWrap
        ? Array.from(titleWrap.querySelectorAll("span")).find((node) => /RUNNING|PAUSED/.test(normalizedText(node))) as HTMLElement | undefined
        : undefined;
      if (statusBadge && normalizedText(statusBadge).startsWith("RUNNING")) {
        statusBadge.textContent = latestHub.hasData
          ? "RUNNING · 실시간 데이터 수신 중"
          : "RUNNING · 데이터 대기 중";
        statusBadge.title = "RUNNING은 감시 루프 상태입니다. 실제 주문 가능 여부는 브로커·계좌·시세 검증과 주문 잠금 상태를 별도로 확인합니다.";
      }
    };

    const repairAll = () => {
      if (repairing) return;
      repairing = true;
      try {
        repairAiSignals();
        repairTradeLog();
        repairV11Console();
      } finally {
        repairing = false;
      }
    };

    const handleHubStatus = (event: Event) => {
      latestHub = ((event as CustomEvent<HubRuntimeDetail>).detail || {}) as HubRuntimeDetail;
      repairAll();
    };

    repairAll();
    const observer = new MutationObserver(() => repairAll());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", repairAll);
    window.addEventListener("aistock-runtime-hub-status", handleHubStatus as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", repairAll);
      window.removeEventListener("aistock-runtime-hub-status", handleHubStatus as EventListener);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}
