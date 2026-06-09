import type { MsPerformanceRecord } from "./types";

export type PerformanceEffectiveBounds = {
  start: number;
  end: number;
  start_timecode: string;
  end_timecode: string;
  has_adjustment: boolean;
};

export function performanceEffectiveBounds(
  record: Pick<
    MsPerformanceRecord,
    "start_seconds" | "end_seconds" | "start_timecode" | "end_timecode" | "adjusted_start" | "adjusted_end"
  >,
): PerformanceEffectiveBounds {
  const start = record.adjusted_start ?? record.start_seconds;
  const end = record.adjusted_end ?? record.end_seconds;
  const has_adjustment = record.adjusted_start != null || record.adjusted_end != null;
  return {
    start,
    end,
    start_timecode: record.adjusted_start != null ? formatInOutTimecode(start) : record.start_timecode,
    end_timecode: record.adjusted_end != null ? formatInOutTimecode(end) : record.end_timecode,
    has_adjustment,
  };
}

/** Short display clock for clip review UI (MM:SS or H:MM:SS). */
export function formatInOutTimecode(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
