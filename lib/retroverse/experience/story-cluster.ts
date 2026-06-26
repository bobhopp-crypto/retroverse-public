import type { FactCategory, StoryCard } from "@/lib/ops/intelligence/song-package-types";
import type { TrackPageData } from "@/lib/track/load-track-page";

import type { StoryDisplayCard, StoryMediaItem } from "./story-cards";

export type StoryClusterKey =
  | "recording"
  | "video"
  | "performance"
  | "tv_film"
  | "cultural"
  | "legacy"
  | "chart"
  | "album"
  | "general";

export type StoryCluster = {
  key: StoryClusterKey;
  title: string;
  cards: StoryDisplayCard[];
  bestRank: number;
  categories: Set<FactCategory>;
};

const CLUSTER_TITLES: Record<StoryClusterKey, string> = {
  recording: "In the Studio",
  video: "The Video",
  performance: "Live on Stage",
  tv_film: "On Screen",
  cultural: "Cultural Impact",
  legacy: "Legacy",
  chart: "On the Charts",
  album: "From the Album",
  general: "The Story",
};

const WEAK_BODY_MAX = 220;
const MIN_STORY_BODY = 80;

const MERGEABLE_KEYS: StoryClusterKey[] = ["performance", "video", "tv_film", "recording", "album"];

const MERGED_TITLES: Partial<Record<string, string>> = {
  "performance+video": "On Screen & Stage",
  "recording+performance": "Making the Record",
  "recording+video": "Studio & Screen",
  "recording+album": "Making the Record",
  "album+performance": "From the Album",
  "tv_film+performance": "On Screen & Stage",
};

const CATEGORY_CLUSTER: Partial<Record<FactCategory, StoryClusterKey>> = {
  recording: "recording",
  video: "video",
  performance: "performance",
  tv_film: "tv_film",
  cultural_impact: "cultural",
  artist: "legacy",
  chart: "chart",
  album: "album",
  quote: "general",
  trivia: "general",
};

const TITLE_PATTERNS: Array<{ key: StoryClusterKey; patterns: RegExp[] }> = [
  {
    key: "recording",
    patterns: [
      /\brecord(ed|ing)\b/i,
      /\bstudio\b/i,
      /\bsession/i,
      /\bproduc(ed|er|tion)\b/i,
      /how (they|it) (recorded|made)/i,
      /name came from/i,
      /studio facts/i,
    ],
  },
  {
    key: "video",
    patterns: [/\bmusic video\b/i, /\bvideo clip\b/i, /\bmtv\b/i, /\bdirector\b/i, /\bfilmed\b/i],
  },
  {
    key: "performance",
    patterns: [/\blive\b/i, /\bconcert\b/i, /\btour\b/i, /\bstage\b/i],
  },
  {
    key: "tv_film",
    patterns: [/\btv\b/i, /\btelevision\b/i, /\bfilm\b/i, /\bsoundtrack\b/i, /\bappeared on\b/i],
  },
  {
    key: "cultural",
    patterns: [/\bcultural\b/i, /\blegacy\b/i, /\binfluence\b/i, /\bimpact\b/i, /\biconic\b/i],
  },
  {
    key: "legacy",
    patterns: [/\blegacy\b/i, /\bcareer\b/i, /\bartist\b/i],
  },
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(" ").filter((t) => t.length > 3));
  const tokensB = new Set(normalizeText(b).split(" ").filter((t) => t.length > 3));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared += 1;
  }
  return shared / Math.max(tokensA.size, tokensB.size);
}

function resolveClusterKey(card: StoryCard, displayTitle: string | null): StoryClusterKey {
  const headline = `${card.headline} ${displayTitle ?? ""}`;
  for (const rule of TITLE_PATTERNS) {
    if (rule.patterns.some((pattern) => pattern.test(headline))) return rule.key;
  }
  return CATEGORY_CLUSTER[card.category] ?? "general";
}

function pickClusterTitle(cards: StoryDisplayCard[], key: StoryClusterKey): string {
  if (key !== "general") return CLUSTER_TITLES[key];
  const titled = cards.find((card) => card.title?.trim());
  return titled?.title?.trim() ?? CLUSTER_TITLES.general;
}

function mergeBodies(cards: StoryDisplayCard[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const card of cards) {
    const body = card.body.trim();
    const key = normalizeText(body);
    if (!body || seen.has(key)) continue;
    seen.add(key);
    parts.push(body);
  }
  return parts.join("\n\n");
}

