export type MarketDataStatus =
  | "VERIFIED"
  | "SUSPICIOUS"
  | "INVALID"
  | "STALE"
  | "FROZEN";

export interface MarketTick {
  symbol: string;

  price: number;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;

  bid?: number;
  ask?: number;

  volume?: number;
  cumulativeVolume?: number;

  timestamp: number; // epoch milliseconds

  source?: string;
  sequence?: number;
}

export interface FakeDataDetectorConfig {
  maxAgeMs: number;
  futureToleranceMs: number;

  maxSingleTickChangePercent: number;
  maxBidAskSpreadPercent: number;

  frozenTickLimit: number;

  minimumPrice: number;
  maximumPrice: number;

  minimumTrustScore: number;

  requireSource: boolean;
}

export interface DetectionReason {
  code: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  penalty: number;
}

export interface MarketDataDetectionResult {
  symbol: string;

  status: MarketDataStatus;

  trusted: boolean;
  liveTradingAllowed: boolean;

  trustScore: number;

  reasons: DetectionReason[];

  checkedAt: number;
}

interface SymbolState {
  previousTick?: MarketTick;

  samePriceCount: number;

  lastSequence?: number;
  lastCumulativeVolume?: number;
}

const DEFAULT_CONFIG: FakeDataDetectorConfig = {
  maxAgeMs: 5_000,
  futureToleranceMs: 2_000,

  maxSingleTickChangePercent: 20,
  maxBidAskSpreadPercent: 10,

  frozenTickLimit: 20,

  minimumPrice: 1,
  maximumPrice: 100_000_000,

  minimumTrustScore: 80,

  requireSource: true,
};

export class FakeDataDetector {
  private readonly config: FakeDataDetectorConfig;

  private readonly states = new Map<string, SymbolState>();

