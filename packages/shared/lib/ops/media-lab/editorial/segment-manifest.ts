import { createHash } from "crypto";
import { readFile, rename, writeFile } from "fs/promises";
import { basename, dirname, resolve, sep } from "path";
export * from "./segment-manifest-client";

export const EDITORIAL_SEGMENTS_VERSION = 1 as const;
import { validateSegmentBounds, type EditorialSegment } from "./segment-manifest-client";
export { validateSegmentBounds, type EditorialSegment } from "./segment-manifest-client";

export type EditorialSegmentManifest = {
  version: typeof EDITORIAL_SEGMENTS_VERSION;
  sourceFilename: string;
  sourceFingerprint: string;
  sourceDurationSeconds: number;
  segments: EditorialSegment[];
  updatedAt: string;
};

export function sourceFingerprintFromStat(sourceFilename: string, size: number, mtimeMs: number): string {
  return createHash("sha256")
    .update(`${sourceFilename}\0${size}\0${mtimeMs.toFixed(3)}`)
    .digest("hex");
}

export function validateOutputPath(outputPath: string, outputRoot: string, sourcePath?: string): string[] {
  const errors: string[] = [];
  const root = resolve(outputRoot);
  const target = resolve(outputPath);
  if (target !== root && !target.startsWith(`${root}${sep}`)) errors.push("output path escapes approved export root");
  if (sourcePath && target === resolve(sourcePath)) errors.push("output path would overwrite source");
  if (basename(target) === "") errors.push("output path must name a file");
  return errors;
}

export async function writeSegmentManifestAtomic(path: string, manifest: EditorialSegmentManifest): Promise<void> {
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

export async function readSegmentManifest(path: string): Promise<EditorialSegmentManifest | null> {
  try { return JSON.parse(await readFile(path, "utf8")) as EditorialSegmentManifest; } catch { return null; }
}

export function segmentManifestPath(jobDir: string): string {
  return resolve(dirname(jobDir), basename(jobDir), "editorial-segments.json");
}
