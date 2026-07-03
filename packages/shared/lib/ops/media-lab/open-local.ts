import { access, stat } from "fs/promises";
import { execFile } from "child_process";
import { join, resolve, sep } from "path";
import { promisify } from "util";

import { retroverseDataRoot } from "@/lib/events/event-data-root";

const execFileAsync = promisify(execFile);

export type MediaLabOpenTarget = "folder" | "chapters" | "chaptersExport" | "labels";

const TARGET_FILES: Record<Exclude<MediaLabOpenTarget, "folder">, string> = {
  chapters: "chapters.csv",
  chaptersExport: "chapters-export.csv",
  labels: "segment-labels.txt",
};

/** Path must live under RETROVERSE_DATA/YEARS/{year}/production/metadata/{job-slug}/ */
export function isAllowedMediaLabPath(absPath: string): boolean {
  const dataRoot = resolve(retroverseDataRoot());
  const resolved = resolve(absPath);
  if (!resolved.startsWith(dataRoot + sep)) return false;

  const parts = resolved.slice(dataRoot.length + 1).split(sep);
  return (
    parts[0] === "YEARS" &&
    /^\d{4}$/.test(parts[1] ?? "") &&
    parts[2] === "production" &&
    parts[3] === "metadata" &&
    Boolean(parts[4])
  );
}

export function resolveMediaLabJobPath(outputDir: string, target: MediaLabOpenTarget): string {
  const dir = resolve(outputDir.trim());
  if (!isAllowedMediaLabPath(dir)) {
    throw new Error("Path is outside Media Lab job directories.");
  }

  if (target === "folder") {
    return dir;
  }

  const filePath = join(dir, TARGET_FILES[target]);
  if (!isAllowedMediaLabPath(filePath)) {
    throw new Error("Path is outside Media Lab job directories.");
  }

  return filePath;
}

export async function openInFinder(targetPath: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.platform !== "darwin") {
    return { ok: false, error: "Open in Finder is only available on macOS (local dev)." };
  }

  const resolved = resolve(targetPath);

  try {
    await access(resolved);
  } catch {
    return { ok: false, error: "File or folder not found." };
  }

  try {
    const info = await stat(resolved);
    // Files: reveal + select in Finder (`open -R`). Directories: open in Finder.
    if (info.isDirectory()) {
      await execFileAsync("open", [resolved]);
    } else {
      await execFileAsync("open", ["-R", resolved]);
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to open in Finder";
    return { ok: false, error: message };
  }
}

export async function openMediaLabJobLocal(
  outputDir: string,
  target: MediaLabOpenTarget,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  let path: string;
  try {
    path = resolveMediaLabJobPath(outputDir, target);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid job path",
    };
  }

  const result = await openInFinder(path);
  if (!result.ok) {
    return result;
  }

  return { ok: true, path };
}
