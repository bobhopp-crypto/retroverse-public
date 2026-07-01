import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { findLatestPassArtworkBySlug, resolveGenerationArtwork } from "./content-creator-artwork";
import { passTypeSlugFromLabel } from "./placeholder-artwork.server";
import type {
  GeneratedPass,
  PassBatch,
  PassBatchesFile,
  PassLibraryFile,
  PassLibraryFilter,
  PassRegistration,
  PassTemplate,
  PassTemplatesFile,
} from "./types";

function passStudioDir(): string {
  return join(opsStateDir(), "event-studio", "pass-studio");
}

function templatesPath(): string {
  return join(passStudioDir(), "templates.json");
}

function batchesPath(): string {
  return join(passStudioDir(), "batches.json");
}

function libraryPath(): string {
  return join(passStudioDir(), "library.json");
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(path: string, value: T): Promise<void> {
  await mkdir(passStudioDir(), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

// ── Templates ──────────────────────────────────────────────
// templates.json holds metadata only (name, colors, generationId, etc).
// Artwork itself always lives in Content Creator — the shared BobOS library —
// and is resolved fresh from there every time templates are loaded.

async function loadRawTemplates(): Promise<PassTemplate[]> {
  const file = await readJsonFile<PassTemplatesFile>(templatesPath(), {
    version: 1,
    templates: [],
  });
  return file.templates;
}

/** Custom designs (no generationId) keep whatever URL was pasted in; library designs always re-resolve. */
async function hydrateTemplateArtwork(template: PassTemplate): Promise<PassTemplate> {
  if (!template.generationId) return template;
  const artwork = await resolveGenerationArtwork(template.generationId);
  return {
    ...template,
    frontArtworkUrl: artwork?.frontArtworkUrl ?? null,
    backArtworkUrl: artwork?.backArtworkUrl ?? null,
  };
}

/** Strip resolved artwork before persisting so templates.json never stores a copy of library URLs. */
function stripDerivedArtwork(template: PassTemplate): PassTemplate {
  if (!template.generationId) return template;
  return { ...template, frontArtworkUrl: null, backArtworkUrl: null };
}

function isInlineArtwork(url: string | null): boolean {
  return typeof url === "string" && url.startsWith("data:");
}

/**
 * One-time cleanup for templates.json rows saved before Pass Studio was reconnected
 * to Content Creator: those rows carry inline placeholder SVGs and no generationId.
 * Strip the inline artwork and re-match against the shared library so templates.json
 * goes back to metadata-only and real artwork (or the "Generate Artwork" prompt) takes over.
 */
async function migrateLegacyPlaceholderArtwork(
  raw: PassTemplate[],
): Promise<{ templates: PassTemplate[]; changed: boolean }> {
  const needsMigration = raw.some(
    (t) => !t.generationId && (isInlineArtwork(t.frontArtworkUrl) || isInlineArtwork(t.backArtworkUrl)),
  );
  if (!needsMigration) return { templates: raw, changed: false };

  const artworkBySlug = await findLatestPassArtworkBySlug();
  const migrated = raw.map((t) => {
    if (t.generationId || (!isInlineArtwork(t.frontArtworkUrl) && !isInlineArtwork(t.backArtworkUrl))) return t;
    const label = t.name.replace(/\s+Pass$/i, "").trim() || t.name;
    const slug = passTypeSlugFromLabel(label);
    const match = artworkBySlug[slug];
    return { ...t, generationId: match?.generationId ?? null, frontArtworkUrl: null, backArtworkUrl: null };
  });
  return { templates: migrated, changed: true };
}

export async function loadPassTemplates(): Promise<PassTemplate[]> {
  const raw = await loadRawTemplates();
  const { templates: migrated, changed } = await migrateLegacyPlaceholderArtwork(raw);
  if (changed) {
    await writeJsonFile<PassTemplatesFile>(templatesPath(), { version: 1, templates: migrated });
  }
  return Promise.all(migrated.map(hydrateTemplateArtwork));
}

export async function savePassTemplate(template: PassTemplate): Promise<void> {
  const raw = await loadRawTemplates();
  const stored = stripDerivedArtwork(template);
  const next = [stored, ...raw.filter((t) => t.id !== template.id)];
  await writeJsonFile<PassTemplatesFile>(templatesPath(), { version: 1, templates: next });
}

// ── Batches ────────────────────────────────────────────────

export async function loadPassBatches(): Promise<PassBatch[]> {
  const file = await readJsonFile<PassBatchesFile>(batchesPath(), {
    version: 1,
    batches: [],
  });
  return file.batches;
}

export async function savePassBatch(batch: PassBatch): Promise<void> {
  const batches = await loadPassBatches();
  const next = [batch, ...batches.filter((b) => b.id !== batch.id)];
  await writeJsonFile<PassBatchesFile>(batchesPath(), { version: 1, batches: next });
}

// ── Library (generated passes — never overwritten) ────────

export async function loadPassLibrary(): Promise<GeneratedPass[]> {
  const file = await readJsonFile<PassLibraryFile>(libraryPath(), {
    version: 1,
    passes: [],
  });
  return file.passes;
}

/** Appends new passes — existing library entries are never overwritten. */
export async function appendPassesToLibrary(passes: GeneratedPass[]): Promise<void> {
  const existing = await loadPassLibrary();
  const existingIds = new Set(existing.map((p) => p.id));
  const additions = passes.filter((p) => !existingIds.has(p.id));
  const next = [...existing, ...additions];
  await writeJsonFile<PassLibraryFile>(libraryPath(), { version: 1, passes: next });
}

/** Serials are sequential across the whole library — never restart at 1 per batch. */
export async function nextSerialStart(): Promise<number> {
  const existing = await loadPassLibrary();
  if (existing.length === 0) return 1;
  return Math.max(...existing.map((p) => p.serialNumber)) + 1;
}

/** Serial alone resolves a pass — most recent match wins if duplicates ever exist. */
export async function findPassBySerial(serial: string): Promise<GeneratedPass | null> {
  const all = await loadPassLibrary();
  const matches = all.filter((p) => p.serial === serial);
  if (matches.length === 0) return null;
  return matches.reduce((latest, p) => (p.createdAt > latest.createdAt ? p : latest));
}

/** Idempotent — already-registered passes are returned unchanged, never overwritten. */
export async function registerPassBySerial(
  serial: string,
  registration: PassRegistration,
): Promise<GeneratedPass | null> {
  const file = await readJsonFile<PassLibraryFile>(libraryPath(), { version: 1, passes: [] });
  const index = file.passes.findIndex((p) => p.serial === serial);
  if (index === -1) return null;

  const existing = file.passes[index]!;
  if (existing.status === "registered" && existing.registration) {
    return existing;
  }

  const updated: GeneratedPass = { ...existing, status: "registered", registration };
  const nextPasses = [...file.passes];
  nextPasses[index] = updated;
  await writeJsonFile<PassLibraryFile>(libraryPath(), { version: 1, passes: nextPasses });
  return updated;
}

export async function filterPassLibrary(
  passes: GeneratedPass[],
  filter: PassLibraryFilter,
): Promise<GeneratedPass[]> {
  const search = filter.search?.trim().toLowerCase();
  return passes.filter((pass) => {
    if (filter.eventId && pass.eventId !== filter.eventId) return false;
    if (filter.templateId && pass.templateId !== filter.templateId) return false;
    if (filter.passType && pass.passType !== filter.passType) return false;
    if (filter.date && pass.date !== filter.date) return false;
    if (filter.status && pass.status !== filter.status) return false;
    if (search && !pass.serial.toLowerCase().includes(search)) return false;
    return true;
  });
}
