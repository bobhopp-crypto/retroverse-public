import assert from "node:assert/strict";

import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";
import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import {
  formatSearchTimestamp,
  searchTimelineTranscript,
} from "@/lib/ops/media-lab/timeline-transcript-search";

const chapters: EditorialChapterRow[] = [
  {
    id: "ch-1",
    startSec: 764,
    endSec: 800,
    title: "Performance - Michael Jackson",
    start: "00:12:44.000",
    end: "00:13:20.000",
    durationSec: 36,
    clock: "12:44",
  },
  {
    id: "ch-2",
    startSec: 2598,
    endSec: 2650,
    title: "Interview - Host",
    start: "00:43:18.000",
    end: "00:44:10.000",
    durationSec: 52,
    clock: "43:18",
  },
];

const segments: TranscriptSegment[] = [
  { start: 770, end: 775, text: "Michael Jackson takes the stage" },
  { start: 2600, end: 2605, text: "Thank you for joining us tonight" },
];

const hits = searchTimelineTranscript(chapters, segments, "Michael Jackson");
assert.equal(hits.length, 1);
assert.equal(hits[0]?.chapterId, "ch-1");
assert.equal(hits[0]?.matchSource, "title");

const transcriptHits = searchTimelineTranscript(chapters, segments, "joining us");
assert.equal(transcriptHits.length, 1);
assert.equal(transcriptHits[0]?.chapterId, "ch-2");
assert.equal(transcriptHits[0]?.matchSource, "transcript");

assert.equal(formatSearchTimestamp(764, 7200), "00:12:44");

console.log("timeline-transcript-search tests ok");
