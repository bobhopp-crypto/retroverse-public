import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export function liveNowPlayingDir(): string {
  return join(retroverseDataRoot(), "live");
}

export function liveNowPlayingStatePath(): string {
  return join(liveNowPlayingDir(), "state.json");
}