function mergeContexts(cards: StoryDisplayCard[]): string | null {
  const parts = cards
    .map((card) => card.context?.trim())
    .filter((value): value is string => Boolean(value));
  if (parts.length === 0) return null;
  const seen = new Set<string>();
  const unique = parts.filter((part) => {
    const key = normalizeText(part);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.join(" ");
}

function attachMedia(
  cards: StoryDisplayCard[],
  key: StoryClusterKey,
  track: TrackPageData,
  label: string | null,
): StoryMediaItem[] {
  const media: StoryMediaItem[] = [];
  const cover = track.coverUrl ?? track.albums[0]?.coverUrl ?? null;
  const albumCover = track.albums[0]?.coverUrl ?? cover;

  if (key === "album" && albumCover) {
    media.push({
      kind: "cover",
      url: albumCover,
      alt: track.albums[0]?.title ?? track.title,
      caption: track.albums[0]?.title ?? null,
    });
  } else if ((key === "recording" || key === "general") && cover) {
    media.push({ kind: "cover", url: cover, alt: track.title, caption: track.albums[0]?.title ?? null });
  } else if (key === "video" && cover) {
    media.push({ kind: "video_thumb", url: cover, alt: `${track.title} video`, caption: "Music video" });
  }

  if (label && (key === "recording" || key === "album")) {
    media.push({ kind: "label", url: null, alt: label, caption: label });
  }

  return media;
}

function cardsOverlap(a: StoryDisplayCard, b: StoryDisplayCard): boolean {
  if (tokenOverlap(a.body, b.body) >= 0.45) return true;
  if (a.title && b.title && tokenOverlap(a.title, b.title) >= 0.5) return true;
  return false;
}

/** Merge overlapping story cards into richer exhibit chapters. */
export function clusterStoryCards(
  cards: Array<{ card: StoryCard; display: StoryDisplayCard; rank: number }>,
  track: TrackPageData,
  label: string | null,
): StoryCluster[] {
  const buckets = new Map<StoryClusterKey, Array<{ card: StoryCard; display: StoryDisplayCard; rank: number }>>();

  for (const entry of cards) {
    const key = resolveClusterKey(entry.card, entry.display.title);
    const bucket = buckets.get(key) ?? [];
    bucket.push(entry);
    buckets.set(key, bucket);
  }

  const clusters: StoryCluster[] = [];

  for (const [key, entries] of buckets) {
    entries.sort((a, b) => a.rank - b.rank);
    const groups: Array<Array<(typeof entries)[number]>> = [];

    for (const entry of entries) {
      let placed = false;
      for (const group of groups) {
        if (group.some((member) => cardsOverlap(member.display, entry.display))) {
          group.push(entry);
          placed = true;
          break;
        }
      }
      if (!placed) groups.push([entry]);
    }

    for (const group of groups) {
      const displays = group.map((entry) => entry.display);
      const merged: StoryDisplayCard = {
        id: group.map((entry) => entry.display.id).join("+"),
        title: pickClusterTitle(displays, key),
        body: mergeBodies(displays),
        context: mergeContexts(displays),
        media: attachMedia(displays, key, track, label),
      };
      if (!merged.body.trim()) continue;

      clusters.push({
        key,
        title: merged.title ?? CLUSTER_TITLES[key],
        cards: [merged],
        bestRank: Math.min(...group.map((entry) => entry.rank)),
        categories: new Set(group.map((entry) => entry.card.category)),
      });
    }
  }

  return clusters.sort((a, b) => a.bestRank - b.bestRank);
}

function clusterBodyLength(cluster: StoryCluster): number {
  return cluster.cards[0]?.body.trim().length ?? 0;
}

function mergeClusterPair(a: StoryCluster, b: StoryCluster): StoryCluster {
  const displays = [...a.cards, ...b.cards];
  const mergeKey = [a.key, b.key].sort().join("+");
  const title = MERGED_TITLES[mergeKey] ?? pickClusterTitle(displays, a.key);
  return {
    key: a.key,
    title,
    bestRank: Math.min(a.bestRank, b.bestRank),
    categories: new Set([...a.categories, ...b.categories]),
    cards: [
      {
        id: displays.map((card) => card.id).join("+"),
        title,
        body: mergeBodies(displays),
        context: mergeContexts(displays),
        media: [...(a.cards[0]?.media ?? []), ...(b.cards[0]?.media ?? [])],
      },
    ],
  };
}

/** Merge thin story chapters into richer combined exhibits. */
export function consolidateWeakStoryClusters(clusters: StoryCluster[]): StoryCluster[] {
  let result = [...clusters];

  for (let pass = 0; pass < 4; pass += 1) {
    const weak = result
      .map((cluster, index) => ({ cluster, index }))
      .filter(
        ({ cluster }) =>
          MERGEABLE_KEYS.includes(cluster.key) && clusterBodyLength(cluster) < WEAK_BODY_MAX,
      );

    if (weak.length < 2) break;

    const first = weak[0]!;
    const second = weak.find((entry) => entry.index !== first.index) ?? weak[1]!;
    const merged = mergeClusterPair(result[first.index]!, result[second.index]!);
    const drop = new Set([first.index, second.index]);
    result = result.filter((_, index) => !drop.has(index));
    result.push(merged);
    result.sort((a, b) => a.bestRank - b.bestRank);
  }

  return result
    .filter((cluster) => {
      const length = clusterBodyLength(cluster);
      if (length >= MIN_STORY_BODY) return true;
      if (MERGEABLE_KEYS.includes(cluster.key) && length < MIN_STORY_BODY) return false;
      return length >= MIN_STORY_BODY;
    })
    .sort((a, b) => a.bestRank - b.bestRank);
}

export function intelCardsFromFacts(input: {
  recordingFacts: string[];
  videoFacts: string[];
  track: TrackPageData;
  label: string | null;
}): StoryCluster[] {
  const clusters: StoryCluster[] = [];
  const { recordingFacts, videoFacts, track, label } = input;

  if (recordingFacts.length > 0) {
    clusters.push({
      key: "recording",
      title: CLUSTER_TITLES.recording,
      bestRank: 50,
      categories: new Set(["recording"]),
      cards: [
        {
          id: "intel-recording",
          title: CLUSTER_TITLES.recording,
          body: recordingFacts.join(" "),
          context: null,
          media: attachMedia([], "recording", track, label),
        },
      ],
    });
  }

  if (videoFacts.length > 0) {
    clusters.push({
      key: "video",
      title: CLUSTER_TITLES.video,
      bestRank: 55,
      categories: new Set(["video", "performance"]),
      cards: [
        {
          id: "intel-video",
          title: CLUSTER_TITLES.video,
          body: videoFacts.join(" "),
          context: null,
          media: attachMedia([], "video", track, label),
        },
      ],
    });
  }

  return clusters;
}
