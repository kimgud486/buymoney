import fs from "fs";
import path from "path";

export type JournalOrderState =
  | "INTENT"
  | "SUBMITTED"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "REJECTED"
  | "CANCELLED"
  | "UNKNOWN";

export interface AutonomousOrderJournalRecord {
  clientOrderKey: string;
  symbol: string;
  market: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  state: JournalOrderState;
  brokerOrderId?: string;
  filledQty?: number;
  updatedAt: number;
  createdAt: number;
  note?: string;
}

interface JournalFile {
  version: 1;
  records: AutonomousOrderJournalRecord[];
}

const terminal = new Set<JournalOrderState>(["FILLED", "REJECTED", "CANCELLED"]);

/**
 * File-backed idempotency journal for server-side autonomous execution.
 * Writes use temp-file + rename so a process interruption does not leave
 * a half-written JSON file. This is intentionally server-only.
 */
export class AutonomousOrderJournal {
  private readonly records = new Map<string, AutonomousOrderJournalRecord>();

  constructor(private readonly filePath = path.join(process.cwd(), ".runtime", "autonomous-order-journal.json")) {
    this.load();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as JournalFile;
      if (parsed?.version !== 1 || !Array.isArray(parsed.records)) return;
      for (const record of parsed.records) {
        if (record?.clientOrderKey) this.records.set(record.clientOrderKey, record);
      }
    } catch (error) {
      console.error("[AutonomousOrderJournal] load failed; execution should remain locked until reconciliation", error);
    }
  }

  private persist(): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const temp = `${this.filePath}.tmp`;
    const body: JournalFile = { version: 1, records: [...this.records.values()] };
    fs.writeFileSync(temp, JSON.stringify(body, null, 2), "utf8");
    fs.renameSync(temp, this.filePath);
  }

  get(clientOrderKey: string): AutonomousOrderJournalRecord | null {
    return this.records.get(clientOrderKey) ?? null;
  }

  hasActive(clientOrderKey: string): boolean {
    const existing = this.records.get(clientOrderKey);
    return Boolean(existing && !terminal.has(existing.state));
  }

  createIntent(input: Omit<AutonomousOrderJournalRecord, "state" | "createdAt" | "updatedAt">): AutonomousOrderJournalRecord {
    const existing = this.records.get(input.clientOrderKey);
    if (existing && !terminal.has(existing.state)) {
      throw new Error(`DUPLICATE_ACTIVE_ORDER:${input.clientOrderKey}`);
    }

    const now = Date.now();
    const record: AutonomousOrderJournalRecord = {
      ...input,
      state: "INTENT",
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(record.clientOrderKey, record);
    this.persist();
    return { ...record };
  }

  update(
    clientOrderKey: string,
    patch: Partial<Pick<AutonomousOrderJournalRecord, "state" | "brokerOrderId" | "filledQty" | "note">>,
  ): AutonomousOrderJournalRecord {
    const existing = this.records.get(clientOrderKey);
    if (!existing) throw new Error(`ORDER_JOURNAL_NOT_FOUND:${clientOrderKey}`);

    const next: AutonomousOrderJournalRecord = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };
    this.records.set(clientOrderKey, next);
    this.persist();
    return { ...next };
  }

  getUnresolved(): AutonomousOrderJournalRecord[] {
    return [...this.records.values()].filter((record) => !terminal.has(record.state));
  }

  list(): AutonomousOrderJournalRecord[] {
    return [...this.records.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
