#!/usr/bin/env npx tsx
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import {
  buildRvYearDestination,
  enrichRvYearDestination,
} from "@/lib/rv-year/enrich-rv-year-destination";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { buildPublicExhibitFromPatron, buildPatronSongExperience } from "@/lib/retroverse/experience/build-song-experience";
import { savePublicExhibit } from "@/lib/retroverse/experience/public-exhibit-store";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { songControlData } from "@/lib/retroverse-2/song-control";

const rvtr = (process.argv[2] ?? "RVTR044043").toUpperCase();

async function yearDestination(track: NonNullable<Awaited<ReturnType<typeof loadTrackPage>>>) {
  const year =
    track.releaseYear ??
    (track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : null) ??
    track.albums[0]?.releaseYear ??
    null;
  if (!year) return null;
  const history = await loadRvYearChartHistory(year);
  if (!history || !isUsableChartHistory(history)) return null;
  return enrichRvYearDestination(buildRvYearDestination(history, year));
}

async function main() {
  const track = await loadTrackPage(rvtr);
  if (!track) throw new Error(`Track not found: ${rvtr}`);
  const pkg = await loadSongPackage(rvtr);
  if (!pkg) throw new Error(`Package not found: ${rvtr}`);

  const [artist, destination] = await Promise.all([
    loadArtistPage(track.artistSlug),
    yearDestination(track),
  ]);
  const control = songControlData(pkg);
  const year =
    track.releaseYear ??
    (track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : null) ??
    track.albums[0]?.releaseYear ??
    null;

  const patron = buildPatronSongExperience({
    track,
    pkg,
    control,
    artist,
    destination,
    releaseYear: year,
    lengthHint: control.facts?.length ?? null,
  });

  const exhibit = buildPublicExhibitFromPatron(patron);
  await savePublicExhibit(exhibit);

  const bundledPath = join(
    process.cwd(),
    "data/ops/intelligence/packages",
    rvtr,
    "experience.json",
  );
  await mkdir(dirname(bundledPath), { recursive: true });
  await writeFile(bundledPath, `${JSON.stringify(exhibit, null, 2)}\n`, "utf8");

  console.log(`Wrote experience.json for ${rvtr}`);
  console.log(`  primary chapters: ${exhibit.primary.length}`);
  console.log(`  learn more: ${exhibit.learnMore.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
