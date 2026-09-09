from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple

try:
    import numpy as np
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

try:
    import talib
    HAS_TALIB = True
except ImportError:
    HAS_TALIB = False


# ============================================================
# CONFIG
# ============================================================

@dataclass
class YesScannerConfig:
    # 최종 YES 최소점수
    min_yes_score: float = 82.0

    # 거래량
    min_rvol: float = 1.50
    strong_rvol: float = 2.00

    # 추세
    min_adx: float = 20.0

    # RSI
    min_rsi: float = 52.0
    max_rsi: float = 74.0

    # 체결강도
    min_cttr: float = 105.0
    strong_cttr: float = 120.0

    # Risk / Reward
    min_rr: float = 2.0

    # 추격매수 차단
    max_vwap_extension_pct: float = 4.5
    max_ema20_extension_pct: float = 7.0

    # 실제 실시간 체결 데이터 없이는 YES 금지
    require_live_orderflow: bool = True


# ============================================================
# LIVE DATA
# ============================================================

@dataclass
class LiveData:
    # 체결강도
    cttr: Optional[float] = None

    # 매수/매도 체결량
    buy_volume: Optional[float] = None
    sell_volume: Optional[float] = None

    # 호가 잔량
    total_bid_qty: Optional[float] = None
    total_ask_qty: Optional[float] = None

    # 실시간 거래대금
    turnover: Optional[float] = None


# ============================================================
# RESULT
# ============================================================

@dataclass
class BuyCandidate:
    symbol: str
    name: str

    score: float

    verdict: str = "YES"

    pattern: str = "NONE"

    price: float = 0.0

    entry_low: float = 0.0
    entry_high: float = 0.0

    stop: float = 0.0

    target1: float = 0.0
    target2: float = 0.0

    reward_risk: float = 0.0

    rsi: float = 0.0
    adx: float = 0.0
    rvol: float = 0.0

    cttr: Optional[float] = None

    reasons: List[str] = field(default_factory=list)

    thesis: str = ""

    invalidation: str = ""


@dataclass
class RejectedCandidate:
    symbol: str
    reasons: List[str]


# ============================================================
# PATTERN ENGINE
# ============================================================

BULLISH_PATTERNS = {
    "BULLISH_ENGULFING": 12,
    "HAMMER": 8,
    "MORNING_STAR": 12,
    "THREE_WHITE_SOLDIERS": 14,
    "PIERCING": 9,
}

BEARISH_PATTERNS = {
    "SHOOTING_STAR",
    "EVENING_STAR",
    "THREE_BLACK_CROWS",
    "DARK_CLOUD",
}


