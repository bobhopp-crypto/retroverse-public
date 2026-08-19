import assert from "node:assert/strict";
import test from "node:test";

import type { PublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";
import type { TrackPageData } from "@/lib/track/load-track-page";

import {
  describePublicSongExperience,
  mergeExactVdjPresentation,
} from "./public-song-experience-resolution";

function fixture(overrides: Partial<PublicSongPayload> = {}): PublicSongPayload {
  return {
    rvtr: "VDJ:1111111111111111",
    alternateIdentities: [],
    title: "Fixture Song",
    artist: "Fixture Artist",
    album: null,
    year: null,
    yearSource: "unknown",
    coverUrl: null,
    heroUrl: null,
    heroSource: "none",
    track: null,
    localContent: null,
    trivia: [],
    timeline: [],
    storyCards: [],
    packageCards: null,
    universalPackage: null,
    vdjPackage: null,
    vdj: { title: "Fixture Song", artist: "Fixture Artist" },
    links: { songHref: "/song/vdj/1111111111111111", artistHref: null, albumHref: null, yearHref: null },
    externalDiscovery: { entityType: "song", title: "Fixture Song", artist: "Fixture Artist", album: null, year: null },
    resolution: "partial",
    resolutionTier: "vdj-only",
    warnings: [],
    resolverPath: ["vdj:runtime-hint"],
    ...overrides,
  };
}

const chartTrack = { trajectoryWeeks: [{ issueDate: "1981-01-01", rank: 40 }] } as TrackPageData;
const noChartTrack = { trajectoryWeeks: [] } as unknown as TrackPageData;

test("controlled 10-case matrix selects the shared renderer and exposes its decision", () => {
  const cases = [
    { label: "fully prepared song", payload: fixture({ resolution: "package", resolutionTier: "fallback", storyCards: [{ headline: "Prepared", body: "Story", sourceUrl: null }] }), editorial: false, renderer: "public-song-experience", story: "package", chart: false },
    { label: "prepared song with Chart Journey", payload: fixture({ rvtr: "RVTR100002", resolution: "graph", resolutionTier: "canonical", track: chartTrack }), editorial: true, renderer: "public-song-experience", story: "editorial", chart: true },
    { label: "canonical song without Chart Journey", payload: fixture({ rvtr: "RVTR100003", resolution: "graph", resolutionTier: "canonical", track: noChartTrack }), editorial: false, renderer: "public-song-experience", story: "none", chart: false },
    { label: "resolved song with partial data", payload: fixture(), editorial: false, renderer: "public-song-experience", story: "none", chart: false },
    { label: "VDJ-only song", payload: fixture({ resolution: "vdj", resolutionTier: "vdj-only" }), editorial: false, renderer: "public-song-experience", story: "none", chart: false },
    { label: "song with album data", payload: fixture({ album: "Fixture Album", links: { songHref: "/retroverse-2/song/RVTR100006", artistHref: "/artist/6", albumHref: "/album/RVAL100006", yearHref: "/rv/1981" } }), editorial: false, renderer: "public-song-experience", story: "none", chart: false, albumLink: true },
    { label: "song without album data", payload: fixture({ album: null }), editorial: false, renderer: "public-song-experience", story: "none", chart: false, albumLink: false },
    { label: "song with prepared video hero", payload: fixture({ heroUrl: "/api/experience/visual-asset?file=hero-video.jpg", heroSource: "approved-song-hero" }), editorial: false, renderer: "public-song-experience", story: "none", chart: false, hero: "approved-song-hero" },
    { label: "song requiring hero fallback", payload: fixture({ heroUrl: "/fallback.jpg", heroSource: "fallback" }), editorial: false, renderer: "public-song-experience", story: "none", chart: false, hero: "fallback" },
    { label: "unresolved unknown song", payload: fixture({ title: "", artist: "", resolution: "empty", resolutionTier: "unresolved" }), editorial: false, renderer: "live-song-fallback", story: "none", chart: false },
  ] as const;

  for (const entry of cases) {
    const trace = describePublicSongExperience(entry.payload, { hasEditorial: entry.editorial });
    assert.equal(trace.renderer, entry.renderer, entry.label);
    assert.equal(trace.storySource, entry.story, entry.label);
    assert.equal(trace.chartAvailable, entry.chart, entry.label);
    if ("albumLink" in entry) assert.equal(trace.links.album, entry.albumLink, entry.label);
    if ("hero" in entry) assert.equal(trace.heroSource, entry.hero, entry.label);
  }
});

test("exact VDJ presentation enriches canonical truth without replacing it", () => {
  const canonical = fixture({
    rvtr: "RVTR285085", title: "Canonical Title", artist: "Canonical Artist", year: 1981, yearSource: "canonical",
    resolution: "graph", resolutionTier: "canonical", track: chartTrack,
    links: { songHref: "/retroverse-2/song/RVTR285085", artistHref: "/artist/42", albumHref: "/album/RVAL285085", yearHref: "/rv/1981" },
    resolverPath: ["graph:loadTrackPage", "package:loadSongPackage"],
  });
  const exactVdj = fixture({ rvtr: "VDJ:ABCDEF0123456789", heroUrl: "/api/experience/visual-asset?rvtr=VDJ-ABCDEF0123456789&file=hero-video.jpg", heroSource: "approved-song-hero", resolution: "vdj", resolutionTier: "vdj-only" });
  const merged = mergeExactVdjPresentation(canonical, exactVdj);
  assert.ok(merged);
  assert.equal(merged.rvtr, "RVTR285085");
  assert.equal(merged.year, 1981);
  assert.equal(merged.links.albumHref, "/album/RVAL285085");
  assert.equal(merged.heroUrl, exactVdj.heroUrl);
  assert.deepEqual(merged.alternateIdentities, ["VDJ:ABCDEF0123456789"]);
});

test("an unknown runtime track remains renderable but does not advertise a dead song route", () => {
  const exactVdj = fixture({ rvtr: "VDJ:9999999999999999", title: "Unknown Track", artist: "Unknown Artist" });
  const merged = mergeExactVdjPresentation(null, exactVdj);
  assert.ok(merged);
  const trace = describePublicSongExperience(merged);
  assert.equal(trace.renderer, "public-song-experience");
  assert.equal(trace.links.song, false);
});
