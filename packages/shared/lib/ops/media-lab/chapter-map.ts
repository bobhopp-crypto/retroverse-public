import { createHash } from "crypto";

export const CHAPTER_MAP_VERSION = 1 as const;
export const MIN_CHAPTER_DURATION_SEC = 5;

export type ChapterMapMarker = {
  id: string;
  timeSec: number;
  provenance: "generated" | "operator";
  createdAt: string;
  updatedAt: string;
};

export type EditableChapterMap = {
  version: typeof CHAPTER_MAP_VERSION;
  sourceFingerprint: string;
  sourceDurationSeconds: number;
  markers: ChapterMapMarker[];
  updatedAt: string;
};

export function markerId(timeSec: number, provenance: ChapterMapMarker["provenance"]): string {
  return `marker-${provenance}-${createHash("sha1").update(String(Math.round(timeSec * 1000))).digest("hex").slice(0, 10)}`;
}

export function normalizeMarkers(markers: ChapterMapMarker[], durationSec: number): ChapterMapMarker[] {
  return markers
    .filter((m) => Number.isFinite(m.timeSec) && m.timeSec > MIN_CHAPTER_DURATION_SEC && m.timeSec < durationSec - MIN_CHAPTER_DURATION_SEC)
    .sort((a, b) => a.timeSec - b.timeSec);
}

export function deriveChapterRanges(map: EditableChapterMap): { id: string; startSec: number; endSec: number; markerIds: string[] }[] {
  const markers = normalizeMarkers(map.markers, map.sourceDurationSeconds);
  const boundaries = [{ timeSec: 0, id: "source-start" }, ...markers.map((m) => ({ timeSec: m.timeSec, id: m.id })), { timeSec: map.sourceDurationSeconds, id: "source-end" }];
  return boundaries.slice(0, -1).map((start, index) => ({ id: `chapter-${index + 1}`, startSec: start.timeSec, endSec: boundaries[index + 1].timeSec, markerIds: [start.id, boundaries[index + 1].id] }));
}

export function canPlaceMarker(timeSec: number, markers: ChapterMapMarker[], durationSec: number, movingId?: string): boolean {
  if (!Number.isFinite(timeSec) || timeSec <= MIN_CHAPTER_DURATION_SEC || timeSec >= durationSec - MIN_CHAPTER_DURATION_SEC) return false;
  return markers.filter((m) => m.id !== movingId).every((m) => Math.abs(m.timeSec - timeSec) >= MIN_CHAPTER_DURATION_SEC);
}
