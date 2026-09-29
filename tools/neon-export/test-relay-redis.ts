/** Disposable integration check; does not touch an active event. */
import { randomUUID } from "node:crypto";
import { redisCommand } from "@/lib/sunday-nights/redis-live-state";
import {
  acknowledgePublicJukeboxRelayRequests, applyPublicJukeboxRelayControl,
  loadPublicJukeboxRelayCatalog, loadPublicJukeboxRelayStatus,
  pollPublicJukeboxRelayInbox, submitPublicJukeboxRelayRequest,
} from "@/lib/song-requests/jukebox-relay-store";

async function main() {
  const current = await redisCommand(["GET", "rv:relay:current:v1"]);
  if (current) throw new Error("Refusing to test while a relay session exists");
  const token = randomUUID();
  const guestId = randomUUID();
  const requestId = randomUUID();
  const trackKey = randomUUID();
  const track = { key: trackKey, artist: "Migration Test", title: "Disposable", year: 2026, rvtr: null, heroUrl: null };
  let catalogKey: string | null = null;
  let tracksKey: string | null = null;
  try {
    await applyPublicJukeboxRelayControl({ sessionToken: token, isOpen: true, requestLimit: 1, catalog: [track] });
    const state = JSON.parse(String(await redisCommand(["GET", `rv:relay:session:${token}`])));
    catalogKey = state.catalogKey;
    tracksKey = state.tracksKey;
    const status = await loadPublicJukeboxRelayStatus();
    const catalog = await loadPublicJukeboxRelayCatalog({ sessionToken: token });
    if (!status.isOpen || catalog.total !== 1) throw new Error("relay open/catalog failed");
    const receipt = await submitPublicJukeboxRelayRequest({ publicRequestId: requestId, sessionToken: token, guestId, trackKey });
    const duplicate = await submitPublicJukeboxRelayRequest({ publicRequestId: requestId, sessionToken: token, guestId, trackKey });
    if (receipt.duplicate || !duplicate.duplicate) throw new Error("relay idempotency failed");
    const pending = await pollPublicJukeboxRelayInbox(token);
    if (pending.length !== 1 || pending[0]?.publicRequestId !== requestId) throw new Error("relay poll failed");
    await acknowledgePublicJukeboxRelayRequests({ sessionToken: token, acknowledgements: [{ publicRequestId: requestId, result: "delivered" }] });
    if ((await pollPublicJukeboxRelayInbox(token)).length) throw new Error("relay ack failed");
    await applyPublicJukeboxRelayControl({ sessionToken: token, isOpen: false, requestLimit: 1, ended: true });
    if ((await loadPublicJukeboxRelayStatus()).isOpen) throw new Error("relay close failed");
    console.log("relay integration: open, catalog, request, duplicate, poll, ack, close verified");
  } finally {
    const keys = ["rv:relay:current:v1", `rv:relay:session:${token}`, `rv:relay:requests:${token}`,
      `rv:relay:guests:${token}`, `rv:relay:pending:${token}`, `rv:relay:count:${token}`, catalogKey, tracksKey]
      .filter((key): key is string => !!key);
    await redisCommand(["DEL", ...keys]);
  }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "relay test failed"); process.exitCode = 1; });
