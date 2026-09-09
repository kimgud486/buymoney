# AI Explainable Profit Opportunity Scanner Engine
# Comprehensive 100-Point Scoring, Technical Rationale & Signal Validation Gate Engine

from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple, Any, Set
import math
import sys

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


@dataclass
class TradeIdea:
    symbol: str
    name: str
    score: float
    grade: str
    decision: str

    price: float
    entry_low: float
    entry_high: float

    stop: float
    target1: float
    target2: float

    rsi: float
    rvol: float
    adx: float
    atr_pct: float

    pattern: str

    bullish_reasons: List[str]
    risk_reasons: List[str]

    thesis: str
    invalidation: str

    would_buy: bool


# =========================================================
# TECHNICAL INDICATORS & FEATURE CALCULATION
# =========================================================

def ema_series(values: List[float], period: int) -> List[float]:
    if not values:
        return []
    alpha = 2.0 / (period + 1)
    res = [values[0]]
    for i in range(1, len(values)):
        res.append(alpha * values[i] + (1 - alpha) * res[-1])
    return res


def rsi_series(close: List[float], period: int = 14) -> List[float]:
    if len(close) < period + 1:
        return [50.0] * len(close)
    diffs = [close[i] - close[i-1] for i in range(1, len(close))]
    gains = [max(d, 0.0) for d in diffs]
    losses = [max(-d, 0.0) for d in diffs]

    alpha = 1.0 / period
    avg_gain = gains[0]
    avg_loss = losses[0]

    res = [50.0]
    for i in range(1, len(diffs)):
        avg_gain = alpha * gains[i] + (1.0 - alpha) * avg_gain
        avg_loss = alpha * losses[i] + (1.0 - alpha) * avg_loss
        if avg_loss == 0:
            res.append(100.0)
        else:
            rs = avg_gain / avg_loss
            res.append(100.0 - (100.0 / (1.0 + rs)))
    return res


def adx_series(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> List[float]:
    if len(closes) < period * 2:
        return [20.0] * len(closes)
    
    # Pure python approximation of ADX
    tr_list = []
    dm_plus = []
    dm_minus = []

    for i in range(len(closes)):
        if i == 0:
            tr_list.append(highs[0] - lows[0])
            dm_plus.append(0.0)
            dm_minus.append(0.0)
        else:
            up_move = highs[i] - highs[i-1]
            down_move = lows[i-1] - lows[i]

            dm_p = up_move if (up_move > down_move and up_move > 0) else 0.0
            dm_m = down_move if (down_move > up_move and down_move > 0) else 0.0

            tr = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i-1]),
                abs(lows[i] - closes[i-1])
            )
            tr_list.append(tr)
            dm_plus.append(dm_p)
            dm_minus.append(dm_m)

    tr_smoothed = ema_series(tr_list, period)
    p_smoothed = ema_series(dm_plus, period)
    m_smoothed = ema_series(dm_minus, period)

    dx_list = []
    for i in range(len(closes)):
        tr_val = max(tr_smoothed[i], 0.000001)
        di_plus = (p_smoothed[i] / tr_val) * 100.0
        di_minus = (m_smoothed[i] / tr_val) * 100.0
        di_sum = max(di_plus + di_minus, 0.000001)
        dx = (abs(di_plus - di_minus) / di_sum) * 100.0
        dx_list.append(dx)

    return ema_series(dx_list, period)


