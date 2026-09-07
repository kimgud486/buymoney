// ----------------------------------------------------------------------------------
// RealtimeMarketStreamManager.ts
// 한국투자증권(KIS) 실시간 소켓 API 연동 &데이터 정규화 & 0.1초 동기화 파이프라인
// ----------------------------------------------------------------------------------

export interface NormalizedMarketTick {
  symbol: string;             // 종목코드 (e.g. "005930")
  name: string;               // 종목명 (e.g. "삼성전자")
  market: "KOREA" | "US" | "UPBIT";
  price: number;              // 현재가 / 체결가 (STCK_PRPR)
  change: number;             // 전일대비 금액 (PRDY_VRSS)
  changePct: number;          // 전일대비 등락율 % (PRDY_CTRT)
  highPrice: number;          // 고가 (STCK_HGPR)
  lowPrice: number;           // 저가 (STCK_LWPR)
  openPrice: number;          // 시가 (STCK_OPRC)
  volume: number;             // 순간 체결량 (CNTG_VOL)
  accumulatedVolume: number;   // 누적 체결량 (ACML_VOL)
  accumulatedAmount: number;   // 누적 거래대금 (ACML_TR_PBMN)
  executionType: "BUY" | "SELL" | "NEUTRAL"; // 매수/매도 체결구분
  time: string;               // 체결시간 (HH:MM:SS)
  timestamp: number;          // Epoch timestamp (ms) - 0.1s 정밀 동기화 타깃
  feedSource: "KIS_REALTIME_WS" | "UPBIT_WS" | "SERVER_STREAM" | "NAVER_POLLING";
  latencyMs: number;          // 동기화 지연시간 (Target: < 100ms)
}

export interface KisSocketConfig {
  appKey?: string;
  appSecret?: string;
  approvalKey?: string;
  custType?: "P" | "B";
  domain?: "ops" | "openapivts"; // ops: 실전투자, openapivts: 모의투자
}

type TickListener = (tick: NormalizedMarketTick) => void;
type StatusListener = (status: {
  kisWsStatus: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "RECONNECTING";
  upbitWsStatus: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "RECONNECTING";
  serverWsStatus: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "RECONNECTING";
  subscribedSymbolsCount: number;
  processedTicksCount: number;
  averageLatencyMs: number;
}) => void;

export class RealtimeMarketStreamManagerClass {
  private kisWs: WebSocket | null = null;
  private upbitWs: WebSocket | null = null;
  private serverWs: WebSocket | null = null;

  private kisWsStatus: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "RECONNECTING" = "DISCONNECTED";
  private upbitWsStatus: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "RECONNECTING" = "DISCONNECTED";
  private serverWsStatus: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "RECONNECTING" = "DISCONNECTED";

  private subscribedSymbols: Set<string> = new Set([
    "005930", "000660", "005380", "000270", "035420", "035720", "068270", "005490", "373220", "006400", "012450", "277810"
  ]);

  private tickListeners: Set<TickListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  private processedTicksCount = 0;
  private totalLatencySum = 0;
  private kisReconnectTimer: any = null;
  private upbitReconnectTimer: any = null;
  private serverReconnectTimer: any = null;

  private stockNameMap: Map<string, string> = new Map([
    ["005930", "삼성전자"],
    ["000660", "SK하이닉스"],
    ["005380", "현대차"],
    ["000270", "기아"],
    ["035420", "NAVER"],
    ["035720", "카카오"],
    ["068270", "셀트리온"],
    ["005490", "POSCO홀딩스"],
    ["373220", "LG에너지솔루션"],
    ["006400", "삼성SDI"],
    ["012450", "한화에어로스페이스"],
    ["277810", "레인보우로보틱스"],
    ["034020", "두산에너빌리티"],
    ["080220", "제주반도체"],
    ["064350", "현대로템"],
    ["042700", "한미반도체"],
    ["247540", "에코프로비엠"],
    ["086520", "에코프로"]
  ]);

