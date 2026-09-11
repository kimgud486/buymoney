from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from enhanced_signal_engine import (
    EnhancedSignalConfig,
    EnhancedSignalResult,
    analyze_signal_quality,
    multi_timeframe_confirmation,
)
from pattern_similarity import PatternSimilarityConfig, match_current_pattern
from yes_only_scanner import BuyCandidate, LiveData, YesOnlyScanner


@dataclass(frozen=True)
class RealtimePatternScannerConfig:
    pattern: PatternSimilarityConfig = field(default_factory=PatternSimilarityConfig)
    enhanced: EnhancedSignalConfig = field(default_factory=EnhancedSignalConfig)

    min_pattern_score: float = 58.0
    min_success_rate: float = 52.0
    min_success_edge: float = 0.0
    min_quality_score: float = 58.0
    min_rise_probability: float = 51.0
    min_net_ev_pct: float = 0.0

    require_volume_confirmation: bool = True
    reject_exhaustion_risk: bool = True
    require_multi_timeframe_confirmation: bool = False
    max_results: int = 20


@dataclass
class RealtimePatternCandidate:
    symbol: str
    name: str
    price: float

    pattern_score: float
    quality_score: float
    rise_probability: float
    net_expected_value_pct: float

    historical_success_rate: float
    similarity: float
    success_similarity: float
    failure_similarity: float
    avg_forward_return: float
    median_forward_return: float
    avg_mfe: float
    avg_mae: float

    regime: str
    trend_state: str
    candle_bias: str
    candle_quality: float
    volume_confirmation: bool
    rvol: float
    adx: float
    cmf: float
    mfi: float
    vwap_extension_pct: float

    reference_samples: int
    matched_samples: int
    multi_timeframe_score: Optional[float] = None
    multi_timeframe_confirmed: Optional[bool] = None

    yes_candidate: Optional[BuyCandidate] = None
    reasons: List[str] = field(default_factory=list)
    risk_flags: List[str] = field(default_factory=list)

    @property
    def yes_confirmed(self) -> bool:
        return self.yes_candidate is not None

    @property
    def combined_score(self) -> float:
        """
        Pattern analogs + feature quality + existing strict YES engine.

        A historical lookalike alone never creates YES. If the strict engine rejects,
        this remains a WATCH candidate even when the research scores are high.
        """
        if self.yes_candidate is None:
            return round(
                min(100.0, self.pattern_score * 0.40 + self.quality_score * 0.60),
                1,
            )
        return round(
            min(
                100.0,
                self.pattern_score * 0.20
                + self.quality_score * 0.35
                + self.yes_candidate.score * 0.45,
            ),
            1,
        )


