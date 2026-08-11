import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type IdentityReviewCandidate = { rvtr: string; artist: string; title: string; album?: string | null; year?: number | string | null; source?: string | null };
export type IdentityReviewItem = { videoPath: string; vdj: string; vdjArtist?: string; vdjTitle?: string; vdjYear?: string | number | null; vdjAlbum?: string | null; playCount?: number; candidates: IdentityReviewCandidate[]; evidence: string; question: string; classification?: string; reviewDecision?: "APPROVED" | "REJECTED"; reviewedAt?: string; rejectedRvtrs?: string[] };
export type IdentityReviewDecision = "APPROVE" | "REJECT" | "SKIP";

const ROOT = process.cwd();
const QUEUE_PATH = process.env.IDENTITY_REVIEW_QUEUE_PATH ?? join(ROOT, "reports/identity-resolution-pilot-50/review-queue.json");
const MANIFEST_PATH = process.env.IDENTITY_REVIEW_MANIFEST_PATH ?? join(ROOT, "data/ops/manifest/video-completion-manifest.json");
const HISTORY_PATH = process.env.IDENTITY_REVIEW_HISTORY_PATH ?? join(ROOT, "data/ops/manifest/identity-review-history.json");
export type IdentityReviewStorePaths = { queuePath?: string; manifestPath?: string; historyPath?: string };
function storePaths(overrides?: IdentityReviewStorePaths) { return { queuePath: overrides?.queuePath ?? QUEUE_PATH, manifestPath: overrides?.manifestPath ?? MANIFEST_PATH, historyPath: overrides?.historyPath ?? HISTORY_PATH }; }

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(path, "utf8")) as T; } catch { return fallback; }
}

function lifecycleAfterIdentity(record: Record<string, any>) {
  if (record.editorialStatus === "RESEARCH_REQUIRED") return "RESEARCH_REQUIRED";
  if (record.heroStatus !== "PREPARED_VIDEO_HERO" || record.collectorStatus !== "READY" || record.relatedMusicStatus !== "READY") return "PREPARATION_REQUIRED";
  if (record.validationStatus !== "VALIDATED") return "READY_FOR_VALIDATION";
  return "COMPLETE";
}

export async function loadIdentityReviewQueue(overrides?: IdentityReviewStorePaths): Promise<IdentityReviewItem[]> {
  const paths = storePaths(overrides);
  const queue = await readJson<{ records?: IdentityReviewItem[] }>(paths.queuePath, {});
  return (queue.records ?? []).filter((item) => item.reviewDecision !== "APPROVED" && item.reviewDecision !== "REJECTED");
}

export async function applyIdentityReviewDecision(input: { videoPath: string; decision: IdentityReviewDecision; candidateRvtr?: string | null }, overrides?: IdentityReviewStorePaths) {
  const paths = storePaths(overrides);
  const queue = await readJson<{ version?: number; records?: IdentityReviewItem[] }>(paths.queuePath, { records: [] });
  const item = (queue.records ?? []).find((candidate) => candidate.videoPath === input.videoPath);
  if (!item) throw new Error("Review item not found");
  const now = new Date().toISOString();
  const history = await readJson<{ version: number; records: any[] }>(paths.historyPath, { version: 1, records: [] });
  const manifest = await readJson<{ records?: Record<string, any>[] }>(paths.manifestPath, { records: [] });
  const record = (manifest.records ?? []).find((candidate) => candidate.normalizedPath === input.videoPath);
  if (!record) throw new Error("Manifest record not found");
  const candidate = item.candidates.find((entry) => entry.rvtr === input.candidateRvtr);
  if (input.decision === "APPROVE") {
    if (!candidate) throw new Error("Choose one proposed canonical candidate before approving");
    record.rvtr = candidate.rvtr;
    record.artist = candidate.artist;
    record.title = candidate.title;
    record.identityStatus = "RESOLVED";
    record.identityProvenance = { method: "HUMAN_APPROVED", approvalSource: "human", evidence: item.evidence, approvedCandidate: candidate, reviewedAt: now, previousLifecycleState: record.overallStatus };
    record.overallStatus = lifecycleAfterIdentity(record);
    record.preparationNeeds = record.overallStatus === "PREPARATION_REQUIRED" ? ["hero", "collector", "editorial", "relatedMusic", "validation"] : record.overallStatus === "READY_FOR_VALIDATION" ? ["validation"] : [];
    item.reviewDecision = "APPROVED";
    item.reviewedAt = now;
    history.records.push({ videoPath: item.videoPath, rvtr: candidate.rvtr, reviewedAt: now, reviewDecision: "APPROVED", approvalSource: "human", evidence: item.evidence, previousLifecycleState: record.identityProvenance.previousLifecycleState, resultingLifecycleState: record.overallStatus });
  } else if (input.decision === "REJECT") {
    if (!candidate) throw new Error("Choose the proposed candidate before rejecting it");
    item.rejectedRvtrs = [...new Set([...(item.rejectedRvtrs ?? []), candidate.rvtr])];
    item.reviewDecision = "REJECTED";
    item.reviewedAt = now;
    history.records.push({ videoPath: item.videoPath, rejectedRvtr: candidate.rvtr, reviewedAt: now, reviewDecision: "REJECTED", reason: item.question, previousLifecycleState: record.overallStatus, resultingLifecycleState: record.overallStatus });
  } else {
    history.records.push({ videoPath: item.videoPath, reviewedAt: now, reviewDecision: "SKIPPED", previousLifecycleState: record.overallStatus, resultingLifecycleState: record.overallStatus });
  }
  await writeFile(paths.queuePath, JSON.stringify({ ...queue, records: queue.records }, null, 2) + "\n");
  await writeFile(paths.manifestPath, JSON.stringify({ ...manifest, generatedAt: now, records: manifest.records }, null, 2) + "\n");
  await writeFile(paths.historyPath, JSON.stringify({ ...history, records: history.records }, null, 2) + "\n");
  return { decision: input.decision, item, lifecycleState: record.overallStatus };
}
