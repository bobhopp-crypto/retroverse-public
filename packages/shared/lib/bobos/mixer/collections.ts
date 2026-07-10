/**
 * Broadcast Mixer collection loaders — real assets for sidebar collections.
 *
 * A collection is either one of a small set of built-in ids (legacy RVBA
 * templates, VDJ live, recent/favorites) or an imported Broadcast Collection
 * (`lib/bobos/importer`). Imported collections are discovered dynamically —
 * nothing here is Live-Aid-specific; "Live Aid 1985" is just the first
 * collection an operator has imported.
 */

import "server-only";

import {
  getCollectionManifest,
  listCollectionSummaries,
  slideMediaUrl,
} from "@/lib/bobos/importer";
import type { BroadcastCollectionSummary, BroadcastSequence } from "@/lib/bobos/importer";
import { RVBA_TEMPLATES } from "@/lib/bobos/mixer/rvba-templates";

import type { AssetReference } from "./types";
import { newDeckPlaylistEntry, type DeckPlaylistEntry } from "./types";

/** Built-in ids that always show in the sidebar, even with no content yet. */
export const MIXER_COLLECTION_IDS = [
  "sunday-nights",
  "live-aid-1985",
  "slides-graphics",
  "announcements",
  "sponsor-content",
  "recent",
  "favorites",
] as const;

export type MixerCollectionId = (typeof MIXER_COLLECTION_IDS)[number];

export type MixerCollectionItem = AssetReference & {
  /** Sequence id, RVBA template id, etc. — used when loading a row onto a deck. */
  loadKey?: string;
  loadKind?: "sequence" | "asset";
  /** Set alongside loadKind "sequence" — which imported collection it belongs to. */
  collectionId?: string;
};

export const MIXER_COLLECTION_LABELS: Record<string, string> = {
  "sunday-nights": "Sunday Nights",
  "live-aid-1985": "Live Aid 1985",
  "slides-graphics": "Slides & Graphics",
  announcements: "Announcements",
  "sponsor-content": "Sponsor Content",
  recent: "Recent",
  favorites: "Favorites",
};

function rvbaByTypes(types: string[]): MixerCollectionItem[] {
  return RVBA_TEMPLATES.filter((template) => types.includes(template.rvbaType)).map((template) => ({
    assetId: template.assetId,
    kind: template.kind,
    title: template.title,
    subtitle: template.subtitle,
    coverUrl: template.coverUrl,
    loadKey: template.assetId,
    loadKind: "asset",
  }));
}

function sequenceToItem(summary: BroadcastCollectionSummary, sequence: BroadcastSequence, coverUrl: string | null): MixerCollectionItem {
  return {
    assetId: `${summary.id}::${sequence.id}`,
    kind: "event",
    title: sequence.title,
    subtitle: `${summary.title} · slides ${sequence.startSlide}-${sequence.endSlide}`,
    coverUrl,
    loadKey: sequence.id,
    loadKind: "sequence",
    collectionId: summary.id,
  };
}

async function importedCollectionItems(summary: BroadcastCollectionSummary): Promise<MixerCollectionItem[]> {
  const manifest = await getCollectionManifest(summary.id);
  if (!manifest) return [];
  return manifest.sequences.map((sequence) => {
    const firstSlide = manifest.slides.find((slide) => slide.sequenceIndex === sequence.startSlide);
    const coverUrl = firstSlide ? slideMediaUrl(summary.id, "thumbs", firstSlide.thumbFile) : null;
    return sequenceToItem(summary, sequence, coverUrl);
  });
}

/** Every collections index entry, imported first. Built-ins fill in ids
 * that have no imported data yet (legacy templates, VDJ live, etc.). */
export async function listMixerCollections(): Promise<
  { id: string; title: string; imported: boolean }[]
> {
  const imported = await listCollectionSummaries();
  const importedIds = new Set(imported.map((c) => c.id));
  // "recent" / "favorites" are already shown as top-level sidebar shortcuts —
  // omit them here so "My Collections" doesn't list them a second time.
  const builtins = MIXER_COLLECTION_IDS.filter(
    (id) => !importedIds.has(id) && id !== "recent" && id !== "favorites",
  ).map((id) => ({
    id,
    title: MIXER_COLLECTION_LABELS[id] ?? id,
    imported: false,
  }));
  return [
    ...imported.map((c) => ({ id: c.id, title: c.title, imported: true })),
    ...builtins,
  ];
}

/** Items shown when a sidebar collection is selected (not search mode). */
export async function listMixerCollectionItems(collectionId: string): Promise<MixerCollectionItem[]> {
  const imported = await getCollectionManifest(collectionId);
  if (imported) {
    const summary: BroadcastCollectionSummary = {
      id: imported.id,
      title: imported.title,
      slideCount: imported.slides.length,
      sequenceCount: imported.sequences.length,
      createdAt: imported.createdAt,
      updatedAt: imported.updatedAt,
      sourceKind: imported.sourceKind,
    };
    return importedCollectionItems(summary);
  }

  switch (collectionId) {
    case "slides-graphics":
      return rvbaByTypes(["image", "pdf", "video", "story", "blank"]);
    case "announcements":
      return rvbaByTypes(["announcement", "countdown", "giveaway"]);
    case "sponsor-content":
      return rvbaByTypes(["announcement", "image"]);
    case "sunday-nights":
      return [
        {
          assetId: "sunday-nights-live",
          kind: "vdj-live",
          title: "Sunday Nights · Live Follow",
          subtitle: "VirtualDJ auto-follow when on air",
          coverUrl: null,
          loadKey: "vdj-live",
          loadKind: "asset",
        },
      ];
    case "recent":
    case "favorites":
      return [];
    default:
      return [];
  }
}

/** Expand one sequence into deck playlist rows — the generic replacement
 * for the old Live-Aid-only `segmentScenesToDeckEntries`. Works for any
 * imported collection's sequence. */
export async function sequenceToDeckEntries(
  collectionId: string,
  sequenceId: string,
): Promise<DeckPlaylistEntry[]> {
  const manifest = await getCollectionManifest(collectionId);
  if (!manifest) return [];
  const sequence = manifest.sequences.find((s) => s.id === sequenceId);
  if (!sequence) return [];

  const slides = manifest.slides.filter(
    (slide) => slide.sequenceIndex >= sequence.startSlide && slide.sequenceIndex <= sequence.endSlide,
  );

  return slides.map((slide) => {
    const asset: AssetReference = {
      assetId: slide.rvbaId,
      kind: "broadcast",
      title: slide.title,
      subtitle: manifest.title,
      coverUrl: slideMediaUrl(collectionId, "thumbs", slide.thumbFile),
    };
    const entry = newDeckPlaylistEntry(asset);
    entry.durationSeconds = null;
    return entry;
  });
}

export function isMixerCollectionId(value: string): value is MixerCollectionId {
  return (MIXER_COLLECTION_IDS as readonly string[]).includes(value);
}