class RealtimePatternScanner:
    """
    Leak-safe, evidence-stacked realtime market scanner.

    1) Historical analog matching
    2) True ADX/DMI + VWAP + RVOL + MFI/CMF/OBV + candle-quality validation
    3) Optional multi-timeframe confirmation
    4) Existing strict YesOnlyScanner hard gate

    Scores are research evidence, not guaranteed returns or automatic order instructions.
    """

    def __init__(
        self,
        config: RealtimePatternScannerConfig | None = None,
        yes_scanner: YesOnlyScanner | None = None,
    ) -> None:
        self.cfg = config or RealtimePatternScannerConfig()
        self.yes_scanner = yes_scanner or YesOnlyScanner()

    def analyze_symbol(self, symbol: str, data: dict) -> Optional[RealtimePatternCandidate]:
        raw_df = data["df"]
        live = data.get("live") or LiveData()
        name = data.get("name", symbol)

        # Stage 1: compare the current completed window with leak-safe historical analogs.
        pattern_result = match_current_pattern(raw_df, self.cfg.pattern)
        if not pattern_result.available:
            return None

        pattern_edge = pattern_result.success_similarity - pattern_result.failure_similarity
        if pattern_result.profit_score < self.cfg.min_pattern_score:
            return None
        if pattern_result.success_rate < self.cfg.min_success_rate:
            return None
        if pattern_edge < self.cfg.min_success_edge:
            return None

        # Stage 2: independently validate the current tape/indicator state.
        enhanced = analyze_signal_quality(
            raw_df,
            pattern_result=pattern_result,
            config=self.cfg.enhanced,
        )
        if not enhanced.available:
            return None
        if enhanced.quality_score < self.cfg.min_quality_score:
            return None
        if enhanced.rise_probability < self.cfg.min_rise_probability:
            return None
        if enhanced.net_expected_value_pct < self.cfg.min_net_ev_pct:
            return None
        if self.cfg.require_volume_confirmation and not enhanced.volume_confirmation:
            return None

        # Hard chase/exhaustion guard. A strong pattern must not override a bad entry location.
        if self.cfg.reject_exhaustion_risk:
            hard_risk_prefixes = (
                "VWAP +",
                "EMA20 대비 ATR 과대이격",
                "-DI 우위 하락 추세",
                "RSI ",
                "MFI ",
            )
            if any(
                any(flag.startswith(prefix) for prefix in hard_risk_prefixes)
                for flag in enhanced.risk_flags
            ):
                return None

        # Stage 3: optional cross-timeframe confirmation. Existing callers need no change.
        mtf_score: Optional[float] = None
        mtf_confirmed: Optional[bool] = None
        timeframes = data.get("timeframes")
        if isinstance(timeframes, dict) and timeframes:
            mtf = multi_timeframe_confirmation(timeframes, config=self.cfg.enhanced)
            if mtf.get("available"):
                mtf_score = float(mtf["score"])
                mtf_confirmed = bool(mtf["confirmed"])
                if self.cfg.require_multi_timeframe_confirmation and not mtf_confirmed:
                    return None
        elif self.cfg.require_multi_timeframe_confirmation:
            return None

        # Stage 4: keep the repository's strict YES hard gate.
        yes_candidate = self.yes_scanner.analyze(
            symbol=symbol,
            name=name,
            raw_df=raw_df,
            live=live,
        )

        # When TA-Lib is absent, the older fallback can overstate ADX.
        # The enhanced engine's correctly calculated Wilder ADX is authoritative.
        if (
            yes_candidate is not None
            and enhanced.adx < self.yes_scanner.cfg.min_adx
        ):
            yes_candidate = None

        price = self._last_close(raw_df)
        reasons = [
            f"과거 유사패턴 {pattern_result.matched_count}개 대조",
            f"유사패턴 상승비중 {pattern_result.success_rate:.1f}%",
            f"상승패턴 유사도 {pattern_result.success_similarity:.1f}%",
            f"실패패턴 유사도 {pattern_result.failure_similarity:.1f}%",
            f"실전 품질점수 {enhanced.quality_score:.1f}/100",
            f"보수적 상승확률 추정 {enhanced.rise_probability:.1f}%",
            f"비용 차감 기대값 {enhanced.net_expected_value_pct:+.2f}%",
            f"시장상태 {enhanced.regime}",
            f"RVOL {enhanced.rvol:.2f} / ADX {enhanced.adx:.1f}",
            f"CMF {enhanced.cmf:+.2f} / MFI {enhanced.mfi:.1f}",
        ]
        reasons.extend(list(enhanced.reasons[:5]))

        if mtf_score is not None:
            reasons.append(
                f"멀티타임프레임 {mtf_score:.1f}/100 "
                f"({'확인' if mtf_confirmed else '불일치'})"
            )

        if yes_candidate is not None:
            reasons.append(f"기존 YES 엔진 동시 통과 {yes_candidate.score:.1f}/100")
        else:
            reasons.append("연구 후보이나 기존 YES 하드게이트는 미통과")

        return RealtimePatternCandidate(
            symbol=symbol,
            name=name,
            price=price,
            pattern_score=pattern_result.profit_score,
            quality_score=enhanced.quality_score,
            rise_probability=enhanced.rise_probability,
            net_expected_value_pct=enhanced.net_expected_value_pct,
            historical_success_rate=pattern_result.success_rate,
            similarity=pattern_result.similarity,
            success_similarity=pattern_result.success_similarity,
            failure_similarity=pattern_result.failure_similarity,
            avg_forward_return=pattern_result.avg_forward_return,
            median_forward_return=pattern_result.median_forward_return,
            avg_mfe=pattern_result.avg_mfe,
            avg_mae=pattern_result.avg_mae,
            regime=enhanced.regime,
            trend_state=enhanced.trend_state,
            candle_bias=enhanced.candle_bias,
            candle_quality=enhanced.candle_quality,
            volume_confirmation=enhanced.volume_confirmation,
            rvol=enhanced.rvol,
            adx=enhanced.adx,
            cmf=enhanced.cmf,
            mfi=enhanced.mfi,
            vwap_extension_pct=enhanced.vwap_extension_pct,
            reference_samples=pattern_result.sample_count,
            matched_samples=pattern_result.matched_count,
            multi_timeframe_score=mtf_score,
            multi_timeframe_confirmed=mtf_confirmed,
            yes_candidate=yes_candidate,
            reasons=reasons,
            risk_flags=list(enhanced.risk_flags),
        )

    def scan_market(
        self,
        universe: Dict[str, dict],
        top_n: Optional[int] = None,
    ) -> List[RealtimePatternCandidate]:
        """Scan all supplied symbols and rank positive-EV, validated evidence first."""
        candidates: List[RealtimePatternCandidate] = []
        for symbol, data in universe.items():
            try:
                result = self.analyze_symbol(symbol, data)
            except (KeyError, TypeError, ValueError, ZeroDivisionError):
                # One malformed symbol must never stop a market-wide scan.
                continue
            if result is not None:
                candidates.append(result)

        candidates.sort(
            key=lambda x: (
                1 if x.yes_confirmed else 0,
                x.combined_score,
                x.net_expected_value_pct,
                x.rise_probability,
                x.historical_success_rate,
                x.success_similarity - x.failure_similarity,
            ),
            reverse=True,
        )
        limit = self.cfg.max_results if top_n is None else max(0, int(top_n))
        return candidates[:limit]

    @staticmethod
    def _last_close(raw_df) -> float:
        if hasattr(raw_df, "iloc"):
            return float(raw_df.iloc[-1]["close"])
        return float(raw_df[-1]["close"])


