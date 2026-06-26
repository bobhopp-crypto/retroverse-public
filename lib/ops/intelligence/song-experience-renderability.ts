import "server-only";

import {
  isSongExperienceRenderable,
  SONG_EXPERIENCE_RENDERABLE_STATUSES,
} from "@/lib/ops/intelligence/song-experience-renderability-core";

export { isSongExperienceRenderable, SONG_EXPERIENCE_RENDERABLE_STATUSES };

export function songExperienceStatusLabel(
  pkg: { status: string } | null,
): "Experience Ready" | "Not experience-ready" | "No research" {
  if (!pkg) return "No research";
  return isSongExperienceRenderable(pkg.status) ? "Experience Ready" : "Not experience-ready";
}
