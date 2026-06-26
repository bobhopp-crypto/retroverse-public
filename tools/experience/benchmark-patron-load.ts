#!/usr/bin/env npx tsx
/**
 * Compare runtime exhibit build vs precomputed experience.json hydrate.
 */
import { performance } from "node:perf_hooks";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import {
  buildRvYearDestination,
  enrichRvYearDestination,
} from "@/lib/rv-year/enrich-rv-year-destination";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { buildPatronSongExperience } from "@/lib/retroverse/experience/build-song-experience";
import { hydratePublicExhibit } from "@/lib/retroverse/experience/hydrate-public-exhibit";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { songControlData } from "@/lib/retroverse-2/song-control";

const rvtr = (process.argv[2] ?? "RVTR044043").toUpperCase();
const ITERATIONS = 5;

async function yearDestination(track: Awaited<ReturnType<typeof loadTrackPage>>) {
  if (!track) return null;
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
  if (!track) {
    console.error(`Track not found: ${rvtr}`);
    process.exit(1);
  }

  const pkg = await loadSongPackage(rvtr);
  if (!pkg) {
    console.error(`Package not found: ${rvtr}`);
    process.exit(1);
  }

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

  const buildTimes: number[] = [];
  let built = null;
  for (let i = 0; i < ITERATIONS; i += 1) {
    const start = performance.now();
    built = buildPatronSongExperience({
      track,
      pkg,
      control,
      artist,
      destination,
      releaseYear: year,
      lengthHint: control.facts?.length ?? null,
    });
    buildTimes.push(performance.now() - start);
  }

  const exhibit = {
    version: 1 as const,
    rvtr: built!.experience.rvtr,
    packageUpdatedAt: built!.experience.packageUpdatedAt,
    builtAt: built!.experience.builtAt,
    profile: built!.experience.profile,
    director: built!.experience.director,
    eraExhibit: built!.eraExhibit,
    living: built!.living,
    primary: built!.experience.chapters.map((chapter) => {
      if (chapter.kind === "chart_journey") {
        return {
          kind: "chart_journey" as const,
          score: chapter.score,
          releaseYear: chapter.releaseYear,
          summary: chapter.summary,
        };
      }
      return chapter;
    }),
    learnMore: built!.experience.learnMore,
  };

  const hydrateTimes: number[] = [];
  for (let i = 0; i < ITERATIONS; i += 1) {
    const start = performance.now();
    hydratePublicExhibit(exhibit, track);
    hydrateTimes.push(performance.now() - start);
  }

  const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

  console.log(JSON.stringify({
    rvtr,
    iterations: ITERATIONS,
    buildPatronMs: {
      avg: Math.round(avg(buildTimes) * 100) / 100,
      min: Math.round(Math.min(...buildTimes) * 100) / 100,
      max: Math.round(Math.max(...buildTimes) * 100) / 100,
    },
    hydrateExhibitMs: {
      avg: Math.round(avg(hydrateTimes) * 100) / 100,
      min: Math.round(Math.min(...hydrateTimes) * 100) / 100,
      max: Math.round(Math.max(...hydrateTimes) * 100) / 100,
    },
    primaryChapters: built!.experience.chapters.length,
    learnMoreChapters: built!.experience.learnMore.length,
    speedupFactor: Math.round((avg(buildTimes) / Math.max(avg(hydrateTimes), 0.01)) * 10) / 10,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
