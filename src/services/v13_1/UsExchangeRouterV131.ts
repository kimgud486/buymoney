// AISTOCK v13.1 US Exchange Router
// Dynamically maps US exchanges to KIS official codes (NASD, NYSE, AMEX).
// Prevents default NASD hardcoding and rejects UNKNOWN US exchanges or CRYPTO on KIS Stock Gateway.

import { ExchangeRouteResultV131, UsExchangeCodeV131 } from "./typesV131";

export class UsExchangeRouterV131 {
  /**
   * Resolve exchange and validate eligibility for KIS trading gateway
   */
  public static routeExchange(
    market: "KOREA" | "US" | "BTC",
    rawExchange?: string,
    symbol?: string
  ): ExchangeRouteResultV131 {
    // 1. Crypto Block
    if (market === "BTC" || (symbol && (symbol.startsWith("KRW-") || symbol.endsWith("USDT")))) {
      return {
        isValid: false,
        market: "BTC",
        resolvedExchange: "UPBIT",
        isCrypto: true,
        allowKisRouting: false,
        rejectionReason: "⛔ [CRYPTO_KIS_NOT_ALLOWED] KIS 주식 게이트웨이로 암호화폐 주문 전송 금지."
      };
    }

    // 2. Korea Market Route
    if (market === "KOREA") {
      return {
        isValid: true,
        market: "KOREA",
        resolvedExchange: "KRX",
        isCrypto: false,
        allowKisRouting: true
      };
    }

    // 3. US Market Route & Exchange Code Mapping
    const cleanEx = (rawExchange || "").trim().toUpperCase();

    let resolvedExchange: UsExchangeCodeV131 = "UNKNOWN";

    if (["NAS", "NASD", "NASDAQ"].includes(cleanEx)) {
      resolvedExchange = "NASD";
    } else if (["NYS", "NYSE"].includes(cleanEx)) {
      resolvedExchange = "NYSE";
    } else if (["AMS", "AMEX"].includes(cleanEx)) {
      resolvedExchange = "AMEX";
    }

    if (resolvedExchange === "UNKNOWN") {
      return {
        isValid: false,
        market: "US",
        resolvedExchange: "UNKNOWN",
        isCrypto: false,
        allowKisRouting: false,
        rejectionReason: `⛔ [UNKNOWN_US_EXCHANGE] 미지원 미국 거래소 코드('${rawExchange || "EMPTY"}')입니다. Fail-Closed 주문 차단.`
      };
    }

    return {
      isValid: true,
      market: "US",
      resolvedExchange,
      isCrypto: false,
      allowKisRouting: true
    };
  }
}