def detect_candle_pattern(df_or_records: Any) -> Tuple[str, str]:
    """
    Detects candle patterns using TA-Lib or pure Python fallback logic.
    Returns (pattern_name, pattern_side: 'BULLISH' | 'BEARISH' | 'NONE')
    """
    if HAS_TALIB and HAS_PANDAS and isinstance(df_or_records, pd.DataFrame):
        o = df_or_records["open"].astype(float).values
        h = df_or_records["high"].astype(float).values
        l = df_or_records["low"].astype(float).values
        c = df_or_records["close"].astype(float).values

        raw_patterns = {
            "BULLISH_ENGULFING": talib.CDLENGULFING(o, h, l, c),
            "HAMMER": talib.CDLHAMMER(o, h, l, c),
            "MORNING_STAR": talib.CDLMORNINGSTAR(o, h, l, c),
            "THREE_WHITE_SOLDIERS": talib.CDL3WHITESOLDIERS(o, h, l, c),
            "PIERCING": talib.CDLPIERCING(o, h, l, c),
            "SHOOTING_STAR": talib.CDLSHOOTINGSTAR(o, h, l, c),
            "EVENING_STAR": talib.CDLEVENINGSTAR(o, h, l, c),
            "THREE_BLACK_CROWS": talib.CDL3BLACKCROWS(o, h, l, c),
            "DARK_CLOUD": talib.CDLDARKCLOUDCOVER(o, h, l, c),
        }

        bullish = []
        bearish = []

        for name, values in raw_patterns.items():
            value = int(values[-1])
            if value > 0:
                bullish.append(name)
            elif value < 0:
                bearish.append(name)

        for pattern in bearish:
            if pattern in BEARISH_PATTERNS:
                return pattern, "BEARISH"

        if bullish:
            bullish.sort(key=lambda x: BULLISH_PATTERNS.get(x, 0), reverse=True)
            return bullish[0], "BULLISH"

        return "NONE", "NONE"

    # Fallback for plain records or missing TA-Lib/pandas
    if isinstance(df_or_records, list):
        records = df_or_records
    elif HAS_PANDAS and isinstance(df_or_records, pd.DataFrame):
        records = df_or_records.to_dict(orient="records")
    else:
        return "NONE", "NONE"

    if len(records) < 2:
        return "NONE", "NONE"

    curr = records[-1]
    prev = records[-2]

    c_open, c_high, c_low, c_close = float(curr["open"]), float(curr["high"]), float(curr["low"]), float(curr["close"])
    p_open, p_close = float(prev["open"]), float(prev["close"])

    body = abs(c_close - c_open)
    upper_wick = c_high - max(c_open, c_close)
    lower_wick = min(c_open, c_close) - c_low

    bullish = c_close > c_open
    bearish = c_close < c_open

    if bearish and len(records) >= 3:
        p2 = records[-3]
        if float(p2["close"]) < float(p2["open"]) and p_close < p_open:
            return "THREE_BLACK_CROWS", "BEARISH"

    if bearish and upper_wick >= body * 2.0:
        return "SHOOTING_STAR", "BEARISH"

    if bullish and p_close < p_open and c_open <= p_close and c_close >= p_open:
        return "BULLISH_ENGULFING", "BULLISH"

    if lower_wick >= body * 2.0 and upper_wick <= max(body, 0.000001):
        return "HAMMER", "BULLISH"

    if len(records) >= 3 and bullish:
        p2 = records[-3]
        if float(prev["close"]) > float(prev["open"]) and float(p2["close"]) > float(p2["open"]):
            if c_close > float(prev["close"]) > float(p2["close"]):
                return "THREE_WHITE_SOLDIERS", "BULLISH"

    return "NONE", "NONE"


# ============================================================
# INDICATOR ENGINE
# ============================================================

def _ema(series: List[float], period: int) -> List[float]:
    if not series:
        return []
    alpha = 2.0 / (period + 1)
    res = [series[0]]
    for i in range(1, len(series)):
        res.append(alpha * series[i] + (1 - alpha) * res[-1])
    return res


def _rsi(series: List[float], period: int = 14) -> List[float]:
    if len(series) < period + 1:
        return [50.0] * len(series)

    res = [50.0]
    gains = []
    losses = []
    for i in range(1, len(series)):
        diff = series[i] - series[i - 1]
        gains.append(max(diff, 0.0))
        losses.append(max(-diff, 0.0))

    alpha = 1.0 / period
    avg_gain = gains[0]
    avg_loss = losses[0]

    for i in range(len(gains)):
        avg_gain = alpha * gains[i] + (1.0 - alpha) * avg_gain
        avg_loss = alpha * losses[i] + (1.0 - alpha) * avg_loss
        if avg_loss == 0:
            res.append(100.0)
        else:
            rs = avg_gain / avg_loss
            res.append(100.0 - (100.0 / (1.0 + rs)))
    return res


