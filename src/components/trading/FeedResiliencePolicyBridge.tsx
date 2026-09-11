import React, { useEffect } from "react";

/**
 * Cross-cutting feed resilience policy for the existing trading UI.
 *
 * Policy requested for manual execution:
 * - A delayed/stale/no-data feed must NOT disable the manual buy/sell controls.
 * - The UI must show a strong warning and require one extra confirmation.
 * - Other non-feed safety checks remain the responsibility of the existing order handler.
 * - Placeholder zero prices in AI timing cards are rendered as unavailable while feed is stale.
 *
 * This bridge intentionally does not create synthetic prices or synthetic technical scores.
 */
const STALE_FEED_TOKENS = ["NO_DATA", "NO DATA", "DELAYED", "STALE", "INVALID"];
const ORDER_BUTTON_TOKENS = [
  "[대형 매수 주문 실행]",
  "[대형 익절/매도 실행]",
  "자율 매수 체결",
  "자율 매도 체결",
];

const normalize = (value: string | null | undefined) =>
  (value || "").replace(/\s+/g, " ").trim();

const getVisibleFeedState = (): { stale: boolean; label: string } => {
  const elements = Array.from(document.querySelectorAll<HTMLElement>("body *"));
  const feedNode = elements.find((el) => {
    const text = normalize(el.textContent);
    return text.startsWith("FEED:") && text.length < 40;
  });

  const label = normalize(feedNode?.textContent) || "FEED: NO_DATA";
  const stale = STALE_FEED_TOKENS.some((token) => label.toUpperCase().includes(token));
  return { stale, label };
};

const findLastVisiblePrice = (): string | null => {
  const bodyText = normalize(document.body?.innerText);
  const explicitLast = bodyText.match(/마지막\s*수신(?:가|가격)?\s*[:：]?\s*([₩$]?\s*[\d,.]+)/i);
  if (explicitLast?.[1]) return normalize(explicitLast[1]);

  const current = bodyText.match(/현재가\s*[:：]?\s*([₩$]\s*[\d,.]+)/i);
  if (current?.[1] && !/[₩$]\s*0(?:\D|$)/.test(current[1])) return normalize(current[1]);
  return null;
};

const isOrderButton = (button: HTMLButtonElement) => {
  const label = normalize(button.textContent);
  return ORDER_BUTTON_TOKENS.some((token) => label.includes(token));
};

const markUnavailableZeroValues = () => {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("div,section,article"));
  for (const card of candidates) {
    const text = normalize(card.textContent);
    if (
      text.length > 3500 ||
      (!text.includes("AI BUY TIMING ACTIVE") && !text.includes("AI SELL / EXIT ACTIVE"))
    ) {
      continue;
    }

    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      nodes.push(node as Text);
      node = walker.nextNode();
    }

    for (const textNode of nodes) {
      const raw = textNode.nodeValue || "";
      if (/₩\s*0(?=\D|$)/.test(raw)) {
        textNode.nodeValue = raw.replace(/₩\s*0(?=\D|$)/g, "데이터 없음");
      }
    }
  }
};

const markTechnicalScoreWaiting = () => {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("div,span,p"));
  for (const el of candidates) {
    const text = normalize(el.textContent);
    if (text.length > 120 || !/Technical\s*Score/i.test(text)) continue;
    if (/\d+\s*\/\s*100/.test(text)) {
      el.textContent = text.replace(/\d+\s*\/\s*100/, "계산 대기");
      el.setAttribute("data-feed-score-waiting", "true");
    }
  }
};

export const FeedResiliencePolicyBridge: React.FC = () => {
  useEffect(() => {
    let applying = false;

    const applyPolicy = () => {
      if (applying) return;
      applying = true;
      try {
        const feed = getVisibleFeedState();
        document.documentElement.dataset.marketFeedHealth = feed.stale ? "STALE" : "LIVE";

        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
        for (const button of buttons) {
          if (!isOrderButton(button)) continue;

          if (feed.stale) {
            // Feed state alone must never hard-lock these manual order controls.
            button.disabled = false;
            button.removeAttribute("disabled");
            button.setAttribute("aria-disabled", "false");
            button.dataset.feedResilienceUnlocked = "true";
            button.title = "실시간 시세가 지연되거나 끊겨도 주문 버튼은 유지됩니다. 주문 전에 경고 확인이 표시됩니다.";
          } else if (button.dataset.feedResilienceUnlocked === "true") {
            // Do not invent a disabled state when feed recovers. React/existing safety logic owns it.
            delete button.dataset.feedResilienceUnlocked;
            if (button.title.includes("실시간 시세가 지연")) button.title = "";
          }
        }

        if (feed.stale) {
          markUnavailableZeroValues();
          markTechnicalScoreWaiting();
        }

        window.dispatchEvent(
          new CustomEvent("aistock:feed-resilience-status", {
            detail: {
              feedState: feed.label,
              stale: feed.stale,
              keepManualOrderButtonsEnabled: true,
              requireStaleFeedConfirmation: true,
            },
          }),
        );
      } finally {
        applying = false;
      }
    };

    const onCaptureClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button") as HTMLButtonElement | null;
      if (!button || !isOrderButton(button)) return;

      const feed = getVisibleFeedState();
      if (!feed.stale) return;

      const lastPrice = findLastVisiblePrice();
      const priceText = lastPrice
        ? `마지막으로 화면에서 확인된 가격은 ${lastPrice}입니다.`
        : "마지막 수신 가격을 화면에서 확인할 수 없습니다.";

      const approved = window.confirm(
        `⚠ 현재 실시간 시세가 아닙니다.\n${feed.label}\n${priceText}\n\n계속 진행하시겠습니까?`,
      );

      if (!approved) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyPolicy);
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled"],
    });

    document.addEventListener("click", onCaptureClick, true);
    const interval = window.setInterval(applyPolicy, 1000);
    applyPolicy();

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onCaptureClick, true);
      window.clearInterval(interval);
    };
  }, []);

  return null;
};

export default FeedResiliencePolicyBridge;
