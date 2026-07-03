import { join } from "path";

import { msPerformancesDir } from "@/lib/ops/media-collections/midnight-special/paths";

/** Cached filmstrip + thumbnails for performance editing (ffmpeg). */
export function performanceEditorCacheDir(episodeId: string): string {
  const safe = episodeId.replace(/[^a-zA-Z0-9_-]/g, "_") || "episode";
  return join(msPerformancesDir(), "editor-cache", safe);
}
