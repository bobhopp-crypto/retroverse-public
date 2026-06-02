import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

import { yearWorkspaceDir } from "./paths";

import type {
  CategoryProductionFile,
  ProductionItem,
  ProductionWorkflowAction,
  YearWorkspaceProductionState,
  YearWorkspaceProductionSummary,
} from "./production-types";
import {
  curatedPoolStats,
  pickNextCuratedRecommendations,
} from "./recommendations/generator";
import { hasCuratedProvider } from "./recommendations/providers";
import { curatedToProductionItem } from "./recommendations/to-production-item";
import { RECOMMENDATIONS_BATCH_SIZE } from "./recommendations/types";
import { sectionCounts } from "./production-utils";
import type { YearWorkspaceCategoryId } from "./types";
import { YEAR_WORKSPACE_CATEGORIES } from "./types";

const CATEGORY_FILES: Record<YearWorkspaceCategoryId, string> = {
  songs: "songs.json",
  albums: "albums.json",
  commercials: "commercials.json",
  tv_clips: "tv_clips.json",
  bumpers: "bumpers.json",
  promos: "promos.json",
  events: "events.json",
};

export const PRODUCTION_CATEGORIES = YEAR_WORKSPACE_CATEGORIES.map((c) => c.id);

function yearProductionDir(year: number): string {
  return yearWorkspaceDir(year);
}

function categoryFilePath(year: number, category: YearWorkspaceCategoryId): string {
  return join(yearProductionDir(year), CATEGORY_FILES[category]);
}