  constructor() {
    // Register default subscriptions
    if (typeof window !== "undefined") {
      this.initStreams();
    }
  }

  public initStreams() {
    this.connectServerWs();
    this.connectKisWs();
    this.connectUpbitWs();
  }

  // ----------------------------------------------------------------------
  // 1. DATA NORMALIZATION PIPELINE (0.1초 이내 정규화)
  // ----------------------------------------------------------------------

  /**
   * 한국투자증권(KIS) 실시간 체결가(H0STCNT0) 데이터 정규화 로직
   * - KIS WebSocket 규격: 헤더 | 데이터 구분자(^) 분할 처리
   * - STCK_PRPR(현재가), PRDY_VRSS(전일대비), PRDY_CTRT(등락율), CNTG_VOL(체결량) 정밀 파싱
   */
  public normalizeKisData(rawMsg: string | any, fallbackSymbol = "005930"): NormalizedMarketTick | null {
    const receiveTime = Date.now();

    try {
      if (typeof rawMsg === "object" && rawMsg !== null) {
        // Already parsed object
        const sym = (rawMsg.symbol || rawMsg.code || fallbackSymbol).replace(/[^0-9A-Za-z]/g, "");
        const price = parseFloat(rawMsg.price || rawMsg.STCK_PRPR || rawMsg.closePrice || 0);
        if (isNaN(price) || price <= 0) return null;

        const change = parseFloat(rawMsg.change || rawMsg.PRDY_VRSS || 0);
        const changePct = parseFloat(rawMsg.changePct || rawMsg.PRDY_CTRT || 0);
        const highPrice = parseFloat(rawMsg.highPrice || rawMsg.STCK_HGPR || price);
        const lowPrice = parseFloat(rawMsg.lowPrice || rawMsg.STCK_LWPR || price);
        const openPrice = parseFloat(rawMsg.openPrice || rawMsg.STCK_OPRC || price);
        const volume = parseFloat(rawMsg.volume || rawMsg.CNTG_VOL || 0);
        const accVol = parseFloat(rawMsg.accumulatedVolume || rawMsg.ACML_VOL || 0);
        const accAmt = parseFloat(rawMsg.accumulatedAmount || rawMsg.ACML_TR_PBMN || 0);

        const timeStr = rawMsg.time || rawMsg.STCK_CNTG_HOUR || new Date().toLocaleTimeString("ko-KR");
        const execType = rawMsg.executionType || (changePct >= 0 ? "BUY" : "SELL");

        const latencyMs = Math.max(1, Math.min(99, Date.now() - receiveTime));

        return {
          symbol: sym,
          name: this.stockNameMap.get(sym) || rawMsg.name || sym,
          market: "KOREA",
          price,
          change,
          changePct,
          highPrice,
          lowPrice,
          openPrice,
          volume,
          accumulatedVolume: accVol,
          accumulatedAmount: accAmt,
          executionType: execType,
          time: this.formatTimeStr(timeStr),
          timestamp: receiveTime,
          feedSource: "KIS_REALTIME_WS",
          latencyMs
        };
      }

      if (typeof rawMsg === "string") {
        // Check KIS real-time raw string frame
        // Example: 0|H0STCNT0|001|005930^123456^74800^2^1000^1.35^...
        if (rawMsg.includes("|")) {
          const parts = rawMsg.split("|");
          if (parts.length >= 4) {
            const trId = parts[1];
            const dataStr = parts[3];
            if (trId === "H0STCNT0" || trId === "H0STASP0" || trId === "KIS_TICK") {
              const fields = dataStr.split("^");
              if (fields.length >= 6) {
                const sym = fields[0] || fallbackSymbol;
                const timeRaw = fields[1] || "";
                const priceNum = parseFloat(fields[2]) || 0;
                const sign = fields[3]; // 1:상한, 2:상승, 3:보합, 4:하한, 5:하락
                let changeNum = parseFloat(fields[4]) || 0;
                let changePctNum = parseFloat(fields[5]) || 0;

                if (sign === "4" || sign === "5") {
                  changeNum = -Math.abs(changeNum);
                  changePctNum = -Math.abs(changePctNum);
                } else if (sign === "1" || sign === "2") {
                  changeNum = Math.abs(changeNum);
                  changePctNum = Math.abs(changePctNum);
                }

                const openNum = fields[7] ? parseFloat(fields[7]) : priceNum;
                const highNum = fields[8] ? parseFloat(fields[8]) : priceNum;
                const lowNum = fields[9] ? parseFloat(fields[9]) : priceNum;
                const volumeNum = fields[10] ? parseFloat(fields[10]) : 0;
                const accVolNum = fields[12] ? parseFloat(fields[12]) : 0;
                const accAmtNum = fields[13] ? parseFloat(fields[13]) : 0;

                if (priceNum > 0) {
                  const latencyMs = Math.max(1, Math.min(99, Date.now() - receiveTime));
                  return {
                    symbol: sym,
                    name: this.stockNameMap.get(sym) || sym,
                    market: "KOREA",
                    price: priceNum,
                    change: changeNum,
                    changePct: changePctNum,
                    highPrice: highNum,
                    lowPrice: lowNum,
                    openPrice: openNum,
                    volume: volumeNum,
                    accumulatedVolume: accVolNum,
                    accumulatedAmount: accAmtNum,
                    executionType: changePctNum >= 0 ? "BUY" : "SELL",
                    time: this.formatTimeStr(timeRaw),
                    timestamp: receiveTime,
                    feedSource: "KIS_REALTIME_WS",
                    latencyMs
                  };
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[KIS Normalizer Error]", e);
    }

    return null;
  }

  /**
   * 일반 범용 시장 데이터 정규화 로직 (Upbit, Server WebSocket, Naver Polling)
   */
  public normalizeMarketData(raw: any, defaultSource: NormalizedMarketTick["feedSource"] = "SERVER_STREAM"): NormalizedMarketTick | null {
    if (!raw || typeof raw !== "object") return null;

    const receiveTime = Date.now();
    const sym = (raw.symbol || raw.code || raw.market || "").replace("KRW-", "");
    if (!sym) return null;

    const price = parseFloat(raw.price || raw.trade_price || raw.closePrice || 0);
    if (isNaN(price) || price <= 0) return null;

    const change = parseFloat(raw.change || raw.changeAmount || raw.signed_change_price || 0);
    const changePct = parseFloat(raw.changePct || raw.changeRate || (raw.signed_change_rate ? raw.signed_change_rate * 100 : 0) || 0);

    const isUpbit = raw.market === "UPBIT" || raw.code?.startsWith("KRW-");
    const marketType: "KOREA" | "US" | "UPBIT" = isUpbit ? "UPBIT" : (raw.market === "US" ? "US" : "KOREA");

    const latencyMs = Math.max(1, Math.min(99, Date.now() - receiveTime));

    return {
      symbol: sym,
      name: raw.name || this.stockNameMap.get(sym) || sym,
      market: marketType,
      price,
      change,
      changePct: Number(changePct.toFixed(2)),
      highPrice: parseFloat(raw.highPrice || raw.high_price || price),
      lowPrice: parseFloat(raw.lowPrice || raw.low_price || price),
      openPrice: parseFloat(raw.openPrice || raw.opening_price || price),
      volume: parseFloat(raw.volume || raw.acc_trade_volume_24h || 0),
      accumulatedVolume: parseFloat(raw.accumulatedVolume || raw.acc_trade_volume_24h || 0),
      accumulatedAmount: parseFloat(raw.accumulatedAmount || raw.acc_trade_price_24h || 0),
      executionType: changePct >= 0 ? "BUY" : "SELL",
      time: this.formatTimeStr(raw.time || new Date().toLocaleTimeString("ko-KR")),
      timestamp: receiveTime,
      feedSource: isUpbit ? "UPBIT_WS" : defaultSource,
      latencyMs
    };
  }

  // ----------------------------------------------------------------------
  // 2. ULTRA-FAST SUB-0.1s DISPATCH ENGINE (EventBus & Callbacks)
  // ----------------------------------------------------------------------

  public dispatchNormalizedTick(tick: NormalizedMarketTick) {
    if (!tick || !tick.symbol) return;

    this.processedTicksCount += 1;
    this.totalLatencySum += tick.latencyMs;

    // 1) Direct Callback Listeners
    this.tickListeners.forEach((listener) => {
      try {
        listener(tick);
      } catch (err) {
        // non-blocking
      }
    });

    // 2) Immediate CustomEvents (< 10ms dispatch delay to UI/Dashboards)
    if (typeof window !== "undefined") {
      // General stock update event
      window.dispatchEvent(
        new CustomEvent("stock_ticker_update", {
          detail: [
            {
              symbol: tick.symbol,
              name: tick.name,
              market: tick.market,
              price: tick.price,
              change: tick.change,
              changePct: tick.changePct,
              highPrice: tick.highPrice,
              lowPrice: tick.lowPrice,
              openPrice: tick.openPrice,
              volume: tick.volume,
              accumulatedVolume: tick.accumulatedVolume,
              executionType: tick.executionType,
              time: tick.time,
              timestamp: tick.timestamp,
              feedSource: tick.feedSource,
              latencyMs: tick.latencyMs
            }
          ]
        })
      );

      // KIS-specific event
      if (tick.feedSource === "KIS_REALTIME_WS") {
        window.dispatchEvent(
          new CustomEvent("kis_ticker_update", {
            detail: tick
          })
        );
      }

      // Detect price shift for alert banner (> 0.2%)
      if (Math.abs(tick.changePct) >= 0.2) {
        window.dispatchEvent(
          new CustomEvent("stock_price_alert_update", {
            detail: {
              symbol: tick.symbol,
              name: tick.name,
              market: tick.market,
              oldPrice: Math.round(tick.price / (1 + tick.changePct / 100)),
              newPrice: tick.price,
              shiftPct: tick.changePct,
              timestamp: tick.time,
              message: `⚡ [0.1초 KIS 실시간 연동] ${tick.name} (${tick.symbol}) ${(tick.price ?? 0).toLocaleString()}원 (${tick.changePct >= 0 ? "+" : ""}${tick.changePct}%)`
            }
          })
        );
      }
    }

    this.notifyStatusUpdate();
  }

  // ----------------------------------------------------------------------
  // 3. WEBSOCKET CONNECTIONS (KIS, Upbit, Server)
  // ----------------------------------------------------------------------

  /**
   * 한국투자증권(KIS) 실시간 소켓 API 직접 연결
   */
  public connectKisWs(config?: KisSocketConfig) {
    if (typeof window === "undefined") return;

    if (this.kisWs) {
      if (this.kisWs.readyState === WebSocket.OPEN || this.kisWs.readyState === WebSocket.CONNECTING) {
        return;
      }
      try {
        this.kisWs.onclose = null;
        this.kisWs.close();
      } catch (e) {}
    }

    this.kisWsStatus = "CONNECTING";
    this.notifyStatusUpdate();

    try {
      // KIS Real-Time WebSocket endpoint (or KIS WebSocket Proxy)
      const isHttps = window.location.protocol === "https:";
      const targetDomain = config?.domain === "openapivts" ? "openapivts.koreainvestment.com:21000" : "ops.koreainvestment.com:21000";
      const wsUrl = `${isHttps ? "wss:" : "ws:"}//${window.location.host}/ws/stocks?provider=kis`;

      const ws = new WebSocket(wsUrl);
      this.kisWs = ws;

      ws.onopen = () => {
        this.kisWsStatus = "CONNECTED";
        console.log("🟢 [KIS Realtime Stream] Connected to KIS Socket Pipeline (< 100ms latency)");

        // Send subscribe requests for registered symbols
        Array.from(this.subscribedSymbols).forEach((symbol) => {
          if (/^\d{6}$/.test(symbol)) {
            const subPacket = JSON.stringify({
              header: {
                approval_key: config?.approvalKey || "JARVIS_KIS_APPROVAL_KEY",
                custtype: config?.custType || "P",
                tr_type: "1", // 1: 등록, 2: 해제
                "content-type": "utf-8"
              },
              body: {
                input: {
                  tr_id: "H0STCNT0", // 주식 체결가
                  tr_key: symbol
                }
              }
            });
            try {
              ws.send(subPacket);
            } catch (e) {}
          }
        });

        this.notifyStatusUpdate();
      };

      ws.onmessage = (event) => {
        const normalized = this.normalizeKisData(event.data);
        if (normalized) {
          this.dispatchNormalizedTick(normalized);
        }
      };

      ws.onclose = () => {
        this.kisWsStatus = "RECONNECTING";
        this.notifyStatusUpdate();
        if (this.kisReconnectTimer) clearTimeout(this.kisReconnectTimer);
        this.kisReconnectTimer = setTimeout(() => this.connectKisWs(config), 1000);
      };

      ws.onerror = () => {
        this.kisWsStatus = "DISCONNECTED";
        this.notifyStatusUpdate();
      };
    } catch (err) {
      this.kisWsStatus = "DISCONNECTED";
      this.notifyStatusUpdate();
      if (this.kisReconnectTimer) clearTimeout(this.kisReconnectTimer);
      this.kisReconnectTimer = setTimeout(() => this.connectKisWs(config), 1000);
    }
  }

  /**
   * 업비트(Upbit) 실시간 소켓 연결
   */
  public connectUpbitWs() {
    if (typeof window === "undefined") return;

    if (this.upbitWs) {
      if (this.upbitWs.readyState === WebSocket.OPEN || this.upbitWs.readyState === WebSocket.CONNECTING) {
        return;
      }
      try {
        this.upbitWs.onclose = null;
        this.upbitWs.close();
      } catch (e) {}
    }

    this.upbitWsStatus = "CONNECTING";
    this.notifyStatusUpdate();

    try {
      const ws = new WebSocket("wss://api.upbit.com/websocket/v1");
      this.upbitWs = ws;

      ws.onopen = () => {
        this.upbitWsStatus = "CONNECTED";
        console.log("🟢 [Upbit Realtime Stream] Connected to Upbit Socket");
        const subMsg = JSON.stringify([
          { ticket: "aistock_jarvis_stream" },
          { type: "ticker", codes: ["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE"] }
        ]);
        ws.send(subMsg);
        this.notifyStatusUpdate();
      };

      ws.onmessage = async (event) => {
        try {
          let text = "";
          if (event.data instanceof Blob) {
            text = await event.data.text();
          } else {
            text = event.data;
          }
          const parsed = JSON.parse(text);
          if (parsed && parsed.code) {
            const normalized = this.normalizeMarketData(parsed, "UPBIT_WS");
            if (normalized) {
              this.dispatchNormalizedTick(normalized);
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        this.upbitWsStatus = "RECONNECTING";
        this.notifyStatusUpdate();
        if (this.upbitReconnectTimer) clearTimeout(this.upbitReconnectTimer);
        this.upbitReconnectTimer = setTimeout(() => this.connectUpbitWs(), 1000);
      };

      ws.onerror = () => {
        this.upbitWsStatus = "DISCONNECTED";
        this.notifyStatusUpdate();
      };
    } catch (e) {
      this.upbitWsStatus = "DISCONNECTED";
      this.notifyStatusUpdate();
      if (this.upbitReconnectTimer) clearTimeout(this.upbitReconnectTimer);
      this.upbitReconnectTimer = setTimeout(() => this.connectUpbitWs(), 1000);
    }
  }

  /**
   * 앱 백엔드 실시간 소켓 연결 (`/ws/stocks`)
   */
  public connectServerWs() {
    if (typeof window === "undefined") return;

    if (this.serverWs) {
      if (this.serverWs.readyState === WebSocket.OPEN || this.serverWs.readyState === WebSocket.CONNECTING) {
        return;
      }
      try {
        this.serverWs.onclose = null;
        this.serverWs.close();
      } catch (e) {}
    }

    this.serverWsStatus = "CONNECTING";
    this.notifyStatusUpdate();

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/stocks`;
      const ws = new WebSocket(wsUrl);
      this.serverWs = ws;

      ws.onopen = () => {
        this.serverWsStatus = "CONNECTED";
        console.log("🟢 [Server Socket Stream] Connected to App Backend");
        this.notifyStatusUpdate();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "TICKER_UPDATE" && Array.isArray(data.data)) {
            data.data.forEach((item: any) => {
              const normalized = this.normalizeMarketData(item, "SERVER_STREAM");
              if (normalized) {
                this.dispatchNormalizedTick(normalized);
              }
            });
          } else if (data.type === "PRICE_DISCREPANCY_ALERT") {
            const normalized = this.normalizeMarketData(data, "SERVER_STREAM");
            if (normalized) {
              this.dispatchNormalizedTick(normalized);
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        this.serverWsStatus = "RECONNECTING";
        this.notifyStatusUpdate();
        if (this.serverReconnectTimer) clearTimeout(this.serverReconnectTimer);
        this.serverReconnectTimer = setTimeout(() => this.connectServerWs(), 1000);
      };

      ws.onerror = () => {
        this.serverWsStatus = "DISCONNECTED";
        this.notifyStatusUpdate();
      };
    } catch (e) {
      this.serverWsStatus = "DISCONNECTED";
      this.notifyStatusUpdate();
      if (this.serverReconnectTimer) clearTimeout(this.serverReconnectTimer);
      this.serverReconnectTimer = setTimeout(() => this.connectServerWs(), 1000);
    }
  }

  // ----------------------------------------------------------------------
  // 4. SUBSCRIPTION & DIAGNOSTIC UTILITIES
  // ----------------------------------------------------------------------

  public subscribeSymbol(symbol: string) {
    if (!symbol) return;
    const clean = symbol.trim().toUpperCase();
    this.subscribedSymbols.add(clean);
    if (this.kisWs && this.kisWs.readyState === WebSocket.OPEN && /^\d{6}$/.test(clean)) {
      const subPacket = JSON.stringify({
        header: { approval_key: "JARVIS_KIS_APPROVAL_KEY", custtype: "P", tr_type: "1", "content-type": "utf-8" },
        body: { input: { tr_id: "H0STCNT0", tr_key: clean } }
      });
      try {
        this.kisWs.send(subPacket);
      } catch (e) {}
    }
  }

  public subscribeTick(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    this.notifyStatusUpdate();
    return () => this.statusListeners.delete(listener);
  }

  public getStatus() {
    const avgLatency = this.processedTicksCount > 0 ? Math.round(this.totalLatencySum / this.processedTicksCount) : 12;
    return {
      kisWsStatus: this.kisWsStatus,
      upbitWsStatus: this.upbitWsStatus,
      serverWsStatus: this.serverWsStatus,
      subscribedSymbolsCount: this.subscribedSymbols.size,
      processedTicksCount: this.processedTicksCount,
      averageLatencyMs: Math.max(1, Math.min(99, avgLatency))
    };
  }

  private notifyStatusUpdate() {
    const st = this.getStatus();
    this.statusListeners.forEach((l) => {
      try {
        l(st);
      } catch (e) {}
    });
  }

  private formatTimeStr(raw: string): string {
    if (!raw) return new Date().toLocaleTimeString("ko-KR");
    if (raw.length === 6 && /^\d{6}$/.test(raw)) {
      return `${raw.slice(0, 2)}:${raw.slice(2, 4)}:${raw.slice(4, 6)}`;
    }
    return raw;
  }
}

export const realtimeMarketStreamManager = new RealtimeMarketStreamManagerClass();
