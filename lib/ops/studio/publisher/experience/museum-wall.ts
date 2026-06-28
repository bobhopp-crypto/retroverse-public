import "server-only";

import { loadPublisherStore } from "../store";
import { listGoldenPackages } from "./store";
import type { MuseumWallEntry } from "./types";

/** Top experiences for the Museum Wall — read-only gallery. */
export async function buildMuseumWall(limit = 100): Promise<MuseumWallEntry[]> {
  const [publisherStore, golden] = await Promise.all([
    loadPublisherStore(),
    listGoldenPackages(),
  ]);

  const goldenRvtrs = new Set(golden.map((g) => g.rvtr));
  const goldenByRvtr = new Map(golden.map((g) => [g.rvtr, g]));

  const candidates = publisherStore.records.filter(
    (r) =>
      r.evaluation &&
      (r.approvedClass === "ready" ||
        r.approvedClass === "extended" ||
        r.approvedClass === "showcase" ||
        goldenRvtrs.has(r.rvtr)),
  );

  const ranked = candidates
    .map((record) => {
      const eval_ = record.evaluation!;
      const emotion = eval_.experienceScorecard?.emotionScore ?? eval_.qualityScore;
      const goldenRecord = goldenByRvtr.get(record.rvtr);
      const showcaseBoost =
        record.approvedClass === "showcase" ? 8 : record.approvedClass === "extended" ? 3 : 0;
      const goldenBoost = goldenRecord ? 12 : 0;
      const uniqueness = eval_.uniquenessScore ?? 80;
      const composite = emotion * 0.55 + eval_.qualityScore * 0.25 + uniqueness * 0.12 + showcaseBoost + goldenBoost;

      return {
        rvtr: record.rvtr,
        artist: record.artist,
        title: record.title,
        coverUrl: record.coverUrl,
        qualityScore: eval_.qualityScore,
        emotionScore: emotion,
        fingerprint: eval_.fingerprints ?? goldenRecord?.fingerprint ?? [],
        publicationClass: record.approvedClass ?? eval_.publicationClass,
        showcaseReason:
          goldenRecord?.showcaseReason ??
          record.decisions.find((d) => d.action === "approve_showcase")?.reason ??
          eval_.why,
        publisherComment:
          goldenRecord?.publisherComment ??
          record.decisions.find((d) => d.action.startsWith("approve"))?.reason ??
          eval_.why,
        isGolden: Boolean(goldenRecord),
        composite,
      };
    })
    .sort((a, b) => b.composite - a.composite)
    .slice(0, limit);

  return ranked.map((row, index) => ({
    rvtr: row.rvtr,
    artist: row.artist,
    title: row.title,
    coverUrl: row.coverUrl,
    qualityScore: row.qualityScore,
    emotionScore: row.emotionScore,
    fingerprint: row.fingerprint,
    publicationClass: row.publicationClass,
    showcaseReason: row.showcaseReason,
    publisherComment: row.publisherComment,
    isGolden: row.isGolden,
    rank: index + 1,
  }));
}
