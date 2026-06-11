import { existsSync } from "node:fs";
import { unlink, writeFile } from "fs/promises";

import { parseCreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import { generateVariationsFromParent } from "@/lib/ops/content-creator/library";
import { libraryFileUrl } from "@/lib/ops/content-creator/library/index";
import { runVNextGenerate, vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import { parseSecondaryLineWithLegacy } from "@/lib/ops/content-creator/parse-fields";
import type { ArtDirectorFields } from "@/lib/ops/content-creator/rvbr-art-director-prompt";
import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { normalizePassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

import { contentCreatorJobRunnerLockPath } from "./paths";
import { loadJob, listJobs, updateJob } from "./store";

const LOCK_STALE_MS = 15 * 60 * 1000;

function parseFields(body: Record<string, unknown>, prefix?: "front" | "back"): ArtDirectorFields {
  const p = prefix ?? "";
  const cap = (f: string) => `${p}${f.charAt(0).toUpperCase()}${f.slice(1)}`;
  const raw = (f: string) => (prefix ? body[cap(f)] : body[f]);
  const passRaw =
    typeof raw("passTypeLabel") === "string" ? raw("passTypeLabel") : CONTENT_CREATOR_DEFAULTS.passTypeLabel;
  const qrRaw = prefix === "back" ? body.backQrUrl ?? body.qrUrl : body.qrUrl;
  const eventVal = raw("event");
  const venueVal = raw("venue");
  const dateVal = raw("date");
  const secondaryLine = prefix
    ? parseSecondaryLineWithLegacy(body, {
        line: `${prefix}SecondaryLine`,
        legacyYears: `${prefix}FeaturedYears`,
      })
    : parseSecondaryLineWithLegacy(body);
  return {
    event: typeof eventVal === "string" ? eventVal : CONTENT_CREATOR_DEFAULTS.event,
    venue: typeof venueVal === "string" ? venueVal : CONTENT_CREATOR_DEFAULTS.venue,
    date: typeof dateVal === "string" ? dateVal : CONTENT_CREATOR_DEFAULTS.date,
    secondaryLine,
    passTypeLabel: normalizePassTypeLabel(String(passRaw)),
    qrUrl: typeof qrRaw === "string" ? qrRaw : CONTENT_CREATOR_DEFAULTS.qrUrl,
  };
}

async function acquireLock(): Promise<boolean> {
  const lockPath = contentCreatorJobRunnerLockPath();
  if (existsSync(lockPath)) {
    try {
      const { mtimeMs } = await import("fs/promises").then((fs) => fs.stat(lockPath));
      if (Date.now() - mtimeMs < LOCK_STALE_MS) return false;
      await unlink(lockPath);
    } catch {
      return false;
    }
  }
  await writeFile(lockPath, `${process.pid}\n${new Date().toISOString()}\n`, "utf8");
  return true;
}

async function releaseLock(): Promise<void> {
  try {
    await unlink(contentCreatorJobRunnerLockPath());
  } catch {
    // ignore
  }
}

async function resolveProfile(eraSlug: string): Promise<RvbrProfile> {
  const profiles = await listRvbrProfiles();
  const profile = profiles.find((p) => p.slug === eraSlug) ?? profiles[0];
  if (!profile) throw new Error("No RVBR profiles");
  return profile;
}

async function runGenerateJob(jobId: string, body: Record<string, unknown>): Promise<void> {
  const eraSlug = typeof body.eraSlug === "string" ? body.eraSlug : "1982-1985";
  const artifact = (body.artifact as ContentArtifactType) ?? "pass";
  const profile = await resolveProfile(eraSlug);
  const top = parseFields(body);
  const frontFields = body.frontEvent ? parseFields(body, "front") : top;
  const backFields = body.backEvent ? parseFields(body, "back") : top;
  const creativeSettings = parseCreativeDirectionSettings(body);

  await updateJob(jobId, {
    status: "running",
    startedAt: new Date().toISOString(),
    progress: { current: 0, total: 2, step: "Generating front artwork" },
  });

  const manifest = await runVNextGenerate({
    profile,
    artifact,
    frontFields,
    backFields,
    creativeSettings,
  });

  await updateJob(jobId, {
    status: "completed",
    completedAt: new Date().toISOString(),
    progress: { current: 2, total: 2, step: "Complete" },
    result: {
      runId: manifest.runId,
      frontUrl: vNextFileUrl(manifest.runId, manifest.frontFilename),
      backUrl: vNextFileUrl(manifest.runId, manifest.backFilename),
    },
  });
}

async function runVariationsJob(jobId: string, body: Record<string, unknown>): Promise<void> {
  const parentId = typeof body.parentId === "string" ? body.parentId : "";
  const count = typeof body.count === "number" ? body.count : 5;
  if (!parentId) throw new Error("parentId required");

  const eraSlug = typeof body.eraSlug === "string" ? body.eraSlug : "1982-1985";
  const profile = await resolveProfile(eraSlug);
  const capped = Math.min(Math.max(1, count), 10);

  await updateJob(jobId, {
    status: "running",
    startedAt: new Date().toISOString(),
    progress: { current: 0, total: capped, step: "Starting variations" },
  });

  await updateJob(jobId, {
    progress: { current: 0, total: capped, step: `Generating ${capped} variations` },
  });

  const result = await generateVariationsFromParent({
    parentId,
    count: capped,
    profile,
  });

  await updateJob(jobId, {
    status: "completed",
    completedAt: new Date().toISOString(),
    progress: { current: capped, total: capped, step: "Complete" },
    result: { runIds: result.runIds, batchId: result.batchId },
  });
}

async function processJob(jobId: string): Promise<void> {
  const job = await loadJob(jobId);
  if (!job || job.status !== "queued") return;

  try {
    if (job.type === "generate") {
      await runGenerateJob(jobId, job.payload);
    } else if (job.type === "variations") {
      await runVariationsJob(jobId, job.payload);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "job_failed";
    await updateJob(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: message,
      progress: { ...job.progress, step: "Failed" },
    });
  }
}

/** Process queued jobs until the queue is empty. */
export async function processContentCreatorJobQueue(): Promise<number> {
  const acquired = await acquireLock();
  if (!acquired) return 0;

  let processed = 0;
  try {
    for (;;) {
      const queued = await listJobs({ status: "queued", limit: 1 });
      if (!queued.length) break;
      await processJob(queued[0]!.id);
      processed += 1;
    }
  } finally {
    await releaseLock();
  }

  return processed;
}

export function jobThumbnailUrl(job: { thumbnailPath: string | null; result: { frontUrl?: string } | null }): string | null {
  if (job.result?.frontUrl) return job.result.frontUrl;
  if (job.thumbnailPath) return libraryFileUrl(job.thumbnailPath);
  return null;
}
