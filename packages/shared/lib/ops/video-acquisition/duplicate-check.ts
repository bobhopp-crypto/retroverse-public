import "server-only";

import {
  listRecordedYoutubeIds,
  loadAcquisitionManifest,
} from "./manifest-store";
import { productionFolderForYear } from "./paths";
import { checkLocalVideoOwnership } from "./check-local-video";
import type { DuplicateConflict, VideoCandidate } from "./types";

export async function checkDuplicateConflicts(input: {
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  candidate: VideoCandidate;
  stagingDir: string;
}): Promise<DuplicateConflict[]> {
  const conflicts: DuplicateConflict[] = [];
  const rvtr = input.rvtr.trim().toUpperCase();

  const recorded = await listRecordedYoutubeIds(rvtr);
  const existingRvtr = recorded.get(input.candidate.videoId);
  if (existingRvtr) {
    conflicts.push({
      kind: "youtube_id_recorded",
      message: `YouTube ID ${input.candidate.videoId} is already recorded for ${existingRvtr}.`,
      detail: existingRvtr,
    });
  }

  const manifest = await loadAcquisitionManifest(rvtr);
  if (
    manifest?.youtubeId &&
    manifest.youtubeId !== input.candidate.videoId &&
    manifest.state === "complete"
  ) {
    conflicts.push({
      kind: "youtube_id_recorded",
      message: `This RVTR already completed acquisition for ${manifest.youtubeId}.`,
      detail: manifest.finalPath ?? undefined,
    });
  }

  const destinationDir = productionFolderForYear(input.year);
  // Filename collisions are resolved with numeric suffixes during approve/execute.
  void destinationDir;

  const owned = await checkLocalVideoOwnership({
    rvtr,
    artist: input.artist,
    title: input.title,
  });
  if (owned.owned && owned.filepath) {
    conflicts.push({
      kind: "rvtr_already_owned",
      message: "A local video is already owned for this song.",
      detail: owned.filepath,
    });
  }

  try {
    const { readdir } = await import("fs/promises");
    const files = await readdir(input.stagingDir);
    const partials = files.filter((name) => name.endsWith(".part"));
    if (partials.length > 0) {
      conflicts.push({
        kind: "staging_partial",
        message: "A partial download already exists in staging.",
        detail: partials.join(", "),
      });
    }
  } catch {
    // staging dir may not exist yet
  }

  return conflicts;
}