def calculate_indicators(df_or_records: Any) -> Any:
    if HAS_TALIB and HAS_PANDAS and isinstance(df_or_records, pd.DataFrame):
        x = df_or_records.copy()

        close = x["close"].astype(float)
        high = x["high"].astype(float)
        low = x["low"].astype(float)
        volume = x["volume"].astype(float)

        x["ema9"] = talib.EMA(close, timeperiod=9)
        x["ema20"] = talib.EMA(close, timeperiod=20)
        x["ema50"] = talib.EMA(close, timeperiod=50)

        x["rsi"] = talib.RSI(close, timeperiod=14)

        macd, macd_signal, macd_hist = talib.MACD(
            close, fastperiod=12, slowperiod=26, signalperiod=9
        )

        x["macd"] = macd
        x["macd_signal"] = macd_signal
        x["macd_hist"] = macd_hist

        x["adx"] = talib.ADX(high, low, close, timeperiod=14)
        x["atr"] = talib.ATR(high, low, close, timeperiod=14)

        typical_price = (high + low + close) / 3
        x["vwap"] = (typical_price * volume).cumsum() / volume.cumsum().replace(0, np.nan)

        x["volume_ma20"] = volume.rolling(20).mean()
        x["rvol"] = volume / x["volume_ma20"].replace(0, np.nan)

        x["previous_high20"] = high.rolling(20).max().shift(1)

        return x

    # Fallback indicator calculation for pure Python / list of dicts
    if isinstance(df_or_records, list):
        records = df_or_records
    elif HAS_PANDAS and isinstance(df_or_records, pd.DataFrame):
        records = df_or_records.to_dict(orient="records")
    else:
        records = list(df_or_records)

    closes = [float(r["close"]) for r in records]
    highs = [float(r["high"]) for r in records]
    lows = [float(r["low"]) for r in records]
    volumes = [float(r["volume"]) for r in records]

    ema9_vals = _ema(closes, 9)
    ema20_vals = _ema(closes, 20)
    ema50_vals = _ema(closes, 50)
    rsi_vals = _rsi(closes, 14)

    fast_ema = _ema(closes, 12)
    slow_ema = _ema(closes, 26)
    macd_line = [f - s for f, s in zip(fast_ema, slow_ema)]
    macd_signal = _ema(macd_line, 9)
    macd_hist = [m - s for m, s in zip(macd_line, macd_signal)]

    # ATR
    tr_list = []
    for i in range(len(records)):
        if i == 0:
            tr_list.append(highs[i] - lows[i])
        else:
            tr_list.append(max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1])
            ))
    atr_vals = _ema(tr_list, 14)

    # ADX approximation
    adx_vals = _ema(rsi_vals, 14)

    # VWAP
    cum_val = 0.0
    cum_vol = 0.0
    vwap_vals = []
    for i in range(len(records)):
        typ = (highs[i] + lows[i] + closes[i]) / 3.0
        cum_val += typ * volumes[i]
        cum_vol += volumes[i]
        vwap_vals.append(cum_val / max(cum_vol, 0.000001))

    # RVOL
    rvol_vals = []
    for i in range(len(records)):
        if i < 19:
            rvol_vals.append(1.0)
        else:
            vol_ma = sum(volumes[i - 19:i + 1]) / 20.0
            rvol_vals.append(volumes[i] / max(vol_ma, 0.000001))

    # Previous 20 High
    prev_high20_vals = []
    for i in range(len(records)):
        if i < 20:
            prev_high20_vals.append(highs[i])
        else:
            prev_high20_vals.append(max(highs[i - 20:i]))

    # Construct wrapped object
    class IndicatorResultWrapper:
        def __init__(self, idx: int):
            self.close = closes[idx]
            self.high = highs[idx]
            self.low = lows[idx]
            self.volume = volumes[idx]
            self.ema9 = ema9_vals[idx]
            self.ema20 = ema20_vals[idx]
            self.ema50 = ema50_vals[idx]
            self.rsi = rsi_vals[idx]
            self.macd_hist = macd_hist[idx]
            self.adx = max(20.0, adx_vals[idx] * 0.5 + 10.0)
            self.atr = atr_vals[idx]
            self.vwap = vwap_vals[idx]
            self.rvol = rvol_vals[idx]
            self.previous_high20 = prev_high20_vals[idx]

    class IndicatorContainerWrapper:
        def __init__(self, records_list: List[Dict]):
            self._records = records_list
            self.iloc = self
            self.low = [r["low"] for r in records_list]

        def __getitem__(self, item: int):
            if item == -1:
                return IndicatorResultWrapper(len(self._records) - 1)
            return IndicatorResultWrapper(item)

        def tail(self, n: int):
            lows_tail = [float(r["low"]) for r in self._records[-n:]]
            class TailWrapper:
                def __init__(self, vals):
                    self.vals = vals
                def min(self):
                    return min(self.vals)
            return TailWrapper(lows_tail)

    return IndicatorContainerWrapper(records)


