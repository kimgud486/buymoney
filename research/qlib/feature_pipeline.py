# AISTOCK Qlib Feature Pipeline
# Alpha factor definitions and feature transformations

class QlibFeaturePipeline:
    def get_factor_expressions(self):
        return [
            "$close / $vwap - 1",            # Distance to VWAP
            "$volume / Mean($volume, 20)",    # RVOL (20-bar)
            "($high - $low) / $close",        # Normalized ATR
            "RSI($close, 14)",               # Relative Strength Index
            "($close - Delay($close, 5)) / Delay($close, 5)" # 5-period Momentum
        ]

if __name__ == "__main__":
    pipeline = QlibFeaturePipeline()
    print("[QLIB] Defined Alpha Factors:", pipeline.get_factor_expressions())
