# Stock GPT Full Integration Inventory

> 기준: 기존 기능을 새로 만들지 않고 재사용하되, 가짜/합성/랜덤/고정 시장수치는 새 Stock GPT 메인 UI에 연결하지 않는다.

## 1. 현재 새 메인 UI에 안전하게 연결된 기능

| 기능 | 실제 연결 | 상태 | 비고 |
|---|---|---|---|
| Stock GPT 자연어 검색 | `stockDictionary` + `realtimeMarketFeedService` | CONNECTED | 종목 검색 후 실제 시세 요청 |
| 실시간 시세 | `realtimeMarketFeedService` | CONNECTED | LIVE + verified 값만 사용 |
| 실시간 캔들 | `/api/market/v13/snapshot/:symbol` + `RealTimeTradingViewChart` | CONNECTED | `dataValid === true` 필요 |
| 차트 패턴 기본 감지 | 실제 OHLCV 기반 `analyzeRealPatterns` | CONNECTED | 21개 이상 실제 캔들 필요 |
| 지지/저항/돌파/눌림/거래량 급증 | 실제 OHLCV 계산 | CONNECTED | 데이터 없으면 NO_DATA |
| 기술 점수 | `RealTimeTradingViewChart.onStateChange` | CONNECTED | 실제 차트 계산 결과만 표시 |
| 실시간 강세/약세 | 검증 LIVE quote 정렬 | CONNECTED | 가짜 후보로 빈칸 채우지 않음 |
| 우측 KOSPI/KOSDAQ 상태 카드 | 검증 LIVE 종목 평균 | CONNECTED | 지수값으로 오인하지 않도록 LIVE 평균으로 표기 |
| 강한 섹터/테마 | 정적 메타데이터 + 실제 LIVE 등락률 | CONNECTED | 시장 수익률은 실제 quote만 사용 |
| 관심종목 | 기존 `watchlist` + 검증 LIVE quote | CONNECTED | 저장 목록은 보존, 시세 없으면 NO_DATA |
| 보유종목 | 기존 `positions` + 검증 LIVE quote | CONNECTED | 현재가가 없으면 평가손익 계산 안 함 |
| 실시간 타일 스캐너 | `RealtimeScannerTileBoard` | CONNECTED | 기존 서버 스캐너 재사용 |
| V20 최종판단 스캐너 | `VerifiedAiOpportunityScanner` | CONNECTED | PRECHECK와 FINAL 판단 분리 |
| 완료 5분봉 패턴 검증 | `VerifiedIntradaySignalPanel` | CONNECTED | ORB / Opening Drive / VWAP Retest / First Pullback |
| AI 봇 상태 | `BotStatusDashboard` | CONNECTED | 실제 heartbeat/브로커/시세 상태 기반 |
| 거래원장/체결내역 | `TransactionHistory` | CONNECTED | 기록된 pnl/netProfit만 승률 계산, 없으면 NO_DATA |
| 고변동성 알림 | `AiHighVolatilityAlertSystem` | CONNECTED | 검증 LIVE 등락률만 사용, ATR/RVOL 미확인 시 NO_DATA |
| 종목 검색/직접 등록 | `StockSearchAndAddModal` + `buildLiveStockItem` | CONNECTED | 누락 시세를 0으로 바꾸지 않고 null/NO_DATA 유지 |
| LONG/SHORT | Review only | CONNECTED | 직접 주문 실행 없음 |

## 2. 존재하지만 새 UI에 재연결 전 안전수정이 필요한 기능

| 기존 모듈 | 보존할 기능 | 발견된 문제 | 현재 처리 |
|---|---|---|---|
| `MasterAiAutoTradingDashboard.tsx` | 전체 통합 대시보드/모달/봇/차트/전략 진입점 | 기본 `overallWinRate = 71.4` 등 정적 지표 및 레거시 표시값 점검 필요 | 메인에서 직접 미사용 |
| `RealBrokerDetailedBalanceAndHoldings.tsx` | 실계좌 잔고/보유종목/동기화 | 고정 환율 1520, 현금 임의 분배, 현재가 누락 시 평단 fallback 등 truth 위반 가능성 | 새 Stock GPT에 미연결, 청소 전 노출 금지 |

## 3. 현재 안전하게 재사용 중인 기존 기능

- `RealtimeScannerTileBoard.tsx`
  - 서버 PRECHECK + 실제 realtime-candles 기반 기존 스캐너를 새 UI의 `실시간 스캐너` 위치에서 재사용.
- `VerifiedAiOpportunityScanner.tsx`
  - 서버 V20 최종 판단 권한 확인 후 결과 표시.
- `VerifiedIntradaySignalPanel.tsx`
  - 실제 완료 5분봉만 사용해 장중 패턴 검증.
- `BotStatusDashboard.tsx`
  - 실시간 피드/브로커/봇 heartbeat 기반 상태 화면.
- `TransactionHistory.tsx`
  - 실제 저장 주문·체결 원장, CSV, 검증 가능한 손익만 사용한 통계.
- `AiHighVolatilityAlertSystem.tsx`
  - verified LIVE quote만 사용한 변동성 경보.
- `RealTimeTradingViewChart.tsx`
  - 새 UI 중앙 차트로 재사용 중.
- `OperationalTruthMonitorV20`
  - 화면 뒤에서 계속 마운트되어 런타임 truth check 유지.

## 4. 남은 재연결 순서

1. `RealBrokerDetailedBalanceAndHoldings`의 고정 환율/현금 임의 분배/가격 fallback 제거 또는 안전한 기존 실계좌 truth 모듈로 대체 연결
2. 종목 상세 탭의 기업 개요 / AI 분석 리포트 / 재무 / 뉴스에서 truth 검증된 기존 기능만 선별 재연결
3. 봇/전략/안전 거버넌스/브로커 연결 기능을 확정 Stock GPT 배치 안으로 재배치
4. 전체 Fake-Data Audit + TypeScript + Test + Production Build + E2E 통과 확인
5. 최종 실제 화면 기준 이미지 확인

## 5. 금지 규칙

- `Math.random()` 또는 `Math.sin()`으로 시장 가격/지표/점수/패턴 생성 금지
- 고정 예시 가격을 실시간 데이터처럼 표시 금지
- API 실패 시 다른 종목/기본 종목 값으로 대체 금지
- 누락 숫자를 `0`으로 바꿔 실제 값처럼 전달 금지
- 실제 데이터가 없으면 `NO_DATA`
- FORECAST는 실제 시세와 분리 표시
- 주문 실행은 별도 승인 게이트 통과 전 금지
