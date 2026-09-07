// AISTOCK v13.8 RVOL Engine - Same-time Cumulative Volume Median Ratio

export function calculateSameTimeRvol(
  currentVolume: number,
  historicalVolumes: number[]
): number | null {
  if (!historicalVolumes || historicalVolumes.length < 10 || !Number.isFinite(currentVolume) || currentVolume < 0) {
    return null;
  }

  const validHist = historicalVolumes.filter(v => Number.isFinite(v) && v >= 0);
  if (validHist.length < 10) return null;

  const sorted = [...validHist].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  if (median <= 0) return null;

  return Number((currentVolume / median).toFixed(2));
}
