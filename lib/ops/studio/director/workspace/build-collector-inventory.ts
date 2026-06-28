import type { CollectorPackage } from "@/lib/ops/studio/collector/types";

import type { InventoryItem } from "./types";

function sourceHas(collector: CollectorPackage, pattern: RegExp): boolean {
  return (collector.sourceLog ?? []).some(
    (s) => pattern.test(s.source ?? "") || pattern.test(s.id ?? "") || pattern.test(s.url ?? ""),
  );
}

function factCount(collector: CollectorPackage, category?: string): number {
  const facts = collector.candidateFacts ?? [];
  if (!category) return facts.length;
  return facts.filter((f) => f.category.toLowerCase().includes(category)).length;
}

export function buildCollectorInventory(collector: CollectorPackage | null): InventoryItem[] {
  if (!collector) {
    return [
      { id: "collector", label: "Collector package", available: false, detail: "Not gathered yet" },
    ];
  }

  const frameCount = collector.visualAssets?.extraction?.extractedCount ?? 0;
  const perfCount = collector.performances?.length ?? collector.videoPerformance?.items?.length ?? 0;
  const hasCharts = collector.charts?.peakHot100 != null || Boolean(collector.charts?.summary?.trim());
  const hasLyrics = collector.lyrics?.available === true;

  return [
    {
      id: "charts",
      label: "Charts",
      available: hasCharts,
      detail: hasCharts
        ? collector.charts.peakHot100 != null
          ? `Hot 100 peak #${collector.charts.peakHot100}`
          : collector.charts.summary || "Chart summary captured"
        : "Missing",
    },
    {
      id: "albums",
      label: "Albums",
      available: Boolean(collector.identity?.albumTitle ?? collector.charts?.albumTitle),
      detail: collector.identity?.albumTitle ?? collector.charts?.albumTitle ?? "Missing",
    },
    {
      id: "artwork",
      label: "Artwork",
      available: Boolean(collector.visualAssets?.coverUrl) || frameCount > 0,
      detail: collector.visualAssets?.coverUrl
        ? "Cover resolved"
        : frameCount > 0
          ? `${frameCount} frames extracted`
          : "Missing",
    },
    {
      id: "artists",
      label: "Artists",
      available: Boolean(collector.artist),
      detail: collector.artist || "Missing",
    },
    {
      id: "credits",
      label: "Credits",
      available: (collector.recording?.notes?.length ?? 0) > 0,
      detail: `${collector.recording?.notes?.length ?? 0} recording notes`,
    },
    {
      id: "genres",
      label: "Genres",
      available: (collector.virtualDj?.tags?.length ?? 0) > 0,
      detail: collector.virtualDj?.tags?.length
        ? collector.virtualDj.tags.slice(0, 4).join(", ")
        : "Missing",
    },
    {
      id: "release_data",
      label: "Release data",
      available: collector.identity?.year != null || Boolean(collector.recording?.summary),
      detail: collector.identity?.year
        ? `Released ${collector.identity.year}`
        : collector.recording?.summary || "Missing",
    },
    {
      id: "musicbrainz",
      label: "MusicBrainz",
      available: sourceHas(collector, /musicbrainz/i),
      detail: sourceHas(collector, /musicbrainz/i) ? "Source logged" : "Missing",
    },
    {
      id: "discogs",
      label: "Discogs",
      available: sourceHas(collector, /discogs/i),
      detail: sourceHas(collector, /discogs/i) ? "Source logged" : "Missing",
    },
    {
      id: "wikipedia",
      label: "Wikipedia",
      available: sourceHas(collector, /wikipedia|wiki/i),
      detail: sourceHas(collector, /wikipedia|wiki/i) ? "Source logged" : "Missing",
    },
    {
      id: "videos",
      label: "Videos",
      available: (collector.videoPerformance?.items?.length ?? 0) > 0,
      detail: `${collector.videoPerformance?.items?.length ?? 0} media items`,
    },
    {
      id: "tv_appearances",
      label: "TV appearances",
      available: factCount(collector, "tv") > 0 || factCount(collector, "film") > 0,
      detail: `${factCount(collector, "tv") + factCount(collector, "film")} facts`,
    },
    {
      id: "live_performances",
      label: "Live performances",
      available: perfCount > 0,
      detail: perfCount > 0 ? `${perfCount} performance(s)` : "Missing",
    },
    {
      id: "vdj_metadata",
      label: "VirtualDJ metadata",
      available: Boolean(collector.virtualDj?.primaryPath),
      detail: collector.virtualDj?.primaryPath ? "Library path linked" : "Missing",
    },
    {
      id: "spotify_features",
      label: "Spotify features",
      available: sourceHas(collector, /spotify/i),
      detail: sourceHas(collector, /spotify/i) ? "Reference found" : "Missing",
    },
    {
      id: "lyrics",
      label: "Lyrics (reference only)",
      available: hasLyrics,
      detail: hasLyrics ? "Lyrics artifact available" : "Missing",
    },
    {
      id: "related_songs",
      label: "Related songs",
      available: (collector.relationships?.relatedArtists?.length ?? 0) > 0,
      detail: `${collector.relationships?.relatedArtists?.length ?? 0} related artist links`,
    },
    {
      id: "historical_events",
      label: "Historical events",
      available: (collector.timelines?.song?.length ?? 0) + (collector.timelines?.recording?.length ?? 0) > 0,
      detail: `${(collector.timelines?.song?.length ?? 0) + (collector.timelines?.recording?.length ?? 0)} timeline events`,
    },
    {
      id: "images",
      label: "Images",
      available: frameCount > 0 || (collector.visualAssets?.inventory?.length ?? 0) > 0,
      detail: `${frameCount} extracted · ${collector.visualAssets?.inventory?.length ?? 0} inventory`,
    },
    {
      id: "external_links",
      label: "External links",
      available: (collector.sourceLog?.length ?? 0) > 0,
      detail: `${collector.sourceLog?.length ?? 0} sources logged`,
    },
    {
      id: "candidate_facts",
      label: "Candidate facts",
      available: (collector.candidateFacts?.length ?? 0) > 0,
      detail: `${collector.candidateFacts?.length ?? 0} facts gathered`,
    },
    {
      id: "cultural_context",
      label: "Cultural context",
      available: (collector.culturalContext?.notes?.length ?? 0) > 0,
      detail: `${collector.culturalContext?.notes?.length ?? 0} notes`,
    },
  ];
}
