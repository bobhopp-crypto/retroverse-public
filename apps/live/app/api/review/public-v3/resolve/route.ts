import { NextResponse } from "next/server";

import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import { integrityWarningCount, loadIntegrityTrace } from "@/lib/ops/integrity/load-integrity-dashboard";
import { loadTrackPage } from "@/lib/track/load-track-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json({ ok: false, error: "Review tools are development-only." }, { status: 404 });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return unavailable();

  const url = new URL(request.url);
  const rvtr = url.searchParams.get("rvtr")?.trim() ?? "";
  if (!/^RVTR\d{6}$/i.test(rvtr)) {
    return NextResponse.json({ ok: false, error: "Select a canonical RVTR song result." }, { status: 400 });
  }

  const track = await loadTrackPage(rvtr);
  if (!track) {
    return NextResponse.json({ ok: false, error: `No canonical song found for ${rvtr}.` }, { status: 404 });
  }

  const album = track.albums.find((entry) => entry.href) ?? null;
  const chartWeek =
    (track.peakHot100 != null
      ? track.trajectoryWeeks.find((week) => week.rank === track.peakHot100)
      : null) ??
    track.trajectoryWeeks[track.trajectoryWeeks.length - 1] ??
    null;
  const chartWeekHref = chartWeek
    ? chartWeekPortalHref(chartWeek.issueDate, { focus: track.rvtr, rank: chartWeek.rank })
    : null;
  const yearUnavailableReason = track.trajectoryWeeks.length === 0 ? "Missing chart-year relationship" : track.releaseYear == null ? "Missing canonical year" : "Unknown";
  const integrityTrace = await loadIntegrityTrace(track.rvtr);

  return NextResponse.json({
    ok: true,
    context: {
      rvtr: track.rvtr,
      title: track.title,
      artist: track.artistName,
      artistSlug: track.artistSlug,
      artistHref: track.artistHref,
      albumTitle: album?.title ?? null,
      albumHref: album?.href ?? null,
      albumRval: album?.rval ?? null,
      year: track.releaseYear,
      yearHref: track.rvYearHref,
      chartWeekLabel: chartWeek
        ? `${chartWeek.issueDate} · #${chartWeek.rank}`
        : null,
      chartWeekHref,
      routes: {
        homepage: `/review/public-v3/home?rvtr=${encodeURIComponent(track.rvtr)}`,
        song: `/retroverse-2/song/${track.rvtr}`,
        artist: track.artistHref,
        album: album?.href ?? null,
        year: track.releaseYear != null ? `/rv/${track.releaseYear}` : null,
        chartWeek: chartWeekHref,
      },
      errors: {
        album: album?.href ? null : "No canonical album route resolved for this song.",
        year: track.rvYearHref ? null : `No canonical year is available for this track. Reason: ${yearUnavailableReason}.`,
        chartWeek: chartWeekHref ? null : "No representative Chart Week V3 route resolved for this song.",
      },
      diagnostics: {
        rvtr: track.rvtr,
        canonicalRvar: track.artistSlug,
        canonicalArtistId: integrityTrace?.canonicalArtistId ?? null,
        canonicalAlbumId: integrityTrace?.canonicalAlbumId ?? album?.rval ?? null,
        loaderTier: "loadTrackPage(rvtr)",
        coverSource: integrityTrace?.artworkSource ?? (track.coverUrl ? "loadTrackPage.coverUrl" : "missing"),
        integrityWarningCount: integrityWarningCount(integrityTrace),
        integrityHref: `http://localhost:3000/ops/integrity?trace=${encodeURIComponent(track.rvtr)}`,
      },
    },
  });
}
