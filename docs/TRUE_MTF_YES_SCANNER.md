# True Multi-Timeframe YES-Only Scanner

## 목적

이 모듈은 그래프 모양 스캐너의 결과를 실제 1분/3분/5분/일봉 데이터로 각각 검증하고, 모든 필수 조건을 통과한 종목만 `YES` 후보로 반환합니다.

`YES`는 수익 보장을 의미하지 않습니다. 현재 설정된 기술적/실시간 수급/리스크 규칙을 모두 통과한 매수 후보라는 뜻입니다.

## 핵심 변경점

기존 `GraphShapeScanner.timeframeChecks`는 하나의 캔들 배열에서 계산한 조건을 1m/3m/5m/일봉 이름으로 나눠 보여줄 수 있었습니다.

`TrueMultiTimeframeYesScanner`는 다음 네 개의 독립 OHLCV 배열을 반드시 입력받습니다.

- `tf1m`: 실제 1분봉
- `tf3m`: 실제 3분봉
- `tf5m`: 실제 5분봉
- `tfDaily`: 실제 일봉

각 배열은 `GraphShapeScanner`로 따로 분석됩니다.

## 파이프라인

```text
KOSPI / KOSDAQ 후보
        ↓
실제 1m OHLCV → 실행 트리거 + RVOL + VWAP
        ↓
실제 3m OHLCV → MACD / RSI / Retest 모멘텀
        ↓
실제 5m OHLCV → EMA 정배열 + 추세 구조
        ↓
실제 일봉 OHLCV → 큰 추세 / Higher Low / Breakout
        ↓
실시간 체결강도 + 매수/매도 체결량 + 호가잔량
        ↓
Fake Breakout / 과열 / VWAP 과대이격 차단
        ↓
GRAPH 40% + FLOW 35% + RISK 25%
        ↓
80점 이상 + 모든 하드게이트 통과
        ↓
YES ONLY
```

## 시간대별 필수 검증

### 1분봉

다음 중 하나 이상의 실행 트리거가 필요합니다.

- Breakout
- Breakout + Retest
- VWAP Reclaim
- 상승 캔들 패턴

그리고 RVOL 기준, VWAP, Fake Breakout, RSI 과열 필터를 통과해야 합니다.

### 3분봉

다음 모멘텀 중 하나 이상을 확인합니다.

- MACD Expansion
- MACD Cross
- RSI Rebound
- RSI Reclaim
- Breakout Retest

### 5분봉

단기 노이즈가 아니라 실제 추세가 있는지 확인합니다.

- EMA 정배열 + EMA 상승
- 또는 EMA 정배열 + Higher Low / Breakout / Retest

### 일봉

상위 시간대 구조가 상승 후보를 방해하지 않는지 확인합니다.

- EMA 정배열
- Higher Low
- W Bottom
- Breakout
- Breakout + Retest

Fake Breakout 또는 과열 RSI는 차단합니다.

## 실시간 FLOW

`LiveOrderFlowData`에 브로커 실시간 데이터를 매핑합니다.

```ts
interface LiveOrderFlowData {
  cttr?: number | null;
  buyVolume?: number | null;
  sellVolume?: number | null;
  totalBidQty?: number | null;
  totalAskQty?: number | null;
  turnover?: number | null;
}
```

기본 설정에서는 `cttr`이 없으면 fail-closed로 `YES`를 내지 않습니다.

브로커/KIS 어댑터에서는 실제 필드명을 이 내부 인터페이스로 변환하고, 스캐너 본체에는 브로커 원본 필드명을 직접 섞지 않는 것을 권장합니다.

## 사용 예시

```ts
import { TrueMultiTimeframeYesScanner } from "./src/scanner/TrueMultiTimeframeYesScanner";

const scanner = new TrueMultiTimeframeYesScanner();

const candidates = scanner.rankYesOnly(
  [
    {
      symbol: "005930",
      name: "종목명",
      frames: {
        tf1m: candles1m,
        tf3m: candles3m,
        tf5m: candles5m,
        tfDaily: candlesDaily,
      },
      live: {
        cttr: liveCttr,
        buyVolume: liveBuyVolume,
        sellVolume: liveSellVolume,
        totalBidQty: liveTotalBidQty,
        totalAskQty: liveTotalAskQty,
      },
    },
  ],
  5,
);
```