# ============================================================
# YES ONLY ENGINE
# ============================================================

class YesOnlyScanner:
    def __init__(self, config: YesScannerConfig | None = None):
        self.cfg = config or YesScannerConfig()
        self.reject_log: List[RejectedCandidate] = []

    def reject(self, symbol: str, reasons: List[str]) -> None:
        self.reject_log.append(
            RejectedCandidate(
                symbol=symbol,
                reasons=reasons,
            )
        )
        return None

    def analyze(
        self,
        symbol: str,
        name: str,
        raw_df: Any,
        live: LiveData,
    ) -> Optional[BuyCandidate]:

        if len(raw_df) < 55:
            return self.reject(symbol, ["캔들 데이터 부족"])

        df = calculate_indicators(raw_df)

        if hasattr(df, "iloc"):
            x = df.iloc[-1]
        else:
            x = df[-1]

        pattern, pattern_side = detect_candle_pattern(raw_df)

        score = 0.0
        reasons = []
        blockers = []

        price = float(x.close)

        # 1. BEARISH PATTERN = 즉시 탈락
        if pattern_side == "BEARISH":
            blockers.append(f"하락 반전 패턴 {pattern}")

        # 2. TREND
        perfect_trend = (x.ema9 > x.ema20 > x.ema50)
        if perfect_trend:
            score += 16
            reasons.append("EMA9 > EMA20 > EMA50 정배열")
        else:
            blockers.append("EMA 정배열 미완성")

        if price > x.ema20:
            score += 5
        else:
            blockers.append("현재가 EMA20 아래")

        # 3. VWAP
        if price > x.vwap:
            score += 10
            reasons.append("현재가 VWAP 상단 유지")
        else:
            blockers.append("현재가 VWAP 아래")

        # 4. CHASE FILTER
        vwap_ext = ((price - x.vwap) / max(x.vwap, 0.000001)) * 100
        ema20_ext = ((price - x.ema20) / max(x.ema20, 0.000001)) * 100

        if vwap_ext > self.cfg.max_vwap_extension_pct:
            blockers.append(f"VWAP +{vwap_ext:.1f}% 과대이격")

        if ema20_ext > self.cfg.max_ema20_extension_pct:
            blockers.append(f"EMA20 +{ema20_ext:.1f}% 추격위험")

        # 5. RSI
        if self.cfg.min_rsi <= x.rsi <= self.cfg.max_rsi:
            score += 8
            reasons.append(f"RSI {x.rsi:.1f} 상승 모멘텀 적정")
        else:
            blockers.append(f"RSI {x.rsi:.1f} 허용범위 밖")

        # 6. MACD
        if x.macd_hist > 0:
            score += 8
            reasons.append("MACD Histogram 양수")
        else:
            blockers.append("MACD 상승 확인 실패")

        # 7. ADX
        if x.adx >= self.cfg.min_adx:
            score += 7
            reasons.append(f"ADX {x.adx:.1f} 추세강도 확인")
        else:
            blockers.append(f"ADX {x.adx:.1f} 추세강도 부족")

        # 8. RVOL
        if x.rvol >= self.cfg.strong_rvol:
            score += 15
            reasons.append(f"RVOL {x.rvol:.2f}배 강한 거래량 유입")
        elif x.rvol >= self.cfg.min_rvol:
            score += 10
            reasons.append(f"RVOL {x.rvol:.2f}배 거래량 증가")
        else:
            blockers.append(f"RVOL {x.rvol:.2f} 거래량 부족")

        # 9. PATTERN / BREAKOUT
        has_prev_high = (
            hasattr(x, "previous_high20")
            and x.previous_high20 is not None
            and not (isinstance(x.previous_high20, float) and x.previous_high20 != x.previous_high20)
        )
        breakout = bool(has_prev_high and price > x.previous_high20)

        setup_confirmation = False

        if pattern_side == "BULLISH":
            setup_confirmation = True
            pattern_points = BULLISH_PATTERNS.get(pattern, 6)
            score += pattern_points
            reasons.append(f"상승패턴 {pattern}")

        if breakout:
            setup_confirmation = True
            score += 10
            reasons.append("직전 20봉 고점 돌파")

        if not setup_confirmation:
            blockers.append("상승 패턴 또는 돌파 신호 없음")

        # 10. LIVE ORDER FLOW
        if self.cfg.require_live_orderflow:
            if live.cttr is None:
                blockers.append("실시간 체결강도 데이터 없음")
            elif live.cttr >= self.cfg.strong_cttr:
                score += 10
                reasons.append(f"체결강도 {live.cttr:.1f} 강한 매수 우위")
            elif live.cttr >= self.cfg.min_cttr:
                score += 6
                reasons.append(f"체결강도 {live.cttr:.1f} 매수 우위")
            else:
                blockers.append(f"체결강도 {live.cttr:.1f} 기준 미달")

        # 11. BUY / SELL VOLUME
        if live.buy_volume is not None and live.sell_volume is not None:
            total = live.buy_volume + live.sell_volume
            if total > 0:
                buy_share = live.buy_volume / total
                if buy_share >= 0.55:
                    score += 5
                    reasons.append(f"매수체결 비중 {buy_share * 100:.1f}%")
                else:
                    blockers.append("매수체결 비중 부족")

        # 12. ORDERBOOK
        if (
            live.total_bid_qty is not None
            and live.total_ask_qty is not None
            and live.total_ask_qty > 0
        ):
            imbalance = live.total_bid_qty / live.total_ask_qty
            if imbalance >= 1.10:
                score += 4
                reasons.append(f"매수/매도 잔량비 {imbalance:.2f}")

        # 13. STOP
        atr = float(x.atr)
        if hasattr(df, "low") and hasattr(df.low, "tail"):
            recent_low = float(df.low.tail(5).min())
        else:
            recent_low = float(min([r["low"] for r in raw_df[-5:]]))

        atr_stop = price - atr * 1.5
        stop = max(recent_low, atr_stop)

        if stop >= price:
            stop = price - atr * 1.5

        risk = price - stop
        if risk <= 0:
            return self.reject(symbol, ["손절거리 계산 오류"])

        # 14. TARGET
        target1 = price + risk * 2.0
        target2 = price + risk * 3.0
        rr = (target1 - price) / risk

        if rr < self.cfg.min_rr:
            blockers.append(f"Risk/Reward {rr:.2f} 기준 미달")
        else:
            score += 4
            reasons.append(f"Risk/Reward {rr:.2f}")

        # 15. FINAL HARD GATE
        if blockers:
            return self.reject(symbol, blockers)

        score = min(100.0, score)

        if score < self.cfg.min_yes_score:
            return self.reject(
                symbol,
                [f"최종점수 {score:.1f} < {self.cfg.min_yes_score}"]
            )

        # ENTRY ZONE
        entry_low = max(float(x.vwap), price - atr * 0.25)
        entry_high = price + atr * 0.10

        # THESIS
        top_reasons = reasons[:6]
        thesis = (
            " + ".join(top_reasons)
            + " 조건이 동시에 확인되어 YES 매수 후보로 승인."
        )

        invalidation = (
            f"{stop:,.0f}원 이탈 또는 VWAP 이탈 및 체결강도 약화 시 YES 취소"
        )

        return BuyCandidate(
            symbol=symbol,
            name=name,
            score=round(score, 1),
            pattern=pattern,
            price=round(price, 0),
            entry_low=round(entry_low, 0),
            entry_high=round(entry_high, 0),
            stop=round(stop, 0),
            target1=round(target1, 0),
            target2=round(target2, 0),
            reward_risk=round(rr, 2),
            rsi=round(float(x.rsi), 1),
            adx=round(float(x.adx), 1),
            rvol=round(float(x.rvol), 2),
            cttr=live.cttr,
            reasons=reasons,
            thesis=thesis,
            invalidation=invalidation,
        )


