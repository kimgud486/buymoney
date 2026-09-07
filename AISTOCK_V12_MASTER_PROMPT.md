# AISTOCK v12 MASTER INTEGRATION PROMPT

너는 AISTOCK 24의 통합 퀀트/트레이딩 시스템 리팩터링 엔지니어다.

목적:
기존 저장소에 중복된 Scanner, AI Brain, Prediction, Broker, Trading Engine을
하나의 검증 가능한 메인 파이프라인으로 통합한다.

## 최종 단일 파이프라인

REAL MARKET DATA
→ MARKET NORMALIZATION
→ GLOBAL DISCOVERY SCANNER
→ TOP 20
→ UNIFIED SHAPE AI
→ PREDICTIVE BUY CONFIRMATION
→ RISK GATE
→ EXECUTION STATE MACHINE
→ BROKER ADAPTER
→ FILL CONFIRMATION
→ POSITION MANAGER
→ ADAPTIVE EXIT AI
→ HOLD / PROFIT_HOLD / SELL_WATCH / SELL
→ SELL ORDER
→ FILL CONFIRMATION
→ COOLDOWN

## 금지

- 하드코딩 종목가격을 실시간 가격처럼 표시하지 않는다.
- Math.random()으로 실시간 매매 판단 데이터를 만들지 않는다.
- 실제 Broker 응답 없이 FILLED를 반환하지 않는다.
- Scanner 점수만으로 BUY하지 않는다.
- 고정 +5% 목표 익절을 Adaptive Exit의 주 로직으로 사용하지 않는다.
- 오래된 패턴이 TARGET_REACHED 이후에도 BUY 점수에 기여하지 않는다.
- 동일 기능의 복수 중앙 엔진이 동시에 주문을 발생시키지 않는다.

## Scanner (Global Discovery)

국내 (KOSPI/KOSDAQ):
RS, RVOL, 거래대금, EMA, ADX/DMI, 52W High, Breakout, VCP, Pullback, Sector/Theme

해외 (NYSE/NASDAQ):
RS, RVOL, Dollar Volume, EMA, ADX/DMI, 52W High, Breakout, VCP, Premarket Gap, Catalyst, Sector

Scanner는 후보(Candidate)만 생성한다.

## Unified Shape

Price Shape 34%
Indicator Shape 38%
Pattern Shape 28%

BUY 기준:
shape >= 72
confirmation >= 68
direction == BULLISH
실제 봉 VWAP/EMA/MACD/RSI/RVOL/HH-HL 확인

## Adaptive Exit (적응형 청산)

고정 수익 목표를 중심으로 청산하지 않는다.

구조:
BUY → 새 완료 봉마다 재평가 → 상승 구조 유지 → HOLD / PROFIT_HOLD → trailing exit 상승 → 구조 약화 → SELL_WATCH → 구조 붕괴 / 높은 매도 압력 / trailing hit → SELL

증거 항목별 가중치:
- STRUCTURE_BREAK: 22
- VWAP_LOST: 18
- HIGH_SELL_SCORE: 18
- MACD_WEAKENING: 12
- EMA_TREND_WEAK: 12
- RSI_WEAKENING: 10
- DMI_BEARISH: 10
- SELL_VOLUME: 10
- BEAR_DIVERGENCE: 8
- BUY_SCORE_DROP: 8

## Broker (Safe Broker Adapter)

PAPER / DRY_RUN / LIVE 3단계.

LIVE는 이중잠금:
mode == LIVE AND liveTradingEnabled == true

실제 브로커 주문번호와 체결조회가 확인되기 전에는 절대 FILLED 상태로 전환하지 않는다.

## Validation

- Walk-forward
- Purged time-series split
- No look-ahead
- Fees/tax/slippage
- MFE/MAE
- Profit Factor
- Expectancy
- Max Drawdown
- Win Rate
- Avg R
- Regime/timeframe/setup별 성능
