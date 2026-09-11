from __future__ import annotations

from dataclasses import dataclass
from math import isfinite, log, sqrt
from statistics import mean, pstdev
from typing import Any, Dict, List, Optional, Sequence, Tuple


EPS = 1e-12


@dataclass(frozen=True)
class EnhancedSignalConfig:
    """Production-oriented technical/volume validation for realtime pattern candidates."""

    rvol_period: int = 20
    atr_period: int = 14
    adx_period: int = 14
    mfi_period: int = 14
    cmf_period: int = 20
    bb_period: int = 20
    bb_stddev: float = 2.0
    vwap_fallback_window: int = 120
    min_history: int = 60

    min_rvol: float = 1.20
    strong_rvol: float = 1.80
    min_adx: float = 18.0
    strong_adx: float = 25.0
    min_cmf: float = -0.02
    min_mfi: float = 45.0
    max_mfi: float = 82.0

    # Estimated round-trip friction. 1 bp = 0.01%.
    round_trip_fee_bps: float = 10.0
    slippage_bps: float = 10.0
    min_net_ev_pct: float = 0.05

    # Probability estimates are deliberately shrunk toward 50% until enough analogs exist.
    probability_prior_strength: float = 25.0

    # Chase / exhaustion filters.
    max_atr_extension: float = 2.5
    max_vwap_extension_pct: float = 5.0
    max_volume_zscore: float = 6.0


@dataclass(frozen=True)
class EnhancedSignalResult:
    available: bool
    reason: str
    quality_score: float = 50.0
    rise_probability: float = 50.0
    net_expected_value_pct: float = 0.0
    gross_expected_value_pct: float = 0.0

    regime: str = "UNKNOWN"
    trend_state: str = "UNKNOWN"
    candle_bias: str = "NEUTRAL"
    candle_quality: float = 0.0
    volume_confirmation: bool = False

    rvol: float = 1.0
    volume_zscore: float = 0.0
    adx: float = 0.0
    plus_di: float = 0.0
    minus_di: float = 0.0
    atr_pct: float = 0.0
    vwap: float = 0.0
    vwap_extension_pct: float = 0.0
    mfi: float = 50.0
    cmf: float = 0.0
    obv_slope: float = 0.0
    bb_width_pct: float = 0.0
    macd_hist: float = 0.0
    macd_hist_slope: float = 0.0

    reasons: Tuple[str, ...] = ()
    risk_flags: Tuple[str, ...] = ()


def _records(data: Any) -> List[Dict[str, Any]]:
    if hasattr(data, "to_dict"):
        rows = data.to_dict(orient="records")
    else:
        rows = list(data)

    out: List[Dict[str, Any]] = []
    for row in rows:
        out.append(
            {
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": float(row.get("volume", 0.0)),
                "timestamp": row.get("timestamp", row.get("datetime", row.get("date"))),
            }
        )
    return out


def _ema(values: Sequence[float], period: int) -> List[float]:
    if not values:
        return []
    alpha = 2.0 / (max(period, 1) + 1.0)
    out = [float(values[0])]
    for value in values[1:]:
        out.append(alpha * float(value) + (1.0 - alpha) * out[-1])
    return out


def _wilder(values: Sequence[float], period: int) -> List[float]:
    """Wilder smoothing, aligned to input length."""
    if not values:
        return []
    period = max(1, int(period))
    out = [float(values[0])]
    alpha = 1.0 / period
    for value in values[1:]:
        out.append(out[-1] + alpha * (float(value) - out[-1]))
    return out


def _rsi(closes: Sequence[float], period: int = 14) -> List[float]:
    if not closes:
        return []
    gains = [0.0]
    losses = [0.0]
    for prev, curr in zip(closes[:-1], closes[1:]):
        diff = curr - prev
        gains.append(max(diff, 0.0))
        losses.append(max(-diff, 0.0))
    avg_gain = _wilder(gains, period)
    avg_loss = _wilder(losses, period)
    result: List[float] = []
    for g, l in zip(avg_gain, avg_loss):
        if g <= EPS and l <= EPS:
            result.append(50.0)
        elif l <= EPS:
            result.append(100.0)
        else:
            rs = g / l
            result.append(100.0 - 100.0 / (1.0 + rs))
    return result


