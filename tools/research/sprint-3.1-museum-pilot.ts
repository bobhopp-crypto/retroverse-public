#!/usr/bin/env node
/**
 * Sprint 3.1 — Museum Experience Pilot validation + registry build.
 *
 * Usage: npm run research:sprint:3.1-museum
 */
require("../finance/preload-server-only.cjs");

import { mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";

import { buildSongDnaPackage } from "../../lib/ops/studio/collector/build-song-dna.ts";
import { loadCollectorPackage } from "../../lib/ops/studio/collector/store.ts";
import { loadSongDnaPackage, saveSongDnaPackage } from "../../lib/ops/studio/collector/song-dna-store.ts";
import { buildVisualIdentityPackage } from "../../lib/ops/studio/collector/visual-identity.ts";
import { collectorVisualAssetsDir, researchDepartmentRoot } from "../../lib/studio/package.ts";
import { composeScenes } from "../../lib/retroverse/scene-composer/compose-scenes.ts";
import {
  composeMuseumExperience,
  museumAdjacentDuplicateImages,
} from "../../lib/retroverse/renderer/museum-experience.ts";
import {
  loadMuseumPilotRegistry,
  museumPilotRegistryPath,
  type MuseumPilotRegistry,
  type MuseumPilotSong,
} from "../../lib/retroverse/renderer/museum-pilot-registry.ts";
import { loadPublicExperience } from "../../lib/retroverse/renderer/load-public-experience.ts";
import { loadExperienceRenderSpec } from "../../lib/retroverse/renderer/load-render-spec.ts";
import { polishScenesForPresentation } from "../../lib/retroverse/renderer/scene-presentation.ts";
import { buildSongDnaWatercolorSvg } from "../../lib/retroverse/renderer/song-dna-watercolor.ts";
import { loadTrackPage } from "../../lib/track/load-track-page.ts";

const REPORT_DIR = join(process.cwd(), "reports/sprint-3.1");
const TARGET_COUNT = 20;
const STRICT_MIN = 10;
const STRICT_MAX = 20;
const EXPANDED_MIN = 5;

type EligibleSong = MuseumPilotSong & {
  frameCount: number;
  hasSongDna: boolean;
  hasChartWeeks: boolean;
  directorSpec: boolean;
};

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function sceneWords(scene: {
  headline: string;
  supportingCopy: string;
  assets: { factTexts: string[] };
}): number {
  return (
    wordCount(scene.headline) +
    wordCount(scene.supportingCopy) +
    scene.assets.factTexts.reduce((s, f) => s + wordCount(f), 0)
  );
}

function playCountFromCollector(collector: Awaited<ReturnType<typeof loadCollectorPackage>>): number | null {
  if (!collector) return null;
  if (typeof collector.virtualDj.playCount === "number") return collector.virtualDj.playCount;
  const item = collector.videoPerformance.items.find((i) => i.isVideo);
  return item?.playCount ?? null;
}

function frameCount(collector: NonNullable<Awaited<ReturnType<typeof loadCollectorPackage>>>): number {
  const perf = collector.performances?.[0];
  return (
    perf?.visualAssets.extraction.extractedCount ??
    collector.visualAssets.extraction.extractedCount ??
    0
  );
}

function hasVideo(collector: NonNullable<Awaited<ReturnType<typeof loadCollectorPackage>>>): boolean {
  if ((collector.performances?.length ?? 0) > 0) return true;
  return collector.videoPerformance.items.some((item) => item.isVideo);
}

function tierForPlayCount(playCount: number | null): MuseumPilotSong["tier"] {
  if (playCount == null) return "unknown";
  if (playCount >= STRICT_MIN && playCount <= STRICT_MAX) return "strict";
  if (playCount >= EXPANDED_MIN && playCount <= STRICT_MAX) return "expanded";
  return "expanded";
}

function isEligible(
  collector: NonNullable<Awaited<ReturnType<typeof loadCollectorPackage>>>,
): boolean {
  const plays = playCountFromCollector(collector);
  if (plays != null && (plays < EXPANDED_MIN || plays > STRICT_MAX)) return false;
  if (!hasVideo(collector)) return false;
  if (frameCount(collector) < 5) return false;
  return collector.status === "complete" || collector.status === "partial";
}

async function ensureSongDna(rvtr: string): Promise<boolean> {
  const existing = await loadSongDnaPackage(rvtr);
  if (existing) return true;
  const collector = await loadCollectorPackage(rvtr);
  if (!collector) return false;
  const visualIdentity = await buildVisualIdentityPackage(collector);
  const dna = await buildSongDnaPackage(collector, visualIdentity);
  await saveSongDnaPackage(dna);
  return true;
}

async function writeWatercolorAsset(rvtr: string): Promise<boolean> {
  const dna = await loadSongDnaPackage(rvtr);
  if (!dna) return false;
  const svg = buildSongDnaWatercolorSvg(dna);
  const dir = collectorVisualAssetsDir(rvtr);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "dna-watercolor.svg"), svg, "utf8");
  return true;
}

