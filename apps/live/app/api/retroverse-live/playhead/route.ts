import { NextResponse } from "next/server";

import { normalizePlayheadPayload } from "@/lib/broadcast/normalize-playhead";
import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";

export const dynamic = "force-dynamic";

/**
 * The public player's entire API surface:
 * "What is the current Playhead?"
 *
 * Auto-advance is resolved lazily on read from the stored anchor, so no
 * background job is needed and every poll returns the correct item.
 */
export async function GET() {
  const payload = normalizePlayheadPayload(await buildPlayheadPayload());
  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}
