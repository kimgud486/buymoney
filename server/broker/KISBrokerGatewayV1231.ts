// AISTOCK v12.5 Server-Side KIS Broker Gateway Export
// Re-exports KISBrokerGatewayV125 with RC5 PROD TRUTH updates.

export type {
  KISOrderRequest,
  KISOrderGatewayResponse,
  KISFillCheckResult
} from "./KISBrokerGatewayV125";

export {
  KISBrokerGatewayV125,
  KISBrokerGatewayV125 as KISBrokerGatewayV123,
  KISBrokerGatewayV125 as KISBrokerGatewayV1231
} from "./KISBrokerGatewayV125";

