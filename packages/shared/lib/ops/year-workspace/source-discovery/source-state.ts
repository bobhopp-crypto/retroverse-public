import { mkdir, readFile, writeFile } from "fs/promises";

import { categorySourcesPath, yearSourcesDir } from "../paths";
import type { YearWorkspaceCategoryId } from "../types";
import type {
  CategorySourcesFile,
  SourceCandidate,
  SourceCandidateStatus,
  SourceDiscoveryDrawerPayload,
} from "./types";
import { buildSourceCandidates } from "./generate-candidates";

function emptySourcesFile(
  year: number,
  category: YearWorkspaceCategoryId,
): CategorySourcesFile {
  return {
    version: 1,
    year,
    category,
    byRecommendation: {},
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCandidate(raw: unknown): SourceCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  const recommendationId =
    typeof o.recommendationId === "string" ? o.recommendationId : null;
  const title = typeof o.title === "string" ? o.title : null;
  const sourceType = o.sourceType;
  const query = typeof o.query === "string" ? o.query : null;
  const url = typeof o.url === "string" ? o.url : null;
  if (!id || !recommendationId || !title || !query || !url) return null;
  if (sourceType !== "youtube" && sourceType !== "internet_archive") return null;

  const status = o.status;
  const validStatus: SourceCandidateStatus =
    status === "reviewed" ||
    status === "selected" ||
    status === "rejected" ||
    status === "pending"
      ? status
      : "pending";

  const now = new Date().toISOString();
  return {
    id,
    recommendationId,
    title,
    sourceType,
    query,
    url,
    status: validStatus,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : now,
  };
}

export async function loadCategorySources(
  year: number,
  category: YearWorkspaceCategoryId,
): Promise<CategorySourcesFile> {
  try {
    const raw = await readFile(categorySourcesPath(year, category), "utf8");
    const parsed = JSON.parse(raw) as CategorySourcesFile;
    if (parsed?.version !== 1 || parsed.category !== category) {
      return emptySourcesFile(year, category);
    }
    const byRecommendation: Record<string, SourceCandidate[]> = {};
    for (const [recId, list] of Object.entries(parsed.byRecommendation ?? {})) {
      if (!Array.isArray(list)) continue;
      const candidates: SourceCandidate[] = [];
      for (const entry of list) {
        const c = normalizeCandidate(entry);
        if (c) candidates.push(c);
      }
      if (candidates.length > 0) byRecommendation[recId] = candidates;
    }
    return {
      version: 1,
      year,
      category,
      byRecommendation,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptySourcesFile(year, category);
  }
}

async function persistSources(file: CategorySourcesFile): Promise<void> {
  await mkdir(yearSourcesDir(file.year), { recursive: true });
  file.updatedAt = new Date().toISOString();
  await writeFile(
    categorySourcesPath(file.year, file.category),
    `${JSON.stringify(file, null, 2)}\n`,
    "utf8",
  );
}

export async function loadAllCategorySources(
  year: number,
  categories: YearWorkspaceCategoryId[],
): Promise<Record<YearWorkspaceCategoryId, CategorySourcesFile>> {
  const entries = await Promise.all(
    categories.map(async (category) => [
      category,
      await loadCategorySources(year, category),
    ] as const),
  );
  return Object.fromEntries(entries) as Record<
    YearWorkspaceCategoryId,
    CategorySourcesFile
  >;
}

export function drawerPayloadFromCandidates(
  recommendationId: string,
  recommendationTitle: string,
  candidates: SourceCandidate[],
): SourceDiscoveryDrawerPayload {
  return {
    recommendationId,
    recommendationTitle,
    youtube: candidates.filter((c) => c.sourceType === "youtube"),
    internetArchive: candidates.filter((c) => c.sourceType === "internet_archive"),
  };
}

/** Generate (or refresh pending) search candidates for a recommendation. */
export async function findSourcesForRecommendation(
  year: number,
  category: YearWorkspaceCategoryId,
  recommendationId: string,
  recommendationTitle: string,
  refresh = false,
): Promise<SourceDiscoveryDrawerPayload> {
  const file = await loadCategorySources(year, category);
  const existing = file.byRecommendation[recommendationId] ?? [];

  if (!refresh && existing.length > 0) {
    return drawerPayloadFromCandidates(
      recommendationId,
      recommendationTitle,
      existing,
    );
  }

  const generated = buildSourceCandidates(year, recommendationId, recommendationTitle);
  const kept = refresh
    ? existing.filter((c) => c.status === "selected" || c.status === "rejected")
    : existing.filter((c) => c.status !== "pending");

  const mergedIds = new Set(kept.map((c) => c.id));
  const merged = [...kept];
  for (const c of generated) {
    if (mergedIds.has(c.id)) continue;
    const dup = merged.some(
      (x) => x.sourceType === c.sourceType && x.query === c.query,
    );
    if (dup) continue;
    merged.push(c);
    mergedIds.add(c.id);
  }

  file.byRecommendation[recommendationId] = merged;
  await persistSources(file);
  return drawerPayloadFromCandidates(
    recommendationId,
    recommendationTitle,
    merged,
  );
}

export async function updateSourceCandidateStatus(
  year: number,
  category: YearWorkspaceCategoryId,
  recommendationId: string,
  sourceId: string,
  status: SourceCandidateStatus,
): Promise<SourceCandidate> {
  const file = await loadCategorySources(year, category);
  const list = file.byRecommendation[recommendationId];
  if (!list) throw new Error("Recommendation sources not found");

  const candidate = list.find((c) => c.id === sourceId);
  if (!candidate) throw new Error("Source candidate not found");

  const now = new Date().toISOString();
  candidate.status = status;
  candidate.updatedAt = now;
  if (status === "selected" || status === "rejected") {
    candidate.status = status;
  } else if (status === "reviewed") {
    candidate.status = "reviewed";
  }

  await persistSources(file);
  return candidate;
}