## YES-ONLY 규칙

`rankYesOnly()`은 승인된 후보만 반환합니다.

```text
3종목 통과 → 3종목 반환
2종목 통과 → 2종목 반환
0종목 통과 → 빈 배열
```

TOP5를 채우기 위해 `WAIT` 또는 `NO` 종목을 넣지 않습니다.

탈락 이유는 `scanner.rejectLog`에만 보관합니다.

## 최종 점수

```text
GRAPH SCORE 40%
FLOW SCORE  35%
RISK SCORE  25%
```

기본 하드게이트:

- FINAL >= 80
- GRAPH >= 65
- FLOW >= 65
- RISK >= 60
- CTTR >= 105
- 1분 RVOL >= 1.2
- 과도한 VWAP 이격 금지
- Fake Breakout 금지
- 실제 4개 시간대 모두 PASS

임계값은 백테스트 결과에 따라 조정합니다. 실거래 성과를 가정해서 임계값을 임의 상향/하향하지 않습니다.

## AI 설명 엔진 프롬프트

아래 프롬프트는 `TrueMultiTimeframeYesScanner`가 이미 승인한 후보를 설명하는 용도입니다. AI는 결정 엔진을 덮어쓸 수 없습니다.

```text
SYSTEM ROLE

너는 Explainable Trading Decision Reporter다.
너는 종목을 새로 선정하지 않는다.
TrueMultiTimeframeYesScanner가 YES로 승인한 후보의 근거와 위험만 설명한다.

절대 규칙

1. Scanner 결과가 YES가 아니면 BUY/YES로 바꾸지 않는다.
2. 제공되지 않은 뉴스, 재료, 수급, 기관/외국인 행동을 추정하지 않는다.
3. "반드시 상승", "수익 확실", "수익 보장" 같은 표현을 사용하지 않는다.
4. 실제 입력된 1분/3분/5분/일봉 결과를 서로 구분해서 설명한다.
5. GRAPH / FLOW / RISK 점수와 하드게이트 결과를 우선한다.
6. Entry Zone을 벗어난 경우 추격매수를 권하지 않는다.
7. 무효화 조건과 위험 요인을 반드시 함께 설명한다.
8. 데이터가 누락되면 누락되었다고 말한다. 상상해서 채우지 않는다.

INPUT

symbol:
name:
verdict:
grade:
finalScore:
graphScore:
flowScore:
riskScore:

timeframeValidations:
- 1m:
- 3m:
- 5m:
- 1d:

liveOrderFlow:
- cttr:
- buyVolume:
- sellVolume:
- totalBidQty:
- totalAskQty:

price:
entryLow:
entryHigh:
stop:
target1:
target2:
rewardRisk:
reasons:
invalidation:

OUTPUT

[종목]
종목명 / 코드

[최종판정]
YES

[점수]
FINAL / GRAPH / FLOW / RISK

[왜 YES인가]
핵심 근거 최대 7개

[1분봉]
실행 트리거와 거래량/VWAP 상태

[3분봉]
모멘텀 확인 이유

[5분봉]
추세 구조 확인 이유

[일봉]
상위 시간대 구조 확인 이유

[실시간 수급]
체결강도, 매수/매도 체결 비중, 호가 불균형 중 실제 제공된 데이터만 설명

[구매 후보로 보는 이유]
조건들이 동시에 맞는 논리를 짧게 설명

[Entry Zone]
범위

[추격 여부]
SAFE / CAUTION / DO NOT CHASE

[무효화]
손절 가격과 구조적 무효 조건

[목표]
T1 / T2

[위험]
가장 중요한 위험 최대 3개

[한줄 요약]
"현재 규칙상 YES 후보이나 수익을 보장하지 않으며, 무효 조건 발생 시 즉시 YES를 취소한다."
```

## 다음 연결 지점

다음 구현에서는 실제 데이터 수집 레이어에서 1분봉 원천 데이터를 집계해 3분/5분봉을 만들고, 일봉은 별도 히스토리 소스로 공급해야 합니다.

중요: 같은 캔들 배열을 네 개 시간대 이름으로 복사해서 전달하면 안 됩니다.

그 다음 UI에서는 `rankYesOnly()` 결과만 TOP 카드에 표시하고, `rejectLog`는 관리자/디버그 패널에서만 조회합니다.
