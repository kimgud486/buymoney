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

  /**
   * Load Journal File Sync.
   * CRITICAL FAIL-CLOSED CONTRACT: If the journal file exists but contains invalid or corrupted JSON,
   * it MUST throw an explicit JOURNAL_CORRUPTED error rather than starting with an empty journal.
   */
  public loadJournalSync(): void {
    if (!fs.existsSync(this.filePath)) {
      this.entries.clear();
      this.idempotencyKeys.clear();
      return;
    }

    try {
      const rawContent = fs.readFileSync(this.filePath, "utf8");
      if (!rawContent.trim()) {
        throw new Error("JOURNAL_EMPTY_FILE");
      }

      const data = JSON.parse(rawContent);
      if (!Array.isArray(data)) {
        throw new Error("JOURNAL_INVALID_FORMAT");
      }

      this.entries.clear();
      this.idempotencyKeys.clear();

      for (const item of data) {
        if (!item.idempotencyKey || !item.orderId || !item.symbol || !item.status) {
          throw new Error("JOURNAL_ITEM_MALFORMED");
        }
        this.entries.set(item.orderId, item);
        this.idempotencyKeys.add(item.idempotencyKey);
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

  /**
   * Persist Journal Entries to Disk Sync
   */
  public saveJournalSync(): void {
    const list = Array.from(this.entries.values());
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), "utf8");
  }

  public recordOrder(entry: JournalOrderEntry): void {
    this.entries.set(entry.orderId, entry);
    this.idempotencyKeys.add(entry.idempotencyKey);
    this.saveJournalSync();
  }

  public getOrder(orderIdOrKey: string): JournalOrderEntry | undefined {
    if (this.entries.has(orderIdOrKey)) {
      return this.entries.get(orderIdOrKey);
    }
    for (const entry of this.entries.values()) {
      if (entry.idempotencyKey === orderIdOrKey) {
        return entry;
      }
    }
    return undefined;
  }

  public hasIdempotencyKey(key: string): boolean {
    return this.idempotencyKeys.has(key);
  }

  public getPartialOrders(): JournalOrderEntry[] {
    return Array.from(this.entries.values()).filter(o => o.status === "PARTIAL");
  }

  public getPendingOrAcknowledgedOrders(): JournalOrderEntry[] {
    return Array.from(this.entries.values()).filter(o => o.status === "ACKNOWLEDGED" || o.status === "PENDING");
  }

  /**
   * Returns true if there is any order with PARTIAL status (unresolved partial fill exposure)
   */
  public hasActivePartialExposure(): boolean {
    return this.getPartialOrders().length > 0;
  }

  public clear(): void {
    this.entries.clear();
    this.idempotencyKeys.clear();
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
  }
}
