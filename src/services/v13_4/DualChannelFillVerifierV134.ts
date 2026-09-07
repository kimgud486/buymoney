import { DualChannelFillRecordV134 } from "./typesV134";

export class DualChannelFillVerifierV134 {
  private fillRecords: Map<string, DualChannelFillRecordV134> = new Map();

  public registerOrder(orderId: string, symbol: string, requestedQty: number) {
    this.fillRecords.set(orderId, {
      orderId,
      symbol,
      requestedQty,
      status: "PENDING"
    });
  }

  public recordWsFill(orderId: string, filledQty: number) {
    const record = this.fillRecords.get(orderId);
    if (!record) return;

    record.wsFilledQty = filledQty;
    this.evaluateStatus(record);
  }

  public recordRestFill(orderId: string, filledQty: number) {
    const record = this.fillRecords.get(orderId);
    if (!record) return;

    record.restFilledQty = filledQty;
    this.evaluateStatus(record);
  }

  private evaluateStatus(record: DualChannelFillRecordV134) {
    if (record.wsFilledQty !== undefined && record.restFilledQty !== undefined) {
      if (record.wsFilledQty === record.restFilledQty) {
        record.status = "MATCHED";
      } else {
        record.status = "MISMATCH";
      }
      record.verifiedAt = new Date().toISOString();
    }
  }

  public getRecord(orderId: string): DualChannelFillRecordV134 | undefined {
    return this.fillRecords.get(orderId);
  }

  public hasMismatches(): boolean {
    for (const record of this.fillRecords.values()) {
      if (record.status === "MISMATCH") {
        return true;
      }
    }
    return false;
  }

  public getMismatchedOrders(): DualChannelFillRecordV134[] {
    return Array.from(this.fillRecords.values()).filter(r => r.status === "MISMATCH");
  }
}

export const dualChannelFillVerifierV134 = new DualChannelFillVerifierV134();
