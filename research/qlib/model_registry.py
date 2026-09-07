# AISTOCK Qlib Model Registry
# Exports trained LightGBM weights and metadata for TypeScript runtime engine

import json

class QlibModelRegistry:
    def export_weights(self, model_version, output_json_path):
        metadata = {
            "modelVersion": model_version,
            "status": "NOT_TRAINED",
            "trainedUntil": None,
            "features": ["vwap_dist", "rvol_20", "atr_norm", "rsi_14"],
            "validationMetrics": None
        }
        with open(output_json_path, "w") as f:
            json.dump(metadata, f, indent=2)
        print(f"[QLIB REGISTRY] Exported model {model_version} status: NOT_TRAINED to {output_json_path}")

if __name__ == "__main__":
    registry = QlibModelRegistry()
    registry.export_weights("v13.6-lightgbm-v1", "qlib_model_metadata.json")
