export const LONG_CLIP_THRESHOLD_SEC = 8 * 60;

function safeSeconds(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function formatPreciseTime(seconds: number): string {
  const safe = safeSeconds(seconds);
  const totalMilliseconds = Math.round(safe * 1000);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

export function formatDuration(seconds: number): string {
  const safe = safeSeconds(seconds);
  const totalSeconds = Math.round(safe);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const wholeSeconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}`;
}

export function formatRulerLabel(seconds: number, visibleDuration: number): string {
  return visibleDuration <= 90 ? formatPreciseTime(seconds).slice(3) : formatDuration(seconds);
}

const DEFAULT_INTERVALS = [60, 120, 300, 600, 900];

export type RulerTick = { seconds: number; position: number; label?: string; major: boolean };

export function generateRulerTicks(
  rangeStartSec: number,
  rangeEndSec: number,
  availableWidthPx: number,
  minimumLabelSpacingPx = 56,
  preferredIntervals = DEFAULT_INTERVALS,
): RulerTick[] {
  const start = safeSeconds(rangeStartSec);
  const end = Math.max(start, safeSeconds(rangeEndSec));
  const duration = end - start;
  if (duration <= 0) return [{ seconds: start, position: 0, label: formatRulerLabel(start, duration), major: true }];
  const maxLabels = Math.max(2, Math.floor(Math.max(1, availableWidthPx) / minimumLabelSpacingPx));
  const interval = preferredIntervals.find((candidate) => duration / candidate <= maxLabels) ?? preferredIntervals.at(-1) ?? 60;
  const ticks: RulerTick[] = [{ seconds: start, position: 0, label: formatRulerLabel(start, duration), major: true }];
  for (let seconds = Math.ceil(start / interval) * interval; seconds < end - 1e-7; seconds += interval) {
    ticks.push({ seconds, position: (seconds - start) / duration, label: formatRulerLabel(seconds, duration), major: true });
  }
  ticks.push({ seconds: end, position: 1, label: formatRulerLabel(end, duration), major: true });
  return ticks.map((tick) => ({ ...tick, position: Math.max(0, Math.min(1, tick.position)) }));
}

export function isLongClip(durationSec: number): boolean {
  return Number.isFinite(durationSec) && durationSec >= LONG_CLIP_THRESHOLD_SEC;
}
