/**
 * Hero prompt verification — run with: npx tsx tools/verify-hero-prompt.ts
 */
import assert from "node:assert/strict";

import { buildHeroPrompt, buildHeroPromptFromPackage } from "../lib/bobos/hero/prompt-builder";
import { emptyPackageIntel } from "../lib/ops/intelligence/package-intel";
import type { SongPackage } from "../lib/ops/intelligence/song-package-types";

function stubPackage(): SongPackage {
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
      artist: "Fleetwood Mac",
      title: "Dreams",
      year: 1977,
      albumTitle: "Rumours",
      coverUrl: "https://example.com/cover.jpg",
      peakHot100: 1,
      chartWeeks: 19,
      playCount: 12,
      tags: ["soft rock"],
      hasVdjMedia: false,
      videoInfo: null,
      relatedArtists: [],
      vdjSnapshot: { genre: "Rock", artist: "Fleetwood Mac", title: "Dreams" } as SongPackage["metadata"]["vdjSnapshot"],
    },
    researchVault: [],
    candidateFacts: [],
    candidateStories: [],
    storyCards: [
      {
        id: "s1",
        storyId: "st1",
        rank: 1,
        headline: "Studio Tension",
        fact: "Recorded during emotional turmoil in Los Angeles.",
        sourceLabel: "Retroverse",
        sourceUrl: null,
        sourceExcerpt: "",
        confidence: 0.9,
        category: "recording",
      },
    ],
    intel: emptyPackageIntel(),
  };
}

const prompt = buildHeroPromptFromPackage(stubPackage());
assert.match(prompt, /Dreams/i);
assert.match(prompt, /Fleetwood Mac/i);
assert.match(prompt, /9:16/i);
assert.match(prompt, /Do NOT include: text/i);
assert.match(prompt, /Avoid celebrity likeness/i);

const custom = buildHeroPrompt({
  title: "Test",
  artist: "Artist",
  year: 1984,
  albumTitle: null,
  genre: "Pop",
  mood: ["neon"],
  stories: [],
  objects: ["highway"],
  locations: ["Los Angeles"],
  historicalContext: ["MTV era"],
});

assert.match(custom, /Los Angeles/);

console.log("ok hero prompt builder");
console.log("\nAll hero prompt checks passed.");
