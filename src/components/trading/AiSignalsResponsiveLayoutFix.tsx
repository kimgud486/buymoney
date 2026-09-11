import { useEffect } from "react";

const STYLE_ID = "ai-signals-responsive-layout-fix";

/**
 * Keeps the existing AI SIGNALS and TRADE LOG panels readable on narrow/mobile
 * screens without changing live data bindings or trading logic.
 *
 * Truth-first UI rules:
 * - A zero price is rendered as a waiting state instead of looking like a real
 *   tradable price.
 * - A zero technical score is rendered as a waiting state only while price data
 *   is still unavailable.
 * - An empty trade log explicitly says that there are no real fills yet.
 */
export default function AiSignalsResponsiveLayoutFix() {
  useEffect(() => {
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
        [data-trade-log-panel="true"] {
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        [data-ai-signals-stock-row="true"] > * {
          min-width: 0 !important;
        }

        [data-ai-signals-stock-name="true"] {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
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
          min-height: 72px !important;
          padding: 14px 10px !important;
          text-align: center !important;
          font-size: 11px !important;
          line-height: 1.45 !important;
          opacity: 0.72 !important;
        }

        @media (max-width: 640px) {
          [data-ai-signals-panel="true"],
          [data-trade-log-panel="true"] {
            overflow: hidden !important;
          }

          [data-ai-signals-box="true"] {
            padding: 12px !important;
          }

          [data-ai-signals-state-row="true"] {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto !important;
            align-items: center !important;
            column-gap: 8px !important;
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
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            gap: 10px !important;
          }

          [data-ai-signals-stock-name="true"] {
            display: block !important;
            width: 100% !important;
            white-space: normal !important;
            overflow: visible !important;
            overflow-wrap: anywhere !important;
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
            white-space: normal !important;
            line-height: 1.25 !important;
            padding: 8px 6px !important;
          }

          [data-ai-signals-actions="true"] > button:first-child:nth-last-child(3) {
            grid-column: 1 / -1 !important;
          }

          [data-ai-signals-tech-row="true"] {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
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
        }
      `;
      document.head.appendChild(styleEl);
    }

    const tagAndRepairPanels = () => {
      const headings = Array.from(document.querySelectorAll("h2"));
      const aiHeading = headings.find(
        (node) => (node.textContent || "").replace(/\s+/g, " ").trim() === "AI SIGNALS",
      ) as HTMLElement | undefined;

      if (aiHeading) {
        const header = aiHeading.parentElement as HTMLElement | null;
        const panel = header?.parentElement as HTMLElement | null;
        const box = header?.nextElementSibling as HTMLElement | null;

        if (panel && box) {
          panel.dataset.aiSignalsPanel = "true";
          box.dataset.aiSignalsBox = "true";

          const rows = Array.from(box.children) as HTMLElement[];
          const stateRow = rows[0];
          const stockRow = rows[1];
          const techRow = rows[2];

          if (stateRow) {
            stateRow.dataset.aiSignalsStateRow = "true";
            const priceNode = stateRow.lastElementChild as HTMLElement | null;
            const normalizedPrice = (priceNode?.textContent || "").replace(/\s+/g, "").trim();
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
            if (actions) actions.dataset.aiSignalsActions = "true";
          }

          if (techRow) {
            techRow.dataset.aiSignalsTechRow = "true";
            const statePriceNode = stateRow?.lastElementChild as HTMLElement | null;
            const waitingForPrice = statePriceNode?.dataset.aiPriceWaiting === "true";
            if (waitingForPrice) {
              const spans = Array.from(techRow.querySelectorAll("span")) as HTMLElement[];
              const scoreValue = spans.find((node) => /(?:0\s*\/\s*100|계산\s*중)/.test(node.textContent || ""));
              if (scoreValue) scoreValue.textContent = "데이터 수신 대기";
            }
          }
        }
      }

      const tradeHeading = headings.find(
        (node) => (node.textContent || "").replace(/\s+/g, " ").trim() === "TRADE LOG",
      ) as HTMLElement | undefined;

      if (tradeHeading) {
        const header = tradeHeading.parentElement as HTMLElement | null;
        const panel = header?.parentElement as HTMLElement | null;
        if (panel) {
          panel.dataset.tradeLogPanel = "true";
          const allDivs = Array.from(panel.querySelectorAll("div")) as HTMLElement[];
          const scrollArea = allDivs.find((node) =>
            node.className.includes("max-h-44") && node.className.includes("overflow-y-auto"),
          );

          if (scrollArea) {
            const realRows = Array.from(scrollArea.children).filter(
              (child) => !(child as HTMLElement).dataset.tradeLogEmpty,
            );
            const existingEmpty = scrollArea.querySelector('[data-trade-log-empty="true"]') as HTMLElement | null;

            if (realRows.length === 0 && !existingEmpty) {
              const empty = document.createElement("div");
              empty.dataset.tradeLogEmpty = "true";
              empty.textContent = "아직 실제 체결 내역이 없습니다.";
              scrollArea.appendChild(empty);
            } else if (realRows.length > 0 && existingEmpty) {
              existingEmpty.remove();
            }
          }
        }
      }
    };

    tagAndRepairPanels();

    const observer = new MutationObserver(tagAndRepairPanels);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener("resize", tagAndRepairPanels);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", tagAndRepairPanels);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}