function emptyCategoryFile(
  year: number,
  category: YearWorkspaceCategoryId,
): CategoryProductionFile {
  return {
    version: 1,
    year,
    category,
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeItem(raw: unknown): ProductionItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  const title = typeof o.title === "string" ? o.title : null;
  if (!id || !title) return null;

  const section = o.section;
  const validSection =
    section === "wanted" ||
    section === "queued" ||
    section === "acquired" ||
    section === "approved"
      ? section
      : "wanted";

  const action = o.workflowAction;
  const workflowAction =
    action === "acquire" || action === "skip" || action === "approve"
      ? action
      : null;

  const now = new Date().toISOString();
  const status =
    o.status === "wanted" ||
    o.status === "queued" ||
    o.status === "acquired" ||
    o.status === "approved"
      ? o.status
      : validSection;

  const kindRaw = o.kind;
  const kind =
    kindRaw === "asset" || kindRaw === "queue_entry" ? kindRaw : "recommendation";

  const sourceTypeRaw = o.sourceType;
  const sourceType =
    sourceTypeRaw === "youtube" || sourceTypeRaw === "internet_archive"
      ? sourceTypeRaw
      : null;

  const priorityRaw = o.priority;
  const priority =
    typeof priorityRaw === "number" && priorityRaw >= 1 && priorityRaw <= 5
      ? priorityRaw
      : null;

  return {
    id,
    title,
    subtitle: typeof o.subtitle === "string" ? o.subtitle : null,
    description: typeof o.description === "string" ? o.description : null,
    year: typeof o.year === "number" ? o.year : null,
    sourceCategory:
      typeof o.sourceCategory === "string" ? o.sourceCategory : null,
    priority,
    status,
    kind,
    section: validSection,
    workflowAction,
    skipped: o.skipped === true,
    filename: typeof o.filename === "string" ? o.filename : null,
    dateAdded: typeof o.dateAdded === "string" ? o.dateAdded : null,
    recommendationId:
      typeof o.recommendationId === "string" ? o.recommendationId : null,
    selectedSourceId:
      typeof o.selectedSourceId === "string" ? o.selectedSourceId : null,
    sourceUrl: typeof o.sourceUrl === "string" ? o.sourceUrl : null,
    sourceType,
    attachedFilename:
      typeof o.attachedFilename === "string" ? o.attachedFilename : null,
    attachedFilepath:
      typeof o.attachedFilepath === "string" ? o.attachedFilepath : null,
    attachedAt: typeof o.attachedAt === "string" ? o.attachedAt : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : now,
  };
}

export async function loadCategoryProduction(
  year: number,
  category: YearWorkspaceCategoryId,
): Promise<CategoryProductionFile> {
  try {
    const raw = await readFile(categoryFilePath(year, category), "utf8");
    const parsed = JSON.parse(raw) as CategoryProductionFile;
    if (parsed?.version !== 1 || parsed.category !== category) {
      return emptyCategoryFile(year, category);
    }
    const items: ProductionItem[] = [];
    for (const entry of parsed.items ?? []) {
      const item = normalizeItem(entry);
      if (item) items.push(item);
    }
    return {
      version: 1,
      year,
      category,
      items,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyCategoryFile(year, category);
  }
}

export async function persistCategoryProduction(
  file: CategoryProductionFile,
): Promise<CategoryProductionFile> {
  await persistCategory(file);
  return file;
}

async function persistCategory(file: CategoryProductionFile): Promise<void> {
  const dir = yearProductionDir(file.year);
  await mkdir(dir, { recursive: true });
  file.updatedAt = new Date().toISOString();
  await writeFile(
    categoryFilePath(file.year, file.category),
    `${JSON.stringify(file, null, 2)}\n`,
    "utf8",
  );
}

export async function loadYearProductionState(
  year: number,
): Promise<YearWorkspaceProductionState> {
  const entries = await Promise.all(
    PRODUCTION_CATEGORIES.map(async (category) => [
      category,
      await loadCategoryProduction(year, category),
    ] as const),
  );
  return Object.fromEntries(entries) as YearWorkspaceProductionState;
}

export { sectionCounts, itemsInSection } from "./production-utils";

export type AppendRecommendationsResult = {
  file: CategoryProductionFile;
  added: number;
  remaining: number;
  poolTotal: number;
};

export async function appendCategoryRecommendations(
  year: number,
  category: YearWorkspaceCategoryId,
  limit = RECOMMENDATIONS_BATCH_SIZE,
): Promise<AppendRecommendationsResult> {
  if (category === "songs") {
    throw new Error("Recommendations are not generated for songs");
  }
  if (!hasCuratedProvider(year)) {
    throw new Error(`No curated recommendations for year ${year}`);
  }

  const file = await loadCategoryProduction(year, category);
  const existingIds = new Set(file.items.map((i) => i.id));
  const batch = pickNextCuratedRecommendations(year, category, existingIds, limit);
  const now = new Date().toISOString();

  for (const rec of batch) {
    file.items.push(curatedToProductionItem(rec, now));
    existingIds.add(rec.id);
  }

  await persistCategory(file);
  const stats = curatedPoolStats(year, category, existingIds);
  return {
    file,
    added: batch.length,
    remaining: stats.remaining,
    poolTotal: stats.total,
  };
}

/** @deprecated alias — first batch */
export async function generateCategoryRecommendations(
  year: number,
  category: YearWorkspaceCategoryId,
): Promise<CategoryProductionFile> {
  const result = await appendCategoryRecommendations(year, category);
  return result.file;
}

export async function applyProductionItemAction(
  year: number,
  category: YearWorkspaceCategoryId,
  itemId: string,
  action: ProductionWorkflowAction,
): Promise<CategoryProductionFile> {
  const file = await loadCategoryProduction(year, category);
  const item = file.items.find((i) => i.id === itemId);
  if (!item) throw new Error("Item not found");

  const now = new Date().toISOString();
  item.workflowAction = action;
  item.updatedAt = now;

  if (action === "skip") {
    item.skipped = true;
  } else if (action === "acquire") {
    item.section = "acquired";
    item.status = "acquired";
    item.skipped = false;
    if (item.kind === "queue_entry" && item.recommendationId) {
      const rec = file.items.find((i) => i.id === item.recommendationId);
      if (rec && rec.kind === "recommendation") {
        rec.section = "acquired";
        rec.status = "acquired";
        rec.updatedAt = now;
      }
    }
  } else if (action === "approve") {
    item.section = "approved";
    item.status = "approved";
    item.skipped = false;
    if (item.kind === "queue_entry" && item.recommendationId) {
      const rec = file.items.find((i) => i.id === item.recommendationId);
      if (rec && rec.kind === "recommendation") {
        rec.section = "approved";
        rec.status = "approved";
        rec.updatedAt = now;
      }
    }
  }

  await persistCategory(file);
  return file;
}

export async function addProductionAssets(
  year: number,
  category: YearWorkspaceCategoryId,
  filenames: string[],
  queueItemId?: string,
): Promise<CategoryProductionFile> {
  if (queueItemId && filenames.length > 0) {
    const { attachAssetToQueueItem } = await import("./acquisition-queue");
    let file = await loadCategoryProduction(year, category);
    for (const name of filenames) {
      file = await attachAssetToQueueItem(year, category, queueItemId, name);
    }
    return file;
  }

  const file = await loadCategoryProduction(year, category);
  const now = new Date().toISOString();

  for (const filename of filenames) {
    const trimmed = filename.trim();
    if (!trimmed) continue;
    const id = `asset-${randomUUID()}`;
    file.items.push({
      id,
      title: trimmed,
      subtitle: null,
      description: null,
      year: null,
      sourceCategory: category,
      priority: null,
      status: "wanted",
      kind: "asset",
      section: "wanted",
      workflowAction: null,
      skipped: false,
      filename: trimmed,
      dateAdded: now,
      recommendationId: null,
      selectedSourceId: null,
      sourceUrl: null,
      sourceType: null,
      attachedFilename: null,
      attachedFilepath: null,
      attachedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  await persistCategory(file);
  return file;
}

export function buildProductionSummary(
  production: YearWorkspaceProductionState,
  songsFromCompletion?: CategorySectionCounts,
): YearWorkspaceProductionSummary {
  const summary = {} as YearWorkspaceProductionSummary;
  for (const category of PRODUCTION_CATEGORIES) {
    if (category === "songs" && songsFromCompletion) {
      summary.songs = songsFromCompletion;
    } else {
      summary[category] = sectionCounts(production[category]);
    }
  }
  return summary;
}
