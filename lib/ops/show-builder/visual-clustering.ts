import type { VdjPoolSong } from "./types";

export type VisualClusterPaletteEntry = {
  id: string;
  color: string;
  glyph: string;
};

export type SongClusterHint = {
  clusterId: string;
  color: string;
  glyph: string;
  label: string;
};

export type VisualClusterResult = {
  clusters: Array<{ id: string; color: string; glyph: string; label: string; count: number }>;
  bySongKey: Map<string, SongClusterHint>;
};

/** Stable scan palette — suggestions only, never persisted. */
export const CLUSTER_PALETTE: VisualClusterPaletteEntry[] = [
  { id: "green", color: "#3ddc84", glyph: "🟩" },
  { id: "blue", color: "#5eb8ff", glyph: "🟦" },
  { id: "yellow", color: "#ffd54a", glyph: "🟨" },
  { id: "purple", color: "#b48cff", glyph: "🟪" },
  { id: "orange", color: "#ff9f43", glyph: "🟧" },
  { id: "pink", color: "#ff7eb9", glyph: "🩷" },
  { id: "teal", color: "#2eb8b8", glyph: "🩵" },
  { id: "red", color: "#ff6b6b", glyph: "🟥" },
];

type StyleProfile = {
  id: string;
  label: string;
  keywords: string[];
  artists: string[];
  years?: number[];
};

const STYLE_PROFILES: StyleProfile[] = [
  {
    id: "psychedelic",
    label: "Psychedelic",
    keywords: [
      "white rabbit",
      "light my fire",
      "purple haze",
      "sunshine",
      "trippy",
      "acid",
      "san francisco",
      "dream",
      "magic",
      "strange",
    ],
    artists: [
      "jefferson airplane",
      "doors",
      "grateful dead",
      "jimi hendrix",
      "cream",
      "13th floor",
      "strawberry alarm",
      "country joe",
    ],
    years: [1967],
  },
  {
    id: "sunshine_pop",
    label: "Feel-Good Pop",
    keywords: [
      "happy",
      "windy",
      "daydream",
      "believe",
      "together",
      "sunshine",
      "love",
      "smile",
      "wonderful",
      "groove",
    ],
    artists: [
      "association",
      "monkees",
      "mamas",
      "papas",
      "herman's hermits",
      "hollies",
      "carpenters",
      "abba",
      "bee gees",
    ],
    years: [1967, 1978],
  },
  {
    id: "soul_rnb",
    label: "Soul & R&B",
    keywords: ["soul", "respect", "groove", "funk", "shake", "chain", "fire", "feeling"],
    artists: [
      "aretha",
      "otis",
      "sam and dave",
      "sam & dave",
      "temptations",
      "four tops",
      "marvin",
      "stevie",
      "supremes",
      "jackson 5",
      "earth wind",
      "chaka",
      "whitney",
      "prince",
    ],
    years: [1967, 1978, 1992],
  },
  {
    id: "british_invasion",
    label: "British Rock",
    keywords: ["revolution", "yesterday", "help", "satisfaction"],
    artists: [
      "beatles",
      "rolling stones",
      "kinks",
      "who",
      "yardbirds",
      "animals",
      "hollies",
      "dave clark",
      "10cc",
      "queen",
      "police",
      "u2",
      "rem",
    ],
    years: [1967, 1978, 1992],
  },
  {
    id: "folk_acoustic",
    label: "Folk & Story Songs",
    keywords: ["blowin", "wind", "times", "story", "home", "country", "cowboy", "friend"],
    artists: [
      "dylan",
      "simon",
      "garfunkel",
      "peter paul",
      "willie nelson",
      "neil diamond",
      "john denver",
      "andrew gold",
    ],
    years: [1967, 1978, 1992],
  },
  {
    id: "rock_anthem",
    label: "Rock Anthems",
    keywords: [
      "fire",
      "wild",
      "born",
      "highway",
      "rock",
      "power",
      "now",
      "away",
      "surrender",
      "moonlight",
    ],
    artists: [
      "steppenwolf",
      "hendrix",
      "van halen",
      "cheap trick",
      "journey",
      "foreigner",
      "guns",
      "chili peppers",
      "warrant",
      "def leppard",
    ],
    years: [1967, 1978, 1992],
  },
  {
    id: "disco_dance",
    label: "Disco & Dance",
    keywords: ["dance", "night", "fever", "groove", "boogie", "shake", "party", "funk"],
    artists: ["chic", "sister sledge", "village people", "kool", "snap", "ce ce"],
    years: [1978, 1992],
  },
  {
    id: "soft_ballad",
    label: "Ballads & Soft Rock",
    keywords: ["love", "eyes", "forever", "always", "tender", "baby", "heart", "magnet"],
    artists: [
      "frankie valli",
      "barry manilow",
      "air supply",
      "bread",
      "carpenters",
      "walter egan",
      "lulu",
    ],
    years: [1967, 1978, 1992],
  },
  {
    id: "hip_hop",
    label: "Hip-Hop & Street",
    keywords: ["back", "rap", "beat", "street", "yo", "mix", "effect", "cantaloop"],
    artists: ["sir mix", "wreckx", "us3", "public enemy", "dre", "snoop", "hammer"],
    years: [1992],
  },
  {
    id: "alt_grunge",
    label: "Alt & Grunge",
    keywords: ["moon", "black", "teen", "spirit", "alive", "everything", "man"],
    artists: ["nirvana", "pearl jam", "soundgarden", "alice in chains", "ugly kid", "rem"],
    years: [1992],
  },
];

