import type {
  CoverageItem,
  CoverageRole,
  CoverageStatus,
  LibraryDerivedAsset,
  LibraryPerformanceFrame,
  ShotType,
} from "./types";

export const COVERAGE_ROLES: CoverageRole[] = [
  "hero",
  "performance",
  "recording",
  "television",
  "studio",
  "chart",
  "album",
  "artist",
  "reflection",
  "closing",
  "quote",
  "timeline",
];

const ROLE_LABELS: Record<CoverageRole, string> = {
  hero: "Hero",
  performance: "Performance",
  recording: "Recording",
  television: "Television",
  studio: "Studio",
  chart: "Chart",
  album: "Album",
  artist: "Artist",
  reflection: "Reflection",
  closing: "Closing",
  quote: "Quote",
  timeline: "Timeline",
};

export function coverageRoleLabel(role: CoverageRole): string {
  return ROLE_LABELS[role];
}

function frameMatchesRole(frame: LibraryPerformanceFrame, role: CoverageRole): boolean {
  switch (role) {
    case "hero":
      return frame.shotType === "hero" || frame.category === "Hero";
    case "performance":
      return (
        frame.shotType === "performance" ||
        frame.category === "Performance" ||
        frame.detectedSubjects.includes("performer")
      );
    case "television":
      return frame.detectedSubjects.includes("broadcast") || frame.category === "Hero";
    case "recording":
    case "studio":
      return false;
    case "chart":
    case "album":
    case "artist":
    case "quote":
    case "timeline":
      return false;
    case "reflection":
      return frame.shotType === "close_up" || frame.category === "Close-up";
    case "closing":
      return frame.shotType === "performance" || frame.shotType === "hero";
    default:
      return false;
  }
}

function derivedMatchesRole(asset: LibraryDerivedAsset, role: CoverageRole): boolean {
  return asset.preferredSceneTypes.some((t) => {
    const hay = t.toLowerCase();
    switch (role) {
      case "hero":
        return hay.includes("hero");
      case "performance":
        return hay.includes("performance");
      case "chart":
        return hay.includes("chart");
      case "reflection":
        return hay.includes("reflection") || hay.includes("final");
      case "closing":
        return hay.includes("final") || hay.includes("reflection");
      case "quote":
        return hay.includes("quote");
      case "timeline":
        return hay.includes("timeline");
      case "television":
        return hay.includes("hero") || hay.includes("performance");
      default:
        return false;
    }
  });
}

function derivedStatusForRole(
  assets: LibraryDerivedAsset[],
  role: CoverageRole,
): { ids: string[]; bestStatus: CoverageStatus } {
  const matching = assets.filter((a) => derivedMatchesRole(a, role));
  const ids = matching.map((a) => a.id);
  if (matching.some((a) => a.status === "approved")) {
    return { ids, bestStatus: "approved" };
  }
  if (matching.some((a) => a.status === "generated")) {
    return { ids, bestStatus: "generated" };
  }
  if (matching.some((a) => a.status === "recommended")) {
    return { ids, bestStatus: "recommended" };
  }
  return { ids, bestStatus: "missing" };
}

export type CoverageContext = {
  hasChartData: boolean;
  hasAlbumData: boolean;
  hasArtistData: boolean;
  hasQuoteContent: boolean;
  hasTimelineEvents: boolean;
  isTelevisionSong: boolean;
  hasRecordingNotes: boolean;
};

export function classifyCoverage(input: {
  frames: LibraryPerformanceFrame[];
  derivedAssets: LibraryDerivedAsset[];
  context: CoverageContext;
}): CoverageItem[] {
  const { frames, derivedAssets, context } = input;

  return COVERAGE_ROLES.map((role) => {
    const frameMatches = frames.filter((f) => frameMatchesRole(f, role));
    const frameIds = frameMatches.map((f) => f.id);
    const derived = derivedStatusForRole(derivedAssets, role);

    let recommended = false;
    let notes = "";

    switch (role) {
      case "hero":
        recommended = frameIds.length === 0;
        notes = frameIds.length ? "Hero frame on file" : "Needs opening representative frame";
        break;
      case "performance":
        recommended = frameIds.length < 2;
        notes =
          frameIds.length >= 2
            ? `${frameIds.length} performance frames`
            : "Add distinct performance angles";
        break;
      case "television":
        recommended = context.isTelevisionSong && frameIds.length === 0;
        notes = context.isTelevisionSong
          ? "Television/broadcast visual treatment"
          : "Not a television-forward song";
        break;
      case "chart":
        recommended = context.hasChartData && frameIds.length === 0 && derived.ids.length === 0;
        notes = context.hasChartData ? "Chart milestone visual or derived halftone" : "No chart data";
        break;
      case "album":
        recommended = context.hasAlbumData;
        notes = context.hasAlbumData ? "Album sleeve or liner visual" : "No album anchor";
        break;
      case "artist":
        recommended = context.hasArtistData;
        notes = context.hasArtistData ? "Artist portrait or identity frame" : "Limited artist context";
        break;
      case "recording":
      case "studio":
        recommended = context.hasRecordingNotes;
        notes = context.hasRecordingNotes ? "Studio/recording story visual" : "No recording session imagery";
        break;
      case "quote":
        recommended = context.hasQuoteContent;
        notes = context.hasQuoteContent ? "Pull-quote visual moment" : "No quotes on file";
        break;
      case "timeline":
        recommended = context.hasTimelineEvents;
        notes = context.hasTimelineEvents ? "Timeline beat imagery" : "No dated timeline events";
        break;
      case "reflection":
        recommended = !frameMatches.some((f) => f.shotType === "close_up");
        notes = frameIds.length ? "Reflective close-up available" : "Consider close-up or watercolor derived";
        break;
      case "closing":
        recommended = frameIds.length === 0;
        notes = frameIds.length ? "Closing performance frame available" : "Needs closing visual";
        break;
      default:
        break;
    }

    const derivedStatus = derived.bestStatus;
    let status: CoverageStatus = "missing";

    if (derivedStatus === "approved" || (frameIds.length > 0 && role !== "chart")) {
      status = frameIds.length > 0 || derived.ids.length > 0 ? "approved" : derivedStatus;
    } else if (derivedStatus === "generated") {
      status = "generated";
    } else if (derivedStatus === "recommended" || recommended) {
      status = frameIds.length > 0 ? "approved" : recommended ? "recommended" : "missing";
    } else if (frameIds.length > 0) {
      status = "approved";
    }

    if (status === "missing" && recommended) status = "recommended";

    const satisfiedBy = [...new Set([...frameIds, ...derived.ids])];

    return { role, status, satisfiedBy, notes };
  });
}

export function shotTypeFromCategory(category: string | null): ShotType {
  switch (category) {
    case "Hero":
      return "hero";
    case "Performance":
      return "performance";
    case "Close-up":
      return "close_up";
    case "Alternate":
      return "alternate";
    case "Crowd":
      return "crowd";
    default:
      return "unknown";
  }
}

export function subjectsFromCategory(category: string | null): string[] {
  switch (category) {
    case "Hero":
      return ["performer", "broadcast", "stage"];
    case "Performance":
      return ["performer", "stage"];
    case "Close-up":
      return ["performer", "face"];
    case "Alternate":
      return ["performer", "stage", "angle"];
    case "Crowd":
      return ["crowd", "stage", "wide"];
    default:
      return ["performer"];
  }
}