def _atr_adx(
    highs: Sequence[float],
    lows: Sequence[float],
    closes: Sequence[float],
    period: int,
) -> Tuple[List[float], List[float], List[float], List[float]]:
    """Correct Wilder ATR, +DI, -DI and ADX, with no RSI proxy."""
    n = len(closes)
    if n == 0:
        return [], [], [], []

    tr = [max(highs[0] - lows[0], 0.0)]
    plus_dm = [0.0]
    minus_dm = [0.0]
    for i in range(1, n):
        up = highs[i] - highs[i - 1]
        down = lows[i - 1] - lows[i]
        plus_dm.append(up if up > down and up > 0 else 0.0)
        minus_dm.append(down if down > up and down > 0 else 0.0)
        tr.append(
            max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1]),
            )
        )

    atr = _wilder(tr, period)
    smooth_plus = _wilder(plus_dm, period)
    smooth_minus = _wilder(minus_dm, period)

    plus_di: List[float] = []
    minus_di: List[float] = []
    dx: List[float] = []
    for a, p, m in zip(atr, smooth_plus, smooth_minus):
        denom = max(a, EPS)
        pdi = 100.0 * p / denom
        mdi = 100.0 * m / denom
        plus_di.append(pdi)
        minus_di.append(mdi)
        dx.append(100.0 * abs(pdi - mdi) / max(pdi + mdi, EPS))
    adx = _wilder(dx, period)
    return atr, plus_di, minus_di, adx


def _session_key(value: Any) -> Optional[str]:
    if value is None:
        return None
    if hasattr(value, "date"):
        try:
            return str(value.date())
        except Exception:
            pass
    text = str(value)
    if "T" in text:
        return text.split("T", 1)[0]
    if " " in text:
        return text.split(" ", 1)[0]
    if len(text) >= 10 and text[4] in "-/" and text[7] in "-/":
        return text[:10]
    return None


def _vwap(rows: Sequence[Dict[str, Any]], fallback_window: int) -> float:
    if not rows:
        return 0.0

    latest_key = _session_key(rows[-1].get("timestamp"))
    if latest_key is not None:
        selected: List[Dict[str, Any]] = []
        for row in reversed(rows):
            if _session_key(row.get("timestamp")) != latest_key:
                break
            selected.append(row)
        selected.reverse()
    else:
        selected = list(rows[-max(1, fallback_window) :])

    pv = 0.0
    vol = 0.0
    for row in selected:
        typical = (row["high"] + row["low"] + row["close"]) / 3.0
        v = max(row["volume"], 0.0)
        pv += typical * v
        vol += v
    return pv / max(vol, EPS) if vol > 0 else rows[-1]["close"]


def _rvol_and_zscore(volumes: Sequence[float], period: int) -> Tuple[float, float]:
    """Baseline excludes the current bar to avoid self-diluting a volume spike."""
    if len(volumes) < 2:
        return 1.0, 0.0
    history = list(volumes[max(0, len(volumes) - period - 1) : -1])
    if not history:
        return 1.0, 0.0

    baseline = mean(history)
    rvol = volumes[-1] / max(baseline, EPS)
    if len(history) < 2:
        return rvol, 0.0
    sd = pstdev(history)
    z = (volumes[-1] - baseline) / max(sd, EPS)
    return rvol, z


def _cmf(rows: Sequence[Dict[str, Any]], period: int) -> float:
    sample = list(rows[-max(1, period) :])
    mfv = 0.0
    volume = 0.0
    for row in sample:
        rng = row["high"] - row["low"]
        multiplier = 0.0 if abs(rng) <= EPS else (
            (2.0 * row["close"] - row["low"] - row["high"]) / rng
        )
        v = max(row["volume"], 0.0)
        mfv += multiplier * v
        volume += v
    return mfv / max(volume, EPS) if volume > 0 else 0.0


