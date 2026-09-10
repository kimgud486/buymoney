#!/usr/bin/env node

const rawBaseUrl = process.env.BUYMONEY_LIVE_URL || process.argv[2] || "";
const symbol = String(process.env.BUYMONEY_PROOF_SYMBOL || process.argv[3] || "005930").replace(/\D/g, "").slice(0, 6);

function fail(message, details) {
  console.error(`❌ KIS LIVE DEPLOYMENT PROOF FAILED: ${message}`);
  if (details !== undefined) console.error(details);
  process.exit(1);
}

if (!rawBaseUrl) fail("BUYMONEY_LIVE_URL is required. Example: https://your-service.run.app");

let baseUrl;
try {
  const parsed = new URL(rawBaseUrl);
  if (parsed.protocol !== "https:") fail("Live proof requires an HTTPS deployment URL.");
  baseUrl = parsed.toString().replace(/\/$/, "");
} catch {
  fail("BUYMONEY_LIVE_URL is not a valid absolute URL.");
}

if (!/^\d{6}$/.test(symbol)) fail("BUYMONEY_PROOF_SYMBOL must be a 6-digit Korean stock code.");

const endpoint = `${baseUrl}/api/broker/v21/runtime?symbol=${encodeURIComponent(symbol)}`;
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);
let response;
let payload;
try {
  response = await fetch(endpoint, { method: "GET", headers: { accept: "application/json", "cache-control": "no-cache" }, signal: controller.signal });
  payload = await response.json();
} catch (error) {
  clearTimeout(timeout);
  fail("Could not reach or parse the deployed KIS runtime endpoint.", error instanceof Error ? error.message : String(error));
}
clearTimeout(timeout);

if (!response.ok) fail(`Runtime endpoint returned HTTP ${response.status}.`, payload);
if (payload?.provider !== "KIS") fail("provider must be KIS.", payload?.provider);
if (payload?.mode !== "LIVE_ONLY") fail("mode must be LIVE_ONLY.", payload?.mode);
if (payload?.canSubmitOrder !== false) fail("Automatic order submission must remain disabled.", payload?.canSubmitOrder);

const proof = payload?.liveEnvironmentProof;
if (!proof || typeof proof !== "object") fail("liveEnvironmentProof is missing.");
if (proof.status !== "ESTABLISHED") fail("Live environment proof is not established.", proof?.blockers || payload?.blockers || []);

for (const key of ["brokerConfigured","oauthAuthenticated","accountQuerySucceeded","quoteQuerySucceeded","marketOpen","realtimeQuoteVerified","accountFresh","exactOrderabilityVerified"]) {
  if (proof?.evidence?.[key] !== true) fail(`Proof evidence '${key}' is not true.`, proof?.evidence);
}

if (payload?.dataStatus !== "REALTIME_VERIFIED") fail("dataStatus must be REALTIME_VERIFIED.", payload?.dataStatus);
if (payload?.oauth !== "AUTHENTICATED") fail("OAuth must be AUTHENTICATED.", payload?.oauth);
if (payload?.marketSession !== "OPEN") fail("Market session must be OPEN.", payload?.marketSession);

for (const [label, value] of [["quoteAgeMs", payload?.quoteAgeMs], ["accountAgeMs", payload?.accountAgeMs]]) {
  if (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 30_000) fail(`${label} must be between 0 and 30000ms.`, value);
}

if (!Number.isFinite(Number(payload?.lastPrice)) || Number(payload.lastPrice) <= 0) fail("lastPrice must be a positive live value.");
if (!Number.isFinite(Number(payload?.orderableCash)) || Number(payload.orderableCash) < 0) fail("orderableCash must be a verified non-negative value.");
if (!Number.isInteger(Number(payload?.orderableQty)) || Number(payload.orderableQty) < 0) fail("orderableQty must be a verified non-negative integer.");

const serialized = JSON.stringify(payload).toLowerCase();
for (const forbidden of ["kis_appsecret", "kis_appkey", "access_token", "appsecret", "authorization"]) {
  if (serialized.includes(forbidden)) fail(`Sensitive field marker leaked in runtime response: ${forbidden}`);
}

console.log("✅ KIS LIVE DEPLOYMENT PROOF ESTABLISHED");
console.log(JSON.stringify({ endpoint, symbol: payload.symbol || symbol, provider: payload.provider, marketSession: payload.marketSession, dataStatus: payload.dataStatus, quoteAgeMs: payload.quoteAgeMs, accountAgeMs: payload.accountAgeMs, proofStatus: proof.status, checkedAt: proof.checkedAt, automaticOrderSubmission: payload.canSubmitOrder }, null, 2));
