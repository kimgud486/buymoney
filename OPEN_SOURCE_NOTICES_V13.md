# OPEN SOURCE NOTICES & LICENSES (AISTOCK v13.0)

AISTOCK v13.0 Real Intelligence Core integrates and references the following open-source frameworks and libraries in strict accordance with their respective open-source license agreements:

---

### 1. Korea Investment Securities Official Trading API (`koreainvestment/open-trading-api`)
* **Repository**: [https://github.com/koreainvestment/open-trading-api](https://github.com/koreainvestment/open-trading-api)
* **License**: MIT / Apache-2.0
* **Usage Scope in AISTOCK v13.0**:
  - Serves as the **Canonical Source of Truth** for Korea Investment Securities (KIS) Open API endpoints, OAuth2 token request flows, domestic & overseas order specifications, and WebSocket protocol definitions.
  - Endpoint Configuration:
    - Production REST Domain: `https://openapi.koreainvestment.com:9443`
    - Paper Trading (VTS) Domain: `https://openapivts.koreainvestment.com:29443`
  - Used for DataProvider & Broker Gateway interface abstractions.

---

### 2. pandas-ta-classic
* **Repository**: [https://github.com/pandas-ta/pandas-ta](https://github.com/pandas-ta/pandas-ta)
* **License**: MIT
* **Usage Scope in AISTOCK v13.0**:
  - Standardized reference implementation for Technical Analysis indicators (VWAP, EMA9/20/50/200, MACD 12/26/9, RSI14, ADX14/DMI, ATR14, RVOL).
  - Used for validating mathematical indicator calculations in TypeScript Technical Analysis Engine V13.

---

### 3. Microsoft Qlib (`microsoft/qlib`)
* **Repository**: [https://github.com/microsoft/qlib](https://github.com/microsoft/qlib)
* **License**: MIT
* **Usage Scope in AISTOCK v13.0**:
  - Offline quantitative research, LightGBM model training, multi-factor alpha ranking, and model evaluation layer.
  - Note: Qlib is restricted to offline research/ranking and is **NOT** used as an active live order execution broker.

---

*AISTOCK v13.0 Core Engine - Compliance & Integrity Enforced*
