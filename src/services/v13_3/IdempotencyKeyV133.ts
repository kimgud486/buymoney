import crypto from "node:crypto";
import { OrderIntentV133 } from "./typesV133";

export class IdempotencyKeyGeneratorV133 {
  /**
   * Generates a deterministic SHA-256 Idempotency Key for an order intent.
   * Key components: strategy + market + symbol + side + qty + logicalSignalId
   */
  public generateKey(intent: OrderIntentV133): string {
    const rawString = `${intent.strategyName}_${intent.market}_${intent.symbol}_${intent.side}_${intent.orderQty}_${intent.logicalSignalId}`;
    return crypto.createHash("sha256").update(rawString).digest("hex");
  }
}

export const idempotencyKeyGeneratorV133 = new IdempotencyKeyGeneratorV133();
