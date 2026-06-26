import "server-only";

import { copyFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";

import { normVdjPath, vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";
import { songPackageIndexPath, songPackagesDir } from "@/lib/ops/intelligence/paths";

import { clearBrowserPlusModelCache } from "./load-browser-plus";

const RVTR_RE = /^RVTR\d{6}$/i;
const RETROVERSE_LABEL_RE = /^(RV_PACKAGE|PK_|DK_|RVTR\d{6}$)/;

function decodeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function encodeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normPackageRvtr(value: string): string | null {
  const rvtr = value.trim().toUpperCase();
  return RVTR_RE.test(rvtr) ? rvtr : null;
}

async function loadPackageRvtrs(): Promise<Set<string>> {
  const rvtrs = new Set<string>();
  try {
    const raw = await readFile(songPackageIndexPath(), "utf8");
    const parsed = JSON.parse(raw) as { packages?: Array<{ rvtr?: string }> };
    for (const entry of parsed.packages ?? []) {
      const rvtr = normPackageRvtr(entry.rvtr ?? "");
      if (rvtr) rvtrs.add(rvtr);
    }
  } catch {
    // Package files are the fallback source of truth below.
  }
  try {
    for (const file of await readdir(songPackagesDir())) {
      const rvtr = normPackageRvtr(basename(file, ".json"));
      if (rvtr) rvtrs.add(rvtr);
    }
  } catch {
    // No package directory.
  }
  return rvtrs;
}

export async function resolveRetroverseLabelForRvtr(rvtr: string): Promise<string> {
  const normalized = rvtr.trim().toUpperCase();
  if (!RVTR_RE.test(normalized)) {
    throw new Error("Invalid RVTR");
  }
  const packageRvtrs = await loadPackageRvtrs();
  if (!packageRvtrs.has(normalized)) return normalized;
  return `PK_${normalized}`;
}

function readSongPath(songBlock: string): string | null {
  const match = songBlock.match(/<Song\s+FilePath="([^"]*)"/);
  return match?.[1] ? decodeXmlAttr(match[1]) : null;
}

function readTagsLabel(tags: string): string | null {
  const labelMatch = tags.match(/\sLabel="([^"]*)"/);
  return labelMatch ? decodeXmlAttr(labelMatch[1] ?? "") : null;
}

function canWriteLabel(label: string | null): boolean {
  if (label == null) return true;
  const trimmed = label.trim();
  return trimmed === "" || trimmed === "test" || trimmed === "RV_PACKAGE" || RETROVERSE_LABEL_RE.test(trimmed);
}

function setTagsLabel(
  tags: string,
  nextLabel: string | null,
): { next: string; changed: boolean; skipped: boolean; cleared: boolean } {
  const currentLabel = readTagsLabel(tags);
  const labelMatch = tags.match(/\sLabel="([^"]*)"/);

  if (!canWriteLabel(currentLabel)) {
    return { next: tags, changed: false, skipped: true, cleared: false };
  }

  if (!nextLabel) {
    if (!labelMatch) return { next: tags, changed: false, skipped: false, cleared: false };
    return {
      next: tags.replace(/\sLabel="[^"]*"/, ""),
      changed: true,
      skipped: false,
      cleared: true,
    };
  }

  if (labelMatch) {
    if (currentLabel === nextLabel) {
      return { next: tags, changed: false, skipped: false, cleared: false };
    }
    return {
      next: tags.replace(/\sLabel="[^"]*"/, ` Label="${encodeXmlAttr(nextLabel)}"`),
      changed: true,
      skipped: false,
      cleared: false,
    };
  }

  return {
    next: tags.replace(/(\s*\/?>)$/, ` Label="${encodeXmlAttr(nextLabel)}"$1`),
    changed: true,
    skipped: false,
    cleared: false,
  };
}

function updateSongBlockLabel(
  songBlock: string,
  nextLabel: string | null,
): { next: string; changed: boolean; skipped: boolean; cleared: boolean } {
  const tagsMatch = songBlock.match(/<Tags\b[^>]*\/?>/);
  if (!tagsMatch?.[0]) return { next: songBlock, changed: false, skipped: false, cleared: false };

  const { next, changed, skipped, cleared } = setTagsLabel(tagsMatch[0], nextLabel);
  if (!changed) return { next: songBlock, changed: false, skipped, cleared };
  return { next: songBlock.replace(tagsMatch[0], next), changed: true, skipped, cleared };
}

export type VdjLabelAssignResult = {
  ok: boolean;
  rvtr: string;
  label: string;
  filePath: string;
  changed: boolean;
  skipped: boolean;
  backupPath: string | null;
  message: string;
};

