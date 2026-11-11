import { NextResponse } from "next/server";
import { loadPreviewPublicFeed } from "@/lib/home/preview-public-feed";

import {
  loadPublicCurrentSongPayload,
  PUBLIC_CURRENT_NO_STORE_HEADERS,
} from "@/lib/home/public-current-song";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const preview = await loadPreviewPublicFeed(req, process.env);
    if (preview !== undefined) return NextResponse.json(preview, {
      headers: { ...PUBLIC_CURRENT_NO_STORE_HEADERS, "X-Retroverse-State-Source": "preview-public-feed", "X-Retroverse-State-Version": "2" },
    });
    const payload = await loadPublicCurrentSongPayload({ identityOnly: new URL(req.url).searchParams.get("view") === "identity" });
    // Keep the existing full response contract. Lightweight snapshots already
    // carry explicit playing/stopped state and their original timestamps;
    // never turn an identity response's explicit stop into playing=true.
    const publicPayload =
      payload.identityOnly !== true && payload.live?.source === "bridge"
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
      { error: "Current song is temporarily unavailable" },
      { status: 500, headers: PUBLIC_CURRENT_NO_STORE_HEADERS },
    );
  }
}
