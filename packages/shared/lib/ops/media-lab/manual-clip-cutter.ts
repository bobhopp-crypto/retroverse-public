export const DETAIL_WINDOWS = [10, 30, 60, 300] as const;
export type DetailWindowSeconds = (typeof DETAIL_WINDOWS)[number];

export function detailWindowRange(playhead: number, duration: number, windowSec: DetailWindowSeconds): { start: number; end: number } {
  const half = windowSec / 2;
  const start = Math.max(0, Math.min(Math.max(0, duration - windowSec), playhead - half));
  return { start, end: Math.min(duration, start + windowSec) };
}

export type TimeRange = { start: number; end: number };

export function clampSourceTime(time: number, duration: number): number {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, Math.min(duration, time));
}

export function timeFromTimelinePosition(position: number, range: TimeRange): number {
  if (!Number.isFinite(position) || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end <= range.start) return range.start;
  return range.start + Math.max(0, Math.min(1, position)) * (range.end - range.start);
}

export function timelinePositionForTime(time: number, range: TimeRange): number {
  if (!Number.isFinite(time) || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end <= range.start) return 0;
  return Math.max(0, Math.min(1, (time - range.start) / (range.end - range.start)));
}

export function timelineSampleTimes(range: TimeRange, requestedCount: number, maxCount = 48): number[] {
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end <= range.start) return [];
  const count = Math.max(2, Math.min(maxCount, Math.round(requestedCount)));
  return Array.from({ length: count }, (_, index) => Math.round((range.start + ((range.end - range.start) * index) / (count - 1)) * 1000) / 1000);
}

export function thumbnailCacheKey(fingerprint: string, profile: string, sec: number): string {
  return `${fingerprint}:${profile}:${Math.round(sec * 1000)}`;
}

export function validClipRange(start: number, end: number, duration: number): boolean {
  return Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(duration) && start >= 0 && end > start && end <= duration;
}

export function temporaryClipTitle(sequence: number): string {
  return `Clip ${String(Math.max(1, sequence)).padStart(3, "0")}`;
}

export function manualClipId(sourceFingerprint: string, start: number, end: number, sequence: number): string {
  return `manual-${sourceFingerprint.slice(0, 10)}-${Math.round(start * 1000).toString(36)}-${Math.round(end * 1000).toString(36)}-${sequence}`;
}
