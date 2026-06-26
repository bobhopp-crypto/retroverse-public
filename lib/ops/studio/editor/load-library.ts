import "server-only";

import { readdir } from "node:fs/promises";

import { buildEditorHandoff } from "@/lib/ops/studio/collector/package-handoff";
import { type CollectorLibraryCard } from "@/lib/ops/studio/collector/load-library";
import { performanceCount } from "@/lib/ops/studio/collector/package-archive";
import { normalizeCollectorPackage } from "@/lib/ops/studio/collector/presentation";
import { researchDepartmentRoot } from "@/lib/ops/studio/collector/paths";
import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { visualAssetUrl } from "@/lib/ops/studio/collector/visual-asset-url";
import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";

import { buildEditorOfficeView } from "./office-presentation";
import { buildEditorStoryView } from "./presentation";
import { loadEditorStory, loadOrDraftEditorStory } from "./store";
import {
  type EditorLibraryCard,
  type EditorLibraryIndex,
  type EditorLibraryStats,
  type EditorStoryPackage,
  editorialStatusToConfidence,
  editorialStatusToHandoff,
} from "./types";
import type { EditorPackagePageContext } from "./page-context";

export type { EditorPackagePageContext } from "./page-context";

const RVTR_DIR = /^RVTR\d+$/i;

function handoffReady(pkg: CollectorPackage): boolean {
  const handoff = buildEditorHandoff(pkg, pkg.performances?.[0]?.id ?? null);
  return handoff.items.every((item) => item.status === "Ready");
}

function cardFromPackage(
  pkg: CollectorPackage,
  story: EditorStoryPackage | null,
): EditorLibraryCard {
  const normalized = normalizeCollectorPackage(pkg);
  const hero = normalized.visualAssets?.extraction?.assets?.find((a) => a.category === "Hero");

  return {
    rvtr: normalized.rvtr,
    artist: normalized.artist,
    title: normalized.title,
    heroImageUrl: hero
      ? visualAssetUrl(normalized.rvtr, hero.filename)
      : normalized.visualAssets?.coverUrl ?? null,
    performanceCount: performanceCount(normalized),
    storyStatus: story ? editorialStatusToHandoff(story.meta.editorialStatus) : "no_draft",
    confidence: story ? editorialStatusToConfidence(story.meta.editorialStatus) : null,
    lastUpdated: story?.meta.updatedAt ?? null,
    collectorReady: handoffReady(normalized),
    href: `/ops/studio/editor/${normalized.rvtr}`,
  };
}

function buildStats(cards: EditorLibraryCard[]): EditorLibraryStats {
  return {
    storyCount: cards.filter((c) => c.storyStatus !== "no_draft").length,
    readyForDirector: cards.filter((c) => c.storyStatus === "ready").length,
    submitted: cards.filter((c) => c.storyStatus === "submitted").length,
    draftCount: cards.filter((c) => c.confidence === "draft").length,
  };
}

function compareCards(a: EditorLibraryCard, b: EditorLibraryCard): number {
  return a.artist.localeCompare(b.artist, undefined, { sensitivity: "base" })
    || a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

export async function loadEditorLibraryIndex(): Promise<EditorLibraryIndex> {
  const root = researchDepartmentRoot();
  let entries: string[] = [];

  try {
    const dirEntries = await readdir(root, { withFileTypes: true });
    entries = dirEntries.filter((e) => e.isDirectory() && RVTR_DIR.test(e.name)).map((e) => e.name);
  } catch {
    entries = [];
  }

  const cards: EditorLibraryCard[] = [];

  for (const dir of entries) {
    const rvtr = dir.toUpperCase();
    try {
      const pkg = await loadCollectorPackage(rvtr);
      if (!pkg) continue;
      const story = await loadEditorStory(rvtr);
      cards.push(cardFromPackage(pkg, story));
    } catch {
      /* skip */
    }
  }

  const alphabetical = [...cards].sort(compareCards);
  const recent = [...cards]
    .filter((c) => c.lastUpdated)
    .sort((a, b) => new Date(b.lastUpdated!).getTime() - new Date(a.lastUpdated!).getTime());

  return {
    cards,
    recent,
    alphabetical,
    stats: buildStats(cards),
  };
}

function editorNeighbors(
  index: EditorLibraryIndex,
  rvtr: string,
): { prev: EditorLibraryCard | null; next: EditorLibraryCard | null } {
  const normalized = rvtr.trim().toUpperCase();
  const pos = index.alphabetical.findIndex((c) => c.rvtr === normalized);
  if (pos === -1) return { prev: null, next: null };
  return {
    prev: pos > 0 ? index.alphabetical[pos - 1]! : null,
    next: pos < index.alphabetical.length - 1 ? index.alphabetical[pos + 1]! : null,
  };
}

export async function loadEditorPackagePageContext(
  rvtr: string,
): Promise<EditorPackagePageContext> {
  const normalized = rvtr.trim().toUpperCase();
  const [index, collector] = await Promise.all([
    loadEditorLibraryIndex(),
    loadCollectorPackage(normalized),
  ]);

  const { prev, next } = editorNeighbors(index, normalized);

  if (!collector) {
    return {
      rvtr: normalized,
      collector: null,
      story: null,
      view: null,
      office: null,
      seeded: false,
      prev,
      next,
    };
  }

  const normalizedCollector = normalizeCollectorPackage(collector);
  let story: EditorStoryPackage | null = null;
  let seeded = false;

  try {
    const result = await loadOrDraftEditorStory(normalized, normalizedCollector);
    story = result.story;
    seeded = result.seeded;
  } catch {
    story = null;
  }

  const view = story
    ? buildEditorStoryView(normalizedCollector, story, story.approved.performanceId)
    : null;
  const office = story ? buildEditorOfficeView(normalizedCollector, story, story.approved.performanceId) : null;

  return {
    rvtr: normalized,
    collector: normalizedCollector,
    story,
    view,
    office,
    seeded,
    prev,
    next,
  };
}

export function collectorCardToEditor(card: CollectorLibraryCard): EditorLibraryCard {
  return {
    rvtr: card.rvtr,
    artist: card.artist,
    title: card.title,
    heroImageUrl: card.heroImageUrl,
    performanceCount: card.performanceCount,
    storyStatus: "no_draft",
    confidence: null,
    lastUpdated: null,
    collectorReady: true,
    href: `/ops/studio/editor/${card.rvtr}`,
  };
}
