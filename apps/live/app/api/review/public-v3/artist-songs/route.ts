import { NextResponse } from "next/server";

import { loadArtistChartedSongs } from "@/lib/artist/load-artist-charted-songs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Review tools are development-only." }, { status: 404 });
  }

  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Artist slug is required." }, { status: 400 });
  }

  const artist = await loadArtistChartedSongs(slug);
  return NextResponse.json({
    ok: true,
    artist: {
      slug: artist.slug,
      displayName: artist.displayName,
      songs: artist.songs.map((song) => ({
        rvtr: song.rvtr,
        title: song.title,
        albumTitle: song.albumTitle,
        firstChartYear: song.firstChartYear,
        firstChartDate: song.firstChartDate,
        peakHot100: song.peakHot100,
      })),
    },
  });
}
