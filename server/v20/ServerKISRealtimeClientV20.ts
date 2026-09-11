// ----------------------------------------------------------------------
// SERVER KIS REALTIME CLIENT V20 (AISTOCK FINAL RC)
// Upstream WebSocket client for KIS Domestic & Overseas Market Data + Fills
// Truth-first: validated packets only, reconnect + resubscribe on disconnect.
// Adds bounded whole-market rotation so thousands of KRX/US symbols are sampled
// without pretending one WebSocket can safely hold every symbol at once.
// ----------------------------------------------------------------------

import fs from "fs";
import path from "path";
import WebSocket from "ws";
import { KISExecutionNoticeParserV20 } from "./KISExecutionNoticeParserV20";
import { brokerExecutionTruthBusV20 } from "./BrokerExecutionTruthBusV20";
import { KISOverseasParserV20 } from "./KISOverseasParserV20";
import { KISDomesticTradeParserV20 } from "./KISDomesticTradeParserV20";
import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";
import { realtimeSubscriptionRegistryV20 } from "./RealtimeSubscriptionRegistryV20";
import { serverCandleWarmCoordinatorV20 } from "./ServerCandleWarmCoordinatorV20";
import { getExchangeMasterUniverseV20 } from "../../src/services/ExchangeMasterUniverseSyncV20";

export interface KISRealtimeClientConfig {
  appKey: string;
  appSecret: string;
  approvalKey?: string;
  htsId?: string;
  isPaper?: boolean;
  overseasRealtimeEntitled?: boolean;
}

type UsRealtimeTargetV20 = {
  symbol: string;
  trKey: string;
};

const ROTATION_INTERVAL_MS = 45_000;
const DOMESTIC_ROTATION_BATCH = 18;
const US_ROTATION_BATCH = 18;
const WARM_PER_ROTATION = 8;
const KIS_REAL_REST_DOMAIN = process.env.KIS_REAL_DOMAIN ?? "https://openapi.koreainvestment.com:9443";
const STORED_CREDENTIALS_PATH = path.join(process.cwd(), "data", "server_api_credentials.json");
const STORED_CREDENTIALS_WATCH_MS = 10_000;

let activeRealtimeClient: ServerKISRealtimeClientV20 | null = null;
let activeRealtimeFingerprint = "";
let storedCredentialsWatcherStarted = false;

const toBool = (value: unknown): boolean => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
};

