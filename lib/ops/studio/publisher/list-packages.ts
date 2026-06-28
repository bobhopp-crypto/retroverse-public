import "server-only";

import { access } from "fs/promises";
import { readdir } from "fs/promises";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { directorRenderSpecPath, researchDepartmentRoot } from "@/lib/studio/package";
import { normalizeRvtr } from "@/lib/studio/status";
import { ensureRowIds } from "@/lib/ops/studio/model-identity";

import { evaluatePublisherPackage } from "./evaluate";
import { getPublisherStoreCached } from "@/lib/ops/studio/studio-cached-loaders";
import {
  displayPublicationClass,
  getPublisherRecord,
  upsertPublisherRecord,
} from "./store";
import type { PublisherCard, PublisherDashboardMetrics, PublisherRecord } from "./types";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function listDirectorReadyRvtrs(): Promise<string[]> {
  const root = researchDepartmentRoot();
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const rvtrs: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^RVTR\d{6}$/i.test(entry.name)) continue;
      const rvtr = entry.name.toUpperCase();
      if (await fileExists(directorRenderSpecPath(rvtr))) {
        rvtrs.push(rvtr);
      }
    }
    return rvtrs.sort();
  } catch {
    return [];
  }
}

/** Ensure every Director-complete package has a publisher evaluation record. */
export async function syncPublisherQueue(): Promise<PublisherRecord[]> {
  const rvtrs = await listDirectorReadyRvtrs();
  const store = await getPublisherStoreCached();
  const records: PublisherRecord[] = [];

  for (const rvtr of rvtrs) {
    const existing = store.records.find((r) => r.rvtr === rvtr) ?? null;
    if (existing?.evaluation) {
      records.push(existing);
      continue;
    }
    const evaluated = await evaluatePublisherPackage(rvtr);
    if (evaluated) records.push(evaluated);
  }

  return records;
}

export async function ensurePublisherEvaluation(rvtr: string): Promise<PublisherRecord | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;

  const existing = await getPublisherRecord(normalized);
  if (existing?.evaluation) return existing;

  return evaluatePublisherPackage(normalized);
}

function recordToCard(record: PublisherRecord): PublisherCard {
  const publicationClass = displayPublicationClass(record);
  const approved =
    publicationClass === "ready" ||
    publicationClass === "extended" ||
    publicationClass === "showcase";

  return {
    rvtr: record.rvtr,
    artist: record.artist,
    title: record.title,
    coverUrl: record.coverUrl,
    publicationClass,
    qualityScore: record.evaluation?.qualityScore ?? 0,
    why: record.approvedClass
      ? `Approved as ${record.approvedClass.replace("_", " ")}`
      : record.evaluation?.why ?? "Awaiting evaluation",
    approved: Boolean(record.approvedClass),
    approvedAt: record.approvedAt,
    awaitingReview:
      !record.approvedClass &&
      publicationClass !== "blocked" &&
      publicationClass !== "needs_coaching",
  };
}

function buildDashboardFromRecords(records: PublisherRecord[]): {
  metrics: PublisherDashboardMetrics;
  columns: Record<
    "ready" | "extended" | "showcase" | "needs_coaching" | "blocked",
    PublisherCard[]
  >;
  records: PublisherRecord[];
} {
  const cards = records.map(recordToCard);

  const columns = {
    ready: cards.filter((c) => c.publicationClass === "ready"),
    extended: cards.filter((c) => c.publicationClass === "extended"),
    showcase: cards.filter((c) => c.publicationClass === "showcase"),
    needs_coaching: cards.filter((c) => c.publicationClass === "needs_coaching"),
    blocked: cards.filter((c) => c.publicationClass === "blocked"),
  };

  const approved = records.filter((r) => r.approvedClass);
  const publishTimes = approved
    .filter((r) => r.firstEvaluatedAt && r.publishedAt)
    .map((r) => {
      const start = new Date(r.firstEvaluatedAt!).getTime();
      const end = new Date(r.publishedAt!).getTime();
      return (end - start) / 3600000;
    });

  const rejectionCounts = new Map<string, number>();
  for (const record of records) {
    for (const decision of record.decisions) {
      if (
        decision.action === "return_editor" ||
        decision.action === "return_director"
      ) {
        const key = decision.reason.slice(0, 80);
        rejectionCounts.set(key, (rejectionCounts.get(key) ?? 0) + 1);
      }
    }
    for (const issue of record.evaluation?.coachingIssues ?? []) {
      rejectionCounts.set(issue.slice(0, 80), (rejectionCounts.get(issue) ?? 0) + 1);
    }
  }

  const topRejectionReasons = ensureRowIds(
    "publisher-rejection",
    [...rejectionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count })),
    (row) => row.reason,
  );

  const qualityScores = records
    .map((r) => r.evaluation?.qualityScore ?? 0)
    .filter((s) => s > 0);

  const decisionCount = records.reduce((n, r) => n + r.decisions.length, 0);
  const approvalDecisions = records.reduce(
    (n, r) =>
      n +
      r.decisions.filter(
        (d) =>
          d.action === "approve" ||
          d.action === "approve_extended" ||
          d.action === "approve_showcase",
      ).length,
    0,
  );

  const metrics: PublisherDashboardMetrics = {
    ready: columns.ready.length,
    extended: columns.extended.length,
    showcase: columns.showcase.length,
    needsCoaching: columns.needs_coaching.length,
    blocked: columns.blocked.length,
    averageQualityScore:
      qualityScores.length > 0
        ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
        : 0,
    averagePublishTimeHours:
      publishTimes.length > 0
        ? Math.round((publishTimes.reduce((a, b) => a + b, 0) / publishTimes.length) * 10) / 10
        : null,
    approvalRate:
      decisionCount > 0 ? Math.round((approvalDecisions / decisionCount) * 100) : 0,
    topRejectionReasons,
  };

  return { metrics, columns, records };
}

/** Read-only dashboard — never runs publisher evaluation on page load. */
export async function buildPublisherDashboardReadOnly() {
  const store = await getPublisherStoreCached();
  return buildDashboardFromRecords(store.records.filter((r) => r.evaluation));
}

/** @deprecated Side-effectful queue sync — use buildPublisherDashboardReadOnly for page loads. */
export async function buildPublisherDashboard(): Promise<{
  metrics: PublisherDashboardMetrics;
  columns: Record<
    "ready" | "extended" | "showcase" | "needs_coaching" | "blocked",
    PublisherCard[]
  >;
  records: PublisherRecord[];
}> {
  const records = await syncPublisherQueue();
  return buildDashboardFromRecords(records);
}

/** @deprecated Unused — review page loads data directly. */
export async function buildPublisherReviewPayload(rvtr: string) {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;

  const [record, director, collector] = await Promise.all([
    ensurePublisherEvaluation(normalized),
    loadDirectorPackage(normalized),
    loadCollectorPackage(normalized),
  ]);

  if (!record || !director) return null;

  return {
    record,
    director,
    collector,
  };
}

export async function listPackagesNeedingPublisherReview(limit = 12): Promise<PublisherCard[]> {
  const { columns } = await buildPublisherDashboardReadOnly();
  const attention = [
    ...columns.needs_coaching.filter((c) => !c.approved),
    ...columns.ready.filter((c) => c.awaitingReview),
    ...columns.extended.filter((c) => c.awaitingReview),
    ...columns.blocked,
  ];
  return attention.slice(0, limit);
}
