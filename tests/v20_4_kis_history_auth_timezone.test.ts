import test from "node:test";
import assert from "node:assert/strict";

import {
  KISHistoricalDataProviderV204,
  hmsKst,
  parseKisDateTime,
  ymdKst,
} from "../server/v20/KISHistoricalDataProviderV204";
import {
  clearKisMarketDataCredentialsV204,
  getKisMarketDataCredentialsV204,
  registerKisMarketDataCredentialsV204,
} from "../server/v20/KISMarketDataCredentialRegistryV204";

test("V20.4 KIS history date/time formatting is pinned to Asia/Seoul", () => {
  const utc = new Date(Date.UTC(2026, 8, 9, 15, 30, 45)); // 2026-09-10 00:30:45 KST
  assert.equal(ymdKst(utc), "20260910");
  assert.equal(hmsKst(utc), "003045");
  assert.equal(
    parseKisDateTime("20260910", "101530"),
    Date.UTC(2026, 8, 10, 1, 15, 30),
  );
});

test("V20.4 KIS history config requires market-data keys, not brokerage account number", () => {
  const oldKey = process.env.KIS_APP_KEY;
  const oldSecret = process.env.KIS_APP_SECRET;
  const oldLegacyKey = process.env.KIS_APPKEY;
  const oldLegacySecret = process.env.KIS_APPSECRET;

  try {
    clearKisMarketDataCredentialsV204();
    delete process.env.KIS_APPKEY;
    delete process.env.KIS_APPSECRET;
    process.env.KIS_APP_KEY = "test-key";
    process.env.KIS_APP_SECRET = "test-secret";

    const provider = new KISHistoricalDataProviderV204();
    assert.equal(provider.isConfigured(), true);
    assert.deepEqual(getKisMarketDataCredentialsV204(), {
      appKey: "test-key",
      appSecret: "test-secret",
    });
  } finally {
    clearKisMarketDataCredentialsV204();
    if (oldKey === undefined) delete process.env.KIS_APP_KEY;
    else process.env.KIS_APP_KEY = oldKey;
    if (oldSecret === undefined) delete process.env.KIS_APP_SECRET;
    else process.env.KIS_APP_SECRET = oldSecret;
    if (oldLegacyKey === undefined) delete process.env.KIS_APPKEY;
    else process.env.KIS_APPKEY = oldLegacyKey;
    if (oldLegacySecret === undefined) delete process.env.KIS_APPSECRET;
    else process.env.KIS_APPSECRET = oldLegacySecret;
  }
});

test("V20.4 in-memory KIS credential registry overrides environment without exposing CANO", () => {
  try {
    clearKisMarketDataCredentialsV204();
    registerKisMarketDataCredentialsV204({
      appKey: "runtime-key",
      appSecret: "runtime-secret",
    });
    assert.deepEqual(getKisMarketDataCredentialsV204(), {
      appKey: "runtime-key",
      appSecret: "runtime-secret",
    });
  } finally {
    clearKisMarketDataCredentialsV204();
  }
});