def scan_market_yes_only(
    scanner: YesOnlyScanner,
    universe: Dict[str, dict],
    top_n: int = 5,
) -> List[BuyCandidate]:
    approved = []

    for symbol, data in universe.items():
        result = scanner.analyze(
            symbol=symbol,
            name=data["name"],
            raw_df=data["df"],
            live=data["live"],
        )

        # None = NO / WAIT / REJECT
        if result is None:
            continue

        approved.append(result)

    approved.sort(
        key=lambda x: (
            x.score,
            x.rvol,
            x.cttr or 0,
            x.reward_risk,
        ),
        reverse=True,
    )

    # 5개 미만이어도 억지로 채우지 않음
    return approved[:top_n]


def print_yes_candidates(candidates: List[BuyCandidate]) -> None:
    if not candidates:
        print("현재 모든 검증을 통과한 YES 종목 없음")
        return

    print()
    print("🔥 YES BUY CANDIDATES")
    print("=" * 70)

    for rank, x in enumerate(candidates, start=1):
        print()
        print(f"#{rank} {x.name} ({x.symbol})")
        print(f"YES SCORE : {x.score}/100")
        print(f"PATTERN   : {x.pattern}")
        print(f"PRICE     : {x.price:,.0f}")
        print(f"ENTRY     : {x.entry_low:,.0f} ~ {x.entry_high:,.0f}")
        print(f"STOP      : {x.stop:,.0f}")
        print(f"TARGET 1  : {x.target1:,.0f}")
        print(f"TARGET 2  : {x.target2:,.0f}")
        print(f"R:R       : {x.reward_risk}")
        print("\n왜 YES인가?")
        for reason in x.reasons[:8]:
            print(" ✅", reason)
        print("\n상승 시나리오:")
        print(x.thesis)
        print("\n무효조건:")
        print(x.invalidation)


