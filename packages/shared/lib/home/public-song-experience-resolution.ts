import type { PublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";

export type PublicSongRenderer = "public-song-experience" | "live-song-fallback";

export type PublicSongExperienceTrace = {
  identity: string;
  dataSources: string[];
  heroSource: PublicSongPayload["heroSource"];
  storySource: "editorial" | "package" | "local" | "chart" | "none";
  chartAvailable: boolean;
  renderer: PublicSongRenderer;
  links: {
    song: boolean;
    artist: boolean;
    album: boolean;
    year: boolean;
  };
};

function payloadQuality(payload: PublicSongPayload | null): number {
  if (!payload) return 0;
  switch (payload.resolution) {
    case "graph":
      return 4;
    case "package":
      return 3;
    case "vdj":
      return 2;
    case "partial":
      return 1;
    default:
      return 0;
  }
}

export function canRenderPublicSongExperience(
  payload: PublicSongPayload | null,
): payload is PublicSongPayload {
  if (!payload || payload.resolutionTier === "unresolved") return false;
  return Boolean(payload.title.trim() || payload.artist.trim());
}

export function hasStablePublicSongRoute(payload: PublicSongPayload): boolean {
  if (!canRenderPublicSongExperience(payload)) return false;
  if (/^RVTR\d{6}$/i.test(payload.rvtr)) return true;
  if (!/^VDJ:[0-9A-F]{16}$/i.test(payload.rvtr)) return false;
  return payload.resolution !== "partial" || payload.resolverPath.some((step) =>
    step.startsWith("package:") ||
    step.startsWith("editorial:") ||
    step.startsWith("vdj:load"),
  );
}

/**
 * Preserve the strongest resolved identity while attaching presentation assets
 * tied to the exact VirtualDJ filepath. This keeps canonical navigation and
 * chart truth without losing a prepared video hero or VDJ package.
 */
export function mergeExactVdjPresentation(
  resolvedPayload: PublicSongPayload | null,
  exactVdjPayload: PublicSongPayload | null,
): PublicSongPayload | null {
  if (!resolvedPayload) return exactVdjPayload;
  if (!exactVdjPayload) return resolvedPayload;

  const primary = payloadQuality(resolvedPayload) >= payloadQuality(exactVdjPayload)
    ? resolvedPayload
    : exactVdjPayload;
  const secondary = primary === resolvedPayload ? exactVdjPayload : resolvedPayload;
  const exactVideoHero = exactVdjPayload.heroUrl && exactVdjPayload.heroSource === "approved-song-hero"
    ? exactVdjPayload.heroUrl
    : null;

  return {
    ...primary,
    alternateIdentities: Array.from(new Set([
      ...(primary.alternateIdentities ?? []),
      secondary.rvtr,
      ...(secondary.alternateIdentities ?? []),
    ])).filter((identity) => identity !== primary.rvtr),
    coverUrl: primary.coverUrl ?? secondary.coverUrl,
    heroUrl: exactVideoHero ?? primary.heroUrl ?? secondary.heroUrl,
    heroSource: exactVideoHero
      ? "approved-song-hero"
      : primary.heroUrl
        ? primary.heroSource
        : secondary.heroSource,
    packageCards: primary.packageCards?.length
      ? primary.packageCards
      : secondary.packageCards,
    universalPackage: primary.universalPackage ?? secondary.universalPackage,
    vdjPackage: exactVdjPayload.vdjPackage ?? primary.vdjPackage ?? secondary.vdjPackage,
    vdj: exactVdjPayload.vdj ?? primary.vdj ?? secondary.vdj,
    warnings: Array.from(new Set([...primary.warnings, ...secondary.warnings])),
    resolverPath: Array.from(new Set([
      ...primary.resolverPath,
      ...secondary.resolverPath,
      "live:exact-vdj-path",
    ])),
  };
}

export function describePublicSongExperience(
  payload: PublicSongPayload,
  options: { hasEditorial: boolean } = { hasEditorial: false },
): PublicSongExperienceTrace {
  const chartAvailable = Boolean(payload.track?.trajectoryWeeks.length);
  const storySource = options.hasEditorial
    ? "editorial"
    : payload.storyCards.length > 0 || payload.trivia.length > 0 || payload.timeline.length > 0
      ? "package"
      : Boolean(payload.localContent)
        ? "local"
        : chartAvailable
          ? "chart"
          : "none";

  return {
    identity: payload.rvtr,
    dataSources: payload.resolverPath,
    heroSource: payload.heroSource,
    storySource,
    chartAvailable,
    renderer: canRenderPublicSongExperience(payload)
      ? "public-song-experience"
      : "live-song-fallback",
    links: {
      song: Boolean(payload.links.songHref) && hasStablePublicSongRoute(payload),
      artist: Boolean(payload.links.artistHref),
      album: Boolean(payload.links.albumHref),
      year: Boolean(payload.links.yearHref || payload.year),
    },
  };
}