export async function assignVdjLabelByFilePath(
  filePath: string,
  rvtr: string,
): Promise<VdjLabelAssignResult> {
  const normalizedRvtr = rvtr.trim().toUpperCase();
  if (!RVTR_RE.test(normalizedRvtr)) {
    throw new Error("Invalid RVTR");
  }

  const label = await resolveRetroverseLabelForRvtr(normalizedRvtr);
  const vdjPath = vdjDatabasePath();
  const xml = await readFile(vdjPath, "utf8");
  const targetNorm = normVdjPath(filePath);

  let matched = false;
  let changed = false;
  let skipped = false;

  const nextXml = xml.replace(/<Song\s+FilePath="[^"]*"[^>]*>[\s\S]*?<\/Song>/g, (songBlock) => {
    const blockPath = readSongPath(songBlock);
    if (!blockPath || normVdjPath(blockPath) !== targetNorm) return songBlock;
    matched = true;
    const updated = updateSongBlockLabel(songBlock, label);
    if (updated.changed) changed = true;
    if (updated.skipped) skipped = true;
    return updated.next;
  });

  if (!matched) {
    return {
      ok: false,
      rvtr: normalizedRvtr,
      label,
      filePath,
      changed: false,
      skipped: false,
      backupPath: null,
      message: "VDJ song block not found for file path",
    };
  }

  if (skipped) {
    return {
      ok: false,
      rvtr: normalizedRvtr,
      label,
      filePath,
      changed: false,
      skipped: true,
      backupPath: null,
      message: "Existing non-Retroverse label blocks overwrite",
    };
  }

  if (!changed) {
    return {
      ok: true,
      rvtr: normalizedRvtr,
      label,
      filePath,
      changed: false,
      skipped: false,
      backupPath: null,
      message: "Label already set",
    };
  }

  const backupDir = join(dirname(vdjPath), "backups");
  await mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `database-before-browser-plus-assign-${stamp}.xml`);
  await copyFile(vdjPath, backupPath);
  await writeFile(vdjPath, nextXml, "utf8");
  clearBrowserPlusModelCache();

  return {
    ok: true,
    rvtr: normalizedRvtr,
    label,
    filePath,
    changed: true,
    skipped: false,
    backupPath,
    message: `Assigned ${label}`,
  };
}

export type VdjLabelBatchAssignResult = {
  ok: number;
  unchanged: number;
  skipped: number;
  failed: Array<{ filePath: string; message: string }>;
  succeededPaths: string[];
  backupPath: string | null;
};

/** Apply many label writes in one database.xml pass. */
export async function assignVdjLabelsBatch(
  items: Array<{ filePath: string; rvtr: string }>,
  options?: { backupTag?: string },
): Promise<VdjLabelBatchAssignResult> {
  const normalized = items
    .map((item) => ({
      filePath: item.filePath.trim(),
      rvtr: item.rvtr.trim().toUpperCase(),
    }))
    .filter((item) => item.filePath && RVTR_RE.test(item.rvtr));

  if (normalized.length === 0) {
    return { ok: 0, unchanged: 0, skipped: 0, failed: [], succeededPaths: [], backupPath: null };
  }

  const labelByPath = new Map<string, string>();
  for (const item of normalized) {
    const label = await resolveRetroverseLabelForRvtr(item.rvtr);
    labelByPath.set(normVdjPath(item.filePath), label);
  }

  const vdjPath = vdjDatabasePath();
  const xml = await readFile(vdjPath, "utf8");
  let changedBlocks = 0;
  let unchangedBlocks = 0;
  let skippedBlocks = 0;
  const failed: Array<{ filePath: string; message: string }> = [];
  const succeededPaths: string[] = [];
  const matchedPaths = new Set<string>();

  const nextXml = xml.replace(/<Song\s+FilePath="[^"]*"[^>]*>[\s\S]*?<\/Song>/g, (songBlock) => {
    const blockPath = readSongPath(songBlock);
    if (!blockPath) return songBlock;
    const norm = normVdjPath(blockPath);
    const nextLabel = labelByPath.get(norm);
    if (!nextLabel) return songBlock;

    matchedPaths.add(norm);
    const updated = updateSongBlockLabel(songBlock, nextLabel);
    if (updated.skipped) {
      skippedBlocks += 1;
      failed.push({ filePath: blockPath, message: "Existing non-Retroverse label blocks overwrite" });
    } else if (updated.changed) {
      changedBlocks += 1;
      succeededPaths.push(norm);
    } else {
      unchangedBlocks += 1;
      succeededPaths.push(norm);
    }
    return updated.next;
  });

  for (const item of normalized) {
    if (!matchedPaths.has(normVdjPath(item.filePath))) {
      failed.push({ filePath: item.filePath, message: "VDJ song block not found" });
    }
  }

  if (changedBlocks === 0) {
    return {
      ok: 0,
      unchanged: unchangedBlocks,
      skipped: skippedBlocks,
      failed,
      succeededPaths,
      backupPath: null,
    };
  }

  const backupDir = join(dirname(vdjPath), "backups");
  await mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupTag = options?.backupTag?.trim() || "browser-plus-batch";
  const backupPath = join(backupDir, `database-before-${backupTag}-${stamp}.xml`);
  await copyFile(vdjPath, backupPath);
  await writeFile(vdjPath, nextXml, "utf8");
  clearBrowserPlusModelCache();

  return {
    ok: changedBlocks,
    unchanged: unchangedBlocks,
    skipped: skippedBlocks,
    failed,
    succeededPaths,
    backupPath,
  };
}