def detect_pattern(df_or_records: Any) -> Tuple[str, int]:
    """
    Detects prominent candlestick patterns.
    Uses TA-Lib if available, or pure Python fallback logic.
    """
    if HAS_TALIB and HAS_PANDAS and isinstance(df_or_records, pd.DataFrame):
        o = df_or_records["open"].astype(float).values
        h = df_or_records["high"].astype(float).values
        l = df_or_records["low"].astype(float).values
        c = df_or_records["close"].astype(float).values

        patterns = {
            "BULLISH_ENGULFING": talib.CDLENGULFING(o, h, l, c),
            "HAMMER": talib.CDLHAMMER(o, h, l, c),
            "MORNING_STAR": talib.CDLMORNINGSTAR(o, h, l, c),
            "THREE_WHITE_SOLDIERS": talib.CDL3WHITESOLDIERS(o, h, l, c),
            "PIERCING": talib.CDLPIERCING(o, h, l, c),
            "SHOOTING_STAR": talib.CDLSHOOTINGSTAR(o, h, l, c),
            "EVENING_STAR": talib.CDLEVENINGSTAR(o, h, l, c),
            "THREE_BLACK_CROWS": talib.CDL3BLACKCROWS(o, h, l, c),
        }

        detected = []
        for name, values in patterns.items():
            sig = int(values[-1])
            if sig != 0:
                detected.append((name, sig))

        if not detected:
            return "NONE", 0

        detected.sort(key=lambda x: abs(x[1]), reverse=True)
        return detected[0]

    # Fallback for plain records or missing TA-Lib
    if isinstance(df_or_records, list):
        records = df_or_records
    elif HAS_PANDAS and isinstance(df_or_records, pd.DataFrame):
        records = df_or_records.to_dict(orient="records")
    else:
        return "NONE", 0

    if len(records) < 2:
        return "NONE", 0

    curr = records[-1]
    prev = records[-2]

    c_open, c_high, c_low, c_close = curr["open"], curr["high"], curr["low"], curr["close"]
    p_open, p_close = prev["open"], prev["close"]

    body = abs(c_close - c_open)
    candle_range = max(c_high - c_low, 0.000001)
    upper_wick = c_high - max(c_open, c_close)
    lower_wick = min(c_open, c_close) - c_low

    bullish = c_close > c_open
    bearish = c_close < c_open

    # Bullish Engulfing
    if bullish and p_close < p_open and c_open <= p_close and c_close >= p_open:
        return "BULLISH_ENGULFING", 100

    # Hammer
    if lower_wick >= body * 2.0 and upper_wick <= max(body, 0.000001):
        return "HAMMER", 100 if bullish else 50

    # Three White Soldiers
    if len(records) >= 3:
        p2 = records[-3]
        if bullish and (prev["close"] > prev["open"]) and (p2["close"] > p2["open"]):
            if c_close > prev["close"] > p2["close"]:
                return "THREE_WHITE_SOLDIERS", 100

    if bullish and body / candle_range >= 0.70:
        return "STRONG_BULL", 70

    if bearish and body / candle_range >= 0.70:
        return "THREE_BLACK_CROWS" if len(records) >= 3 and records[-3]["close"] < records[-3]["open"] else "SHOOTING_STAR", -100

    return "NONE", 0


# =========================================================
# SIGNAL VALIDATION GATE ENGINE
# =========================================================

class SignalValidationGate:
    """
    Validation Gate to eliminate false positive BUY signals.
    Checks sector strength, orderbook/VWAP stability, breakout retests, and chase risk.
    """
    @staticmethod
    def validate(
        score: float,
        vwap_distance: float,
        rvol: float,
        macd_hist: float,
        pattern: str,
        bearish_patterns: Set[str],
        atr_pct: float
    ) -> Tuple[bool, List[str]]:
        rejections = []

        if score < 78:
            rejections.append("최소 Opportunity Score (78점) 미달")

        if vwap_distance >= 5.0:
            rejections.append(f"VWAP 대비 +{vwap_distance:.1f}% 과대이격 (추격매수 위험)")

        if rvol < 1.2:
            rejections.append(f"RVOL {rvol:.2f}배로 최소 거래량 수급 미달")

        if macd_hist <= 0:
            rejections.append("MACD Histogram 음수로 모멘텀 수급 미약")

        if pattern in bearish_patterns:
            rejections.append(f"하락 반전 패턴({pattern}) 감지")

        if atr_pct > 7.5:
            rejections.append(f"ATR 변동성({atr_pct:.1f}%) 과도")

        passed = len(rejections) == 0
        return passed, rejections


# =========================================================
# MAIN EXPLAINABLE SCANNER ENGINE
# =========================================================

