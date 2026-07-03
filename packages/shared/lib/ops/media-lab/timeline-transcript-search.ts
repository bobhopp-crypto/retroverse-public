import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";
import { formatChapterClock } from "@/lib/ops/media-lab/chapter-time";
import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";

export type TimelineSearchHit = {
  chapterId: string;
  chapter: EditorialChapterRow;
  matchSec: number;
  matchSource: "transcript" | "title" | "suggested";
};

export function formatSearchTimestamp(sec: number, showDurationSec: number): string {
  if (showDurationSec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return formatChapterClock(sec);
}

function segmentInChapter(seg: TranscriptSegment, ch: EditorialChapterRow): boolean {
  return seg.end > ch.startSec && seg.start < ch.endSec;
}

function titleFields(ch: EditorialChapterRow): string[] {
  const fields: string[] = [];
  if (ch.title.trim()) fields.push(ch.title);
  if (ch.tagSuggestion?.title?.trim()) fields.push(ch.tagSuggestion.title);
  if (ch.tagSuggestion?.subject?.trim()) fields.push(ch.tagSuggestion.subject);
  if (ch.tagSuggestion?.ocrSubject?.trim()) fields.push(ch.tagSuggestion.ocrSubject);
  return fields;
}

export function searchTimelineTranscript(
  chapters: EditorialChapterRow[],
  segments: TranscriptSegment[],
  query: string,
): TimelineSearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const hits: TimelineSearchHit[] = [];

  for (const ch of chapters) {
    let matchSec = ch.startSec;
    let matchSource: TimelineSearchHit["matchSource"] | null = null;

    for (const field of titleFields(ch)) {
      if (field.toLowerCase().includes(q)) {
        matchSource = ch.title.toLowerCase().includes(q) ? "title" : "suggested";
        matchSec = ch.startSec;
        break;
      }
    }

    if (!matchSource) {
      for (const seg of segments) {
        if (!segmentInChapter(seg, ch)) continue;
        if (seg.text.toLowerCase().includes(q)) {
          matchSource = "transcript";
          matchSec = seg.start;
          break;
        }
      }
    }

    if (matchSource) {
      hits.push({ chapterId: ch.id, chapter: ch, matchSec, matchSource });
    }
  }

  return hits.sort((a, b) => a.matchSec - b.matchSec);
}

export function searchHitChapterIds(hits: TimelineSearchHit[]): Set<string> {
  return new Set(hits.map((h) => h.chapterId));
}
