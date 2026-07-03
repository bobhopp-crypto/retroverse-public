import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import { join, relative } from "path";

import type { PromptQualityLevel } from "@/lib/creative/rvbr-prompt-types";
import { creativeLabVNextDir } from "@/lib/ops/creative-lab/paths";
import { CREATIVE_DIRECTIONS, DEFAULT_CREATIVE_DIRECTION_SETTINGS } from "@/lib/ops/content-creator/creative-direction";
import { artDirectorPromptText } from "@/lib/ops/content-creator/rvbr-art-director-prompt";
import type { VNextManifest } from "@/lib/ops/content-creator/vnext-run";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

import { indexEntryFromManifest, normalizeGenerationManifest } from "./normalize";
import {
  contentCreatorExportDir,
  contentCreatorGenerationDayDir,
  contentCreatorIndexPath,
  contentCreatorManifestPath,
  contentCreatorManifestsDir,
  contentCreatorRoot,
  contentCreatorThumbnailPath,
} from "./paths";
import { hashPrompts } from "./prompt-hash";
import { writeGenerationThumbnail } from "./thumbnail";
import type {
  ContentCreatorGenerationIndexEntry,
  ContentCreatorGenerationManifest,
  ContentCreatorLibraryIndex,
  GenerationCuratorPatch,
  GenerationStatus,
  GenerationQualitySnapshot,
  LibraryStats,
} from "./types";

export type {
  ContentCreatorGenerationManifest,
  ContentCreatorGenerationIndexEntry,
  ContentCreatorLibraryIndex,
  GenerationCuratorPatch,
  LibraryStats,
};

export { generateVariationsFromParent } from "./variations";