def _mfi(rows: Sequence[Dict[str, Any]], period: int) -> float:
    if len(rows) < 2:
        return 50.0
    sample = list(rows[-(period + 1) :])
    pos = 0.0
    neg = 0.0
    prev_tp = (sample[0]["high"] + sample[0]["low"] + sample[0]["close"]) / 3.0
    for row in sample[1:]:
        tp = (row["high"] + row["low"] + row["close"]) / 3.0
        flow = tp * max(row["volume"], 0.0)
        if tp > prev_tp:
            pos += flow
        elif tp < prev_tp:
            neg += flow
        prev_tp = tp
    if pos <= EPS and neg <= EPS:
        return 50.0
    if neg <= EPS:
        return 100.0
    ratio = pos / neg
    return 100.0 - 100.0 / (1.0 + ratio)


def _obv_slope(closes: Sequence[float], volumes: Sequence[float], window: int = 10) -> float:
    if not closes:
        return 0.0
    obv = [0.0]
    for i in range(1, len(closes)):
        direction = 1.0 if closes[i] > closes[i - 1] else -1.0 if closes[i] < closes[i - 1] else 0.0
        obv.append(obv[-1] + direction * volumes[i])
    sample = obv[-max(2, window) :]
    if len(sample) < 2:
        return 0.0
    x_mean = (len(sample) - 1) / 2.0
    y_mean = mean(sample)
    numerator = sum((i - x_mean) * (y - y_mean) for i, y in enumerate(sample))
    denominator = sum((i - x_mean) ** 2 for i in range(len(sample)))
    slope = numerator / max(denominator, EPS)
    scale = max(mean([abs(v) for v in volumes[-len(sample) :]]), EPS)
    return slope / scale


def _bollinger_width(closes: Sequence[float], period: int, stddev_mult: float) -> float:
    sample = list(closes[-max(2, period) :])
    if len(sample) < 2:
        return 0.0
    mid = mean(sample)
    sd = pstdev(sample)
    upper = mid + stddev_mult * sd
    lower = mid - stddev_mult * sd
    return (upper - lower) / max(abs(mid), EPS) * 100.0


def _macd(closes: Sequence[float]) -> Tuple[float, float]:
    fast = _ema(closes, 12)
    slow = _ema(closes, 26)
    line = [a - b for a, b in zip(fast, slow)]
    signal = _ema(line, 9)
    hist = [a - b for a, b in zip(line, signal)]
    if not hist:
        return 0.0, 0.0
    slope = hist[-1] - hist[-2] if len(hist) >= 2 else 0.0
    return hist[-1], slope


def _candle_quality(rows: Sequence[Dict[str, Any]]) -> Tuple[str, float, List[str]]:
    """Continuous candle score: body/wicks/location/context, not pattern-name-only."""
    if len(rows) < 2:
        return "NEUTRAL", 0.0, []

    curr = rows[-1]
    prev = rows[-2]
    rng = max(curr["high"] - curr["low"], EPS)
    body_signed = (curr["close"] - curr["open"]) / rng
    body_abs = abs(body_signed)
    upper = (curr["high"] - max(curr["open"], curr["close"])) / rng
    lower = (min(curr["open"], curr["close"]) - curr["low"]) / rng
    close_loc = (curr["close"] - curr["low"]) / rng

    score = 0.0
    notes: List[str] = []
    if body_signed > 0:
        score += min(35.0, body_abs * 50.0)
        if close_loc >= 0.75:
            score += 18.0
            notes.append("양봉 종가가 봉 상단부")
        if lower >= 0.25:
            score += min(15.0, lower * 30.0)
            notes.append("아래꼬리 매수 방어")
        if upper > 0.35:
            score -= min(20.0, upper * 30.0)
            notes.append("긴 윗꼬리 공급 압력")

        prev_bear = prev["close"] < prev["open"]
        engulf = (
            prev_bear
            and curr["open"] <= prev["close"]
            and curr["close"] >= prev["open"]
        )
        if engulf:
            score += 25.0
            notes.append("상승 장악형 구조")
        bias = "BULLISH"
    elif body_signed < 0:
        score -= min(35.0, body_abs * 50.0)
        if close_loc <= 0.25:
            score -= 18.0
        if upper >= 0.25:
            score -= min(15.0, upper * 30.0)
        if lower > 0.35:
            score += min(15.0, lower * 25.0)
        bias = "BEARISH"
    else:
        bias = "NEUTRAL"

    quality = max(0.0, min(100.0, 50.0 + score))
    if quality >= 58:
        bias = "BULLISH"
    elif quality <= 42:
        bias = "BEARISH"
    else:
        bias = "NEUTRAL"
    return bias, quality, notes