def scan_market_pattern_similarity(
    universe: Dict[str, dict],
    top_n: int = 10,
    config: RealtimePatternScannerConfig | None = None,
) -> List[RealtimePatternCandidate]:
    """Drop-in market scanner entrypoint for API/UI workers."""
    return RealtimePatternScanner(config=config).scan_market(universe, top_n=top_n)


def print_pattern_candidates(candidates: List[RealtimePatternCandidate]) -> None:
    if not candidates:
        print("현재 통계·거래량·기대값 기준을 통과한 실시간 패턴 후보 없음")
        return

    print("🔥 REALTIME EVIDENCE-STACKED CANDIDATES")
    print("=" * 84)
    for rank, x in enumerate(candidates, start=1):
        state = "YES CONFIRMED" if x.yes_confirmed else "PATTERN WATCH"
        print(f"#{rank} {x.name} ({x.symbol}) | {state}")
        print(f"COMBINED SCORE : {x.combined_score:.1f}/100")
        print(f"PATTERN SCORE  : {x.pattern_score:.1f}/100")
        print(f"QUALITY SCORE  : {x.quality_score:.1f}/100")
        print(f"RISE ESTIMATE  : {x.rise_probability:.1f}%")
        print(f"NET EV         : {x.net_expected_value_pct:+.2f}%")
        print(f"REGIME         : {x.regime}")
        print(f"SUCCESS RATE   : {x.historical_success_rate:.1f}%")
        print(f"SUCCESS / FAIL : {x.success_similarity:.1f}% / {x.failure_similarity:.1f}%")
        print(f"RVOL / ADX     : {x.rvol:.2f} / {x.adx:.1f}")
        print(f"MFE / MAE      : {x.avg_mfe:+.2f}% / {x.avg_mae:+.2f}%")
        print(f"REFERENCE      : {x.reference_samples} windows")
        if x.risk_flags:
            print("RISK            :", " | ".join(x.risk_flags[:4]))
        for reason in x.reasons[:12]:
            print(" ✅", reason)
        print()
