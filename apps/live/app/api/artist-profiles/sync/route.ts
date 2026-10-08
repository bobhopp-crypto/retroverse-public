import { NextResponse } from "next/server";
import { verifyLiveNowPlayingSecret } from "@/lib/live-now-playing/auth";
import { validateArtistProfileView } from "../../../../lib/artist-profile-contract";
import { saveArtistDirectory, saveArtistProfile, validateArtistDirectory } from "../../../../lib/artist-profile-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!verifyLiveNowPlayingSecret(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "Batch too large" }, { status: 413 });
  let body: { profiles?: unknown[]; directory?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!Array.isArray(body.profiles) || body.profiles.length > 20) return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
  const profiles = body.profiles.map(validateArtistProfileView);
  if (profiles.some((profile) => !profile)) return NextResponse.json({ error: "Invalid artist profile" }, { status: 400 });
  const directory = body.directory === undefined ? undefined : validateArtistDirectory(body.directory);
  if (body.directory !== undefined && !directory) return NextResponse.json({ error: "Invalid artist directory" }, { status: 400 });
  try {
    for (const profile of profiles) await saveArtistProfile(profile!);
    if (directory) await saveArtistDirectory(directory);
    return NextResponse.json({ ok: true, count: profiles.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }
}
