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
| LONG/SHORT | Review only | CONNECTED | 직접 주문 실행 없음 |

## 2. 존재하지만 새 UI에 재연결 전 안전수정이 필요한 기능

| 기존 모듈 | 보존할 기능 | 발견된 문제 | 현재 처리 |
|---|---|---|---|
| `MasterAiAutoTradingDashboard.tsx` | 전체 통합 대시보드/모달/봇/차트/전략 진입점 | 기본 `overallWinRate = 71.4` 등 정적 지표 및 레거시 표시값 점검 필요 | 메인에서 직접 미사용 |
| `TransactionHistory.tsx` | 주문/체결 원장, CSV, 거래내역 분석 | `Math.random()` 기반 승률/준수율, 고정 손익비/리스크 문구 | 재연결 전 수정 필수 |
| `AiHighVolatilityAlertSystem.tsx` | 변동성 경고/알림 | 고정 후보, fallback 등락률, 계산된 가짜 RVOL/ATR, `Math.random()` ID | 재연결 전 수정 필수 |
| `RealBrokerDetailedBalanceAndHoldings.tsx` | 실계좌 잔고/보유종목/동기화 | 고정 환율 1520, 현금 임의 50:50 분배, 연결정상 고정표시, 정적 빠른매수 가격 | 재연결 전 수정 필수 |
| `StockSearchAndAddModal.tsx` | 종목검색/관심종목 등록 | 등록폼 기본 가격 12500, 기본 테마 문자열 | 기본값 제거 후 연결 |

## 3. 우선 재사용 가능한 기존 기능 후보

- `RealtimeScannerTileBoard.tsx`
  - 서버 PRECHECK + 실제 realtime-candles + `evaluateVerifiedSignal` 사용.
  - 새 UI의 `실시간 스캐너` 위치에 연결 예정.
- `BotStatusDashboard.tsx`
  - 실시간 피드/브로커/봇 heartbeat 기반 상태 화면.
  - 새 UI 우측 또는 AI 분석 리포트 위치에 연결 예정.
- `RealTimeTradingViewChart.tsx`
  - 이미 새 UI 중앙 차트로 재사용 중.
- `OperationalTruthMonitorV20`
  - 화면 뒤에서 계속 마운트되어 런타임 truth check 유지.

## 4. 재연결 순서

1. 확정 레퍼런스 UI 배치 고정
2. 실시간 스캐너 재연결
3. 보유종목/실계좌 모듈의 고정값 제거 후 재연결
4. 거래내역의 랜덤 AI 지표 제거 후 재연결
5. 알림 모듈의 synthetic 후보/RVOL 제거 후 재연결
6. 봇/전략/안전 거버넌스/브로커 연결 기능 재배치
7. 전체 Fake-Data Audit + TypeScript + Test + Production Build 통과
8. 최종 실제 화면 기준 이미지 생성

## 5. 금지 규칙

- `Math.random()` 또는 `Math.sin()`으로 시장 가격/지표/점수/패턴 생성 금지
- 고정 예시 가격을 실시간 데이터처럼 표시 금지
- API 실패 시 다른 종목/기본 종목 값으로 대체 금지
- 실제 데이터가 없으면 `NO_DATA`
- FORECAST는 실제 시세와 분리 표시
- 주문 실행은 별도 승인 게이트 통과 전 금지
