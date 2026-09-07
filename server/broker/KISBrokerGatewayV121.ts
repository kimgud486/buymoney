// AISTOCK v12.1/v12.3 Server-Side KIS Broker Gateway Compatibility Wrapper
// Re-exports KISBrokerGatewayV123 with full v12.3 Real Fill Engine support.

export type {
  KISOrderRequest,
  KISOrderGatewayResponse,
  KISFillCheckResult
} from "./KISBrokerGatewayV123";

export {
  KISBrokerGatewayV123 as KISBrokerGatewayV121
} from "./KISBrokerGatewayV123";