const readStoredRealtimeConfig = (): KISRealtimeClientConfig | null => {
  let disk: Record<string, unknown> = {};
  try {
    if (fs.existsSync(STORED_CREDENTIALS_PATH)) {
      const raw = fs.readFileSync(STORED_CREDENTIALS_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") disk = parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn("[ServerKISRealtimeClientV20] Failed to read stored KIS credentials metadata.", error);
  }

  const appKey = String(
    disk.kisAppKey || disk.koreaAppKey || process.env.KIS_APP_KEY || process.env.KIS_APPKEY || ""
  ).trim();
  const appSecret = String(
    disk.kisAppSecret || disk.koreaAppSecret || process.env.KIS_APP_SECRET || process.env.KIS_APPSECRET || ""
  ).trim();

  if (!appKey || !appSecret) return null;

  const approvalKey = String(disk.kisApprovalKey || process.env.KIS_APPROVAL_KEY || "").trim();
  const htsId = String(disk.kisHtsId || process.env.KIS_HTS_ID || "").trim();
  const overseasRealtimeEntitled = toBool(
    disk.kisOverseasRealtimeEntitled ?? process.env.KIS_OVERSEAS_REALTIME_ENTITLED
  );

  return {
    appKey,
    appSecret,
    approvalKey: approvalKey || undefined,
    htsId: htsId || undefined,
    isPaper: false,
    overseasRealtimeEntitled,
  };
};

export class ServerKISRealtimeClientV20 {
  private ws: WebSocket | null = null;
  private config: KISRealtimeClientConfig;
  private isConnected = false;
  private subscribedSymbols: Set<string> = new Set();
  private rotatingSymbols: Set<string> = new Set();
  private secretKeyHex = "";
  private secretIvHex = "";
  private reconnectTimer: NodeJS.Timeout | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  private closedIntentionally = false;
  private koreaUniverse: string[] = [];
  private usUniverse: UsRealtimeTargetV20[] = [];
  private koreaCursor = 0;
  private usCursor = 0;
  private rotationBusy = false;
  private approvalRequestInFlight: Promise<string | null> | null = null;

  constructor(config: KISRealtimeClientConfig) {
    this.config = { ...config, isPaper: false };
  }

  private credentialFingerprint(): string {
    return [
      this.config.appKey.trim(),
      this.config.appSecret.trim(),
      this.config.htsId || "",
      this.config.overseasRealtimeEntitled === true ? "US1" : "US0",
    ].join("::");
  }

  private async acquireApprovalKey(): Promise<string | null> {
    if (this.config.approvalKey?.trim()) return this.config.approvalKey.trim();
    if (this.approvalRequestInFlight) return this.approvalRequestInFlight;

    this.approvalRequestInFlight = (async () => {
      try {
        const res = await fetch(`${KIS_REAL_REST_DOMAIN}/oauth2/Approval`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            grant_type: "client_credentials",
            appkey: this.config.appKey,
            secretkey: this.config.appSecret,
          }),
        });
        if (!res.ok) {
          console.warn(`[ServerKISRealtimeClientV20] approval key HTTP ${res.status}`);
          return null;
        }
        const data = await res.json().catch(() => null);
        const approvalKey = String(data?.approval_key || "").trim();
        if (!approvalKey) {
          console.warn("[ServerKISRealtimeClientV20] KIS approval response did not include approval_key.");
          return null;
        }
        this.config.approvalKey = approvalKey;
        console.log("[ServerKISRealtimeClientV20] KIS WebSocket approval key acquired.");
        return approvalKey;
      } catch (error) {
        console.warn("[ServerKISRealtimeClientV20] KIS approval key request failed.", error);
        return null;
      } finally {
        this.approvalRequestInFlight = null;
      }
    })();
    return this.approvalRequestInFlight;
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) return;

    const fingerprint = this.credentialFingerprint();
    if (activeRealtimeClient && activeRealtimeClient !== this) {
      if (activeRealtimeFingerprint === fingerprint && activeRealtimeClient.isSocketConnected()) return;
      activeRealtimeClient.disconnect();
    }

    const approvalKey = await this.acquireApprovalKey();
    if (!approvalKey) {
      this.scheduleReconnect();
      return;
    }

    activeRealtimeClient = this;
    activeRealtimeFingerprint = fingerprint;
    const url = "ws://ops.koreainvestment.com:21000/tryitout/H0STCNT0";
    this.closedIntentionally = false;

    try {
      this.ws = new WebSocket(url);
      this.ws.on("open", () => {
        this.isConnected = true;
        console.log("[ServerKISRealtimeClientV20] KIS LIVE WebSocket connected.");
        if (this.config.htsId) this.subscribeExecutionNotice(this.config.htsId);
        this.resubscribeAll();
        void this.initializeWholeMarketRotation();
      });
      this.ws.on("message", (data: WebSocket.Data) => this.handleMessage(data.toString()));
      this.ws.on("close", () => {
        this.isConnected = false;
        this.ws = null;
        this.stopRotation();
        console.log("[ServerKISRealtimeClientV20] KIS WebSocket closed.");
        if (!this.closedIntentionally) this.scheduleReconnect();
      });
      this.ws.on("error", (err) => console.error("[ServerKISRealtimeClientV20] KIS WebSocket error:", err));
    } catch (err) {
      console.error("[ServerKISRealtimeClientV20] Connection initialization failed:", err);
      this.scheduleReconnect();
    }
  }

  public subscribeSymbol(symbol: string, trId: "H0STCNT0" | "HDFSCNT0" = "H0STCNT0"): void {
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    if (!cleanSymbol) return;

    if (trId === "HDFSCNT0") {
      if (!/^D[A-Z]{3}[A-Z0-9]{1,5}$/.test(cleanSymbol)) {
        console.warn(`[ServerKISRealtimeClientV20] skipped unverified US realtime tr_key: ${cleanSymbol}`);
        return;
      }
      this.subscribedSymbols.add(`${trId}:${cleanSymbol}`);
      this.sendSubscription(trId, cleanSymbol);
      return;
    }

    realtimeSubscriptionRegistryV20.register({ symbol: cleanSymbol, market: "KR" });
    this.subscribedSymbols.add(`${trId}:${cleanSymbol}`);
    this.sendSubscription(trId, cleanSymbol);
  }

  public getSubscriptionSnapshot(): string[] {
    return Array.from(new Set([...this.subscribedSymbols.values(), ...this.rotatingSymbols.values()]));
  }

  public isSocketConnected(): boolean {
    return Boolean(this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN);
  }

  private sendControl(trId: "H0STCNT0" | "HDFSCNT0", symbol: string, subscribe: boolean): void {
    if (!this.ws || !this.isConnected || this.ws.readyState !== WebSocket.OPEN || !this.config.approvalKey) return;
    this.ws.send(JSON.stringify({
      header: {
        approval_key: this.config.approvalKey,
        custtype: "P",
        tr_type: subscribe ? "1" : "2",
        "content-type": "utf-8"
      },
      body: { input: { tr_id: trId, tr_key: symbol } }
    }));
  }

  private sendSubscription(trId: "H0STCNT0" | "HDFSCNT0", symbol: string): void {
    this.sendControl(trId, symbol, true);
  }

  private sendUnsubscription(trId: "H0STCNT0" | "HDFSCNT0", symbol: string): void {
    this.sendControl(trId, symbol, false);
  }

  private resubscribeAll(): void {
    for (const item of this.subscribedSymbols) {
      const idx = item.indexOf(":");
      if (idx <= 0) continue;
      const trId = item.slice(0, idx) as "H0STCNT0" | "HDFSCNT0";
      this.sendSubscription(trId, item.slice(idx + 1));
    }
  }

  private async initializeWholeMarketRotation(): Promise<void> {
    try {
      const snapshot = await getExchangeMasterUniverseV20();
      this.koreaUniverse = snapshot.symbols
        .filter((item) => item.market === "KOSPI" || item.market === "KOSDAQ")
        .map((item) => item.symbol);
      this.usUniverse = snapshot.symbols
        .filter((item) => item.market === "US" && typeof item.kisRealtimeKey === "string" && item.kisRealtimeKey.length > 0)
        .map((item) => ({ symbol: item.symbol, trKey: item.kisRealtimeKey! }));
    } catch (error) {
      console.warn("[ServerKISRealtimeClientV20] exchange master unavailable; pinned subscriptions only", error);
      this.koreaUniverse = [];
      this.usUniverse = [];
    }

    await this.rotateWholeMarketBatch();
    if (!this.rotationTimer) {
      this.rotationTimer = setInterval(() => void this.rotateWholeMarketBatch(), ROTATION_INTERVAL_MS);
      this.rotationTimer.unref?.();
    }
  }

  private stopRotation(): void {
    if (this.rotationTimer) clearInterval(this.rotationTimer);
    this.rotationTimer = null;
    this.rotationBusy = false;
    this.rotatingSymbols.clear();
  }

  private takeRotationBatch<T>(universe: T[], cursor: number, size: number): { batch: T[]; cursor: number } {
    if (!universe.length) return { batch: [], cursor: 0 };
    const batch: T[] = [];
    for (let i = 0; i < Math.min(size, universe.length); i++) {
      batch.push(universe[(cursor + i) % universe.length]);
    }
    return { batch, cursor: (cursor + batch.length) % universe.length };
  }

  private async rotateWholeMarketBatch(): Promise<void> {
    if (this.rotationBusy || !this.isSocketConnected()) return;
    this.rotationBusy = true;
    try {
      const kr = this.takeRotationBatch(this.koreaUniverse, this.koreaCursor, DOMESTIC_ROTATION_BATCH);
      const us = this.takeRotationBatch(this.usUniverse, this.usCursor, US_ROTATION_BATCH);
      this.koreaCursor = kr.cursor;
      this.usCursor = us.cursor;

      const desired = new Set<string>([
        ...kr.batch.map((symbol) => `H0STCNT0:${symbol}`),
        ...(this.config.overseasRealtimeEntitled === true ? us.batch.map((target) => `HDFSCNT0:${target.trKey}`) : []),
      ]);

      for (const item of this.rotatingSymbols) {
        if (desired.has(item) || this.subscribedSymbols.has(item)) continue;
        const idx = item.indexOf(":");
        if (idx <= 0) continue;
        this.sendUnsubscription(item.slice(0, idx) as "H0STCNT0" | "HDFSCNT0", item.slice(idx + 1));
      }

      for (const symbol of kr.batch) {
        const subscriptionId = `H0STCNT0:${symbol}`;
        if (this.rotatingSymbols.has(subscriptionId) || this.subscribedSymbols.has(subscriptionId)) continue;
        realtimeSubscriptionRegistryV20.register({ symbol, market: "KR" });
        this.sendSubscription("H0STCNT0", symbol);
      }

      if (this.config.overseasRealtimeEntitled === true) {
        for (const target of us.batch) {
          const subscriptionId = `HDFSCNT0:${target.trKey}`;
          if (this.rotatingSymbols.has(subscriptionId) || this.subscribedSymbols.has(subscriptionId)) continue;
          realtimeSubscriptionRegistryV20.register({ symbol: target.symbol, market: "US" });
          this.sendSubscription("HDFSCNT0", target.trKey);
        }
      }
      this.rotatingSymbols = desired;

      const warmRequests = [
        ...kr.batch.map((symbol) => ({ symbol, market: "KOREA" as const })),
        ...(this.config.overseasRealtimeEntitled === true ? us.batch.map((target) => ({ symbol: target.symbol, market: "US" as const })) : []),
      ];
      await serverCandleWarmCoordinatorV20.warmBatch(warmRequests, WARM_PER_ROTATION);
    } finally {
      this.rotationBusy = false;
    }
  }

  public subscribeExecutionNotice(htsId: string): void {
    if (!this.ws || !this.isConnected || !htsId || !this.config.approvalKey) return;
    this.ws.send(JSON.stringify({
      header: {
        approval_key: this.config.approvalKey,
        custtype: "P",
        tr_type: "1",
        "content-type": "utf-8"
      },
      body: { input: { tr_id: "H0STCNI0", tr_key: htsId } }
    }));
  }

  private handleMessage(msg: string): void {
    if (!msg) return;
    if (msg.startsWith("{")) {
      try {
        const parsed = JSON.parse(msg);
        const output = parsed?.body?.output;
        if (parsed?.header?.tr_id === "H0STCNI0" && output?.key && output?.iv) {
          this.secretKeyHex = output.key;
          this.secretIvHex = output.iv;
        }
      } catch {}
      return;
    }

    const parts = msg.split("|");
    if (parts.length < 4) return;
    const trId = parts[1];
    const dataBody = parts[3];

    if (trId === "H0STCNI0" || trId === "H0GSCNI0") {
      let payload = dataBody;
      if (this.secretKeyHex && this.secretIvHex) {
        payload = KISExecutionNoticeParserV20.decryptPayload(dataBody, this.secretKeyHex, this.secretIvHex);
      }
      const notice = KISExecutionNoticeParserV20.parse(trId, payload);
      if (notice?.isExecuted) brokerExecutionTruthBusV20.publish(notice);
      return;
    }

    if (trId === "H0STCNT0") {
      const tick = KISDomesticTradeParserV20.parseH0STCNT0(dataBody);
      if (!tick) return;
      serverRealtimeMarketHubV20.updateQuote(
        tick.symbol, tick.symbol, "KOREA", tick.lastPrice, tick.changeAmount, tick.ratePct,
        tick.totalVolume, tick.totalAmount, "KIS_H0STCNT0", tick.grade,
        tick.askPrice, tick.bidPrice, tick.executedVolume,
      );
      return;
    }

    if (trId === "HDFSCNT0") {
      const tick = KISOverseasParserV20.parseHDFSCNT0(dataBody, this.config.overseasRealtimeEntitled === true);
      if (!tick) return;
      serverRealtimeMarketHubV20.updateQuote(
        tick.symbol, tick.symbol, "US", tick.lastPrice, 0, tick.ratePct,
        tick.totalVolume, tick.totalAmount, "KIS_HDFSCNT0", tick.grade,
        tick.askPrice, tick.bidPrice, tick.executedVolume,
      );
    }
  }

  private scheduleReconnect(): void {
    if (this.closedIntentionally) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => void this.connect(), 5000);
    this.reconnectTimer.unref?.();
  }

  public disconnect(): void {
    this.closedIntentionally = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopRotation();
    if (this.ws) this.ws.close();
    this.ws = null;
    this.isConnected = false;
    if (activeRealtimeClient === this) {
      activeRealtimeClient = null;
      activeRealtimeFingerprint = "";
    }
  }
}

async function ensureStoredKISRealtimeClient(): Promise<void> {
  const config = readStoredRealtimeConfig();
  if (!config) return;
  const fingerprint = [
    config.appKey.trim(),
    config.appSecret.trim(),
    config.htsId || "",
    config.overseasRealtimeEntitled === true ? "US1" : "US0",
  ].join("::");

  if (activeRealtimeClient && activeRealtimeFingerprint === fingerprint) {
    if (!activeRealtimeClient.isSocketConnected()) void activeRealtimeClient.connect();
    return;
  }

  if (activeRealtimeClient) activeRealtimeClient.disconnect();
  const client = new ServerKISRealtimeClientV20(config);
  await client.connect();
}

export function startStoredKISRealtimeCredentialWatcherV20(): void {
  if (storedCredentialsWatcherStarted) return;
  storedCredentialsWatcherStarted = true;
  const firstRun = setTimeout(() => void ensureStoredKISRealtimeClient(), 1000);
  firstRun.unref?.();
  const watcher = setInterval(() => void ensureStoredKISRealtimeClient(), STORED_CREDENTIALS_WATCH_MS);
  watcher.unref?.();
}

startStoredKISRealtimeCredentialWatcherV20();