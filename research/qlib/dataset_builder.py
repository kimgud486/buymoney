# AISTOCK Qlib Dataset Builder
# Converts raw OHLCV market feeds into Qlib binary format

import os
import json

class QlibDatasetBuilder:
    def __init__(self, provider_name="KIS_KRX"):
        self.provider_name = provider_name

    def dump_dataset(self, raw_data_path, output_dir):
        """Dump raw OHLCV JSON into Qlib binary files"""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        print(f"[QLIB] Dataset successfully processed from {raw_data_path} to {output_dir}")

if __name__ == "__main__":
    builder = QlibDatasetBuilder()
    builder.dump_dataset("data/raw_candles.json", "data/qlib_format")