def _regime(
    close: float,
    ema20: float,
    ema50: float,
    ema200: float,
    adx: float,
    atr_pct: float,
    bb_width_pct: float,
) -> Tuple[str, str]:
    if close > ema20 > ema50 and (ema200 <= 0 or ema50 > ema200):
        trend = "UPTREND"
    elif close < ema20 < ema50 and (ema200 <= 0 or ema50 < ema200):
        trend = "DOWNTREND"
    else:
        trend = "MIXED"

    high_vol = atr_pct >= 3.0 or bb_width_pct >= 8.0
    if adx >= 25.0 and trend == "UPTREND":
        regime = "TREND_UP_HIGH_VOL" if high_vol else "TREND_UP"
    elif adx >= 25.0 and trend == "DOWNTREND":
        regime = "TREND_DOWN_HIGH_VOL" if high_vol else "TREND_DOWN"
    elif high_vol:
        regime = "RANGE_HIGH_VOL"
    else:
        regime = "RANGE"
    return regime, trend


def _pattern_probability(pattern_result: Any, prior_strength: float) -> float:
    if pattern_result is None or not getattr(pattern_result, "available", False):
        return 50.0
    success_rate = float(getattr(pattern_result, "success_rate", 50.0))
    n = max(0.0, float(getattr(pattern_result, "matched_count", 0)))
    weighted = (success_rate * n + 50.0 * max(prior_strength, 0.0)) / max(n + max(prior_strength, 0.0), EPS)
    return max(0.0, min(100.0, weighted))


