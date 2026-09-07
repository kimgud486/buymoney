// ----------------------------------------------------------------------
// AISTOCK TRADING CHART MODEL V19.2
// Lightweight Charts 5.2.1 Integration Data Standard
// ----------------------------------------------------------------------

export interface ChartCandleDataV192 {
  time: string; // "YYYY-MM-DD" or UNIX timestamp number or "HH:mm"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  ema9?: number;
  ema20?: number;
  ema50?: number;
}

export interface ChartMarkerV192 {
  time: string;
  position: "aboveBar" | "belowBar" | "inBar";
  color: string;
  shape: "circle" | "square" | "arrowUp" | "arrowDown";
  text: string;
  size?: number;
}

export interface ChartPriceLineV192 {
  price: number;
  color: string;
  lineWidth: number;
  lineStyle: number; // 0=Solid, 1=Dotted, 2=Dashed
  axisLabelVisible: boolean;
  title: string;
}

export interface ChartForecastDataV192 {
  time: string;
  forecastPrice: number;
  upperBand?: number;
  lowerBand?: number;
}
