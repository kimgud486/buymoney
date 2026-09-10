from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from pattern_similarity import PatternSimilarityConfig, PatternSimilarityResult, match_current_pattern
from yes_only_scanner import BuyCandidate, LiveData, YesOnlyScanner


@dataclass(frozen=True)
class RealtimePatternScannerConfig:
    pattern: PatternSimilarityConfig = field(default_factory=PatternSimilarityConfig)
    min_pattern_score: float = 58.0
    min_success_rate: float = 52.0
    min_success_edge: float = 0.0
    max_results: int = 20


@dataclass
class RealtimePatternCandidate:
    symbol: str
    name: str
    price: float
    pattern_score: float
    historical_success_rate: float
    similarity: float
    success_similarity: float
    failure_similarity: float
    avg_forward_return: float
    median_forward_return: float
    avg_mfe: float
    avg_mae: float
    reference_samples: int
    matched_samples: int
    yes_candidate: Optional[BuyCandidate] = None
    reasons: List[str] = field(default_factory=list)

    @property
    def yes_confirmed(self) -> bool:
        return self.yes_candidate is not None

    @property
    def combined_score(self) -> float:
        """Pattern evidence + existing strict YES engine. Never converts a reject into YES."""
        if self.yes_candidate is None:
            return round(self.pattern_score, 1)
        return round(min(100.0, self.pattern_score * 0.45 + self.yes_candidate.score * 0.55), 1)


class RealtimePatternScanner:
    """
    Two-stage scanner for a whole market universe.

    Stage 1 compares every symbol's recent OHLCV shape against outcome-labelled historical
    windows. Stage 2 runs the repository's existing strict YesOnlyScanner. A pattern match is
    evidence, not an order instruction; only the existing YES gate can set yes_confirmed=True.
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

        pattern_result = match_current_pattern(raw_df, self.cfg.pattern)
        if not pattern_result.available:
            return None

        edge = pattern_result.success_similarity - pattern_result.failure_similarity
        if pattern_result.profit_score < self.cfg.min_pattern_score:
            return None
        if pattern_result.success_rate < self.cfg.min_success_rate:
            return None
        if edge < self.cfg.min_success_edge:
            return None

        price = self._last_close(raw_df)
        yes_candidate = self.yes_scanner.analyze(
            symbol=symbol,
            name=name,
            raw_df=raw_df,
            live=live,
        )

        reasons = [
            f"과거 유사패턴 {pattern_result.matched_count}개 대조",
            f"유사패턴 성공비중 {pattern_result.success_rate:.1f}%",
            f"상승패턴 유사도 {pattern_result.success_similarity:.1f}%",
            f"실패패턴 유사도 {pattern_result.failure_similarity:.1f}%",
            f"평균 후행수익률 {pattern_result.avg_forward_return:+.2f}%",
        ]
        if yes_candidate is not None:
            reasons.append(f"기존 YES 엔진 동시 통과 {yes_candidate.score:.1f}/100")
        else:
            reasons.append("패턴 후보이나 기존 YES 하드게이트는 미통과")

        return RealtimePatternCandidate(
            symbol=symbol,
            name=name,
            price=price,
            pattern_score=pattern_result.profit_score,
            historical_success_rate=pattern_result.success_rate,
            similarity=pattern_result.similarity,
            success_similarity=pattern_result.success_similarity,
            failure_similarity=pattern_result.failure_similarity,
            avg_forward_return=pattern_result.avg_forward_return,
            median_forward_return=pattern_result.median_forward_return,
            avg_mfe=pattern_result.avg_mfe,
            avg_mae=pattern_result.avg_mae,
            reference_samples=pattern_result.sample_count,
            matched_samples=pattern_result.matched_count,
            yes_candidate=yes_candidate,
            reasons=reasons,
        )

    def scan_market(self, universe: Dict[str, dict], top_n: Optional[int] = None) -> List[RealtimePatternCandidate]:
        """Scan all supplied symbols and rank the strongest evidence first."""
        candidates: List[RealtimePatternCandidate] = []
        for symbol, data in universe.items():
            try:
                result = self.analyze_symbol(symbol, data)
            except (KeyError, TypeError, ValueError, ZeroDivisionError):
                # A malformed symbol must not stop the market-wide scan.
                continue
            if result is not None:
                candidates.append(result)

        candidates.sort(
            key=lambda x: (
                1 if x.yes_confirmed else 0,
                x.combined_score,
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
        print("현재 통계 기준을 통과한 실시간 패턴 후보 없음")
        return

    print("🔥 REALTIME PATTERN MATCH CANDIDATES")
    print("=" * 76)
    for rank, x in enumerate(candidates, start=1):
        state = "YES CONFIRMED" if x.yes_confirmed else "PATTERN WATCH"
        print(f"#{rank} {x.name} ({x.symbol}) | {state}")
        print(f"COMBINED SCORE : {x.combined_score:.1f}/100")
        print(f"PATTERN SCORE  : {x.pattern_score:.1f}/100")
        print(f"SUCCESS RATE   : {x.historical_success_rate:.1f}%")
        print(f"SUCCESS SIM    : {x.success_similarity:.1f}%")
        print(f"FAILURE SIM    : {x.failure_similarity:.1f}%")
        print(f"AVG FWD RETURN : {x.avg_forward_return:+.2f}%")
        print(f"MFE / MAE      : {x.avg_mfe:+.2f}% / {x.avg_mae:+.2f}%")
        print(f"REFERENCE      : {x.reference_samples} windows")
        for reason in x.reasons:
            print(" ✅", reason)
        print()
