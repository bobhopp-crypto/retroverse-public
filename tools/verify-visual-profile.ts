/**
 * Visual Profile verification — run with: npx tsx tools/verify-visual-profile.ts
 */
import assert from "node:assert/strict";

import { buildVisualProfileFromPackage } from "../lib/visual-profile/build-visual-profile";
import { resolveBestHero, resolveHeroFromSongPackage } from "../lib/visual-profile/hero-resolver";
import type { SongPackage } from "../lib/ops/intelligence/song-package-types";
import { emptyPackageIntel } from "../lib/ops/intelligence/package-intel";

function stubPackage(coverUrl: string | null): SongPackage {
  return {
    version: 2,
    rvtr: "RVTR000001",
    status: "published",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    processedAt: null,
    approvedAt: null,
    publishedAt: null,
    processLog: [],
    metadata: {
      rvtr: "RVTR000001",
      artist: "Artist",
      title: "Title",
      year: 1984,
      albumTitle: "Album",
      coverUrl,
      peakHot100: 1,
      chartWeeks: 10,
      playCount: 5,
      tags: [],
      hasVdjMedia: false,
      videoInfo: null,
      relatedArtists: [],
    },
    researchVault: [],
    candidateFacts: [],
    candidateStories: [],
    storyCards: [],
    intel: emptyPackageIntel(),
  };
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`fail ${name}`);
    throw error;
  }
}

test("secondary hero populated from album cover", () => {
  const profile = buildVisualProfileFromPackage(stubPackage("https://example.com/cover.jpg"));
  assert.equal(profile.primaryHero.url, null);
  assert.equal(profile.secondaryHero.url, "https://example.com/cover.jpg");
  assert.equal(profile.status, "legacy");
});

test("resolveBestHero prefers primary over secondary", () => {
  const profile = buildVisualProfileFromPackage(stubPackage("https://example.com/cover.jpg"));
  profile.primaryHero.url = "https://example.com/hero.jpg";
  profile.status = "complete";

  const hero = resolveBestHero(profile);
  assert.equal(hero.url, "https://example.com/hero.jpg");
  assert.equal(hero.tier, "primary");
});

test("resolveBestHero falls back to retroverse cover", () => {
  const profile = buildVisualProfileFromPackage(stubPackage(null));
  const hero = resolveBestHero(profile, "https://example.com/fallback.jpg");
  assert.equal(hero.url, "https://example.com/fallback.jpg");
  assert.equal(hero.tier, "fallback");
});

test("resolveHeroFromSongPackage uses secondary when primary empty", () => {
  const pkg = stubPackage("https://example.com/cover.jpg");
  const hero = resolveHeroFromSongPackage(pkg);
  assert.equal(hero.url, "https://example.com/cover.jpg");
  assert.equal(hero.tier, "secondary");
});

test("stored primary hero persists through buildVisualProfileFromPackage", () => {
  const pkg = stubPackage("https://example.com/cover.jpg");
  pkg.storedVisualProfile = { primaryHeroUrl: "https://example.com/hero.jpg" };
  const profile = buildVisualProfileFromPackage(pkg);
  assert.equal(profile.primaryHero.url, "https://example.com/hero.jpg");
  assert.equal(profile.status, "complete");
});

console.log("\nAll visual-profile checks passed.");
