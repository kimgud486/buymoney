# OPEN SOURCE REFERENCES & LICENSES (AISTOCK v13.1)

AISTOCK v13.1 Validation & Safety Engine incorporates and adheres to specifications from the following open-source and official standard frameworks:

---

### 1. Korea Investment Securities Official OpenAPI Specifications (`koreainvestment/open-trading-api`)
* **Repository**: [https://github.com/koreainvestment/open-trading-api](https://github.com/koreainvestment/open-trading-api)
* **License**: MIT / Apache-2.0
* **Usage in v13.1**:
  - Official Exchange Codes: `NASD` (NASDAQ), `NYSE` (New York Stock Exchange), `AMEX` (American Stock Exchange), `KRX` (Korea Exchange).
  - Domestic / Overseas Order Transaction Codes (`TTTC0802U`, `VTTC0802U`, `TTTT1002U`, `VTTT1002U`).
  - Order inquiry & execution report data schema definitions.

---

### 2. Google Cloud Firestore REST API & Client Libraries
* **Documentation**: [https://firebase.google.com/docs/firestore/use-rest-api](https://firebase.google.com/docs/firestore/use-rest-api)
* **License**: Apache-2.0
* **Usage in v13.1**:
  - `FirestorePendingOrderStoreV131`: Server-side state persistence for pending and partial orders to survive Cloud Run container restarts without losing order state.

---

### 3. Node.js Native Test Runner (`node:test`)
* **Documentation**: [https://nodejs.org/api/test.html](https://nodejs.org/api/test.html)
* **License**: MIT / Node.js License
* **Usage in v13.1**:
  - Zero-dependency unit and integration testing runner executed directly via `node --import tsx --test`.

---

*AISTOCK v13.1 Safety Engine - Compliance & Integrity Enforced*
