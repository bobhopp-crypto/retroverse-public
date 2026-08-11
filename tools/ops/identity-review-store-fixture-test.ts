import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function fixture(decision: "APPROVE" | "REJECT" | "SKIP") {
  const dir = await mkdtemp(join(tmpdir(), "retroverse-identity-review-"));
  const videoPath = "/fixture/VIDEO/Artist - Song.mp4";
  await writeFile(join(dir, "queue.json"), JSON.stringify({ version: 1, records: [{ videoPath, vdj: "Artist — Song", candidates: [{ rvtr: "RVTR123456", artist: "Artist", title: "Song", year: 1984, source: "hot100" }], evidence: "Fixture evidence", question: "Fixture question" }] }));
  await writeFile(join(dir, "manifest.json"), JSON.stringify({ version: 1, records: [{ normalizedPath: videoPath, rvtr: null, identityStatus: "IDENTITY_REQUIRED", overallStatus: "IDENTITY_REQUIRED", heroStatus: "PREPARATION_REQUIRED", collectorStatus: "MISSING", editorialStatus: "MISSING", relatedMusicStatus: "PREPARATION_REQUIRED", validationStatus: "NOT_VALIDATED", preparationNeeds: ["identity"] }] }));
  await writeFile(join(dir, "history.json"), JSON.stringify({ version: 1, records: [] }));
  const store = await import("../../packages/shared/lib/ops/identity-review-store");
  await store.applyIdentityReviewDecision({ videoPath, decision, candidateRvtr: decision === "SKIP" ? null : "RVTR123456" }, { queuePath: join(dir, "queue.json"), manifestPath: join(dir, "manifest.json"), historyPath: join(dir, "history.json") });
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  const queue = JSON.parse(await readFile(join(dir, "queue.json"), "utf8"));
  const history = JSON.parse(await readFile(join(dir, "history.json"), "utf8"));
  if (decision === "APPROVE" && (manifest.records[0].rvtr !== "RVTR123456" || manifest.records[0].identityProvenance.approvalSource !== "human")) throw new Error("approve fixture failed");
  if (decision === "REJECT" && (manifest.records[0].rvtr || queue.records[0].reviewDecision !== "REJECTED")) throw new Error("reject fixture failed");
  if (decision === "SKIP" && (manifest.records[0].rvtr || queue.records[0].reviewDecision || history.records[0].reviewDecision !== "SKIPPED")) throw new Error("skip fixture failed");
  await rm(dir, { recursive: true, force: true });
}

async function main() {
  for (const decision of ["APPROVE", "REJECT", "SKIP"] as const) await fixture(decision);
  console.log(JSON.stringify({ approve: "passed", reject: "passed", skip: "passed" }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
