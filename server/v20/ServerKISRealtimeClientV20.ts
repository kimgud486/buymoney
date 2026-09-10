// ----------------------------------------------------------------------
// SERVER KIS REALTIME CLIENT V20 (AISTOCK FINAL RC)
// Upstream WebSocket client for KIS Domestic & Overseas Market Data + Fills
// Truth-first: validated packets only, reconnect + resubscribe on disconnect.
// ----------------------------------------------------------------------

import WebSocket from "ws";
import { KISExecutionNoticeParserV20 } from "./KISExecutionNoticeParserV20";
import { brokerExecutionTruthBusV20 } from "./BrokerExecutionTruthBusV20";
import { KISOverseasParserV20 } from "./KISOverseasParserV20";
import { KISDomesticTradeParserV20 } from "./KISDomesticTradeParserV20";
import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";

export interface KISRealtimeClientConfig {
  appKey: string;
  appSecret: string;
  approvalKey: string;
  htsId?: string;
  isPaper?: boolean;
  overseasRealtimeEntitled?: boolean;
}

export class ServerKISRealtimeClientV20 {
  private ws: WebSocket | null = null;
  private config: KISRealtimeClientConfig;
  private isConnected = false;
  private subscribedSymbols: Set<string> = new Set();
  private secretKeyHex = "";
  private secretIvHex = "";
  private reconnectTimer: NodeJS.Timeout | null = null;
  private closedIntentionally = false;

  constructor(config: KISRealtimeClientConfig) {
    this.config = config;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const domain = this.config.isPaper
      ? "ops.koreainvestment.com:31000"
      : "ops.koreainvestment.com:21000";
    const url = `ws://${domain}/tryitout/H0STCNT0`;

    this.closedIntentionally = false;

    try {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        this.isConnected = true;
        console.log("[ServerKISRealtimeClientV20] KIS WebSocket connected.");
        if (this.config.htsId) this.subscribeExecutionNotice(this.config.htsId);
        this.resubscribeAll();
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on("close", () => {
        this.isConnected = false;
        this.ws = null;
        console.log("[ServerKISRealtimeClientV20] KIS WebSocket closed.");
        if (!this.closedIntentionally) this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        console.error("[ServerKISRealtimeClientV20] KIS WebSocket error:", err);
      });
    } catch (err) {
      console.error("[ServerKISRealtimeClientV20] Connection initialization failed:", err);
      this.scheduleReconnect();
    }
  }

  public subscribeSymbol(symbol: string, trId: "H0STCNT0" | "HDFSCNT0" = "H0STCNT0"): void {
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    if (!cleanSymbol) return;

    this.subscribedSymbols.add(`${trId}:${cleanSymbol}`);
    this.sendSubscription(trId, cleanSymbol);
  }

  private sendSubscription(trId: "H0STCNT0" | "HDFSCNT0", symbol: string): void {
    if (!this.ws || !this.isConnected || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      header: {
        approval_key: this.config.approvalKey,
        custtype: "P",
        tr_type: "1",
        "content-type": "utf-8"
      },
      body: { input: { tr_id: trId, tr_key: symbol } }
    }));
  }

  private resubscribeAll(): void {
    for (const item of this.subscribedSymbols) {
      const idx = item.indexOf(":");
      if (idx <= 0) continue;
      const trId = item.slice(0, idx) as "H0STCNT0" | "HDFSCNT0";
      const symbol = item.slice(idx + 1);
      this.sendSubscription(trId, symbol);
    }
  }

  public subscribeExecutionNotice(htsId: string): void {
    if (!this.ws || !this.isConnected || !htsId) return;

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
      } catch {
        // Ignore malformed control packets.
      }
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
        tick.symbol,
        tick.symbol,
        "KOREA",
        tick.lastPrice,
        tick.changeAmount,
        tick.ratePct,
        tick.totalVolume,
        tick.totalAmount,
        "KIS_H0STCNT0",
        tick.grade,
        tick.askPrice,
        tick.bidPrice,
        tick.executedVolume,
      );
      return;
    }

    if (trId === "HDFSCNT0") {
      const tick = KISOverseasParserV20.parseHDFSCNT0(
        dataBody,
        this.config.overseasRealtimeEntitled === true,
      );
      if (!tick) return;

      serverRealtimeMarketHubV20.updateQuote(
        tick.symbol,
        tick.symbol,
        "US",
        tick.lastPrice,
        0,
        tick.ratePct,
        tick.totalVolume,
        tick.totalAmount,
        "KIS_HDFSCNT0",
        tick.grade,
        tick.askPrice,
        tick.bidPrice,
        tick.executedVolume,
      );
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  public disconnect(): void {
    this.closedIntentionally = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.ws) this.ws.close();
    this.ws = null;
    this.isConnected = false;
  }
}