const LABEL_BY_STYLE: Record<string, string> = Object.fromEntries(
  STYLE_PROFILES.map((p) => [p.id, p.label]),
);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function haystack(song: VdjPoolSong): string {
  return normalizeText(`${song.artist} ${song.title} ${song.remix ?? ""}`);
}

function scoreProfile(song: VdjPoolSong, profile: StyleProfile): number {
  const text = haystack(song);
  let score = 0;
  for (const kw of profile.keywords) {
    if (text.includes(normalizeText(kw))) score += 1.2;
  }
  for (const artist of profile.artists) {
    if (text.includes(normalizeText(artist))) score += 2.5;
  }
  if (profile.years?.includes(song.year)) score += 0.35;
  return score;
}

function songFeatureVector(song: VdjPoolSong): number[] {
  const scores = STYLE_PROFILES.map((p) => scoreProfile(song, p));
  const artistBucket =
    normalizeText(song.artist)
      .split(" ")
      .slice(0, 2)
      .join(" ")
      .charCodeAt(0) % 7;
  scores.push(artistBucket * 0.15);
  const sum = scores.reduce((a, b) => a + b, 0) || 1;
  return scores.map((v) => v / sum);
}

function vectorDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function averageVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i += 1) out[i] += v[i];
  }
  return out.map((v) => v / vectors.length);
}

function pickClusterCount(songCount: number): number {
  if (songCount <= 6) return Math.max(2, Math.min(5, songCount));
  if (songCount <= 20) return 5;
  if (songCount <= 35) return 6;
  if (songCount <= 50) return 7;
  return 8;
}

function dominantStyleLabel(vectors: number[][], memberIdx: number[]): string {
  const avg = averageVector(memberIdx.map((i) => vectors[i]));
  let bestIdx = 0;
  let best = -1;
  for (let i = 0; i < STYLE_PROFILES.length; i += 1) {
    if (avg[i] > best) {
      best = avg[i];
      bestIdx = i;
    }
  }
  return LABEL_BY_STYLE[STYLE_PROFILES[bestIdx].id] ?? "Pop Crossover";
}

function kMeansAssign(vectors: number[][], k: number): number[] {
  if (vectors.length === 0) return [];
  const kClamped = Math.min(k, vectors.length);
  const centroids: number[][] = [];
  const used = new Set<number>();
  centroids.push([...vectors[0]]);
  used.add(0);
  while (centroids.length < kClamped) {
    let bestIdx = -1;
    let bestDist = -1;
    for (let i = 0; i < vectors.length; i += 1) {
      if (used.has(i)) continue;
      const nearest = Math.min(...centroids.map((c) => vectorDistance(c, vectors[i])));
      if (nearest > bestDist) {
        bestDist = nearest;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    centroids.push([...vectors[bestIdx]]);
    used.add(bestIdx);
  }

  const assignments = new Array(vectors.length).fill(0);
  for (let iter = 0; iter < 12; iter += 1) {
    for (let i = 0; i < vectors.length; i += 1) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c += 1) {
        const d = vectorDistance(centroids[c], vectors[i]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      assignments[i] = best;
    }
    for (let c = 0; c < centroids.length; c += 1) {
      const members = vectors.filter((_, i) => assignments[i] === c);
      if (members.length > 0) centroids[c] = averageVector(members);
    }
  }
  return assignments;
}

/** Visual-only cluster hints for a loaded pool. Does not mutate songs or sets. */
export function clusterPoolSongs(songs: VdjPoolSong[]): VisualClusterResult {
  const bySongKey = new Map<string, SongClusterHint>();
  if (songs.length === 0) {
    return { clusters: [], bySongKey };
  }

  const vectors = songs.map(songFeatureVector);
  const k = pickClusterCount(songs.length);
  const assignments = kMeansAssign(vectors, k);

  const groups = new Map<number, number[]>();
  for (let i = 0; i < assignments.length; i += 1) {
    const g = assignments[i];
    const list = groups.get(g) ?? [];
    list.push(i);
    groups.set(g, list);
  }

  const sortedGroups = [...groups.entries()].sort((a, b) => a[0] - b[0]);
  const clusters: VisualClusterResult["clusters"] = [];
  const usedLabels = new Set<string>();

  sortedGroups.forEach(([groupIdx, memberIdx], paletteIdx) => {
    const palette = CLUSTER_PALETTE[paletteIdx % CLUSTER_PALETTE.length];
    let label = dominantStyleLabel(vectors, memberIdx);
    if (usedLabels.has(label)) {
      const avg = averageVector(memberIdx.map((i) => vectors[i]));
      const ranked = STYLE_PROFILES.map((p, i) => ({ label: p.label, score: avg[i] }))
        .sort((a, b) => b.score - a.score)
        .map((r) => r.label);
      label = ranked.find((l) => !usedLabels.has(l)) ?? `${label} ${paletteIdx + 1}`;
    }
    usedLabels.add(label);
    const clusterId = `${palette.id}-${groupIdx}`;
    clusters.push({
      id: clusterId,
      color: palette.color,
      glyph: palette.glyph,
      label,
      count: memberIdx.length,
    });
    for (const i of memberIdx) {
      bySongKey.set(songs[i].key, {
        clusterId,
        color: palette.color,
        glyph: palette.glyph,
        label,
      });
    }
  });

  return { clusters, bySongKey };
}
