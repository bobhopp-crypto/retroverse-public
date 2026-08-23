import {
  closeJukeboxRelaySession,
  publishJukeboxRelayControl,
} from "../../packages/shared/lib/song-requests/jukebox-relay-client";
import {
  endActiveJukeboxSession,
  loadActiveJukeboxSessionIdentity,
  refreshJukeboxRequestList,
  setJukeboxRequestsEnabled,
  startNewJukeboxSession,
} from "../../packages/shared/lib/song-requests/jukebox-local-store";

const root = process.env.RETROVERSE_DATA_ROOT?.trim() ?? "";
if (!root.startsWith("/private/tmp/retroverse-live-requests-data")) {
  throw new Error("UI staging requires the isolated temporary Jukebox data root.");
}

async function close(): Promise<void> {
  const active = await loadActiveJukeboxSessionIdentity();
  if (!active) return;
  await endActiveJukeboxSession();
  const result = await closeJukeboxRelaySession(active.publicSessionToken);
  if (!result.ok) throw new Error(result.error || "Could not close the UI staging relay session.");
}

async function main(): Promise<void> {
  await close();
  if (process.argv.includes("--close")) {
    console.log(JSON.stringify({ closed: true }));
    return;
  }

  await startNewJukeboxSession("Mobile UI Verification");
  await refreshJukeboxRequestList();
  await setJukeboxRequestsEnabled(true);
  const result = await publishJukeboxRelayControl({ includeCatalog: true });
  if (!result.ok) throw new Error(result.error || "Could not open the UI staging relay session.");
  const active = await loadActiveJukeboxSessionIdentity();
  console.log(JSON.stringify({ open: true, catalogCount: 813, sessionToken: active?.publicSessionToken }));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
