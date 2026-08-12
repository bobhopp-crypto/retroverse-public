import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { writeJsonAtomic } from "@/lib/ops/virtualdj-media-coverage/atomic-json";

import { sourceFingerprintFromStat } from "./editorial/segment-manifest";
import { resolveJobOutputDir } from "./editorial/job-path";
import {
  EDITING_PROXY_PROFILE,
  assertProxyPathSafety,
  assessEditingProxy,
  type EditingProxyManifest,
  type ProxyReadiness,
  type SourceFileSnapshot,
} from "./editing-proxy";
import type { MediaLabJobMeta } from "./job-meta";

export type EditingProxyPaths = {
  proxyDirectory: string;
  proxyPath: string;
  temporaryPath: string;
  manifestPath: string;
};

export type EditingProxyJobContext = {
  year: number;
  jobSlug: string;
  jobDirectory: string;
  job: MediaLabJobMeta;
  sourcePath: string;
  sourceSnapshot: SourceFileSnapshot;
  sourceFingerprintMatches: boolean;
  paths: EditingProxyPaths;
};

export function editingProxyPaths(
  jobDirectory: string,
  sourcePath: string,
): EditingProxyPaths {
  const proxyDirectory = join(jobDirectory, "proxy");
  const paths = {
    proxyDirectory,
    proxyPath: join(proxyDirectory, EDITING_PROXY_PROFILE.proxyFilename),
    temporaryPath: join(
      proxyDirectory,
      EDITING_PROXY_PROFILE.temporaryFilename,
    ),
    manifestPath: join(
      proxyDirectory,
      EDITING_PROXY_PROFILE.manifestFilename,
    ),
  };
  assertProxyPathSafety({
    jobDirectory,
    sourcePath,
    proxyDirectory,
    outputPath: paths.proxyPath,
    temporaryPath: paths.temporaryPath,
  });
  return paths;
}

export async function snapshotSourceFile(
  sourcePath: string,
): Promise<SourceFileSnapshot> {
  const sourceStat = await stat(sourcePath);
  return {
    path: sourcePath,
    size: sourceStat.size,
    mtimeMs: sourceStat.mtimeMs,
    fingerprint: sourceFingerprintFromStat(
      sourcePath,
      sourceStat.size,
      sourceStat.mtimeMs,
    ),
  };
}

export function sourceSnapshotsMatch(
  before: SourceFileSnapshot,
  after: SourceFileSnapshot,
): boolean {
  return (
    before.path === after.path &&
    before.size === after.size &&
    Math.abs(before.mtimeMs - after.mtimeMs) < 0.000_5 &&
    before.fingerprint === after.fingerprint
  );
}

export async function resolveEditingProxyJob(
  year: number,
  jobSlug: string,
): Promise<EditingProxyJobContext> {
  const jobDirectory = resolveJobOutputDir(year, jobSlug);
  const jobPath = join(jobDirectory, "job.json");
  const job = JSON.parse(await readFile(jobPath, "utf8")) as MediaLabJobMeta;
  const sourcePath = job.sourceVideo?.trim() ?? "";
  if (!sourcePath || !existsSync(sourcePath)) {
    throw new Error("Media Lab source video is missing");
  }
  if (!job.sourceFingerprint) {
    throw new Error("Media Lab job has no source fingerprint");
  }
  if (!Number.isFinite(job.durationSeconds) || !job.durationSeconds) {
    throw new Error("Media Lab job has no valid source duration");
  }
  const sourceSnapshot = await snapshotSourceFile(sourcePath);
  return {
    year,
    jobSlug,
    jobDirectory,
    job,
    sourcePath,
    sourceSnapshot,
    sourceFingerprintMatches:
      sourceSnapshot.fingerprint === job.sourceFingerprint,
    paths: editingProxyPaths(jobDirectory, sourcePath),
  };
}

export async function readEditingProxyManifest(
  manifestPath: string,
): Promise<EditingProxyManifest | null> {
  try {
    const parsed = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as EditingProxyManifest;
    if (
      parsed.version !== 1 ||
      typeof parsed.sourceFingerprint !== "string" ||
      typeof parsed.proxyProfile !== "string" ||
      typeof parsed.proxyFilename !== "string" ||
      !["valid", "invalid", "cancelled"].includes(parsed.validationStatus)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeEditingProxyManifest(
  manifestPath: string,
  manifest: EditingProxyManifest,
): Promise<void> {
  await writeJsonAtomic(manifestPath, manifest);
}

export async function inspectEditingProxy(
  context: EditingProxyJobContext,
): Promise<ProxyReadiness> {
  const manifest = await readEditingProxyManifest(context.paths.manifestPath);
  if (!context.sourceFingerprintMatches) {
    return manifest
      ? {
          state: "stale",
          reason: "Current source fingerprint does not match this Media Lab job",
          manifest,
        }
      : {
          state: "missing",
          reason: "Current source fingerprint does not match this Media Lab job",
        };
  }
  return assessEditingProxy({
    manifest,
    sourceFingerprint: context.job.sourceFingerprint!,
    sourceDurationSec: context.job.durationSeconds!,
    proxyFileExists: existsSync(context.paths.proxyPath),
  });
}

export async function ensureEditingProxyDirectory(
  paths: EditingProxyPaths,
): Promise<void> {
  await mkdir(paths.proxyDirectory, { recursive: true });
}

export async function removeIncompleteProxy(
  paths: EditingProxyPaths,
): Promise<void> {
  await rm(paths.temporaryPath, { force: true });
}
