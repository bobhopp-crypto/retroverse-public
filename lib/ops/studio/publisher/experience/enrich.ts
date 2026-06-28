import "server-only";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";

import { detectExperienceFingerprints } from "./fingerprint";
import { buildAutoExperienceScorecard } from "./scorecard";
import {
  buildExperienceVector,
  findSimilarExperiences,
  uniquenessFromSimilarities,
} from "./similarity";
import type { SimilarExperienceMatch } from "./types";
import { loadPublisherStore } from "../store";

export async function enrichEvaluationExperience(input: {
  rvtr: string;
  existingScorecard?: import("./types").ExperienceScorecard | null;
}): Promise<{
  experienceScorecard: import("./types").ExperienceScorecard;
  fingerprints: import("./types").ExperienceFingerprint[];
  uniquenessScore: number;
  similarPackages: SimilarExperienceMatch[];
}> {
  const [director, collector, publisherStore] = await Promise.all([
    loadDirectorPackage(input.rvtr),
    loadCollectorPackage(input.rvtr),
    loadPublisherStore(),
  ]);

  if (!director) {
    throw new Error("no_director");
  }

  const fingerprints = detectExperienceFingerprints(director, collector);
  const experienceScorecard = buildAutoExperienceScorecard(director, input.existingScorecard);
  const targetVector = buildExperienceVector(input.rvtr, director, fingerprints);

  const catalog = [];
  for (const record of publisherStore.records) {
    if (record.rvtr === input.rvtr || !record.evaluation?.fingerprints) continue;
    const otherDirector = await loadDirectorPackage(record.rvtr);
    if (!otherDirector) continue;
    catalog.push(
      buildExperienceVector(
        record.rvtr,
        otherDirector,
        record.evaluation.fingerprints,
      ),
    );
  }

  const similarRaw = findSimilarExperiences(targetVector, catalog, 5);
  const similarPackages: SimilarExperienceMatch[] = similarRaw.map((match) => {
    const record = publisherStore.records.find((r) => r.rvtr === match.rvtr);
    const sharedFingerprints = (record?.evaluation?.fingerprints ?? []).filter((fp) =>
      fingerprints.includes(fp),
    );
    return {
      rvtr: match.rvtr,
      artist: record?.artist ?? "Unknown",
      title: record?.title ?? match.rvtr,
      coverUrl: record?.coverUrl ?? null,
      similarity: match.similarity,
      sharedFingerprints,
    };
  });

  const uniquenessScore = uniquenessFromSimilarities(
    similarRaw.map((row) => row.similarity),
  );

  return { experienceScorecard, fingerprints, uniquenessScore, similarPackages };
}
