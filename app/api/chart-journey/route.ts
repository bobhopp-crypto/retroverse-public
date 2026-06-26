import { NextResponse } from "next/server";

import { buildChartJourney, chartJourneySummary } from "@/lib/chart-journey/build-chart-journey";
import { loadAlbumPage } from "@/lib/album/load-album-page";
import { loadTrackPage } from "@/lib/track/load-track-page";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rvtr = url.searchParams.get("rvtr")?.trim().toUpperCase() ?? "";
  const rval = url.searchParams.get("rval")?.trim().toUpperCase() ?? "";

  if (rvtr && /^RVTR\d{6}$/.test(rvtr)) {
    const track = await loadTrackPage(rvtr);
    if (!track || track.trajectoryWeeks.length === 0) {
      return NextResponse.json({ ok: false, error: "no_chart_data" }, { status: 404 });
    }
    const model = buildChartJourney({
      weeks: track.trajectoryWeeks,
      peak: track.peakHot100,
      chartLabel: track.chartRunLabel,
      focusTrackId: track.rvtr,
    });
    if (!model) {
      return NextResponse.json({ ok: false, error: "no_chart_data" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      entityKind: "song",
      entityId: rvtr,
      title: track.title,
      artist: track.artistName,
      summary: chartJourneySummary(model),
      model,
    });
  }

  if (rval && /^RVAL\d{6}$/.test(rval)) {
    const album = await loadAlbumPage(rval);
    if (!album || album.trajectoryWeeks.length === 0) {
      return NextResponse.json({ ok: false, error: "no_chart_data" }, { status: 404 });
    }
    const model = buildChartJourney({
      weeks: album.trajectoryWeeks,
      peak: album.b200Peak,
      chartLabel: album.chartRunLabel,
      maxRank: 200,
    });
    if (!model) {
      return NextResponse.json({ ok: false, error: "no_chart_data" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      entityKind: "album",
      entityId: rval,
      title: album.title,
      artist: album.artistName,
      summary: chartJourneySummary(model),
      model,
    });
  }

  return NextResponse.json({ ok: false, error: "invalid_params" }, { status: 400 });
}
