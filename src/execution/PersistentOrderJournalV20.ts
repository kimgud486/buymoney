import fs from "fs";
import path from "path";

export interface JournalOrderEntry {
  idempotencyKey: string;
  orderId: string;
  symbol: string;
  market: "KR" | "US" | "CRYPTO";
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  status: "ACKNOWLEDGED" | "PENDING" | "PARTIAL" | "FILLED" | "CANCELLED" | "REJECTED";
  filledQuantity: number;
  averageFillPrice: number | null;
  createdAt: number;
  updatedAt: number;
}

export class PersistentOrderJournalV20 {
  private filePath: string;
  private entries = new Map<string, JournalOrderEntry>();
  private idempotencyKeys = new Set<string>();

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), "order_journal_v20.json");
    this.loadJournalSync();
  }

  public loadJournalSync(): void {
    if (!fs.existsSync(this.filePath)) {
      this.entries.clear();
      this.idempotencyKeys.clear();
      return;
    }

    try {
      const rawContent = fs.readFileSync(this.filePath, "utf8");
      if (!rawContent.trim()) throw new Error("JOURNAL_EMPTY_FILE");

      const data = JSON.parse(rawContent);
      if (!Array.isArray(data)) throw new Error("JOURNAL_INVALID_FORMAT");

      this.entries.clear();
      this.idempotencyKeys.clear();

      for (const item of data) {
        if (!item.idempotencyKey || !item.orderId || !item.symbol || !item.status) {
          throw new Error("JOURNAL_ITEM_MALFORMED");
        }
        this.entries.set(String(item.orderId), item as JournalOrderEntry);
        this.idempotencyKeys.add(String(item.idempotencyKey));
      }
    } catch (err: any) {
      if (err.message?.startsWith("JOURNAL_")) {
        throw new Error(`JOURNAL_CORRUPTED: Order journal file at '${this.filePath}' is corrupted or invalid (${err.message}). Failing closed.`);
      }
      if (err instanceof SyntaxError) {
        throw new Error(`JOURNAL_CORRUPTED: Order journal file at '${this.filePath}' has invalid JSON syntax. Failing closed.`);
      }
      throw err;
    }
  }

  public saveJournalSync(): void {
    const list = Array.from(this.entries.values());
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), "utf8");
    fs.renameSync(tempPath, this.filePath);
  }

  public recordOrder(entry: JournalOrderEntry): void {
    if (!entry.orderId || !entry.idempotencyKey) {
      throw new Error("JOURNAL_INVALID_ORDER_IDENTITY");
    }
    this.entries.set(entry.orderId, { ...entry });
    this.idempotencyKeys.add(entry.idempotencyKey);
    this.saveJournalSync();
  }

  public updateOrder(orderId: string, patch: Partial<Omit<JournalOrderEntry, "orderId" | "idempotencyKey">>): JournalOrderEntry {
    const current = this.entries.get(orderId);
    if (!current) throw new Error(`JOURNAL_ORDER_NOT_FOUND: ${orderId}`);

    const next: JournalOrderEntry = {
      ...current,
      ...patch,
      orderId: current.orderId,
      idempotencyKey: current.idempotencyKey,
      updatedAt: patch.updatedAt ?? Date.now()
    };
    this.entries.set(orderId, next);
    this.saveJournalSync();
    return { ...next };
  }

  public getOrder(orderIdOrKey: string): JournalOrderEntry | undefined {
    const direct = this.entries.get(orderIdOrKey);
    if (direct) return { ...direct };

    for (const entry of this.entries.values()) {
      if (entry.idempotencyKey === orderIdOrKey) return { ...entry };
    }
    return undefined;
  }

  public getAllOrders(): JournalOrderEntry[] {
    return Array.from(this.entries.values()).map((entry) => ({ ...entry }));
  }

  public hasIdempotencyKey(key: string): boolean {
    return this.idempotencyKeys.has(key);
  }

  public getPartialOrders(): JournalOrderEntry[] {
    return this.getAllOrders().filter(o => o.status === "PARTIAL");
  }

  public getPendingOrAcknowledgedOrders(): JournalOrderEntry[] {
    return this.getAllOrders().filter(o => o.status === "ACKNOWLEDGED" || o.status === "PENDING");
  }

  public hasActivePartialExposure(): boolean {
    return this.getPartialOrders().length > 0;
  }

  public clear(): void {
    this.entries.clear();
    this.idempotencyKeys.clear();
    if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
    const tempPath = `${this.filePath}.tmp`;
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}