export function libraryFileUrl(relPath: string): string {
  const normalized = relPath.replace(/^content_creator\//, "");
  return `/api/ops/content-creator/library/files/${normalized.split("/").map(encodeURIComponent).join("/")}`;
}

function relToLibrary(absPath: string): string {
  return relative(contentCreatorRoot(), absPath).split("\\").join("/");
}

async function ensureLibraryLayout(): Promise<void> {
  await mkdir(join(contentCreatorRoot(), "generations"), { recursive: true });
  await mkdir(join(contentCreatorRoot(), "exports"), { recursive: true });
  await mkdir(contentCreatorManifestsDir(), { recursive: true });
  await mkdir(join(contentCreatorRoot(), "thumbnails"), { recursive: true });
}

export async function loadLibraryIndex(): Promise<ContentCreatorLibraryIndex> {
  await ensureLibraryLayout();
  const path = contentCreatorIndexPath();
  if (!existsSync(path)) {
    return { version: 3, updatedAt: new Date().toISOString(), generations: [] };
  }
  const raw = JSON.parse(await readFile(path, "utf8")) as ContentCreatorLibraryIndex;
  return {
    version: 3,
    updatedAt: raw.updatedAt,
    generations: (raw.generations ?? []).map((e) => indexEntryFromManifest(normalizeGenerationManifest(e))),
  };
}

async function saveLibraryIndex(index: ContentCreatorLibraryIndex): Promise<void> {
  index.updatedAt = new Date().toISOString();
  index.version = 3;
  await writeFile(contentCreatorIndexPath(), `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function loadGenerationManifest(id: string): Promise<ContentCreatorGenerationManifest | null> {
  const path = contentCreatorManifestPath(id);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(await readFile(path, "utf8")) as Partial<ContentCreatorGenerationManifest> & { id: string };
  return normalizeGenerationManifest(raw);
}

async function saveGenerationManifest(manifest: ContentCreatorGenerationManifest): Promise<void> {
  await writeFile(contentCreatorManifestPath(manifest.id), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function upsertIndexEntry(manifest: ContentCreatorGenerationManifest): Promise<void> {
  const index = await loadLibraryIndex();
  const entry = indexEntryFromManifest(manifest);
  const i = index.generations.findIndex((g) => g.id === manifest.id);
  if (i >= 0) index.generations[i] = entry;
  else index.generations.unshift(entry);
  index.generations.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  await saveLibraryIndex(index);
}

function promptHashFromManifest(manifest: VNextManifest): string {
  const front = manifest.promptInspector?.front;
  const back = manifest.promptInspector?.back;
  if (front && back) {
    return hashPrompts(artDirectorPromptText(front), artDirectorPromptText(back));
  }
  return createHash("sha256").update(manifest.runId).digest("hex").slice(0, 16);
}

function qualityFromVNext(manifest: VNextManifest): GenerationQualitySnapshot {
  const front = manifest.promptInspector?.front;
  const scores = front?.qualityScores;
  return {
    promptCharCount: front?.promptMetrics?.charCount ?? 0,
    variationScore: (scores?.variationScore ?? "medium") as PromptQualityLevel,
    clicheRisk: (scores?.clicheRisk ?? "medium") as PromptQualityLevel,
  };
}

function statusFromVNext(
  manifest: VNextManifest,
  existing?: ContentCreatorGenerationManifest | null,
): GenerationStatus {
  if (existing?.status === "archived") return "archived";
  if (!manifest.exportZipFilename) {
    return existing?.status === "production_ready" ? "approved" : existing?.status ?? "review";
  }
  if (existing?.status === "approved" && manifest.qrStatus === "scan_verified") {
    return "production_ready";
  }
  return existing?.status ?? "review";
}

/** Copy vnext artwork into library and write manifest + thumbnail. */
export async function syncGenerationFromVNext(
  manifest: VNextManifest,
  profile: RvbrProfile,
  lineage?: { parentGenerationId?: string; variationBatchId?: string },
): Promise<ContentCreatorGenerationManifest> {
  await ensureLibraryLayout();

  const id = manifest.runId;
  const timestamp = manifest.startedAt;
  const genDir = contentCreatorGenerationDayDir(timestamp, id);
  await mkdir(genDir, { recursive: true });

  const frontSrc = join(manifest.runDir, manifest.frontFilename);
  const backSrc = join(manifest.runDir, manifest.backFilename);
  const frontDest = join(genDir, "front.png");
  const backDest = join(genDir, "back.png");

  await copyFile(frontSrc, frontDest);
  await copyFile(backSrc, backDest);

  const frontBuffer = await readFile(frontDest);
  await writeGenerationThumbnail(id, frontBuffer);

  const existing = await loadGenerationManifest(id);
  const creativeSettings = manifest.creativeSettings ?? DEFAULT_CREATIVE_DIRECTION_SETTINGS;
  const nextStatus = statusFromVNext(manifest, existing);
  const now = new Date().toISOString();

  let exportedCredentialPath = existing?.exportedCredentialPath ?? null;
  let exportZipPath = existing?.exportZipPath ?? null;

  if (manifest.exportZipFilename) {
    const exportDir = contentCreatorExportDir(id);
    await mkdir(exportDir, { recursive: true });
    const vnextExportDir = join(manifest.runDir, "export");
    const finalFront = join(vnextExportDir, "final-front.png");
    const finalBack = join(vnextExportDir, "final-back.png");
    const zipSrc = join(manifest.runDir, manifest.exportZipFilename);

    if (existsSync(finalFront)) {
      const destFront = join(exportDir, "final-front.png");
      await copyFile(finalFront, destFront);
      exportedCredentialPath = relToLibrary(destFront);
    }
    if (existsSync(finalBack)) {
      await copyFile(finalBack, join(exportDir, "final-back.png"));
    }
    if (existsSync(zipSrc)) {
      const destZip = join(exportDir, manifest.exportZipFilename);
      await copyFile(zipSrc, destZip);
      exportZipPath = relToLibrary(destZip);
    }
  }

  const record = normalizeGenerationManifest({
    id,
    runId: manifest.runId,
    timestamp,
    updatedAt: manifest.updatedAt,
    status: nextStatus,
    statusUpdatedAt: nextStatus === existing?.status ? existing.statusUpdatedAt : now,
    approvedAt:
      nextStatus === "approved" || nextStatus === "production_ready"
        ? existing?.approvedAt ?? now
        : existing?.approvedAt ?? null,
    archivedAt: nextStatus === "archived" ? existing?.archivedAt ?? now : null,
    archivedReason: nextStatus === "archived" ? existing?.archivedReason ?? "" : "",
    eraSlug: manifest.eraSlug,
    eraName: profile.name,
    artifact: manifest.artifact,
    creativeDirection: creativeSettings.creativeDirection,
    creativeSettings,
    promptHash: promptHashFromManifest(manifest),
    event: manifest.frontFields.event,
    venue: manifest.frontFields.venue,
    date: manifest.frontFields.date,
    secondaryLine: manifest.frontFields.secondaryLine,
    passTypeLabel: manifest.frontFields.passTypeLabel,
    qrUrl: manifest.backFields.qrUrl ?? "",
    qrPlacement: manifest.qrPlacement,
    favorite: existing?.favorite ?? false,
    rating: existing?.rating ?? null,
    notes: existing?.notes ?? "",
    tags: existing?.tags ?? [],
    collections: existing?.collections ?? [],
    template: existing?.template,
    parentGenerationId: lineage?.parentGenerationId ?? existing?.parentGenerationId ?? null,
    variationBatchId: lineage?.variationBatchId ?? existing?.variationBatchId ?? null,
    quality: qualityFromVNext(manifest),
    production: {
      exportedAt: manifest.exportZipFilename ? manifest.updatedAt : null,
      qrStatus: manifest.qrStatus ?? (manifest.exportZipFilename ? "composited" : "not_exported"),
      qrVerified: manifest.qrStatus === "scan_verified",
      quantity: manifest.quantity ?? null,
      numberingMode: manifest.numbering
        ? manifest.numbering.printSerialNumbers
          ? manifest.numbering.numberFormat
          : "write_in"
        : null,
      serialNumber: manifest.serialNumber ?? null,
      printPackagePaths: manifest.printPackage ?? null,
    },
    source: {
      provider: manifest.provider ?? null,
      visualWorldId: manifest.visualWorldId ?? null,
      compositionSeed: manifest.compositionSeed ?? null,
      serialNumber: manifest.serialNumber ?? null,
      resolvedArtifactArchetype: manifest.resolvedArtifactArchetype ?? null,
    },
    prompt: {
      promptHash: promptHashFromManifest(manifest),
      inspectorPath: manifest.promptInspector ? `${manifest.runDir}/manifest.json` : null,
    },
    sourceArtworkPath: manifest.runDir,
    frontImagePath: relToLibrary(frontDest),
    backImagePath: relToLibrary(backDest),
    thumbnailPath: relToLibrary(contentCreatorThumbnailPath(id)),
    exportedCredentialPath,
    exportZipPath,
  });

  await saveGenerationManifest(record);
  await upsertIndexEntry(record);
  return record;
}

export async function updateGenerationCurator(
  id: string,
  patch: GenerationCuratorPatch,
): Promise<ContentCreatorGenerationManifest> {
  const manifest = await loadGenerationManifest(id);
  if (!manifest) throw new Error("Generation not found");
  const now = new Date().toISOString();

  if (typeof patch.favorite === "boolean") manifest.favorite = patch.favorite;
  if (patch.rating !== undefined) manifest.rating = patch.rating;
  if (typeof patch.notes === "string") manifest.notes = patch.notes;
  if (Array.isArray(patch.tags)) manifest.tags = patch.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (Array.isArray(patch.collections)) {
    manifest.collections = Array.from(
      new Set(patch.collections.map((c) => c.trim()).filter(Boolean)),
    );
  }
  if (patch.template) {
    const wasTemplate = manifest.template.isTemplate;
    manifest.template = {
      ...manifest.template,
      ...patch.template,
      templateName:
        typeof patch.template.templateName === "string"
          ? patch.template.templateName.trim()
          : manifest.template.templateName,
      templateNotes:
        typeof patch.template.templateNotes === "string"
          ? patch.template.templateNotes.trim()
          : manifest.template.templateNotes,
      lastUsedAt: patch.template.lastUsedAt ?? manifest.template.lastUsedAt,
    };
    if (manifest.template.isTemplate && !wasTemplate) {
      manifest.template.sourceGenerationId = manifest.template.sourceGenerationId ?? manifest.id;
    }
  }
  const requestedStatus =
    patch.status === "production_ready" && !manifest.exportedCredentialPath && !manifest.exportZipPath
      ? "approved"
      : patch.status;
  if (requestedStatus && requestedStatus !== manifest.status) {
    manifest.status = requestedStatus;
    manifest.statusUpdatedAt = now;
    if (requestedStatus === "approved" || requestedStatus === "production_ready") {
      manifest.approvedAt = manifest.approvedAt ?? now;
    }
    if (requestedStatus === "archived") {
      manifest.archivedAt = now;
      manifest.archivedReason = patch.archivedReason ?? manifest.archivedReason;
    } else {
      manifest.archivedAt = null;
      manifest.archivedReason = "";
    }
  } else if (patch.archivedReason !== undefined) {
    manifest.archivedReason = patch.archivedReason;
  }

  manifest.updatedAt = now;
  await saveGenerationManifest(manifest);
  await upsertIndexEntry(manifest);
  return manifest;
}

export async function setGenerationFavorite(id: string, favorite: boolean): Promise<ContentCreatorGenerationManifest> {
  return updateGenerationCurator(id, { favorite });
}

export type ListGenerationsOptions = {
  q?: string;
  eraSlug?: string;
  creativeDirection?: string;
  favoriteOnly?: boolean;
  rating?: number;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  view?: string;
  status?: GenerationStatus;
  includeArchived?: boolean;
  exported?: boolean;
  variation?: "all" | "roots" | "variations";
  templateOnly?: boolean;
  collection?: string;
  sort?: string;
  variationBatchId?: string;
  limit?: number;
  offset?: number;
};

export async function listGenerations(
  opts: ListGenerationsOptions = {},
): Promise<ContentCreatorGenerationIndexEntry[]> {
  let items = (await loadLibraryIndex()).generations;

  if (opts.view && opts.view !== "all") {
    if (opts.view === "favorites") items = items.filter((g) => g.favorite);
    if (opts.view === "rated") items = items.filter((g) => g.rating != null);
    if (opts.view === "exported") items = items.filter((g) => g.hasExport);
    if (opts.view === "variations") items = items.filter((g) => Boolean(g.parentGenerationId || g.variationBatchId));
    if (opts.view === "templates") items = items.filter((g) => g.template.isTemplate);
    if (opts.view === "approved") items = items.filter((g) => g.status === "approved" || g.status === "production_ready");
    if (opts.view === "production_ready") items = items.filter((g) => g.status === "production_ready");
    if (opts.view === "archived") items = items.filter((g) => g.status === "archived");
    if (opts.view === "inbox") items = items.filter((g) => g.status === "review");
  }
  if (!opts.includeArchived && opts.view !== "archived") items = items.filter((g) => g.status !== "archived");
  if (opts.status) items = items.filter((g) => g.status === opts.status);
  if (opts.favoriteOnly) items = items.filter((g) => g.favorite);
  if (opts.eraSlug) items = items.filter((g) => g.eraSlug === opts.eraSlug);
  if (opts.creativeDirection) items = items.filter((g) => g.creativeDirection === opts.creativeDirection);
  if (opts.rating) items = items.filter((g) => (g.rating ?? 0) >= opts.rating!);
  if (opts.exported !== undefined) items = items.filter((g) => g.hasExport === opts.exported);
  if (opts.variation === "roots") items = items.filter((g) => !g.parentGenerationId);
  if (opts.variation === "variations") items = items.filter((g) => Boolean(g.parentGenerationId));
  if (opts.templateOnly) items = items.filter((g) => g.template.isTemplate);
  if (opts.collection) items = items.filter((g) => g.collections.includes(opts.collection!));

  if (opts.tags?.length) {
    items = items.filter((g) => opts.tags!.every((t) => g.tags.includes(t.toLowerCase())));
  }

  if (opts.dateFrom) {
    const from = opts.dateFrom;
    items = items.filter((g) => g.timestamp >= from);
  }
  if (opts.dateTo) {
    const to = opts.dateTo;
    items = items.filter((g) => g.timestamp.slice(0, 10) <= to);
  }

  if (opts.variationBatchId) {
    items = items.filter((g) => g.variationBatchId === opts.variationBatchId);
  }

  const q = opts.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((g) => {
      const dir = CREATIVE_DIRECTIONS[g.creativeDirection]?.label ?? g.creativeDirection;
      const haystack = [
        g.event,
        g.venue,
        g.eraName,
        dir,
        g.notes,
        ...g.collections,
        g.template.templateName,
        g.template.templateNotes,
        ...g.tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (opts.sort === "rating") {
    items = [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.updatedAt.localeCompare(a.updatedAt));
  } else if (opts.sort === "updated") {
    items = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } else if (opts.sort === "era") {
    items = [...items].sort((a, b) => a.eraName.localeCompare(b.eraName) || b.timestamp.localeCompare(a.timestamp));
  } else if (opts.sort === "event") {
    items = [...items].sort((a, b) => a.event.localeCompare(b.event) || b.timestamp.localeCompare(a.timestamp));
  } else if (opts.sort === "exported") {
    items = [...items].sort((a, b) =>
      (b.production.exportedAt ?? "").localeCompare(a.production.exportedAt ?? "") || b.timestamp.localeCompare(a.timestamp),
    );
  }

  const offset = Math.max(0, opts.offset ?? 0);
  const limit = opts.limit ?? 300;
  return items.slice(offset, offset + limit);
}

export async function computeLibraryStats(): Promise<LibraryStats> {
  const items = (await loadLibraryIndex()).generations;
  const byEra: Record<string, number> = {};
  const byCreativeDirection: Record<string, number> = {};
  const byCollection: Record<string, number> = {};
  const byStatus: Record<GenerationStatus, number> = {
    review: 0,
    approved: 0,
    production_ready: 0,
    archived: 0,
  };

  for (const g of items) {
    byEra[g.eraName] = (byEra[g.eraName] ?? 0) + 1;
    const dir = CREATIVE_DIRECTIONS[g.creativeDirection]?.label ?? g.creativeDirection;
    byCreativeDirection[dir] = (byCreativeDirection[dir] ?? 0) + 1;
    byStatus[g.status] += 1;
    for (const collection of g.collections) {
      byCollection[collection] = (byCollection[collection] ?? 0) + 1;
    }
  }

  return {
    total: items.length,
    favorites: items.filter((g) => g.favorite).length,
    exports: items.filter((g) => g.hasExport).length,
    archived: byStatus.archived,
    approved: byStatus.approved + byStatus.production_ready,
    productionReady: byStatus.production_ready,
    templates: items.filter((g) => g.template.isTemplate).length,
    byStatus,
    byCollection,
    byEra,
    byCreativeDirection,
  };
}

/** Backfill library from existing vnext runs not yet indexed. */
export async function backfillLibraryFromVNext(
  resolveProfile: (slug: string) => RvbrProfile | undefined,
): Promise<number> {
  const vnextDir = creativeLabVNextDir();
  if (!existsSync(vnextDir)) return 0;

  const index = await loadLibraryIndex();
  const known = new Set(index.generations.map((g) => g.id));
  let added = 0;

  const runDirs = await readdir(vnextDir, { withFileTypes: true });
  for (const ent of runDirs) {
    if (!ent.isDirectory() || known.has(ent.name)) continue;
    const manifestPath = join(vnextDir, ent.name, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as VNextManifest;
      const profile = resolveProfile(manifest.eraSlug);
      if (!profile) continue;
      await syncGenerationFromVNext(manifest, profile);
      added++;
    } catch {
      // skip corrupt runs
    }
  }

  return added;
}

export function generationSummaryRow(m: ContentCreatorGenerationManifest): string {
  const exportPath = m.exportZipPath ?? m.exportedCredentialPath ?? "—";
  return [
    m.sourceArtworkPath,
    m.timestamp,
    m.eraName,
    CREATIVE_DIRECTIONS[m.creativeDirection]?.label ?? m.creativeDirection,
    m.frontImagePath,
    m.backImagePath,
    exportPath,
  ].join("\t");
}