  constructor(config?: Partial<FakeDataDetectorConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  inspect(
    tick: MarketTick,
    now: number = Date.now(),
  ): MarketDataDetectionResult {
    const reasons: DetectionReason[] = [];

    const symbol = String(tick.symbol ?? "").trim().toUpperCase();

    const state =
      this.states.get(symbol) ??
      ({
        samePriceCount: 0,
      } satisfies SymbolState);

    // ---------------------------------------------------------
    // 1. 기본 필드 검사
    // ---------------------------------------------------------

    if (!symbol) {
      this.addReason(
        reasons,
        "EMPTY_SYMBOL",
        "CRITICAL",
        "종목코드가 없습니다.",
        100,
      );
    }

    if (!Number.isFinite(tick.price)) {
      this.addReason(
        reasons,
        "INVALID_PRICE",
        "CRITICAL",
        "현재가가 숫자가 아닙니다.",
        100,
      );
    }

    if (
      Number.isFinite(tick.price) &&
      (tick.price < this.config.minimumPrice ||
        tick.price > this.config.maximumPrice)
    ) {
      this.addReason(
        reasons,
        "PRICE_OUT_OF_RANGE",
        "CRITICAL",
        `허용 범위를 벗어난 가격입니다: ${tick.price}`,
        100,
      );
    }

    if (!Number.isFinite(tick.timestamp)) {
      this.addReason(
        reasons,
        "INVALID_TIMESTAMP",
        "CRITICAL",
        "시세 timestamp가 올바르지 않습니다.",
        100,
      );
    }

    // ---------------------------------------------------------
    // 2. 지연 데이터 검사
    // ---------------------------------------------------------

    if (Number.isFinite(tick.timestamp)) {
      const age = now - tick.timestamp;

      if (age > this.config.maxAgeMs) {
        this.addReason(
          reasons,
          "STALE_DATA",
          "HIGH",
          `실시간 데이터가 ${age}ms 지연되었습니다.`,
          50,
        );
      }

      if (tick.timestamp > now + this.config.futureToleranceMs) {
        this.addReason(
          reasons,
          "FUTURE_TIMESTAMP",
          "CRITICAL",
          "현재 시간보다 미래 timestamp가 수신되었습니다.",
          100,
        );
      }
    }

    // ---------------------------------------------------------
    // 3. 출처 검사
    // ---------------------------------------------------------

    if (this.config.requireSource && !tick.source?.trim()) {
      this.addReason(
        reasons,
        "UNKNOWN_SOURCE",
        "HIGH",
        "시세 데이터 출처를 확인할 수 없습니다.",
        35,
      );
    }

    // ---------------------------------------------------------
    // 4. OHLC 논리 검사
    // ---------------------------------------------------------

    this.validateOHLC(tick, reasons);

    // ---------------------------------------------------------
    // 5. BID / ASK 검사
    // ---------------------------------------------------------

    if (
      tick.bid !== undefined &&
      tick.ask !== undefined &&
      Number.isFinite(tick.bid) &&
      Number.isFinite(tick.ask)
    ) {
      if (tick.bid < 0 || tick.ask < 0) {
        this.addReason(
          reasons,
          "NEGATIVE_ORDERBOOK",
          "CRITICAL",
          "호가 가격이 음수입니다.",
          100,
        );
      }

      if (tick.bid > tick.ask) {
        this.addReason(
          reasons,
          "CROSSED_ORDERBOOK",
          "HIGH",
          `매수호가(${tick.bid})가 매도호가(${tick.ask})보다 높습니다.`,
          45,
        );
      }

      const mid = (tick.bid + tick.ask) / 2;

      if (mid > 0) {
        const spreadPercent =
          ((tick.ask - tick.bid) / mid) * 100;

        if (
          spreadPercent >
          this.config.maxBidAskSpreadPercent
        ) {
          this.addReason(
            reasons,
            "ABNORMAL_SPREAD",
            "MEDIUM",
            `비정상적으로 큰 호가 스프레드: ${spreadPercent.toFixed(
              2,
            )}%`,
            20,
          );
        }
      }
    }

    // ---------------------------------------------------------
    // 6. 거래량 검사
    // ---------------------------------------------------------

    if (
      tick.volume !== undefined &&
      (!Number.isFinite(tick.volume) || tick.volume < 0)
    ) {
      this.addReason(
        reasons,
        "INVALID_VOLUME",
        "HIGH",
        "거래량 값이 올바르지 않습니다.",
        40,
      );
    }

    if (
      tick.cumulativeVolume !== undefined &&
      (!Number.isFinite(tick.cumulativeVolume) ||
        tick.cumulativeVolume < 0)
    ) {
      this.addReason(
        reasons,
        "INVALID_CUMULATIVE_VOLUME",
        "HIGH",
        "누적 거래량 값이 올바르지 않습니다.",
        40,
      );
    }

    // ---------------------------------------------------------
    // 7. 이전 Tick과 비교
    // ---------------------------------------------------------

    if (state.previousTick) {
      this.compareWithPreviousTick(
        tick,
        state.previousTick,
        state,
        reasons,
      );
    }

    // ---------------------------------------------------------
    // 8. Sequence 검사
    // ---------------------------------------------------------

    if (
      tick.sequence !== undefined &&
      state.lastSequence !== undefined
    ) {
      if (tick.sequence <= state.lastSequence) {
        this.addReason(
          reasons,
          "SEQUENCE_REVERSED",
          "HIGH",
          `데이터 sequence 역전/중복 감지: ${state.lastSequence} → ${tick.sequence}`,
          40,
        );
      }
    }

    // ---------------------------------------------------------
    // 9. 결과 계산
    // ---------------------------------------------------------

    const totalPenalty = reasons.reduce(
      (sum, reason) => sum + reason.penalty,
      0,
    );

    const trustScore = Math.max(
      0,
      Math.min(100, 100 - totalPenalty),
    );

    const critical = reasons.some(
      (reason) => reason.severity === "CRITICAL",
    );

    const stale = reasons.some(
      (reason) => reason.code === "STALE_DATA",
    );

    const frozen = reasons.some(
      (reason) => reason.code === "FROZEN_FEED",
    );

    let status: MarketDataStatus;

    if (critical) {
      status = "INVALID";
    } else if (stale) {
      status = "STALE";
    } else if (frozen) {
      status = "FROZEN";
    } else if (trustScore < this.config.minimumTrustScore) {
      status = "SUSPICIOUS";
    } else {
      status = "VERIFIED";
    }

    const trusted =
      status === "VERIFIED" &&
      trustScore >= this.config.minimumTrustScore;

    /*
     * 중요:
     * VERIFIED 데이터만 LIVE 주문에 사용.
     */
    const liveTradingAllowed = trusted;

    // ---------------------------------------------------------
    // 10. 정상 데이터인 경우 상태 업데이트
    // ---------------------------------------------------------

    if (!critical) {
      state.previousTick = {
        ...tick,
        symbol,
      };

      if (tick.sequence !== undefined) {
        state.lastSequence = tick.sequence;
      }

      if (tick.cumulativeVolume !== undefined) {
        state.lastCumulativeVolume =
          tick.cumulativeVolume;
      }

      this.states.set(symbol, state);
    }

    return {
      symbol,
      status,
      trusted,
      liveTradingAllowed,
      trustScore,
      reasons,
      checkedAt: now,
    };
  }

  private validateOHLC(
    tick: MarketTick,
    reasons: DetectionReason[],
  ): void {
    const { open, high, low, price } = tick;

    if (
      high !== undefined &&
      low !== undefined &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      high < low
    ) {
      this.addReason(
        reasons,
        "HIGH_BELOW_LOW",
        "CRITICAL",
        `고가(${high})가 저가(${low})보다 낮습니다.`,
        100,
      );
    }

    if (
      high !== undefined &&
      Number.isFinite(high) &&
      Number.isFinite(price) &&
      price > high
    ) {
      this.addReason(
        reasons,
        "PRICE_ABOVE_HIGH",
        "HIGH",
        `현재가(${price})가 고가(${high})보다 높습니다.`,
        40,
      );
    }

    if (
      low !== undefined &&
      Number.isFinite(low) &&
      Number.isFinite(price) &&
      price < low
    ) {
      this.addReason(
        reasons,
        "PRICE_BELOW_LOW",
        "HIGH",
        `현재가(${price})가 저가(${low})보다 낮습니다.`,
        40,
      );
    }

    if (
      open !== undefined &&
      high !== undefined &&
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      open > high
    ) {
      this.addReason(
        reasons,
        "OPEN_ABOVE_HIGH",
        "HIGH",
        "시가가 고가보다 높습니다.",
        40,
      );
    }

    if (
      open !== undefined &&
      low !== undefined &&
      Number.isFinite(open) &&
      Number.isFinite(low) &&
      open < low
    ) {
      this.addReason(
        reasons,
        "OPEN_BELOW_LOW",
        "HIGH",
        "시가가 저가보다 낮습니다.",
        40,
      );
    }
  }

  private compareWithPreviousTick(
    current: MarketTick,
    previous: MarketTick,
    state: SymbolState,
    reasons: DetectionReason[],
  ): void {
    // timestamp 역전
    if (current.timestamp < previous.timestamp) {
      this.addReason(
        reasons,
        "TIMESTAMP_REVERSED",
        "HIGH",
        "이전 시세보다 오래된 데이터가 뒤늦게 수신되었습니다.",
        45,
      );
    }

    // 급격한 가격 변화
    if (
      previous.price > 0 &&
      Number.isFinite(previous.price) &&
      Number.isFinite(current.price)
    ) {
      const changePercent =
        (Math.abs(current.price - previous.price) /
          previous.price) *
        100;

      if (
        changePercent >
        this.config.maxSingleTickChangePercent
      ) {
        this.addReason(
          reasons,
          "ABNORMAL_PRICE_JUMP",
          "HIGH",
          `한 Tick 가격 변화가 ${changePercent.toFixed(
            2,
          )}%입니다.`,
          35,
        );
      }
    }

    // Feed 멈춤 감지
    if (
      current.price === previous.price &&
      current.cumulativeVolume ===
        previous.cumulativeVolume
    ) {
      state.samePriceCount += 1;
    } else {
      state.samePriceCount = 0;
    }

    if (
      state.samePriceCount >=
      this.config.frozenTickLimit
    ) {
      this.addReason(
        reasons,
        "FROZEN_FEED",
        "HIGH",
        "동일 가격/거래량 데이터가 반복되어 Feed 정지 가능성이 있습니다.",
        50,
      );
    }

    // 누적 거래량 감소
    if (
      current.cumulativeVolume !== undefined &&
      previous.cumulativeVolume !== undefined &&
      current.cumulativeVolume <
        previous.cumulativeVolume
    ) {
      this.addReason(
        reasons,
        "VOLUME_ROLLBACK",
        "HIGH",
        `누적 거래량이 감소했습니다: ${previous.cumulativeVolume} → ${current.cumulativeVolume}`,
        40,
      );
    }
  }

  private addReason(
    reasons: DetectionReason[],
    code: string,
    severity: DetectionReason["severity"],
    message: string,
    penalty: number,
  ): void {
    reasons.push({
      code,
      severity,
      message,
      penalty,
    });
  }

  reset(symbol?: string): void {
    if (symbol) {
      this.states.delete(symbol.toUpperCase());
      return;
    }

    this.states.clear();
  }
}

export const defaultFakeDataDetector = new FakeDataDetector({
  maxAgeMs: 5000,
  minimumTrustScore: 80,
  requireSource: false,
});

export function processRealtimeTick(tick: MarketTick, detector: FakeDataDetector = defaultFakeDataDetector) {
  const verification = detector.inspect(tick);

  if (!verification.liveTradingAllowed) {
    return {
      accepted: false,
      scannerAllowed: false,
      aiAnalysisAllowed: false,
      orderAllowed: false,
      reason: "MARKET_DATA_NOT_VERIFIED",
      verification,
    };
  }

  return {
    accepted: true,
    scannerAllowed: true,
    aiAnalysisAllowed: true,
    orderAllowed: true,
    verification,
  };
}

export interface TradingSignal {
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
}

export function validateBeforeOrder(
  signal: TradingSignal,
  tick: MarketTick,
  detector: FakeDataDetector = defaultFakeDataDetector
) {
  const check = detector.inspect(tick);

  if (check.status !== "VERIFIED") {
    throw new Error(
      `[ORDER BLOCKED] ${
        signal.symbol
      } 데이터 검증 실패: ${check.reasons
        .map((r) => r.code)
        .join(", ")}`,
    );
  }

  if (!check.liveTradingAllowed) {
    throw new Error(
      `[ORDER BLOCKED] ${signal.symbol} 데이터 신뢰도 ${check.trustScore}/100`,
    );
  }

  return {
    approved: true,
    trustScore: check.trustScore,
    verifiedAt: check.checkedAt,
  };
}

export function getDataVerificationBadge(result: MarketDataDetectionResult) {
  switch (result.status) {
    case "VERIFIED":
      return {
        label: `실시간 검증 완료 ${result.trustScore}`,
        level: "SAFE",
      };

    case "STALE":
      return {
        label: "지연 데이터",
        level: "BLOCK",
      };

    case "FROZEN":
      return {
        label: "시세 Feed 정지 의심",
        level: "BLOCK",
      };

    case "INVALID":
      return {
        label: "비정상 데이터",
        level: "BLOCK",
      };

    default:
      return {
        label: `의심 데이터 ${result.trustScore}`,
        level: "WARNING",
      };
  }
}
