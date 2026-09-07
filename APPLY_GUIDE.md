# AISTOCK v12 적용 가이드

본 문서는 AISTOCK v12 OSS 통합 수정 패치 적용 및 시스템 구성 안내서입니다.

## 핵심 변경 내용

1. **가짜 데이터/체결 제거**:
   - `GlobalStockDiscoveryScannerV12.ts`: 하드코딩 종목/가격 대신 `MarketDiscoveryProvider` 주입을 통한 실데이터 기반 스캐닝.
   - `AutonomousExecutionEngineV11.ts`: `Math.random()` 난수 시뮬레이션 및 고정 +5% 익절 제거. 실제 봉 데이터 기반 처리.
   - `SafeKISBrokerAdapter.ts`: `PAPER` / `DRY_RUN` / `LIVE` 3단계 분리. `LIVE` 모드에서 증권사 체결 확인 없이 `FILLED` 처리 금지(Fail-closed).

2. **단일 게이트 파이프라인 (Unified Engine)**:
   - 중복된 수많은 백그라운드 엔진의 독립 매수 주문 방지.
   - `UnifiedTradingPipelineV12.ts`를 단일 주문 게이트로 통합.

3. **적응형 청산 엔진 (Adaptive Exit AI)**:
   - `AdaptiveExitDecisionEngine.ts`: 10개 정밀 가중치 항목(구조 붕괴, VWAP 이탈, 매도 수급, MACD/RSI/DMI 약화 등)으로 매 봉 다면 평가.

---

## 필수 적용 파일 목록

- `src/services/GlobalStockDiscoveryScannerV12.ts`
- `src/services/v11/AdaptiveExitDecisionEngine.ts`
- `src/services/v11/SafeKISBrokerAdapter.ts`
- `src/services/v12/UnifiedTradingPipelineV12.ts`
- `OPEN_SOURCE_NOTICES_AISTOCK.md`
- `AISTOCK_V12_MASTER_PROMPT.md`
- `APPLY_GUIDE.md`

---

## 점검 및 검증 명령어

```bash
npm run lint
npm run build
```
