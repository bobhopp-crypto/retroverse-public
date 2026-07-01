import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import {
  buildPackageViewModel,
  defaultRelationships,
  type FactGroupKey,
} from "@/lib/ops/intelligence/package-view-model";
import { loadSongPackage, normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";
import { isSongExperienceRenderable } from "@/lib/ops/intelligence/song-experience-renderability";
import type { SongPackage, StoryCard } from "@/lib/ops/intelligence/song-package-types";
import { resolveHeroFromSongPackage } from "@/lib/visual-profile/hero-resolver";

export type PackageBrowserCard = {
  id: string;
  label: string;
  title: string;
  body?: string;
  lines?: string[];
  heroUrl?: string | null;
};

export type PackageBrowserModel = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  cards: PackageBrowserCard[];
};

function storyCards(pkg: SongPackage): StoryCard[] {
  return pkg.storyCards
    .filter((card) => card.rank > 0 && !card.hidden)
    .sort((a, b) => a.rank - b.rank);
}

function pushStoryCards(cards: PackageBrowserCard[], pkg: SongPackage) {
  for (const card of storyCards(pkg)) {
    cards.push({
      id: `story-${card.id}`,
      label: card.headline,
      title: card.headline,
      body: card.fact,
      lines: card.supportingContext ? [card.supportingContext] : undefined,
    });
  }
}

function pushTimeline(cards: PackageBrowserCard[], pkg: SongPackage) {
  const events = pkg.intel.timelineEvents;
  if (events.length === 0) return;
  cards.push({
    id: "timeline",
    label: "Timeline",
    title: "Timeline",
    lines: events.map((event) =>
      event.year != null ? `${event.year} — ${event.title}: ${event.description}` : `${event.title}: ${event.description}`,
    ),
  });
}

function pushChartHistory(cards: PackageBrowserCard[], pkg: SongPackage) {
  const meta = pkg.metadata;
  const entries = pkg.intel.chartHistory.filter(
    (entry) => entry.peak != null || entry.weeks != null || entry.detail?.trim(),
  );
  if (meta.peakHot100 == null && meta.chartWeeks == null && entries.length === 0) return;

  const lines: string[] = [];
  if (meta.peakHot100 != null) {
    lines.push(
      `Billboard Hot 100 peak #${meta.peakHot100}${meta.chartWeeks ? ` · ${meta.chartWeeks} weeks` : ""}`,
    );
  }
  for (const entry of entries) {
    const parts = [entry.chart];
    if (entry.peak != null) parts.push(`#${entry.peak}`);
    if (entry.weeks != null) parts.push(`${entry.weeks} weeks`);
    if (entry.detail) parts.push(entry.detail);
    lines.push(parts.join(" · "));
  }

  cards.push({
    id: "chart-history",
    label: "Chart History",
    title: "Chart History",
    lines,
  });
}

function pushRecordLabel(cards: PackageBrowserCard[], pkg: SongPackage) {
  const label = pkg.intel.label;
  const catalog = pkg.intel.catalogNumber;
  if (!label && !catalog) return;

  const lines: string[] = [];
  if (label) lines.push(label);
  if (catalog) lines.push(`Catalog ${catalog}`);
  if (pkg.metadata.albumTitle) lines.push(pkg.metadata.albumTitle);

  cards.push({
    id: "record-label",
    label: "Record Label",
    title: label ?? "Record Label",
    lines,
  });
}

function pushRelatedSongs(cards: PackageBrowserCard[], pkg: SongPackage, related: Array<{ rvtr: string; title: string }>) {
  if (related.length === 0) return;
  cards.push({
    id: "related-songs",
    label: "Related Songs",
    title: "Related Songs",
    lines: related.map((song) => `${song.title} · ${song.rvtr}`),
  });
}

function pushRelatedArtists(cards: PackageBrowserCard[], pkg: SongPackage) {
  const artists = pkg.metadata.relatedArtists.filter(Boolean);
  if (artists.length === 0) return;
  cards.push({
    id: "related-artists",
    label: "Related Artists",
    title: "Related Artists",
    lines: artists,
  });
}

