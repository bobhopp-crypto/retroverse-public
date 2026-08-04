export type CutterRangeState = {
  rangeInSec: number | null;
  rangeOutSec: number | null;
};

export type CutterRangeStatus = "empty" | "in_only" | "out_only" | "valid" | "reversed" | "invalid";

export function cutterRangeStatus(range: CutterRangeState, sourceDurationSec: number): CutterRangeStatus {
  const { rangeInSec, rangeOutSec } = range;
  if (rangeInSec == null && rangeOutSec == null) return "empty";
  if (rangeInSec == null) return "out_only";
  if (rangeOutSec == null) return "in_only";
  if (![rangeInSec, rangeOutSec, sourceDurationSec].every(Number.isFinite) || sourceDurationSec <= 0) return "invalid";
  if (rangeInSec >= rangeOutSec) return "reversed";
  if (rangeInSec < 0 || rangeOutSec > sourceDurationSec) return "invalid";
  return "valid";
}

export function selectedRangeDuration(range: CutterRangeState): number | null {
  if (range.rangeInSec == null || range.rangeOutSec == null) return null;
  return range.rangeOutSec > range.rangeInSec ? range.rangeOutSec - range.rangeInSec : null;
}