def analyze_signal_quality(
    data: Any,
    pattern_result: Any = None,
    config: EnhancedSignalConfig | None = None,
) -> EnhancedSignalResult:
    cfg = config or EnhancedSignalConfig()
    rows = _records(data)
    if len(rows) < cfg.min_history:
        return EnhancedSignalResult(False, "insufficient_history")

    closes = [r["close"] for r in rows]
    highs = [r["high"] for r in rows]
    lows = [r["low"] for r in rows]
    volumes = [max(r["volume"], 0.0) for r in rows]

    ema9 = _ema(closes, 9)[-1]
    ema20 = _ema(closes, 20)[-1]
    ema50 = _ema(closes, 50)[-1]
    ema200_values = _ema(closes, 200)
    ema200 = ema200_values[-1] if len(rows) >= 200 else 0.0
    rsi = _rsi(closes, 14)[-1]

    atrs, plus_dis, minus_dis, adxs = _atr_adx(highs, lows, closes, cfg.adx_period)
    atr = atrs[-1]
    adx = adxs[-1]
    plus_di = plus_dis[-1]
    minus_di = minus_dis[-1]

    price = closes[-1]
    atr_pct = atr / max(price, EPS) * 100.0
    vwap = _vwap(rows, cfg.vwap_fallback_window)
    vwap_ext = (price / max(vwap, EPS) - 1.0) * 100.0
    rvol, volume_z = _rvol_and_zscore(volumes, cfg.rvol_period)
    cmf = _cmf(rows, cfg.cmf_period)
    mfi = _mfi(rows, cfg.mfi_period)
    obv_slope = _obv_slope(closes, volumes)
    bb_width = _bollinger_width(closes, cfg.bb_period, cfg.bb_stddev)
    macd_hist, macd_slope = _macd(closes)
    candle_bias, candle_quality, candle_notes = _candle_quality(rows)
    regime, trend_state = _regime(price, ema20, ema50, ema200, adx, atr_pct, bb_width)

    reasons: List[str] = []
    flags: List[str] = []
    score = 50.0

    if price > ema9 > ema20 > ema50:
        score += 12.0
        reasons.append("단기 EMA 정배열 + 가격 상단")
    elif price > ema20 > ema50:
        score += 7.0
        reasons.append("중단기 상승 추세")
    elif price < ema20:
        score -= 10.0
        flags.append("가격이 EMA20 아래")

    if adx >= cfg.strong_adx and plus_di > minus_di:
        score += 10.0
        reasons.append(f"ADX {adx:.1f} +DI 우위")
    elif adx >= cfg.min_adx and plus_di > minus_di:
        score += 5.0
    elif minus_di > plus_di and adx >= cfg.min_adx:
        score -= 9.0
        flags.append("-DI 우위 하락 추세")

    if macd_hist > 0 and macd_slope > 0:
        score += 7.0
        reasons.append("MACD 히스토그램 양수·확대")
    elif macd_hist < 0 and macd_slope < 0:
        score -= 7.0
        flags.append("MACD 하락 모멘텀 확대")

    if 50.0 <= rsi <= 72.0:
        score += 4.0
    elif rsi >= 80.0:
        score -= 6.0
        flags.append(f"RSI {rsi:.1f} 과열")

    if rvol >= cfg.strong_rvol:
        score += 11.0
        reasons.append(f"RVOL {rvol:.2f}배 강한 거래량")
    elif rvol >= cfg.min_rvol:
        score += 6.0
        reasons.append(f"RVOL {rvol:.2f}배 거래량 증가")
    elif rvol < 0.75:
        score -= 5.0
        flags.append("거래량 확인 부족")

    if cmf >= 0.05:
        score += 6.0
        reasons.append(f"CMF {cmf:+.2f} 자금 유입")
    elif cmf < cfg.min_cmf:
        score -= 5.0
        flags.append(f"CMF {cmf:+.2f} 자금 흐름 약함")

    if cfg.min_mfi <= mfi <= cfg.max_mfi:
        score += 3.0
    elif mfi > 90.0:
        score -= 5.0
        flags.append(f"MFI {mfi:.1f} 과열")

    if obv_slope > 0.15:
        score += 4.0
        reasons.append("OBV 기울기 상승")
    elif obv_slope < -0.15:
        score -= 4.0
        flags.append("OBV 하락")

    volume_confirmation = rvol >= cfg.min_rvol and cmf >= cfg.min_cmf and obv_slope > -0.15

    if candle_quality >= 65.0:
        score += 6.0
        reasons.extend(candle_notes[:2])
    elif candle_quality <= 35.0:
        score -= 8.0
        flags.append("현재 봉 매도 압력 우세")

    if price > vwap:
        score += 5.0
        reasons.append("VWAP 상단")
    else:
        score -= 7.0
        flags.append("VWAP 하단")

    if vwap_ext > cfg.max_vwap_extension_pct:
        score -= 9.0
        flags.append(f"VWAP +{vwap_ext:.1f}% 추격 위험")
    if atr > EPS and (price - ema20) / atr > cfg.max_atr_extension:
        score -= 7.0
        flags.append("EMA20 대비 ATR 과대이격")
    if volume_z > cfg.max_volume_zscore:
        flags.append(f"거래량 Z {volume_z:.1f} 비정상 급증")

    pattern_prob = _pattern_probability(pattern_result, cfg.probability_prior_strength)
    if pattern_result is not None and getattr(pattern_result, "available", False):
        pscore = float(getattr(pattern_result, "profit_score", 50.0))
        similarity = float(getattr(pattern_result, "similarity", 0.0))
        edge = float(getattr(pattern_result, "success_similarity", 0.0)) - float(
            getattr(pattern_result, "failure_similarity", 0.0)
        )
        score += (pscore - 50.0) * 0.22
        if similarity >= 65.0:
            score += 3.0
        if edge < 0:
            score -= 5.0
            flags.append("실패 패턴 유사도가 더 높음")
        reasons.append(
            f"과거 유사패턴 상승비중 {float(getattr(pattern_result, 'success_rate', 50.0)):.1f}%"
        )

    score = max(0.0, min(100.0, score))
    technical_prob = 50.0 + (score - 50.0) * 0.55
    rise_probability = 0.72 * pattern_prob + 0.28 * technical_prob
    rise_probability = max(5.0, min(95.0, rise_probability))

    gross_ev = (
        float(getattr(pattern_result, "avg_forward_return", 0.0))
        if pattern_result is not None and getattr(pattern_result, "available", False)
        else 0.0
    )
    friction_pct = (cfg.round_trip_fee_bps + cfg.slippage_bps) / 100.0
    net_ev = gross_ev - friction_pct

    if gross_ev > 0:
        reasons.append(f"유사패턴 평균 후행수익 {gross_ev:+.2f}%")
    if net_ev < cfg.min_net_ev_pct:
        flags.append(f"비용 차감 기대값 {net_ev:+.2f}% 부족")

    return EnhancedSignalResult(
        available=True,
        reason="ok",
        quality_score=round(score, 2),
        rise_probability=round(rise_probability, 2),
        net_expected_value_pct=round(net_ev, 3),
        gross_expected_value_pct=round(gross_ev, 3),
        regime=regime,
        trend_state=trend_state,
        candle_bias=candle_bias,
        candle_quality=round(candle_quality, 2),
        volume_confirmation=volume_confirmation,
        rvol=round(rvol, 3),
        volume_zscore=round(volume_z, 3),
        adx=round(adx, 2),
        plus_di=round(plus_di, 2),
        minus_di=round(minus_di, 2),
        atr_pct=round(atr_pct, 3),
        vwap=round(vwap, 8),
        vwap_extension_pct=round(vwap_ext, 3),
        mfi=round(mfi, 2),
        cmf=round(cmf, 4),
        obv_slope=round(obv_slope, 4),
        bb_width_pct=round(bb_width, 3),
        macd_hist=round(macd_hist, 8),
        macd_hist_slope=round(macd_slope, 8),
        reasons=tuple(reasons),
        risk_flags=tuple(flags),
    )


