import { NextResponse } from "next/server";

import {
  JukeboxInputError,
  endActiveJukeboxSession,
  loadActiveJukeboxSessionIdentity,
  loadJukeboxOperatorStatus,
  refreshJukeboxRequestList,
  setJukeboxPolicy,
  setJukeboxRequestsEnabled,
  startNewJukeboxSession,
} from "@/lib/song-requests/jukebox-local-store";
import {
  pollJukeboxBridge,
  startJukeboxBridge,
  verifyJukeboxRequestListWritable,
} from "@/lib/song-requests/jukebox-runtime";
import {
  closeJukeboxRelaySession,
  pollAndIngestPublicJukeboxRequests,
  publishJukeboxRelayControl,
} from "@/lib/song-requests/jukebox-relay-client";

export const dynamic = "force-dynamic";

function failure(error: unknown) {
  if (error instanceof JukeboxInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Jukebox control failed." },
    { status: 503 },
  );
}

export async function GET() {
  try {
    return NextResponse.json(await loadJukeboxOperatorStatus(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = body as { requestsPerGuest?: unknown };
  try {
    const requestsPerGuest = input.requestsPerGuest == null ? null : Number(input.requestsPerGuest);
    await setJukeboxPolicy({ requestsPerGuest });
    await publishJukeboxRelayControl({ includeCatalog: false });
    return NextResponse.json(await loadJukeboxOperatorStatus());
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const action = (body as { action?: unknown }).action;
  try {
    if (action === "start" || action === "start-session") {
      await verifyJukeboxRequestListWritable();
      await startNewJukeboxSession();
      try {
        await refreshJukeboxRequestList();
        await startJukeboxBridge();
        await refreshJukeboxRequestList();
      } catch (error) {
        await endActiveJukeboxSession().catch(() => undefined);
        throw error;
      }
      await publishJukeboxRelayControl({ includeCatalog: true });
      return NextResponse.json(await loadJukeboxOperatorStatus());
    }
    if (action === "requests-on" || action === "requests-off") {
      const enabled = action === "requests-on";
      await setJukeboxRequestsEnabled(enabled);
      await publishJukeboxRelayControl({ includeCatalog: enabled });
      if (enabled) await pollAndIngestPublicJukeboxRequests();
      return NextResponse.json(await loadJukeboxOperatorStatus());
    }
    if (action === "end-session") {
      const active = await loadActiveJukeboxSessionIdentity();
      await endActiveJukeboxSession();
      if (active) await closeJukeboxRelaySession(active.publicSessionToken);
      await pollJukeboxBridge();
      return NextResponse.json(await loadJukeboxOperatorStatus());
    }
    if (action === "poll-bridge") {
      await pollAndIngestPublicJukeboxRequests();
      await pollJukeboxBridge();
      return NextResponse.json(await loadJukeboxOperatorStatus());
    }
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    return failure(error);
  }
}
