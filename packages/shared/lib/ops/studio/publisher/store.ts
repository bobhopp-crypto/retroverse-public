import "server-only";

import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

import { randomUUID } from "crypto";

import { readJsonFileSafe } from "@/lib/ops/studio/safe-io";

import { normalizePublisherRecord, normalizePublisherStoreRecords } from "./normalize-record";

import { normalizeRvtr } from "@/lib/studio/status";

import { publisherStorePath } from "./paths";
import {
  PUBLISHER_STORE_VERSION,
  type PublicationClass,
  type PublisherDecision,
  type PublisherDecisionAction,
  type PublisherEvaluation,
  type PublisherRecord,
  type PublisherStore,
} from "./types";

function emptyStore(): PublisherStore {
  return {
    version: PUBLISHER_STORE_VERSION,
    updatedAt: new Date().toISOString(),
    records: [],
  };
}

export async function loadPublisherStore(): Promise<PublisherStore> {
  const parsed = await readJsonFileSafe<Partial<PublisherStore> | null>(
    publisherStorePath(),
    null,
    4000,
  );
  if (!parsed) return emptyStore();
  return {
    ...emptyStore(),
    ...parsed,
    records: normalizePublisherStoreRecords(
      Array.isArray(parsed.records) ? parsed.records : [],
    ),
  };
}

export function publisherRecordsByRvtr(
  store: PublisherStore,
): Map<string, PublisherRecord> {
  return new Map(store.records.map((r) => [r.rvtr, r]));
}

async function savePublisherStore(store: PublisherStore): Promise<void> {
  const path = publisherStorePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export async function getPublisherRecord(
  rvtr: string,
  store?: PublisherStore,
): Promise<PublisherRecord | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;
  const resolved = store ?? (await loadPublisherStore());
  const record = resolved.records.find((r) => r.rvtr === normalized) ?? null;
  return record ? normalizePublisherRecord(record) : null;
}

export async function upsertPublisherRecord(record: PublisherRecord): Promise<PublisherRecord> {
  const store = await loadPublisherStore();
  const idx = store.records.findIndex((r) => r.rvtr === record.rvtr);
  if (idx >= 0) {
    store.records[idx] = record;
  } else {
    store.records.push(record);
  }
  await savePublisherStore(store);
  return record;
}

export async function savePublisherEvaluation(input: {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  evaluation: PublisherEvaluation;
}): Promise<PublisherRecord> {
  const normalized = normalizeRvtr(input.rvtr);
  if (!normalized) throw new Error("invalid_rvtr");

  const existing = await getPublisherRecord(normalized);
  const now = new Date().toISOString();

  const record: PublisherRecord = {
    rvtr: normalized,
    artist: input.artist,
    title: input.title,
    coverUrl: input.coverUrl,
    evaluation: input.evaluation,
    approvedClass: existing?.approvedClass ?? null,
    approvedAt: existing?.approvedAt ?? null,
    returnedTo: existing?.returnedTo ?? null,
    decisions: existing?.decisions ?? [],
    firstEvaluatedAt: existing?.firstEvaluatedAt ?? now,
    publishedAt: existing?.publishedAt ?? null,
    isGolden: existing?.isGolden ?? false,
    goldenPromotedAt: existing?.goldenPromotedAt ?? null,
  };

  // Clear approval if package was returned and re-evaluated worse
  if (
    existing?.returnedTo &&
    input.evaluation.publicationClass === "blocked"
  ) {
    record.approvedClass = null;
    record.approvedAt = null;
    record.publishedAt = null;
  }

  return upsertPublisherRecord(record);
}

function approvedClassForAction(action: PublisherDecisionAction): PublicationClass | null {
  switch (action) {
    case "approve":
      return "ready";
    case "approve_extended":
      return "extended";
    case "approve_showcase":
      return "showcase";
    case "return_editor":
    case "return_director":
      return "needs_coaching";
  }
}

export async function recordPublisherDecision(input: {
  rvtr: string;
  action: PublisherDecisionAction;
  reviewer: string;
  reason: string;
}): Promise<PublisherRecord> {
  const normalized = normalizeRvtr(input.rvtr);
  if (!normalized) throw new Error("invalid_rvtr");

  const existing = await getPublisherRecord(normalized);
  if (!existing?.evaluation) throw new Error("no_evaluation");

  const previousClass = existing.approvedClass ?? existing.evaluation.publicationClass;
  const now = new Date().toISOString();
  const nextClass = approvedClassForAction(input.action);

  const decision: PublisherDecision = {
    id: randomUUID(),
    action: input.action,
    publicationClass: nextClass ?? "needs_coaching",
    reviewer: input.reviewer.trim() || "operator",
    reason: input.reason.trim() || "No reason provided",
    previousClass,
    decidedAt: now,
  };

  const isApproval =
    input.action === "approve" ||
    input.action === "approve_extended" ||
    input.action === "approve_showcase";

  const record: PublisherRecord = {
    ...existing,
    decisions: [...existing.decisions, decision],
    approvedClass: isApproval ? nextClass : null,
    approvedAt: isApproval ? now : null,
    publishedAt: isApproval ? now : null,
    returnedTo:
      input.action === "return_editor"
        ? "editor"
        : input.action === "return_director"
          ? "director"
          : null,
  };

  return upsertPublisherRecord(record);
}

export function isPublisherApproved(record: PublisherRecord | null): boolean {
  if (!record?.approvedClass) return false;
  return (
    record.approvedClass === "ready" ||
    record.approvedClass === "extended" ||
    record.approvedClass === "showcase"
  );
}

export function displayPublicationClass(record: PublisherRecord): PublicationClass {
  if (record.approvedClass) return record.approvedClass;
  return record.evaluation?.publicationClass ?? "blocked";
}
