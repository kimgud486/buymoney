// ----------------------------------------------------------------------
// UNIFIED DATA TRUST & PROVENANCE SPECIFICATION (V15 ZERO FAKE DATA)
// ----------------------------------------------------------------------

export type DataTrustLevel =
  | "EXECUTION_GRADE"
  | "ANALYSIS_ONLY"
  | "DISPLAY_ONLY"
  | "NO_DATA";

export interface VerifiedDatum<T> {
  value: T | null;

  provider: string | null;
  source: string | null;

  providerTimestamp: number | null;
  receivedAt: number;

  ageMs: number | null;

  verified: boolean;
  trust: DataTrustLevel;

  reason: string | null;
}

export function createVerifiedDatum<T>(
  value: T | null,
  provider: string | null,
  source: string | null,
  providerTimestamp: number | null,
  trust: DataTrustLevel = "DISPLAY_ONLY",
  reason: string | null = null
): VerifiedDatum<T> {
  const now = Date.now();
  const ageMs = providerTimestamp ? Math.max(0, now - providerTimestamp) : null;
  const verified = trust === "EXECUTION_GRADE" || trust === "ANALYSIS_ONLY";

  return {
    value,
    provider,
    source,
    providerTimestamp,
    receivedAt: now,
    ageMs,
    verified,
    trust: value === null ? "NO_DATA" : trust,
    reason
  };
}