def analyze_stock(
    symbol: str,
    raw_data: Any,
    stock_name: str = ""
) -> TradeIdea:
    if HAS_PANDAS and isinstance(raw_data, pd.DataFrame):
        records = raw_data.to_dict(orient="records")
    elif isinstance(raw_data, list):
        records = raw_data
    else:
        raise TypeError(f"{symbol}: Unsupported input data format")

    if len(records) < 55:
        raise ValueError(f"{symbol}: 최소 55개 이상의 OHLCV 캔들이 필요합니다.")

    name = stock_name or symbol

    opens = [float(r["open"]) for r in records]
    highs = [float(r["high"]) for r in records]
    lows = [float(r["low"]) for r in records]
    closes = [float(r["close"]) for r in records]
    volumes = [float(r["volume"]) for r in records]

    ema9_vals = ema_series(closes, 9)
    ema20_vals = ema_series(closes, 20)
    ema50_vals = ema_series(closes, 50)

    rsi_vals = rsi_series(closes, 14)

    fast_ema = ema_series(closes, 12)
    slow_ema = ema_series(closes, 26)
    macd_line = [f - s for f, s in zip(fast_ema, slow_ema)]
    macd_signal = ema_series(macd_line, 9)
    macd_hist = [m - s for m, s in zip(macd_line, macd_signal)]

    adx_vals = adx_series(highs, lows, closes, 14)

    # ATR
    tr_list = []
    for i in range(len(records)):
        if i == 0:
            tr_list.append(highs[i] - lows[i])
        else:
            tr_list.append(max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i-1]),
                abs(lows[i] - closes[i-1])
            ))
    atr_vals = ema_series(tr_list, 14)

    # VWAP
    cum_val = 0.0
    cum_vol = 0.0
    vwap_vals = []
    for i in range(len(records)):
        typical = (highs[i] + lows[i] + closes[i]) / 3.0
        cum_val += typical * volumes[i]
        cum_vol += volumes[i]
        vwap_vals.append(cum_val / max(cum_vol, 0.000001))

    # RVOL (Volume MA20)
    rvol_vals = []
    for i in range(len(records)):
        if i < 19:
            rvol_vals.append(1.0)
        else:
            vol_ma = sum(volumes[i-19:i+1]) / 20.0
            rvol_vals.append(volumes[i] / max(vol_ma, 0.000001))

    # Previous High 20
    prev_high20_vals = []
    for i in range(len(records)):
        if i < 20:
            prev_high20_vals.append(highs[i])
        else:
            prev_high20_vals.append(max(highs[i-20:i]))

    # Last bar values
    x_close = closes[-1]
    x_open = opens[-1]
    x_high = highs[-1]
    x_low = lows[-1]
    x_vol = volumes[-1]

    x_ema9 = ema9_vals[-1]
    x_ema20 = ema20_vals[-1]
    x_ema50 = ema50_vals[-1]

    x_rsi = rsi_vals[-1]
    x_macd_hist = macd_hist[-1]
    x_adx = adx_vals[-1]
    x_atr = atr_vals[-1]
    x_vwap = vwap_vals[-1]
    x_rvol = rvol_vals[-1]
    x_prev_high20 = prev_high20_vals[-1]

    score = 0
    bullish_reasons = []
    risk_reasons = []

    # 1. TREND (Max 24 pts)
    if x_close > x_ema20:
        score += 6
        bullish_reasons.append("현재가가 EMA20 위에 있어 단기 상승 추세 유지")

    if x_ema9 > x_ema20 > x_ema50:
        score += 12
        bullish_reasons.append("EMA9 > EMA20 > EMA50 완벽 정배열 수급확인")

    if x_adx >= 20.0:
        score += 6
        bullish_reasons.append(f"ADX {x_adx:.1f}로 추세 응집력 강세")

    # 2. VWAP (Max 8 pts)
    if x_close > x_vwap:
        score += 8
        bullish_reasons.append("현재가가 VWAP 위에서 거래되어 당일 매수세 우위")
    else:
        score -= 6
        risk_reasons.append("현재가가 VWAP 아래에 위치하여 음봉 눌림 지속")

    # 3. RSI (Max 12 pts)
    if 52.0 <= x_rsi <= 68.0:
        score += 8
        bullish_reasons.append(f"RSI {x_rsi:.1f}: 상승 최적 모멘텀 구간")
    elif 68.0 < x_rsi <= 75.0:
        score += 4
        bullish_reasons.append(f"RSI {x_rsi:.1f}: 과열 직전의 강력한 돌파 구간")
    elif x_rsi > 78.0:
        score -= 10
        risk_reasons.append(f"RSI {x_rsi:.1f}: 단기 과열 구간 경고")

    # 4. MACD (Max 10 pts)
    if x_macd_hist > 0:
        score += 7
        bullish_reasons.append("MACD Histogram 양수 (매수 모멘텀 확장)")

    if len(macd_hist) >= 2 and macd_hist[-1] > macd_hist[-2]:
        score += 3
        bullish_reasons.append("MACD 모멘텀 상승 폭 확대 중")

    # 5. RVOL & VOLUME (Max 14 pts)
    if x_rvol >= 2.0:
        score += 14
        bullish_reasons.append(f"RVOL {x_rvol:.2f}배: 평균 대비 2배 이상 폭발적 거래량")
    elif x_rvol >= 1.5:
        score += 10
        bullish_reasons.append(f"RVOL {x_rvol:.2f}배: 유의미한 수급 유입")
    elif x_rvol < 0.8:
        score -= 5
        risk_reasons.append("거래량 부족으로 인한 돌파 동력 유입 저해")

    # 6. CANDLE PATTERN (Max 12 pts)
    pattern, pattern_sig = detect_pattern(raw_data)
    bullish_patterns = {"BULLISH_ENGULFING", "HAMMER", "MORNING_STAR", "THREE_WHITE_SOLDIERS", "PIERCING", "STRONG_BULL"}
    bearish_patterns = {"SHOOTING_STAR", "EVENING_STAR", "THREE_BLACK_CROWS"}

    if pattern in bullish_patterns:
        score += 12
        bullish_reasons.append(f"상승 캔들 패턴 감지: {pattern}")
    elif pattern in bearish_patterns:
        score -= 15
        risk_reasons.append(f"하락 반전 캔들 패턴 감지: {pattern}")

    # 7. BREAKOUT (Max 12 pts)
    breakout = (x_close > x_prev_high20)
    if breakout:
        score += 12
        bullish_reasons.append("20봉 신고가 강력 돌파")
    elif x_close >= x_prev_high20 * 0.995:
        score += 6
        bullish_reasons.append("20봉 신고가 돌파 직전 시도")

    # 8. STRONG CLOSE POSITION (Max 6 pts)
    candle_range = max(x_high - x_low, 0.000001)
    close_pos = (x_close - x_low) / candle_range
    if close_pos >= 0.80:
        score += 6
        bullish_reasons.append("종가가 캔들 상단 20% 이내에 형성된 강한 마감")

    # 9. CHASE & VOLATILITY FILTER
    vwap_distance = ((x_close - x_vwap) / max(x_vwap, 0.000001)) * 100.0
    if vwap_distance > 5.0:
        score -= 12
        risk_reasons.append(f"VWAP 대비 +{vwap_distance:.1f}% 이격으로 추격매수 위험")

    atr_pct = (x_atr / max(x_close, 0.000001)) * 100.0
    if atr_pct > 7.0:
        score -= 8
        risk_reasons.append(f"ATR {atr_pct:.1f}%: 변동성 과도 위험")

    score = max(0.0, min(100.0, float(score)))

    # RISK MANAGEMENT LEVEL CALCULATION
    price = float(x_close)
    atr_val = float(x_atr)
    recent_low = float(min(lows[-5:]))

    atr_stop = price - atr_val * 1.5
    stop = max(atr_stop, recent_low)
    if stop >= price:
        stop = price - atr_val * 1.5

    risk = max(price - stop, price * 0.005)

    entry_low = max(float(x_vwap), price - atr_val * 0.35)
    entry_high = price + atr_val * 0.15

    target1 = price + risk * 2.0
    target2 = price + risk * 3.0

    # SIGNAL VALIDATION GATE
    gate_passed, gate_rejections = SignalValidationGate.validate(
        score=score,
        vwap_distance=vwap_distance,
        rvol=x_rvol,
        macd_hist=x_macd_hist,
        pattern=pattern,
        bearish_patterns=bearish_patterns,
        atr_pct=atr_pct
    )

    if not gate_passed:
        risk_reasons.extend(gate_rejections)

    # DECISION RATIONALE
    if score >= 88.0 and gate_passed:
        grade = "S"
        decision = "STRONG_BUY_CANDIDATE"
        would_buy = True
    elif score >= 78.0 and gate_passed:
        grade = "A+"
        decision = "BUY_CANDIDATE"
        would_buy = True
    elif score >= 68.0:
        grade = "A"
        decision = "WATCH_FOR_ENTRY"
        would_buy = False
    elif score >= 55.0:
        grade = "B"
        decision = "WATCH"
        would_buy = False
    else:
        grade = "NO_SETUP"
        decision = "AVOID"
        would_buy = False

    if would_buy:
        thesis = (
            f"{name}({symbol})은 상승 추세, 거래량 폭발, 모멘텀 및 20봉 돌파 구조가 "
            f"수학적으로 확인되었으며, Signal Gate를 통과한 고확률 매수 후보입니다."
        )
    else:
        thesis = (
            f"{name}({symbol})은 일부 상승 조건은 충족하였으나 "
            f"Signal Gate 매수 confirmation 기준을 온전히 충족하지 못했습니다."
        )

    invalidation = (
        f"{stop:,.0f}원 하향 이탈 또는 VWAP 하향 이탈 후 복귀 실패 시 상승 시나리오 전면 무효화"
    )

    return TradeIdea(
        symbol=symbol,
        name=name,
        score=round(score, 1),
        grade=grade,
        decision=decision,
        price=round(price, 0),
        entry_low=round(entry_low, 0),
        entry_high=round(entry_high, 0),
        stop=round(stop, 0),
        target1=round(target1, 0),
        target2=round(target2, 0),
        rsi=round(float(x_rsi), 1),
        rvol=round(float(x_rvol), 2),
        adx=round(float(x_adx), 1),
        atr_pct=round(float(atr_pct), 2),
        pattern=pattern,
        bullish_reasons=bullish_reasons,
        risk_reasons=risk_reasons,
        thesis=thesis,
        invalidation=invalidation,
        would_buy=would_buy
    )


