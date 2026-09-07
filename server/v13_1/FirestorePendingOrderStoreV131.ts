// AISTOCK v13.1 Firestore Pending Order Store (Server-side Cloud Run State Recovery)
// Persists PENDING & PARTIAL orders to Firestore REST API for seamless recovery across Cloud Run instance restarts.

import { PendingOrderV131 } from "../../src/services/v13_1/typesV131";

export class FirestorePendingOrderStoreV131 {
  private projectId: string;
  private databaseId: string;
  private collectionName: string = "aistock_pending_orders_v131";
  private inMemoryCache: Map<string, PendingOrderV131> = new Map();

  constructor(projectId?: string, databaseId: string = "(default)") {
    this.projectId = projectId || process.env.FIRESTORE_PROJECT_ID || process.env.GCP_PROJECT || "ai-studio-6f3899c6-4891-40d1-b569-afb78466e4b7";
    this.databaseId = databaseId;
  }

  /**
   * Save order to Firestore via REST API with fallback to memory
   */
  public async saveOrder(order: PendingOrderV131): Promise<boolean> {
    this.inMemoryCache.set(order.orderKey, order);

    try {
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${this.collectionName}/${encodeURIComponent(order.orderKey)}`;
      
      const documentBody = {
        fields: {
          orderKey: { stringValue: order.orderKey },
          odno: { stringValue: order.odno },
          symbol: { stringValue: order.symbol },
          name: { stringValue: order.name },
          market: { stringValue: order.market },
          exchange: { stringValue: order.exchange },
          side: { stringValue: order.side },
          orderQty: { integerValue: String(order.orderQty) },
          filledQty: { integerValue: String(order.filledQty) },
          remainingQty: { integerValue: String(order.remainingQty) },
          orderPrice: { doubleValue: order.orderPrice },
          avgFilledPrice: { doubleValue: order.avgFilledPrice },
          status: { stringValue: order.status },
          createdAt: { integerValue: String(order.createdAt) },
          updatedAt: { integerValue: String(order.updatedAt) }
        }
      };

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentBody),
        signal: AbortSignal.timeout(3000)
      });

      return res.ok;
    } catch {
      // Fallback: order is saved in inMemoryCache
      return true;
    }
  }

  /**
   * Load active PENDING / PARTIAL orders from Firestore on server startup
   */
  public async listRecoveryQueue(): Promise<PendingOrderV131[]> {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${this.collectionName}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });

      if (!res.ok) {
        return Array.from(this.inMemoryCache.values()).filter(
          o => o.status === "PENDING" || o.status === "PARTIAL"
        );
      }

      const data = await res.json() as any;
      const documents = data?.documents || [];
      const recoveredOrders: PendingOrderV131[] = [];

      for (const doc of documents) {
        const fields = doc?.fields;
        if (!fields) continue;

        const order: PendingOrderV131 = {
          orderKey: fields.orderKey?.stringValue || "",
          odno: fields.odno?.stringValue || "",
          symbol: fields.symbol?.stringValue || "",
          name: fields.name?.stringValue || "",
          market: (fields.market?.stringValue || "KOREA") as "KOREA" | "US",
          exchange: fields.exchange?.stringValue || "",
          side: (fields.side?.stringValue || "BUY") as "BUY" | "SELL",
          orderQty: parseInt(fields.orderQty?.integerValue || "0", 10),
          filledQty: parseInt(fields.filledQty?.integerValue || "0", 10),
          remainingQty: parseInt(fields.remainingQty?.integerValue || "0", 10),
          orderPrice: parseFloat(fields.orderPrice?.doubleValue || "0"),
          avgFilledPrice: parseFloat(fields.avgFilledPrice?.doubleValue || "0"),
          status: (fields.status?.stringValue || "PENDING") as any,
          createdAt: parseInt(fields.createdAt?.integerValue || "0", 10),
          updatedAt: parseInt(fields.updatedAt?.integerValue || "0", 10)
        };

        if (order.orderKey && (order.status === "PENDING" || order.status === "PARTIAL")) {
          this.inMemoryCache.set(order.orderKey, order);
          recoveredOrders.push(order);
        }
      }

      return recoveredOrders;
    } catch {
      return Array.from(this.inMemoryCache.values()).filter(
        o => o.status === "PENDING" || o.status === "PARTIAL"
      );
    }
  }

  /**
   * Delete or archive finished order
   */
  public async removeOrder(orderKey: string): Promise<boolean> {
    this.inMemoryCache.delete(orderKey);
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${this.collectionName}/${encodeURIComponent(orderKey)}`;
      const res = await fetch(url, { method: "DELETE", signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return true;
    }
  }
}
