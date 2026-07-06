import { appendFile, mkdir } from "fs/promises";
import { join } from "path";

export type BridgeLogEvent =
  | "bridge_start"
  | "bridge_destination"
  | "bridge_post_ok"
  | "bridge_tick"
  | "track_detected"
  | "track_published"
  | "publish_skipped"
  | "playback_stopped"
  | "vdj_error"
  | "api_error";

function logPath(dataRoot: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return join(dataRoot, "live", `bridge-${day}.log`);
}

export async function bridgeLog(
  dataRoot: string,
  event: BridgeLogEvent,
  detail: Record<string, unknown>,
): Promise<void> {
  const dir = join(dataRoot, "live");
  await mkdir(dir, { recursive: true });
  const line = JSON.stringify({
    at: new Date().toISOString(),
    event,
    ...detail,
  });
  await appendFile(logPath(dataRoot), `${line}\n`, "utf8");
  console.log(`[live-bridge] ${event}`, detail);
}
