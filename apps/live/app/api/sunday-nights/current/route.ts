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
    return NextResponse.json(payload, { headers: PUBLIC_CURRENT_NO_STORE_HEADERS });
  } catch (err) {
    console.error("[sunday-nights/current GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500, headers: PUBLIC_CURRENT_NO_STORE_HEADERS },
    );
  }
}
