# pandas-ta Open Source Integration Notice

**License:** MIT License
**Source Repository:** https://github.com/twopirllc/pandas-ta

## Architecture Integration in AISTOCK v13
pandas-ta / pandas-ta-classic provides technical analysis indicator calculation standards (130+ indicators & candle patterns). In AISTOCK v13 Real Intelligence Core, technical indicator formulas for VWAP, EMA (9/20/50), MACD, RSI, ADX, DMI, and ATR strictly follow pandas-ta mathematical conventions.

### Mapping:
- **Technical Analysis Engine (`TechnicalAnalysisEngineV13.ts`):** Calculates exact indicator values directly from real OHLCV candle arrays.
- **Rules:** Zero hash/random fallback values. Pure mathematical outputs.
