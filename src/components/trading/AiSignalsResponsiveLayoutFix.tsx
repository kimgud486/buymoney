import { useEffect } from "react";

const STYLE_ID = "ai-signals-responsive-layout-fix";

/**
 * Keeps the existing AI SIGNALS panel readable on narrow/mobile screens
 * without changing its live data bindings or trading logic.
 *
 * MasterAiAutoTradingDashboard is intentionally left untouched here because
 * it is a very large, high-risk integration surface. This guard only tags the
 * already-rendered AI SIGNALS nodes and applies responsive layout rules.
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
        [data-ai-signals-tech-row="true"] {
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

        @media (max-width: 640px) {
          [data-ai-signals-panel="true"] {
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

    const tagAiSignalsPanel = () => {
      const headings = Array.from(document.querySelectorAll("h2"));
      const heading = headings.find(
        (node) => (node.textContent || "").replace(/\s+/g, " ").trim() === "AI SIGNALS",
      ) as HTMLElement | undefined;

      if (!heading) return;

      const header = heading.parentElement as HTMLElement | null;
      const panel = header?.parentElement as HTMLElement | null;
      const box = header?.nextElementSibling as HTMLElement | null;

      if (!panel || !box) return;

      panel.dataset.aiSignalsPanel = "true";
      box.dataset.aiSignalsBox = "true";

      const rows = Array.from(box.children) as HTMLElement[];
      const stateRow = rows[0];
      const stockRow = rows[1];
      const techRow = rows[2];

      if (stateRow) stateRow.dataset.aiSignalsStateRow = "true";
      if (stockRow) {
        stockRow.dataset.aiSignalsStockRow = "true";
        const stockName = stockRow.children[0] as HTMLElement | undefined;
        const actions = stockRow.children[1] as HTMLElement | undefined;
        if (stockName) stockName.dataset.aiSignalsStockName = "true";
        if (actions) actions.dataset.aiSignalsActions = "true";
      }
      if (techRow) techRow.dataset.aiSignalsTechRow = "true";
    };

    tagAiSignalsPanel();

    const observer = new MutationObserver(tagAiSignalsPanel);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", tagAiSignalsPanel);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", tagAiSignalsPanel);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}
