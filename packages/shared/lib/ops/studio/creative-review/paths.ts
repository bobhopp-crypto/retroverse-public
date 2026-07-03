import { join } from "path";

import { collectorSongDir } from "@/lib/studio/package";

export function creativeReviewOutputPath(rvtr: string): string {
  return join(collectorSongDir(rvtr), "creative-review.json");
}

export function creativeReviewPath(rvtr: string): string {
  return `/ops/studio/creative-review/${rvtr.trim().toUpperCase()}`;
}
