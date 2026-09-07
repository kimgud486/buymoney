# AISTOCK v12.1 패치 적용 가이드 (AISTOCK v12.1 Patch Guide)

본 문서는 AISTOCK v12.1 고성능 퀀트 파이프라인 패치의 핵심 변경사항 및 검증 가이드입니다.

---

## 1. 주요 핵심 개선 내용

### ① 가짜 지표 제거 및 실제 OHLCV 보정 (`RealMarketIndicatorProvider.ts`)
- **이전 문제**: 난수 생성 및 단순 고정비율로 SMA, VWAP, ADX, RSI를 추정함.
- **개선**: 실제 전달되는 OHLCV 봉 데이터(Bars Array)를 받아 순수 수학 알고리즘으로 지표를 계산.
  - **SMA 5 / 20 / 60**: 실제 종가 추적
  - **VWAP**: `(High + Low + Close) / 3 * Volume` 누적 합산 계산
  - **ADX & DMI(+/-)**: True Range(TR) 및 Smoothed Directional Movement 기반
  - **ATR (14)**: 변동성 추적 및 Trailing Stop 연산
  - **52주 신고가/신저가**: 데이터 배열 내 최고가/최저가 추적

### ② 단일 강제 관문 (Unified BUY Gate `UnifiedBuyGateV121.ts`)
- **이전 문제**: 스캐너, AI 브레인, UI 매수 버튼 등이 독립적으로 주문 생성.
- **개선**: 모든 매수 시그널은 `UnifiedBuyGateV121`을 거쳐야만 주문 전송 가능.
  - Scanner Score ≥ 72
  - Shape AI Score ≥ 72
  - Confirmation Score ≥ 68
  - Direction == BULLISH
  - Risk Gate 승인 (포지션 한도, 쿨다운, 잔고검사)
  - 단일 active position 유효성 검사

### ③ KIS 국내/미국 주문 분리 & ODNO 상태 엄격화 (`BrokerApiClientV121.ts` / `KISBrokerGatewayV121.ts`)
- **이전 문제**: `ODNO`(주문번호)를 수신하면 즉시 `FILLED`로 오인 처리하거나, 국내/미국 TR_ID 구분 미비.
- **개선**:
  - **국내 (KOREA)**: `TTTC0802U` (매수) / `TTTC0801U` (매도)
  - **미국 (US)**: `VTTT1002U` (모의 매수) / `JTTT1002U` (실거래 매수), `VTTT1001U` / `JTTT1001U` (매도)
  - **ODNO 반환 시**: `PENDING` (주문 접수 완료) 상태로 지정. 체결 확인 조회(`checkFillStatus`)를 통해 실제 체결 수량이 확인된 경우에만 `FILLED` 상태로 전이 (Fail-closed 보안).

### ④ 완료봉 Adaptive Exit + ATR/HH-HL Trailing (`AdaptiveExitDecisionEngineV121.ts`)
- **이전 문제**: 미완성 실시간 틱 흔들림에 의한 조기 손절/익절 문제.
- **개선**:
  - `isCompletedBar === true` 인 완료된 확정 봉에서만 청산 AI 평가 수행.
  - ATR 기반 다이나믹 Trailing Stop (`Current Price < Highest - ATR * 2.0`).
  - HH-HL (Higher High / Higher Low) 파동 구조 파괴 시 점수 가중치 적용.

---

## 2. 파일 구성 현황

- `OPEN_SOURCE_REFERENCES_V12_1.md`
- `AISTOCK_V12_1_PATCH_GUIDE.md`
- `server/broker/KISBrokerGatewayV121.ts`
- `src/services/v12_1/RealMarketIndicatorProvider.ts`
- `src/services/v12_1/BrokerApiClientV121.ts`
- `src/services/v12_1/UnifiedBuyGateV121.ts`
- `src/services/v11/AdaptiveExitDecisionEngineV121.ts`
- `src/services/v12_1/UnifiedTradingPipelinePatchV121.ts`

---

## 3. 검증 방법

```bash
npm run lint
npm run build
```
