import { appendFile, mkdir, readFile } from "node:fs/promises";

import {
  promotionAuditLogPath,
  rvalAssignmentsLogPath,
  rv12AssetsLogPath,
  rv12OpsDir,
} from "@/lib/rv12/paths";

export type Rv12AssetRow = {
  rv12Id: string;
  contentHash: string;
  sourceType: "upload" | "url" | "discogs";
  sourceUrl: string | null;
  localPath: string;
  width: number | null;
  height: number | null;
  trustLevel: "provisional" | "verified" | "curated";
  placeholderVariant: string | null;
  curatorNotes: string | null;
  activeFlag: boolean;
  createdAt: string;
};

export type RvalAssignmentRow = {
  rval: string;
  albumId: number;
  rv12Id: string;
  assignmentType: "primary_cover";
  active: boolean;
  replacedAt: string | null;
  replacedByAssignmentId: string | null;
  assignmentId: string;
  priorCanonicalPath: string | null;
  canonicalPath: string;
  promotedBy: string;
  createdAt: string;
};

export type PromotionAuditRow = {
  action: "promote" | "rollback" | "create_asset";
  ok: boolean;
  rval: string;
  rv12Id: string | null;
  albumId: number | null;
  actor: string;
  message: string;
  priorCanonicalPath: string | null;
  newCanonicalPath: string | null;
  priorContentHash: string | null;
  newContentHash: string | null;
  backupPath: string | null;
  forceTrustedOverride?: boolean;
  forceReason?: string | null;
  ts: string;
};

async function ensureRv12Dir(): Promise<void> {
  await mkdir(rv12OpsDir(), { recursive: true });
}

export async function appendJsonl<T extends object>(path: string, row: T): Promise<T> {
  await ensureRv12Dir();
  await appendFile(path, `${JSON.stringify(row)}\n`, "utf8");
  return row;
}

export async function readJsonl<T>(path: string): Promise<T[]> {
  try {
    const raw = await readFile(path, "utf8");
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l) as T);
  } catch {
    return [];
  }
}

export async function appendRv12Asset(row: Rv12AssetRow): Promise<Rv12AssetRow> {
  return appendJsonl(rv12AssetsLogPath(), row);
}

export async function appendRvalAssignment(row: RvalAssignmentRow): Promise<RvalAssignmentRow> {
  return appendJsonl(rvalAssignmentsLogPath(), row);
}

export async function appendPromotionAudit(
  row: Omit<PromotionAuditRow, "ts">,
): Promise<PromotionAuditRow> {
  const full = { ...row, ts: new Date().toISOString() };
  return appendJsonl(promotionAuditLogPath(), full);
}

export async function listRv12Assets(): Promise<Rv12AssetRow[]> {
  return readJsonl<Rv12AssetRow>(rv12AssetsLogPath());
}

export async function listRvalAssignments(rval?: string): Promise<RvalAssignmentRow[]> {
  const rows = await readJsonl<RvalAssignmentRow>(rvalAssignmentsLogPath());
  if (!rval) return rows;
  const id = rval.toUpperCase();
  return rows.filter((r) => r.rval === id);
}

export async function getActiveAssignment(rval: string): Promise<RvalAssignmentRow | null> {
  const rows = await listRvalAssignments(rval);
  const active = rows.filter((r) => r.active);
  return active[active.length - 1] ?? null;
}

export async function listPromotionAudit(rval?: string): Promise<PromotionAuditRow[]> {
  const rows = await readJsonl<PromotionAuditRow>(promotionAuditLogPath());
  if (!rval) return rows;
  return rows.filter((r) => r.rval === rval.toUpperCase());
}

export async function allocateRv12Id(): Promise<string> {
  const assets = await listRv12Assets();
  let max = 0;
  for (const a of assets) {
    const m = /^RV12(\d+)$/.exec(a.rv12Id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `RV12${String(max + 1).padStart(6, "0")}`;
}

export function newAssignmentId(): string {
  return `asg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