def multi_timeframe_confirmation(
    timeframes: Dict[str, Any],
    pattern_results: Optional[Dict[str, Any]] = None,
    config: EnhancedSignalConfig | None = None,
) -> Dict[str, Any]:
    """Analyze optional 1m/3m/5m/15m/1h/etc frames without forcing a UI change."""
    pattern_results = pattern_results or {}
    results: Dict[str, EnhancedSignalResult] = {}
    for name, frame in timeframes.items():
        try:
            results[name] = analyze_signal_quality(frame, pattern_results.get(name), config)
        except (KeyError, TypeError, ValueError, ZeroDivisionError):
            continue

    available = [r for r in results.values() if r.available]
    if not available:
        return {"available": False, "score": 50.0, "confirmed": False, "results": results}

    weights = {
        "1m": 0.10,
        "3m": 0.12,
        "5m": 0.18,
        "15m": 0.24,
        "30m": 0.12,
        "1h": 0.16,
        "4h": 0.05,
        "1d": 0.03,
    }
    weighted_sum = 0.0
    weight_sum = 0.0
    bullish_frames = 0
    for name, result in results.items():
        if not result.available:
            continue
        w = weights.get(name, 0.10)
        weighted_sum += result.quality_score * w
        weight_sum += w
        if result.trend_state == "UPTREND" and result.quality_score >= 55.0:
            bullish_frames += 1

    score = weighted_sum / max(weight_sum, EPS)
    return {
        "available": True,
        "score": round(score, 2),
        "confirmed": bullish_frames >= min(2, len(available)),
        "bullish_frames": bullish_frames,
        "analyzed_frames": len(available),
        "results": results,
    }
