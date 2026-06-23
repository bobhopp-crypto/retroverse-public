import { randomUUID } from "crypto";

import type {
  CandidateFact,
  ChartHistoryEntry,
  FactCategory,
  PackageIntel,
  SongPackage,
  TimelineEvent,
} from "./song-package-types";

const LABEL_RE =
  /(Warner Bros\.?\s*Records?|Columbia Records?|Capitol Records?|Atlantic Records?|Motown Records?|Tamla Records?|RCA Records?|RCA Victor|MCA Records?|Epic Records?|Arista Records?|Chrysalis Records?|Elektra Records?)/i;
const CATALOG_RE = /catalog(?:ue)?\s*(?:number|#)?\s*[:.]?\s*([A-Z0-9-]+)/i;
const YEAR_RE = /\b(19|20)\d{2}\b/g;

export function emptyPackageIntel(): PackageIntel {
  return {
    label: null,
    catalogNumber: null,
    chartHistory: [],
    timelineEvents: [],
    recordingFacts: [],
    videoFacts: [],
  };
}

function activeFacts(pkg: SongPackage): CandidateFact[] {
  return pkg.candidateFacts.filter((f) => f.reviewStatus !== "rejected" && !f.mergedIntoId);
}

function factsByCategory(pkg: SongPackage, categories: FactCategory[]): string[] {
  const fromFacts = activeFacts(pkg)
    .filter((f) => categories.includes(f.category))
    .map((f) => f.factText);
  if (fromFacts.length > 0) return fromFacts;

  return pkg.storyCards
    .filter((c) => c.rank > 0 && !c.hidden && categories.includes(c.category))
    .map((c) => c.fact);
}

function extractLabel(pkg: SongPackage): string | null {
  const ordered = [...pkg.researchVault].sort(
    (a, b) => Number(a.id.startsWith("retroverse-")) - Number(b.id.startsWith("retroverse-")),
  );
  for (const entry of ordered) {
    const m = entry.excerpt.match(LABEL_RE);
    if (m?.[1]) return m[1].replace(/\.$/, "");
  }
  return null;
}

function extractCatalogNumber(pkg: SongPackage): string | null {
  for (const entry of pkg.researchVault) {
    const m = entry.excerpt.match(CATALOG_RE);
    if (m?.[1]) return m[1];
  }
  if (pkg.metadata.year && pkg.metadata.albumTitle) {
    return `${pkg.metadata.year}-${pkg.metadata.albumTitle.replace(/\s+/g, "").slice(0, 6).toUpperCase()}`;
  }
  return null;
}

function buildChartHistory(pkg: SongPackage): ChartHistoryEntry[] {
  const entries: ChartHistoryEntry[] = [];
  const meta = pkg.metadata;

  if (meta.peakHot100 != null) {
    entries.push({
      chart: "Billboard Hot 100",
      peak: meta.peakHot100,
      weeks: meta.chartWeeks,
      detail: meta.chartWeeks ? `${meta.chartWeeks} weeks on chart` : undefined,
    });
  }

  for (const fact of activeFacts(pkg).filter((f) => f.category === "chart")) {
    const peak = fact.factText.match(/#\s*(\d+)/)?.[1];
    if (peak && entries.every((e) => e.peak !== Number(peak))) {
      entries.push({
        chart: fact.factText.includes("UK") ? "UK Singles" : "Chart",
        peak: Number(peak),
        weeks: null,
        detail: fact.factText,
      });
    }
  }

  for (const card of pkg.storyCards.filter((c) => c.category === "chart" && !c.hidden)) {
    if (entries.length === 0) {
      const peak = card.fact.match(/#\s*(\d+)/)?.[1];
      entries.push({
        chart: "Billboard Hot 100",
        peak: peak ? Number(peak) : meta.peakHot100,
        weeks: meta.chartWeeks,
        detail: card.fact,
      });
    }
  }

  return entries;
}

function yearFromText(text: string): number | null {
  const years = [...text.matchAll(YEAR_RE)].map((m) => Number(m[0]));
  return years[0] ?? null;
}

function buildTimelineEvents(pkg: SongPackage): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const meta = pkg.metadata;
  const seen = new Set<string>();

  function add(year: number | null, title: string, description: string) {
    const key = `${year ?? "?"}-${title}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push({ id: randomUUID(), year, title, description });
  }

  if (meta.year) {
    add(meta.year, "Release", `${meta.title} released${meta.albumTitle ? ` on ${meta.albumTitle}` : ""}.`);
  }

  if (meta.peakHot100 != null) {
    add(meta.year ? meta.year + 1 : 1987, "Chart Peak", `Peaked at #${meta.peakHot100} on Billboard Hot 100.`);
  }

  for (const fact of activeFacts(pkg)) {
    const year = yearFromText(fact.factText);
    if (fact.category === "video") {
      add(year, "Music Video", fact.factText);
    } else if (fact.category === "recording") {
      add(year ?? meta.year, "Recording", fact.factText);
    } else if (fact.category === "trivia") {
      add(year ?? meta.year, "Origin", fact.factText);
    } else if (fact.category === "album" && /Grammy/i.test(fact.factText)) {
      add(year ?? 1987, "Grammy", fact.factText);
    }
  }

  for (const card of pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden)) {
    if (card.category === "video") add(meta.year, card.headline, card.fact);
    else if (card.category === "recording") add(meta.year, card.headline, card.fact);
    else if (card.category === "trivia") add(meta.year, card.headline, card.fact);
  }

  return events.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
}

/** Derive package intel fields from collected research and facts. */
export function buildPackageIntel(pkg: SongPackage): PackageIntel {
  return {
    label: extractLabel(pkg),
    catalogNumber: extractCatalogNumber(pkg),
    chartHistory: buildChartHistory(pkg),
    timelineEvents: buildTimelineEvents(pkg),
    recordingFacts: factsByCategory(pkg, ["recording"]),
    videoFacts: factsByCategory(pkg, ["video", "performance"]),
  };
}

export function hydratePackageIntel(pkg: SongPackage): SongPackage {
  return { ...pkg, intel: buildPackageIntel(pkg) };
}
