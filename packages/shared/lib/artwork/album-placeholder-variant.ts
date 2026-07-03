/**
 * Deterministic album placeholder variety — archival plate, not generic gray fallback.
 * Seeds from RVAL + artist + era; future RV45 label plates can extend `labelFamily`.
 */

export type AlbumPlaceholderContext = {
  rval?: string | null;
  artist: string;
  album?: string | null;
  releaseYear?: number | null;
  /** Optional chart peak for era weighting. */
  b200Peak?: number | null;
};

export type AlbumPlaceholderVariant = {
  era: string;
  initials: string;
  huePrimary: number;
  hueSecondary: number;
  isMonoEra: boolean;
  isCompilation: boolean;
  labelFamily: "retroverse" | "comp" | "rv45_hook";
};

function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seedFromContext(ctx: AlbumPlaceholderContext): number {
  const key = [
    ctx.rval ?? "",
    ctx.artist,
    ctx.album ?? "",
    ctx.releaseYear ?? "",
    ctx.b200Peak ?? "",
  ].join("|");
  return fnv1a(key.toLowerCase());
}

function decadeBand(year: number | null | undefined): string {
  if (year == null || year < 1950) return "pre-50";
  if (year < 1960) return "50s";
  if (year < 1970) return "60s";
  if (year < 1980) return "70s";
  if (year < 1990) return "80s";
  if (year < 2000) return "90s";
  if (year < 2010) return "00s";
  return "10s+";
}

function artistInitials(artist: string): string {
  const parts = artist
    .replace(/^the\s+/i, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (parts.length === 0) return "RV";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function isCompilationTitle(album: string | null | undefined, artist: string): boolean {
  const a = `${album ?? ""} ${artist}`.toLowerCase();
  return (
    /\b(greatest hits|best of|wow hits|now that's|various artists|compilation|anthology)\b/.test(
      a,
    ) || artist.toLowerCase().includes("various")
  );
}

const DECADE_HUE_ANCHORS: Record<string, number> = {
  "pre-50": 28,
  "50s": 35,
  "60s": 12,
  "70s": 168,
  "80s": 195,
  "90s": 210,
  "00s": 25,
  "10s+": 8,
};

export function computeAlbumPlaceholderVariant(
  ctx: AlbumPlaceholderContext,
): AlbumPlaceholderVariant {
  const seed = seedFromContext(ctx);
  const era = decadeBand(ctx.releaseYear);
  const anchor = DECADE_HUE_ANCHORS[era] ?? 168;
  const compilation = isCompilationTitle(ctx.album, ctx.artist);
  const mono = era === "50s" || era === "60s" || era === "pre-50";

  const huePrimary = (anchor + (seed % 28) - 14 + 360) % 360;
  const hueSecondary = (huePrimary + 24 + (seed % 18)) % 360;

  return {
    era,
    initials: artistInitials(ctx.artist),
    huePrimary,
    hueSecondary,
    isMonoEra: mono,
    isCompilation: compilation,
    labelFamily: compilation ? "comp" : "retroverse",
  };
}

/** Inline styles for fallback plate (works in server + client components). */
export function albumPlaceholderStyle(
  ctx: AlbumPlaceholderContext,
): Record<string, string | number> {
  const v = computeAlbumPlaceholderVariant(ctx);
  const sat = v.isMonoEra ? "12%" : v.isCompilation ? "38%" : "42%";
  const light = v.isMonoEra ? "28%" : "32%";
  const light2 = v.isMonoEra ? "38%" : "40%";
  return {
    ["--ph-h1" as string]: v.huePrimary,
    ["--ph-h2" as string]: v.hueSecondary,
    ["--ph-sat" as string]: sat,
    ["--ph-l1" as string]: light,
    ["--ph-l2" as string]: light2,
    background: `linear-gradient(145deg, hsl(${v.huePrimary}, ${sat}, ${light}), hsl(${v.hueSecondary}, ${sat}, ${light2}))`,
    boxShadow: `inset 0 0 0 1px hsl(${v.hueSecondary}, 30%, 55% / 0.22)`,
  };
}
