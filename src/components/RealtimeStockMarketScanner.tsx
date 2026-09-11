import React from "react";
import { RealtimeScannerTileBoard } from "./RealtimeScannerTileBoard";

export interface ScannerStock {
  id: string;
  rank: number;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  capType: "LARGE" | "MID" | "SMALL";
  price: number;
  changePct: number;
  tradingValue: number;
  volumeStatus: "급증" | "증가" | "보통";
  rvol: number;
  executionPower: number;
  aiScore: number;
  aiScoreChange: number;
  hasBos: boolean;
  hasChoch: boolean;
  hasVwapBreak: boolean;
  hasNews: boolean;
  flash?: "UP" | "DOWN" | null;
}

export interface CustomCondition {
  id: string;
  name: string;
  tradingValueMin: number;
  rvolMin: number;
  executionPowerMin: number;
  changePctMin: number;
  mustVwapBreak: boolean;
  mustChoch: boolean;
  capFilter?: "ALL" | "LARGE" | "MID" | "SMALL";
}

export type ScannerGrade = "S" | "A+" | "A" | "B" | "WATCH" | "NO SETUP";
export type SetupType = "Breakout" | "Breakout+Retest" | "52W High" | "VCP" | "EMA Pullback" | "First Pullback" | "Volume Breakout" | "Gap & Go" | "ORB" | "Base Breakout" | "Momentum Continuation" | "Relative Strength Leader";
export type SetupLifecycleState = "FORMING" | "CONFIRMED" | "ACTIVE" | "INVALIDATED";

export interface TradeTimingInfo {
  signal: "STRONG_BUY" | "BUY" | "HOLD" | "TAKE_PROFIT" | "STOP_LOSS";
  label: string;
  badgeBg: string;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  tpPct: string;
  slPct: string;
  actionTip: string;
}

export const getCapType = (s: Partial<ScannerStock>): "LARGE" | "MID" | "SMALL" => {
  if (s.capType) return s.capType;
  return "MID";
};

/**
 * Legacy compatibility helper.
 * No synthetic target/stop/entry values are created here anymore.
 * The production tile board performs verified multi-timeframe analysis and
 * final trade entry still requires the existing confirmation flow.
 */
export const getTradeTiming = (s: ScannerStock): TradeTimingInfo => {
  const hasVerifiedPrice = Number.isFinite(s.price) && s.price > 0;
  return {
    signal: "HOLD",
    label: hasVerifiedPrice ? "실시간 검증 필요" : "NO DATA",
    badgeBg: "bg-zinc-700 text-zinc-100",
    entryPrice: hasVerifiedPrice ? s.price : 0,
    targetPrice: 0,
    stopLossPrice: 0,
    tpPct: "-",
    slPct: "-",
    actionTip: "검증된 RealtimeScannerTileBoard의 다중시간봉 결과를 확인하세요."
  };
};

/**
 * Legacy compatibility score surface. A believable score is never invented.
 * Consumers should use RealtimeScannerTileBoard / server V20 verified scores.
 */
export function computeV10GlobalScore(_st: ScannerStock) {
  return {
    totalScore: 0,
    grade: "NO SETUP" as ScannerGrade,
    setup: "Momentum Continuation" as SetupType,
    setupState: "FORMING" as SetupLifecycleState,
    scores: {
      relativeStrength: 0,
      rvolScore: 0,
      liquidityScore: 0,
      emaAlignment: 0,
      adxScore: 0,
      high52wScore: 0,
      breakoutScore: 0,
      vcpScore: 0,
      pullbackScore: 0,
      momentumScore: 0,
      sectorStrength: 0,
      regionalBoost: 0,
      riskPenalty: 0,
      totalScore: 0
    }
  };
}

export const SCANNER_SECTORS = [
  { id: "all", name: "실시간 전체시장", icon: "📡", totalCount: 0, badgeColor: "bg-zinc-800 text-zinc-200 border-zinc-700" }
];

/**
 * @deprecated Legacy entry point kept only for import compatibility.
 * The old screen contained hardcoded prices, RVOL, execution power, AI scores,
 * fake surge pools and generated 5-minute trend points. Those paths were
 * removed. Reuse the verified production scanner instead of maintaining a
 * second scanner implementation.
 */
export const RealtimeStockMarketScanner: React.FC = () => {
  return <RealtimeScannerTileBoard />;
};

export default RealtimeStockMarketScanner;
