# AI SIGNALS Technical Score fix

The `AI SIGNALS` card could remain on `Technical Score: 계산 중...` when the trading state stayed `NO_TRADE`.

## Root cause

`RealTimeTradingViewChart` published `onStateChange(state, confidence)` only when the trading state changed. A valid recalculation that remained `NO_TRADE -> NO_TRADE` therefore never delivered the new confidence score to `MasterAiAutoTradingDashboard`.

## Fix

- Publish an initial technical score from already-fetched completed candles.
- Seed the internal candle history from those completed candles.
- Publish a fresh technical score after every closed-candle recalculation, including `NO_TRADE -> NO_TRADE`.
- Keep trading execution gated by the existing realtime feed and state-machine checks. This fix does not force-enable buy or sell execution.
- Keep the parent callback in a ref so the initial-score effect is not retriggered merely because an inline callback receives a new function identity.
