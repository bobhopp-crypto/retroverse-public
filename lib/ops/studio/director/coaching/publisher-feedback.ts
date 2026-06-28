import "server-only";

import type { PublisherDecisionAction } from "@/lib/ops/studio/publisher/types";

import { saveExhibitCoaching } from "./store";
import { EXHIBIT_IDS } from "../exhibit-plan";

const PUBLISHER_REASON_MAP: Array<{ pattern: RegExp; exhibitId: string; coachingReason: string }> = [
  { pattern: /iconic|frame|image|visual/i, exhibitId: "iconic_moment", coachingReason: "Wrong iconic frame" },
  { pattern: /opening|cover|hero/i, exhibitId: "cover", coachingReason: "Wrong opening image" },
  { pattern: /chart/i, exhibitId: "chart_journey", coachingReason: "Weak chart presentation" },
  { pattern: /performance|ending|close/i, exhibitId: "performance", coachingReason: "Performance frame isn't memorable" },
  { pattern: /text|copy|paragraph/i, exhibitId: "iconic_moment", coachingReason: "Too much text" },
  { pattern: /emotion|feel|flat/i, exhibitId: "song_dna", coachingReason: "Not enough emotion" },
  { pattern: /repeat|duplicate|same/i, exhibitId: "iconic_moment", coachingReason: "Feels repetitive" },
  { pattern: /pac/i, exhibitId: "chart_journey", coachingReason: "Wrong pacing" },
  { pattern: /variety|diverse|rhythm/i, exhibitId: "performance", coachingReason: "Poor visual variety" },
];

/** Convert Publisher return-to-Director into exhibit coaching records. */
export async function recordPublisherDirectorFeedback(input: {
  rvtr: string;
  action: PublisherDecisionAction;
  reason: string;
}): Promise<void> {
  if (input.action !== "return_director") return;

  const hay = input.reason.trim();
  const matched = PUBLISHER_REASON_MAP.filter((m) => m.pattern.test(hay));
  const targets =
    matched.length > 0
      ? matched
      : EXHIBIT_IDS.map((exhibitId) => ({
          pattern: /.*/,
          exhibitId,
          coachingReason: hay || "Publisher returned package to Director",
        }));

  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.exhibitId)) continue;
    seen.add(target.exhibitId);
    await saveExhibitCoaching({
      rvtr: input.rvtr,
      exhibitId: target.exhibitId,
      verdict: "wrong",
      reasons: [target.coachingReason],
      note: hay || null,
      source: "publisher",
    });
  }
}
