// ----------------------------------------------------------------------
// SERVER KIS REALTIME CLIENT V20.4
// Upstream WebSocket client for KIS Domestic & Overseas Market Data + Fills
// ----------------------------------------------------------------------

import WebSocket from "ws";
import { KISExecutionNoticeParserV20 } from "./KISExecutionNoticeParserV20";
import { brokerExecutionTruthBusV20 } from "./BrokerExecutionTruthBusV20";
import { KISOverseasParserV20 } from "./KISOverseasParserV20";
import { KISDomesticParserV204 } from "./KISDomesticParserV204";
import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";
import { serverScannerRuntimeV204 } from "./ServerScannerRuntimeV204";

export interface KISRealtimeClientConfig {
  appKey: string;
  appSecret: string;
  approvalKey: string;
  htsId?: string;
  isPaper?: boolean;
  /** Explicit server-side entitlement flag for real-time KRX H0STCNT0. */
  domesticRealtimeEntitled?: boolean;
  /** Explicit server-side entitlement flag for real-time US HDFSCNT0. */
  overseasRealtimeEntitled?: boolean;
}

export class ServerKISRealtimeClientV20 {
  private ws: WebSocket | null = null;
  private config: KISRealtimeClientConfig;
  private isConnected = false;
  private subscribedSymbols: Set<string> = new Set();
  private secretKeyHex = "";
  private secretIvHex = "";

  constructor(config: KISRealtimeClientConfig) {
    this.config = config;
  }

  public connect(): void {
    if (this.ws) return;

    const domain = this.config.isPaper
      ? "ops.koreainvestment.com:31000"
      : "ops.koreainvestment.com:21000";

    const url = `ws://${domain}/tryitout/H0STCNT0`;

    try {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        this.isConnected = true;
        console.log("[ServerKISRealtimeClientV20] KIS WebSocket connected.");
        if (this.config.htsId) {
          this.subscribeExecutionNotice(this.config.htsId);
        }
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on("close", () => {
        this.isConnected = false;
        this.ws = null;
        console.log("[ServerKISRealtimeClientV20] KIS WebSocket closed.");
      });

      this.ws.on("error", (err) => {
        console.error("[ServerKISRealtimeClientV20] KIS WebSocket error:", err);
      });
    } catch (err) {
      console.error("[ServerKISRealtimeClientV20] Connection initialization failed:", err);
    }
  }

  public subscribeSymbol(
    symbol: string,
    trId: "H0STCNT0" | "HDFSCNT0" = "H0STCNT0",
  ): void {
    if (!this.ws || !this.isConnected) return;

    const req = {
      header: {
        approval_key: this.config.approvalKey,
        custtype: "P",
        tr_type: "1",
        "content-type": "utf-8",
      },
      body: {
        input: {
          tr_id: trId,
          tr_key: symbol,
        },
      },
    };

    this.ws.send(JSON.stringify(req));
    this.subscribedSymbols.add(`${trId}:${symbol}`);
  }

  public subscribeExecutionNotice(htsId: string): void {
    if (!this.ws || !this.isConnected || !htsId) return;

    const req = {
      header: {
        approval_key: this.config.approvalKey,
        custtype: "P",
        tr_type: "1",
        "content-type": "utf-8",
      },
      body: {
        input: {
          tr_id: "H0STCNI0",
          tr_key: htsId,
        },
      },
    };

    this.ws.send(JSON.stringify(req));
    console.log(
      `[ServerKISRealtimeClientV20] Subscribed to execution notice H0STCNI0 for HTS ID: ${htsId}`,
    );
  }

  private handleMessage(msg: string): void {
    if (!msg) return;

    if (msg.startsWith("{")) {
      try {
        const parsed = JSON.parse(msg);
        if (
          parsed.header &&
          (parsed.header.tr_id === "H0STCNI0" || parsed.header.tr_id === "H0GSCNI0") &&
          parsed.body &&
          parsed.body.output
        ) {
          if (parsed.body.output.key && parsed.body.output.iv) {
            this.secretKeyHex = parsed.body.output.key;
            this.secretIvHex = parsed.body.output.iv;
            console.log(
              "[ServerKISRealtimeClientV20] AES Key/IV received for execution notice.",
            );
          }
        }
      } catch {
        // Ignore malformed JSON handshake frames.
      }
      return;
    }

    const parts = msg.split("|");
    if (parts.length < 4) return;

    const trId = parts[1];
    const dataCount = Math.max(1, Number.parseInt(parts[2] || "1", 10) || 1);
    const dataBody = parts[3];

    if (trId === "H0STCNI0" || trId === "H0GSCNI0") {
      let payload = dataBody;
      if (this.secretKeyHex && this.secretIvHex) {
        payload = KISExecutionNoticeParserV20.decryptPayload(
          dataBody,
          this.secretKeyHex,
          this.secretIvHex,
        );
      }
      const notice = KISExecutionNoticeParserV20.parse(trId, payload);
      if (notice && notice.isExecuted) {
        brokerExecutionTruthBusV20.publish(notice);
      }
      return;
    }

    if (trId === "H0STCNT0") {
      const ticks = KISDomesticParserV204.parseH0STCNT0(
        dataBody,
        dataCount,
        this.config.domesticRealtimeEntitled === true && this.config.isPaper !== true,
      );

      for (const tick of ticks) {
        if (tick.tradingHalted) continue;
        const verified = tick.grade === "EXECUTION_GRADE";

        serverRealtimeMarketHubV20.updateQuote(
          tick.symbol,
          tick.symbol,
          "KOREA",
          tick.lastPrice,
          tick.changeAmount,
          tick.ratePct,
          tick.totalVolume,
          tick.totalAmount,
          "KIS:H0STCNT0",
          tick.grade,
          tick.askPrice,
          tick.bidPrice,
          tick.executedVolume,
          tick.timestamp,
        );

        serverScannerRuntimeV204.ingestTick({
          symbol: tick.symbol,
          market: "KR",
          timestamp: tick.timestamp,
          price: tick.lastPrice,
          volume: tick.executedVolume,
          cumulativeVolume: tick.totalVolume,
          sourceVerified: verified,
          source: "KIS:H0STCNT0",
        });
      }
      return;
    }

    if (trId === "HDFSCNT0") {
      const parsedOverseas = KISOverseasParserV20.parseHDFSCNT0(
        dataBody,
        this.config.overseasRealtimeEntitled === true && this.config.isPaper !== true,
      );
      if (!parsedOverseas) return;

      const verified = parsedOverseas.grade === "EXECUTION_GRADE";
      serverRealtimeMarketHubV20.updateQuote(
        parsedOverseas.symbol,
        parsedOverseas.symbol,
        "US",
        parsedOverseas.lastPrice,
        0,
        parsedOverseas.ratePct,
        parsedOverseas.totalVolume,
        parsedOverseas.totalAmount,
        "KIS:HDFSCNT0",
        parsedOverseas.grade,
        parsedOverseas.askPrice,
        parsedOverseas.bidPrice,
        parsedOverseas.executedVolume,
        parsedOverseas.timestamp,
      );

      serverScannerRuntimeV204.ingestTick({
        symbol: parsedOverseas.symbol,
        market: "US",
        timestamp: parsedOverseas.timestamp,
        price: parsedOverseas.lastPrice,
        volume: parsedOverseas.executedVolume,
        cumulativeVolume: parsedOverseas.totalVolume,
        sourceVerified: verified,
        source: "KIS:HDFSCNT0",
      });
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