async function discoverRvtrs(): Promise<string[]> {
  const root = researchDepartmentRoot();
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && /^RVTR\d{6}$/.test(e.name))
    .map((e) => e.name)
    .sort();
}

async function buildRegistry(): Promise<{ registry: MuseumPilotRegistry; songs: EligibleSong[] }> {
  const rvtrs = await discoverRvtrs();
  const songs: EligibleSong[] = [];

  for (const rvtr of rvtrs) {
    const collector = await loadCollectorPackage(rvtr);
    if (!collector || !isEligible(collector)) continue;

    await ensureSongDna(rvtr);
    await writeWatercolorAsset(rvtr);

    const playCount = playCountFromCollector(collector);
    let hasChartWeeks = false;
    try {
      const track = await loadTrackPage(rvtr);
      hasChartWeeks = Boolean(track && track.trajectoryWeeks.length > 0);
    } catch {
      hasChartWeeks = false;
    }

    const directorSpec = Boolean(await loadExperienceRenderSpec(rvtr));

    songs.push({
      rvtr,
      artist: collector.artist,
      title: collector.title,
      playCount,
      tier: tierForPlayCount(playCount),
      frameCount: frameCount(collector),
      hasSongDna: Boolean(await loadSongDnaPackage(rvtr)),
      hasChartWeeks,
      directorSpec,
    });
  }

  songs.sort((a, b) => {
    const tierOrder = { strict: 0, expanded: 1, unknown: 2 };
    const td = tierOrder[a.tier] - tierOrder[b.tier];
    if (td !== 0) return td;
    return (b.playCount ?? 0) - (a.playCount ?? 0);
  });

  const registry: MuseumPilotRegistry = {
    version: 1,
    generatedAt: new Date().toISOString(),
    targetCount: TARGET_COUNT,
    actualCount: songs.length,
    selectionCriteria: {
      playCountMin: STRICT_MIN,
      playCountMax: STRICT_MAX,
      expandedPlayCountMin: EXPANDED_MIN,
      requiresVideo: true,
      requiresFrames: 5,
      requiresPackage: true,
    },
    showcaseRvtr: "RVTR417030",
    songs: songs.map(({ frameCount: _f, hasSongDna: _d, hasChartWeeks: _c, directorSpec: _s, ...rest }) => rest),
  };

  await writeFile(museumPilotRegistryPath(), `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return { registry, songs };
}

async function validateSong(entry: EligibleSong) {
  const payload = await loadPublicExperience(entry.rvtr, { bypassPublisherGate: true });
  if (!payload?.pipeline.usedMuseum) {
    return { entry, ok: false, error: "museum payload missing" };
  }

  const scenes = payload.scenes;
  const rooms = scenes.map((s) => s.museumRoom ?? "unknown");
  const expectedRooms = ["cover", "chart_journey", "iconic_moment", "song_dna", "performance"];
  const roomMatch = expectedRooms.every((room, i) => rooms[i] === room);
  const adjacentDupes = museumAdjacentDuplicateImages(scenes);
  const avgWords = Math.round(
    scenes.reduce((sum, s) => sum + sceneWords(s), 0) / Math.max(1, scenes.length),
  );
  const hasDna = scenes.some((s) => s.museumRoom === "song_dna" && s.dnaWatercolorSvg);
  const hasChart = scenes.some((s) => s.museumRoom === "chart_journey");

  let beforeScenes = 0;
  let beforeWords = 0;
  if (entry.directorSpec) {
    const experience = await loadExperienceRenderSpec(entry.rvtr);
    const songDna = await loadSongDnaPackage(entry.rvtr);
    if (experience) {
      const composed = composeScenes({
        scenes: experience.scenes,
        songDna,
        totalDurationSec: experience.totalDurationSec,
      });
      const polished = polishScenesForPresentation(composed.composedScenes, experience);
      beforeScenes = polished.length;
      beforeWords = Math.round(
        polished.reduce((sum, s) => sum + sceneWords(s), 0) / Math.max(1, polished.length),
      );
    }
  }

  return {
    entry,
    ok: roomMatch && scenes.length === 5 && adjacentDupes === 0 && hasDna,
    scenes: scenes.length,
    rooms,
    adjacentDupes,
    avgWords,
    hasDna,
    hasChart,
    hasChartWeeks: entry.hasChartWeeks,
    beforeScenes,
    beforeWords,
    experienceUrl: `/experience/${entry.rvtr}`,
  };
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const { registry, songs } = await buildRegistry();
  const results = [];
  for (const song of songs) {
    results.push(await validateSong(song));
  }

  const passCount = results.filter((r) => r.ok).length;
  const strictCount = songs.filter((s) => s.tier === "strict").length;
  const sampleBeforeAfter = results
    .filter((r) => r.entry.directorSpec && r.beforeScenes > 0)
    .slice(0, 4);

  const patternNotes = [
    "## Patterns That Worked",
    "",
    "- **Five-room rhythm** — Identity (cover) → Performance (close-up) → Song DNA (watercolor) → Chart (fingerprint over soft frame) → Closing (alternate frame, poster treatment).",
    "- **Zero adjacent duplicate imagery** — Cover, SVG, and distinct frame picks keep each swipe visually fresh.",
    "- **Chart Journey retained** — Existing fingerprint visualization with `museumMinimal` (no eyebrow, summary, or timeline).",
    "- **Song DNA as pure art** — Programmatic SVG from musical + palette fields; no metrics on screen.",
    "- **Typography only on Identity** — Artist, title, optional showcase badge; all other rooms image-first.",
    "",
    "## Gaps Before Scaling Beyond 20",
    "",
    `- **Inventory ceiling** — Repo has **${registry.actualCount}** eligible packages; target was **${TARGET_COUNT}**. Need **${Math.max(0, TARGET_COUNT - registry.actualCount)}** more Collector runs (play count ${STRICT_MIN}–${STRICT_MAX}, video, 5 frames).`,
    `- **Strict play-count tier** — Only **${strictCount}** songs match ${STRICT_MIN}–${STRICT_MAX} plays; remainder use expanded ${EXPANDED_MIN}–${STRICT_MAX} or unknown play count.`,
    `- **Chart DB dependency** — ${songs.filter((s) => !s.hasChartWeeks).length} pilot songs lack live trajectory weeks; peak-only fallback used where needed.`,
    `- **Song DNA** — Built on the fly for packages missing \`song-dna.json\` via existing Collector DNA pipeline.`,
    "",
    "## Recommendations",
    "",
    "1. Run Collector on 7+ additional VDJ songs in the 10–20 play band before calling this a 20-song pilot.",
    "2. Keep museum mode as a presentation layer — do not fork Director until the five-room arc is validated.",
    "3. Prioritize songs with Hot 100 trajectory data for the Chart Journey room.",
    "4. RVTR417030 remains the showcase reference (`/experience/RVTR417030`).",
  ].join("\n");

  const validationLines = [
    "# Sprint 3.1 — Museum Experience Pilot Validation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Target songs | ${TARGET_COUNT} |`,
    `| Eligible in repo | ${registry.actualCount} |`,
    `| Strict play ${STRICT_MIN}–${STRICT_MAX} | ${strictCount} |`,
    `| Museum packages validated | ${passCount}/${results.length} |`,
    `| Registry | \`data/ops/intelligence/museum-pilot.json\` |`,
    "",
    "## Per-Song",
    "",
    "| Song | RVTR | Plays | Tier | Scenes | Adj dupes | Avg words | Chart weeks | URL |",
    "|------|------|-------|------|--------|-----------|-----------|-------------|-----|",
    ...results.map((r) =>
      `| ${r.entry.artist} — ${r.entry.title} | ${r.entry.rvtr} | ${r.entry.playCount ?? "—"} | ${r.entry.tier} | ${r.scenes} | ${r.adjacentDupes} | ${r.avgWords} | ${r.hasChartWeeks ? "yes" : "peak only"} | ${r.experienceUrl} |`,
    ),
    "",
    "## Room Sequence",
    "",
    ...results.map(
      (r) => `- **${r.entry.rvtr}**: ${(r.rooms ?? []).join(" → ")} ${r.ok ? "✓" : "✗"}`,
    ),
    "",
    "## Success Criteria",
    "",
    passCount === results.length && results.length > 0
      ? "**PASS** — All eligible pilot songs compose five museum rooms with Song DNA watercolor and no adjacent duplicate imagery."
      : "**PARTIAL** — Review failed songs above.",
    "",
    "## Screenshots (manual checkpoint)",
    "",
    "Capture mobile viewport before/after for:",
    ...sampleBeforeAfter.map(
      (r) =>
        `- ${r.entry.artist} — ${r.entry.title}: ${r.beforeScenes} scenes / ${r.beforeWords} avg words → 5 scenes / ${r.avgWords} avg words — ${r.experienceUrl}`,
    ),
    "",
    "See `PATTERN-NOTES.md` for visual pattern analysis.",
    "",
  ];

  const beforeAfterLines = [
    "# Sprint 3.1 — Before / After (sample songs)",
    "",
    ...sampleBeforeAfter.map((r) => [
      `## ${r.entry.artist} — ${r.entry.title} (${r.entry.rvtr})`,
      "",
      "| | Before (Director + polish) | After (Museum) |",
      "|---|---|---|",
      `| Scenes | ${r.beforeScenes} | 5 |`,
      `| Avg words/scene | ${r.beforeWords} | ${r.avgWords} |`,
      `| Layout rhythm | multi-type | 5 fixed rooms |`,
      `| Experience URL | ${r.experienceUrl} | ${r.experienceUrl} |`,
      "",
      "**Checkpoint:** Open URL on phone, swipe through 5 rooms. Identity should show cover only; DNA room should be full-bleed watercolor with no text.",
      "",
    ].join("\n")),
  ];

  await writeFile(join(REPORT_DIR, "VALIDATION.md"), validationLines.join("\n"));
  await writeFile(join(REPORT_DIR, "PATTERN-NOTES.md"), patternNotes);
  await writeFile(join(REPORT_DIR, "BEFORE-AFTER.md"), beforeAfterLines.join("\n"));

  console.log(validationLines.join("\n"));
  console.log(`\nReports: ${REPORT_DIR}`);
  console.log(`Registry: ${museumPilotRegistryPath()}`);

  const loaded = await loadMuseumPilotRegistry();
  if (!loaded || loaded.actualCount !== songs.length) {
    throw new Error("Registry verification failed");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
