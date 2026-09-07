# Open Source References & Technical Attribution - AISTOCK v12.1

This document outlines open-source algorithms, mathematical formulas, and structural patterns integrated into AISTOCK v12.1.

## 1. Technical Indicator Algorithms (OHLCV-based Calculation)
- **Reference**: TA-Lib / TradingView Indicator Standards (MIT License)
- **Implementation**: `src/services/v12_1/RealMarketIndicatorProvider.ts`
- **Features**:
  - **Simple Moving Average (SMA / EMA)**: True rolling memory window calculated on exact close prices.
  - **Volume Weighted Average Price (VWAP)**: Intraday cumulative `sum(typicalPrice * volume) / sum(volume)` where `typicalPrice = (high + low + close) / 3`.
  - **Average Directional Index (ADX) & DMI (+/-)**: Directional movement index using True Range (TR) and smoothed +DM / -DM ratios.
  - **Average True Range (ATR)**: `max(H-L, |H-Cp|, |L-Cp|)` trailing volatility calculation.

## 2. Momentum & Structure Screening Logic
- **Reference**: Qullamaggie High Tight Flag (HTF), Episodic Pivot (EP) & Volume Contraction Pattern (VCP) (MIT License)
- **Implementation**: `src/services/v12_1/RealMarketIndicatorProvider.ts` & `src/services/v12_1/UnifiedBuyGateV121.ts`
- **Features**:
  - 52-week High Proximity scoring.
  - RVOL (Relative Volume vs. 20-period moving average volume).
  - Higher High / Higher Low (HH-HL) structural preservation checks.

## 3. Korea Investment & Securities (KIS) API Gateway Rules
- **Reference**: KIS Open API Specification v2.0
- **Implementation**: `server/broker/KISBrokerGatewayV121.ts` & `src/services/v12_1/BrokerApiClientV121.ts`
- **Features**:
  - Explicit market separation: Domestic Korea (KOSPI/KOSDAQ) vs. US Markets (NYSE/NASDAQ/AMEX).
  - Strict Order Confirmation Protocol: Returning `ODNO` (Order Number) marks state as `PENDING`. State transitions to `FILLED` only upon verified fill query response.

---

## MIT License Term Summary

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
