import { NextResponse } from "next/server";

import {
  isExperienceId,
  type SelectorState,
} from "@/lib/bobos/experience-selector/types";
import { saveSelectorState } from "@/lib/bobos/experience-selector/store";
import { verifyLiveNowPlayingSecret } from "@/lib/live-now-playing/auth";

export const dynamic = "force-dynamic";

/**
 * Experience Selector ingest — deployed write path for selectedId only.
 *
 * Local studio pushes `{ selectedId }` on every operator selection. The public
 * player resolves the current experience from this id on every read.
 */
export async function POST(req: Request) {
  if (!verifyLiveNowPlayingSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const selectedId = (body as Partial<SelectorState>).selectedId;
  if (!isExperienceId(selectedId)) {
    return NextResponse.json({ error: "Invalid selectedId" }, { status: 400 });
  }

  await saveSelectorState({ selectedId });
  return NextResponse.json({ ok: true, selectedId });
}