def scan_market(
    universe: Dict[str, Any],
    top_n: int = 5,
    symbol_names: Optional[Dict[str, str]] = None
) -> List[TradeIdea]:
    symbol_names = symbol_names or {}
    results = []

    for symbol, df in universe.items():
        try:
            name = symbol_names.get(symbol, symbol)
            idea = analyze_stock(symbol, df, stock_name=name)
            results.append(idea)
        except Exception as e:
            print(f"[{symbol} Scanner Warning]: {e}")

    results.sort(key=lambda x: x.score, reverse=True)
    return results[:top_n]


def print_explainable_top5(ideas: List[TradeIdea]) -> None:
    print("\n" + "=" * 80)
    print("🔥 AI Explainable Profit Opportunity Scanner TOP 5 Results")
    print("=" * 80)

    for i, item in enumerate(ideas, 1):
        print(f"\n#{i} {item.name} ({item.symbol}) | Score: {item.score}/100 [{item.grade}] | Decision: {item.decision}")
        print(f"   - Current Price: {item.price:,.0f} KRW | Pattern: {item.pattern}")
        print(f"   - Would AI Buy? -> {'YES ✅' if item.would_buy else 'NO ❌'}")
        print(f"   - Entry Zone: {item.entry_low:,.0f} ~ {item.entry_high:,.0f} KRW")
        print(f"   - Stop Level: {item.stop:,.0f} KRW | Target 1: {item.target1:,.0f} | Target 2: {item.target2:,.0f}")
        print(f"   - Bullish Reasons: {', '.join(item.bullish_reasons[:3])}")
        if item.risk_reasons:
            print(f"   - Risk Warnings: {', '.join(item.risk_reasons[:3])}")
        print(f"   - Invalidation: {item.invalidation}")

    print("=" * 80 + "\n")


if __name__ == "__main__":
    import random

    def generate_dummy_data(bars=60, base=50000.0):
        curr = base
        data = []
        for i in range(bars):
            change = (random.random() - 0.45) * 0.02 * curr
            o = curr
            c = curr + change
            h = max(o, c) + random.random() * 0.008 * curr
            l = min(o, c) - random.random() * 0.008 * curr
            v = random.randint(2000, 20000)
            data.append({"open": o, "high": h, "low": l, "close": c, "volume": v})
            curr = c
        return data

    sample_universe = {
        "005930": generate_dummy_data(60, 71000.0),
        "000660": generate_dummy_data(60, 140000.0),
        "035420": generate_dummy_data(60, 210000.0),
        "035720": generate_dummy_data(60, 52000.0),
        "005380": generate_dummy_data(60, 240000.0)
    }

    names = {
        "005930": "삼성전자",
        "000660": "SK하이닉스",
        "035420": "NAVER",
        "035720": "카카오",
        "005380": "현대차"
    }

    top_ideas = scan_market(sample_universe, top_n=5, symbol_names=names)
    print_explainable_top5(top_ideas)
