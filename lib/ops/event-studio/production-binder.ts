import { listGenerations, libraryFileUrl } from "@/lib/ops/content-creator/library";
import type { ContentCreatorGenerationIndexEntry } from "@/lib/ops/content-creator/library/types";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { RVBR_ISSUE_PALETTES } from "@/lib/ops/event-control/rvbr-palette";

import type {
  EventStudioIdentity,
  EventStudioSnapshot,
  EventStudioStatus,
  ProductionAssetSlot,
  ProductionBinder,
  ProductionChecklistItem,
  ProductionProgress,
} from "./types";

function resolveTheme(
  issueTheme: string | null,
  headline: string | null,
  eventTitle: string,
): string {
  if (issueTheme?.trim()) return issueTheme.trim();
  if (headline?.trim()) return headline.trim();
  return eventTitle;
}

function resolveStatus(active: boolean): EventStudioStatus {
  return active ? "Live" : "Planning";
}

function eventMatches(entry: ContentCreatorGenerationIndexEntry, eventName: string): boolean {
  const needle = eventName.trim().toLowerCase();
  if (!needle) return true;
  return entry.event.trim().toLowerCase().includes(needle) || needle.includes(entry.event.trim().toLowerCase());
}

function latestPassGenerations(
  generations: ContentCreatorGenerationIndexEntry[],
  eventName: string,
): ContentCreatorGenerationIndexEntry[] {
  return generations
    .filter((entry) => entry.artifact === "pass")
    .filter((entry) => eventMatches(entry, eventName))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function hasPrintSheet(entry: ContentCreatorGenerationIndexEntry): boolean {
  const paths = entry.production.printPackagePaths;
  if (!paths || typeof paths !== "object") return false;
  return Object.keys(paths).length > 0;
}

function buildSnapshot(config: Awaited<ReturnType<typeof loadEventControlConfig>>): EventStudioSnapshot {
  return {
    eventName: config.event.title,
    venue: config.event.venue || "Venue TBD",
    date: config.event.date || "Date TBD",
    theme: resolveTheme(config.rvbr.issueTheme, config.homepage.headline, config.event.title),
    featuredYears: config.featuredYears,
    status: resolveStatus(config.event.active),
    updatedAt: config.updatedAt,
  };
}

function buildIdentity(config: Awaited<ReturnType<typeof loadEventControlConfig>>): EventStudioIdentity {
  const palette = RVBR_ISSUE_PALETTES[config.rvbr.issueColor];
  const styleParts = [
    config.rvbr.issueTheme?.trim(),
    config.rvbr.issueColor !== "DEFAULT" ? `${config.rvbr.issueColor} palette` : null,
    config.rvbr.tagline?.trim(),
  ].filter(Boolean);

  return {
    eventName: config.event.title,
    venue: config.event.venue || "Venue TBD",
    date: config.event.date || "Date TBD",
    theme: resolveTheme(config.rvbr.issueTheme, config.homepage.headline, config.event.title),
    featuredYears: config.featuredYears,
    styleProfile: styleParts.join(" · ") || "Retroverse editorial default",
    colorPaletteLabel: config.rvbr.issueColor,
    colorSwatches: [palette.accent, palette.accentHot, palette.bgEnd],
    fonts: "Retroverse editorial stack",
    aiPromptProfile: config.rvbr.issueTheme?.trim()
      ? `${config.rvbr.issueTheme.trim()} · RVBR issue profile`
      : "Inherit from RVBR issue profile",
  };
}

function buildChecklist(
  config: Awaited<ReturnType<typeof loadEventControlConfig>>,
  passes: ContentCreatorGenerationIndexEntry[],
): ProductionChecklistItem[] {
  const latestPass = passes[0];
  const passArtworkDone = Boolean(
    latestPass &&
      (latestPass.status === "production_ready" ||
        latestPass.status === "approved" ||
        latestPass.hasExport ||
        latestPass.thumbnailPath),
  );
  const passSheetDone = passes.some((entry) => entry.hasExport && hasPrintSheet(entry));
  const landingDone = Boolean(
    config.event.active ||
      config.homepage.headline?.trim() ||
      config.homepage.featureImageUrl?.trim() ||
      config.homepage.mode === "EVENT",
  );

  return [
    {
      id: "pass-artwork",
      label: "Pass Artwork",
      done: passArtworkDone,
      href: "/ops/event-studio/create/pass-generator",
    },
    {
      id: "pass-sheet",
      label: "Pass Sheet",
      done: passSheetDone,
      href: "/ops/event-studio/create/pass-generator",
    },
    {
      id: "landing-page",
      label: "Landing Page",
      done: landingDone,
      href: "/ops/event-control",
    },
    { id: "facebook-graphic", label: "Facebook Graphic", done: false, href: "/ops/event-studio/create" },
    { id: "poster", label: "Poster", done: false, href: "/ops/event-studio/create" },
    { id: "giveaway", label: "Giveaway", done: false, href: "/ops/event-studio/audience" },
    { id: "registration", label: "Registration", done: false, href: "/ops/pass-registrations" },
    { id: "now-playing", label: "Now Playing", done: false, href: "/ops/event-studio/publish" },
  ];
}

function buildProgress(checklist: ProductionChecklistItem[]): ProductionProgress {
  const done = checklist.filter((item) => item.done).length;
  const total = checklist.length;
  return {
    done,
    total,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

function buildAssets(
  config: Awaited<ReturnType<typeof loadEventControlConfig>>,
  passes: ContentCreatorGenerationIndexEntry[],
): ProductionAssetSlot[] {
  const latestPass = passes[0];
  const passThumb = latestPass?.thumbnailPath ? libraryFileUrl(latestPass.thumbnailPath) : undefined;
  const passStatus: ProductionAssetSlot["status"] = passThumb
    ? latestPass?.status === "production_ready" || latestPass?.hasExport
      ? "approved"
      : "draft"
    : "missing";
  const heroThumb = config.homepage.featureImageUrl?.trim() || undefined;

  return [
    { id: "pass-front", label: "Pass Front", thumbnailUrl: passThumb, status: passStatus },
    { id: "pass-back", label: "Pass Back", thumbnailUrl: passThumb, status: passStatus },
    { id: "poster", label: "Poster", status: "missing" },
    { id: "hero", label: "Hero Artwork", thumbnailUrl: heroThumb, status: heroThumb ? "approved" : "missing" },
    { id: "facebook-cover", label: "Facebook Cover", status: "missing" },
    { id: "instagram-square", label: "Instagram Square", status: "missing" },
    {
      id: "landing-hero",
      label: "Landing Hero",
      thumbnailUrl: heroThumb,
      status: heroThumb ? "approved" : "missing",
    },
  ];
}

export async function loadProductionBinder(): Promise<ProductionBinder> {
  const config = await loadEventControlConfig();
  const snapshot = buildSnapshot(config);
  const identity = buildIdentity(config);

  let passes: ContentCreatorGenerationIndexEntry[] = [];
  try {
    passes = latestPassGenerations(await listGenerations({ limit: 200, sort: "updated" }), snapshot.eventName);
  } catch {
    passes = [];
  }

  const checklist = buildChecklist(config, passes);
  const progress = buildProgress(checklist);
  const assets = buildAssets(config, passes);

  return { snapshot, identity, checklist, progress, assets };
}

/** @deprecated Use loadProductionBinder */
export async function loadEventStudioSnapshot(): Promise<EventStudioSnapshot> {
  const binder = await loadProductionBinder();
  return binder.snapshot;
}