function pushMusicVideo(cards: PackageBrowserCard[], pkg: SongPackage) {
  const videoFacts = pkg.intel.videoFacts;
  const videoInfo = pkg.metadata.videoInfo?.trim();
  if (!videoInfo && videoFacts.length === 0) return;

  const lines = videoInfo ? [videoInfo, ...videoFacts] : [...videoFacts];
  cards.push({
    id: "music-video",
    label: "Music Video",
    title: "Music Video",
    lines,
  });
}

const RVTR_RE = /^RVTR\d{6}$/;

function relatedSongsFromPackage(pkg: SongPackage): Array<{ rvtr: string; title: string }> {
  const raw = pkg as SongPackage & {
    relatedSongs?: unknown;
    metadata: SongPackage["metadata"] & { relatedSongs?: unknown };
  };
  const source = Array.isArray(raw.metadata.relatedSongs)
    ? raw.metadata.relatedSongs
    : Array.isArray(raw.relatedSongs)
      ? raw.relatedSongs
      : [];

  return source
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as { rvtr?: unknown; title?: unknown };
      const rvtr = typeof obj.rvtr === "string" ? obj.rvtr.trim().toUpperCase() : "";
      const title = typeof obj.title === "string" ? obj.title.trim() : "";
      if (!RVTR_RE.test(rvtr) || !title) return null;
      return { rvtr, title };
    })
    .filter((entry): entry is { rvtr: string; title: string } => Boolean(entry));
}

function pushFactGroups(
  cards: PackageBrowserCard[],
  factGroups: Record<FactGroupKey, Array<{ factText: string }>>,
) {
  for (const [group, facts] of Object.entries(factGroups) as Array<
    [FactGroupKey, Array<{ factText: string }>]
  >) {
    if (facts.length === 0) continue;
    cards.push({
      id: `facts-${group.toLowerCase()}`,
      label: group,
      title: group,
      lines: facts.map((fact) => fact.factText),
    });
  }
}

function pushArtifacts(cards: PackageBrowserCard[], pkg: SongPackage, view: ReturnType<typeof buildPackageViewModel>) {
  for (const artifact of view.artifacts) {
    if (!artifact.ready) continue;
    cards.push({
      id: `artifact-${artifact.id}`,
      label: artifact.label,
      title: artifact.label,
      body: artifact.note,
    });
  }
}

export function buildPackageBrowserFromPackage(pkg: SongPackage): PackageBrowserModel {
  const relatedSongs = relatedSongsFromPackage(pkg);
  const meta = pkg.metadata;
  const hero = resolveHeroFromSongPackage(pkg);
  const view = buildPackageViewModel(pkg, {
    ...defaultRelationships(pkg),
    relatedSongs,
    relatedArtists: meta.relatedArtists.map((name) => ({ name })),
  });

  const cards: PackageBrowserCard[] = [
    {
      id: "hero",
      label: "Hero",
      title: meta.title,
      body: meta.artist,
      heroUrl: hero.url,
      lines: [
        meta.year != null ? String(meta.year) : "",
        meta.albumTitle ?? "",
        meta.rvtr,
      ].filter(Boolean),
    },
  ];

  pushStoryCards(cards, pkg);
  pushTimeline(cards, pkg);
  pushChartHistory(cards, pkg);
  pushRecordLabel(cards, pkg);
  pushRelatedSongs(cards, pkg, relatedSongs);
  pushRelatedArtists(cards, pkg);
  pushMusicVideo(cards, pkg);
  pushFactGroups(cards, view.factGroups);
  pushArtifacts(cards, pkg, view);

  return {
    rvtr: pkg.rvtr,
    title: meta.title,
    artist: meta.artist,
    year: meta.year,
    cards,
  };
}

export async function loadPackageBrowser(rvtrParam: string): Promise<PackageBrowserModel | null> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return null;

  const raw = await loadSongPackage(rvtr);
  if (!raw || !isSongExperienceRenderable(raw.status)) return null;

  const pkg = hydratePackageIntel(raw);
  return buildPackageBrowserFromPackage(pkg);
}

export { relatedSongsFromPackage };
