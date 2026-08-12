import { loadEnvFile } from "node:process";

import { getPassPool } from "../packages/shared/lib/retroverse-pass/pg";
import { activateRequestSource } from "../packages/shared/lib/song-requests/store";
import { discoverVirtualDjSources, loadVirtualDjSourceSelection } from "../packages/shared/lib/song-requests/vdj-sources";

async function main() {
  loadEnvFile(".env.local");
  const discovery = await discoverVirtualDjSources();
  if (!discovery.defaultSourceKey) throw new Error("VIDEO/1960s was not resolved from VirtualDJ.");
  const selection = await loadVirtualDjSourceSelection(discovery.defaultSourceKey);
  if (selection.sourceKind !== "folder" || selection.sourceLabel !== "VIDEO/1960's") {
    throw new Error(`Refusing unexpected default source: ${selection.sourceLabel}`);
  }
  const activeEvent = await activateRequestSource({
    eventId: "2026-08-02",
    eventTitle: "Retroverse Live — August 2, 2026",
    selection,
  });
  process.stdout.write(`${JSON.stringify({ ok: true, activeEvent }, null, 2)}\n`);
  await getPassPool().end();
}

void main();