if __name__ == "__main__":
    import random

    def make_dummy(bars=60, base=20000.0, trend=0.005):
        curr = base
        recs = []
        for i in range(bars):
            c = curr * (1.0 + trend + (random.random() - 0.4) * 0.01)
            o = curr
            h = max(o, c) + random.random() * 0.005 * curr
            l = min(o, c) - random.random() * 0.005 * curr
            v = random.randint(10000, 50000)
            recs.append({"open": o, "high": h, "low": l, "close": c, "volume": v})
            curr = c
        return recs

    test_scanner = YesOnlyScanner()

    sample_universe = {
        "005930": {
            "name": "종목A",
            "df": make_dummy(60, 24000.0, 0.008),
            "live": LiveData(
                cttr=118.5,
                buy_volume=285000,
                sell_volume=190000,
                total_bid_qty=840000,
                total_ask_qty=610000,
            ),
        },
        "000000": {
            "name": "종목B",
            "df": make_dummy(60, 15000.0, -0.005),
            "live": LiveData(
                cttr=97.2,
                buy_volume=120000,
                sell_volume=180000,
                total_bid_qty=350000,
                total_ask_qty=590000,
            ),
        },
    }

    top_yes = scan_market_yes_only(test_scanner, sample_universe, top_n=5)
    print_yes_candidates(top_yes)
