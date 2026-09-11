export type BrokerAccountTruthTarget = "korea" | "us" | "upbit";

export type BrokerAccountTruthResult = {
  success?: unknown;
  integrityStatus?: unknown;
  rawResponse?: unknown;
  message?: unknown;
};

export type BrokerAccountTruthVerdict = {
  verified: boolean;
  reason: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function finiteNonNegative(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function hasOkStatus(raw: UnknownRecord | null): raw is UnknownRecord {
  return raw?.status === "OK";
}

function validateKorea(raw: UnknownRecord): BrokerAccountTruthVerdict {
  const kisRes = asRecord(raw.kisRes);
  if (!kisRes) {
    return { verified: false, reason: "KOREA_RAW_KIS_RESPONSE_MISSING" };
  }

  // A legitimate zero balance is valid. Missing/null is not converted to zero here.
  const balance = finiteNonNegative(kisRes.balance);
  if (balance == null) {
    return { verified: false, reason: "KOREA_BALANCE_EVIDENCE_MISSING" };
  }

  if (!Array.isArray(kisRes.positions)) {
    return { verified: false, reason: "KOREA_POSITIONS_EVIDENCE_MISSING" };
  }

  return { verified: true, reason: "KOREA_ACCOUNT_EVIDENCE_VERIFIED" };
}

function validateUs(raw: UnknownRecord): BrokerAccountTruthVerdict {
  const balance = finiteNonNegative(raw.usBal);
  if (balance == null) {
    return { verified: false, reason: "US_BALANCE_EVIDENCE_MISSING" };
  }

  if (!Array.isArray(raw.usPositions)) {
    return { verified: false, reason: "US_POSITIONS_EVIDENCE_MISSING" };
  }

  return { verified: true, reason: "US_ACCOUNT_EVIDENCE_VERIFIED" };
}

function validateUpbit(raw: UnknownRecord): BrokerAccountTruthVerdict {
  const total = finiteNonNegative(raw.upbitTotal);
  if (total == null) {
    return { verified: false, reason: "UPBIT_TOTAL_EVIDENCE_MISSING" };
  }

  return { verified: true, reason: "UPBIT_ACCOUNT_EVIDENCE_VERIFIED" };
}

/**
 * Fail-closed validator for the legacy /api/broker/sync-balance response.
 *
 * Important: `success: true` and `integrityStatus: HEALTHY` are not sufficient
 * account truth because legacy server code can synthesize those labels. We only
 * accept broker-specific raw evidence that cannot be produced by a missing field
 * normalized to zero in the client.
 */
export function validateBrokerAccountSyncEvidence(
  broker: BrokerAccountTruthTarget,
  result: BrokerAccountTruthResult | null | undefined,
): BrokerAccountTruthVerdict {
  if (!result || result.success !== true) {
    return { verified: false, reason: "BROKER_SYNC_NOT_SUCCESSFUL" };
  }

  const raw = asRecord(result.rawResponse);
  if (!hasOkStatus(raw)) {
    return { verified: false, reason: "BROKER_RAW_EVIDENCE_MISSING" };
  }

  if (broker === "korea") return validateKorea(raw);
  if (broker === "us") return validateUs(raw);
  if (broker === "upbit") return validateUpbit(raw);

  return { verified: false, reason: "UNSUPPORTED_BROKER" };
}
