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
    // `loadPublicCurrentSongPayload` only returns a bridge selection after the
    // private state confirms bridgePlaying === true and a fresh bridge tick.
    // Expose that verified state explicitly for public clients.
    const publicPayload =
      payload.live?.source === "bridge"
        ? { ...payload, live: { ...payload.live, playing: true } }
        : payload;
    console.info("[public-current-song] response", {
      source: publicPayload.publicState?.source,
      servedAt: publicPayload.publicState?.servedAt,
      rvtr: publicPayload.currentTrackId,
      title: publicPayload.live?.title ?? publicPayload.track?.title ?? null,
      artist: publicPayload.live?.artist ?? publicPayload.track?.artistName ?? null,
    });
    return NextResponse.json(publicPayload, {
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
