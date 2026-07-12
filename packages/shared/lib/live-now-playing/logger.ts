import { appendFile, mkdir } from "fs/promises";
import { join } from "path";

import { liveNowPlayingDir } from "./paths";
import { usePostgresSundayNightsState } from "@/lib/sunday-nights/storage-mode";

export type LiveNowPlayingLogEvent =
  | "track_detected"
  | "playback_stopped"
  | "rvtr_resolved"
  | "rvtr_unresolved"
  | "rvtr_fallback"
  | "live_state_updated"
  | "bridge_public_push_ok"
  | "bridge_public_push_failed"
  | "api_error";

function logFileName(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `api-${day}.log`;
}

export async function logLiveNowPlaying(
  event: LiveNowPlayingLogEvent,
  detail: Record<string, unknown>,
): Promise<void> {
  // Postgres-backed deployments are serverless and cannot write runtime logs
  // beneath the application bundle. Local JSON-backed Live keeps file logs.
  if (usePostgresSundayNightsState()) return;

  const dir = liveNowPlayingDir();
  await mkdir(dir, { recursive: true });
  const line = JSON.stringify({
    at: new Date().toISOString(),
    event,
    ...detail,
  });
  await appendFile(join(dir, logFileName()), `${line}\n`, "utf8");
}
