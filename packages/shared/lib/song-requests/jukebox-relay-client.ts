import "server-only";

import {
  ingestPublicJukeboxRequest,
  loadActiveJukeboxSessionIdentity,
  loadJukeboxRelayControlSnapshot,
  recordJukeboxRelayDiagnostics,
  refreshJukeboxRequestList,
} from "./jukebox-local-store";
import type { PublicJukeboxRelayAck, PublicJukeboxRelayRequest } from "./jukebox-relay-types";

type RelayResult = {
  ok: boolean;
  detail: string;
  pendingCount?: number;
  insertedCount?: number;
};

function relayOrigin(): string {
  const candidate = new URL(process.env.RETROVERSE_LIVE_PUBLIC_URL?.trim() || "https://retroverse.live");
  const local = candidate.hostname === "localhost" || candidate.hostname === "127.0.0.1";
  const approvedPublicHost = candidate.hostname === "retroverse.live";
  if ((!local && !approvedPublicHost) || (!local && candidate.protocol !== "https:")) {
    throw new Error("The public request relay destination is not approved.");
  }
  if (candidate.username || candidate.password || candidate.search || candidate.hash) {
    throw new Error("The public request relay destination is invalid.");
  }
  return candidate.origin;
}

function relaySecret(): string {
  const value = process.env.LIVE_NOW_PLAYING_SECRET?.trim();
  if (!value) throw new Error("LIVE_NOW_PLAYING_SECRET is not configured for the public request relay.");
  return value;
}

async function relayPost<T>(path: "/api/jukebox-relay/control" | "/api/jukebox-relay/poll" | "/api/jukebox-relay/ack", body: unknown): Promise<T> {
  const response = await fetch(`${relayOrigin()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${relaySecret()}` },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Public relay returned HTTP ${response.status}.`);
  return payload;
}

async function relayFailure(error: unknown, poll = false): Promise<RelayResult> {
  const detail = error instanceof Error ? error.message : String(error);
  await recordJukeboxRelayDiagnostics({ status: "error", attempt: true, poll, error: detail }).catch(() => undefined);
  return { ok: false, detail };
}

export async function publishJukeboxRelayControl(input: { includeCatalog: boolean }): Promise<RelayResult> {
  try {
    const snapshot = await loadJukeboxRelayControlSnapshot(input.includeCatalog);
    await recordJukeboxRelayDiagnostics({ status: snapshot.isOpen ? "open" : "closed", attempt: true, error: null });
    await relayPost<{ ok: true }>("/api/jukebox-relay/control", snapshot);
    await recordJukeboxRelayDiagnostics({ status: snapshot.isOpen ? "open" : "closed", success: true, error: null });
    return { ok: true, detail: snapshot.isOpen ? "Public requests open" : "Public requests closed" };
  } catch (error) {
    return relayFailure(error);
  }
}

export async function closeJukeboxRelaySession(sessionToken: string): Promise<RelayResult> {
  try {
    await recordJukeboxRelayDiagnostics({ status: "closed", attempt: true, error: null });
    await relayPost<{ ok: true }>("/api/jukebox-relay/control", {
      sessionToken,
      isOpen: false,
      requestLimit: null,
      ended: true,
    });
    await recordJukeboxRelayDiagnostics({ status: "closed", success: true, pendingCount: 0, error: null });
    return { ok: true, detail: "Public session closed" };
  } catch (error) {
    return relayFailure(error);
  }
}

function isRelayRequest(value: unknown): value is PublicJukeboxRelayRequest {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<PublicJukeboxRelayRequest>;
  return typeof row.publicRequestId === "string" && typeof row.sessionToken === "string" &&
    typeof row.guestId === "string" && typeof row.trackKey === "string" &&
    typeof row.artist === "string" && typeof row.title === "string" && typeof row.requestedAt === "string";
}

export async function pollAndIngestPublicJukeboxRequests(): Promise<RelayResult> {
  const session = await loadActiveJukeboxSessionIdentity();
  if (!session || !session.requestsEnabled) {
    await recordJukeboxRelayDiagnostics({ status: "closed", poll: true, pendingCount: 0, error: null });
    return { ok: true, detail: "Requests closed", pendingCount: 0, insertedCount: 0 };
  }
  try {
    const payload = await relayPost<{ requests?: unknown[] }>("/api/jukebox-relay/poll", {
      sessionToken: session.publicSessionToken,
    });
    const raw = payload.requests ?? [];
    const requests = raw.filter(isRelayRequest);
    if (requests.length !== raw.length) throw new Error("The public relay returned an invalid inbox payload.");
    const acknowledgements: PublicJukeboxRelayAck[] = [];
    let insertedCount = 0;
    for (const request of requests) {
      const result = await ingestPublicJukeboxRequest(request);
      acknowledgements.push({
        publicRequestId: result.acknowledgement.publicRequestId,
        result: result.acknowledgement.result,
      });
      if (result.inserted) insertedCount += 1;
    }
    if (insertedCount > 0) await refreshJukeboxRequestList();
    if (acknowledgements.length > 0) {
      await relayPost<{ ok: true }>("/api/jukebox-relay/ack", {
        sessionToken: session.publicSessionToken,
        acknowledgements,
      });
    }
    await recordJukeboxRelayDiagnostics({
      status: "open",
      attempt: true,
      success: true,
      poll: true,
      pendingCount: requests.length,
      error: null,
    });
    return { ok: true, detail: `${insertedCount} new public requests`, pendingCount: requests.length, insertedCount };
  } catch (error) {
    return relayFailure(error, true);
  }
}
