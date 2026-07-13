import { NextResponse } from "next/server";

import {
  loadPublicCurrentSongPayload,
  PUBLIC_CURRENT_NO_STORE_HEADERS,
} from "@/lib/home/public-current-song";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const payload = await loadPublicCurrentSongPayload();
    console.info("[public-current-song] response", {
      source: payload.publicState?.source,
      servedAt: payload.publicState?.servedAt,
      rvtr: payload.currentTrackId,
      title: payload.live?.title ?? payload.track?.title ?? null,
      artist: payload.live?.artist ?? payload.track?.artistName ?? null,
    });
    return NextResponse.json(payload, {
      headers: {
        ...PUBLIC_CURRENT_NO_STORE_HEADERS,
        "X-Retroverse-State-Version": "2",
        "X-Retroverse-State-Source": payload.publicState?.source ?? "unknown",
      },
    });
  } catch (err) {
    console.error("[sunday-nights/current GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500, headers: PUBLIC_CURRENT_NO_STORE_HEADERS },
    );
  }
}
