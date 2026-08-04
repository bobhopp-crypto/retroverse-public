import { loadBatchManifest, updateBatchManifest } from "@/lib/ops/video-acquisition/batch-store";
import { buildBatchPreview, createBatchAcquireJob } from "@/lib/ops/video-acquisition/run-batch";

async function main() {
  const scanId = process.argv[2] || "coverage-20260804012822-9b84e9a93b";
  const preview = await buildBatchPreview({ scanId, filter: "video_missing", limit: 3 });
  console.log(
    "PREVIEW",
    preview.items.map((item) => ({
      rank: item.chartRank,
      rvtr: item.rvtr,
      artist: item.artist,
      title: item.title,
    })),
  );

  const batch = await createBatchAcquireJob({ scanId, filter: "video_missing", limit: 3 });
  console.log("BATCH_STARTED", batch.batchId);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const current = await loadBatchManifest(batch.batchId);
    if (!current) throw new Error("batch lost");
    console.log("POLL", attempt + 1, current.status, current.summary);
    const terminal = current.items.every((item) =>
      ["complete", "failed", "skipped", "needs_review", "awaiting_rescan"].includes(item.downloadStatus),
    );
    if (terminal) {
      if (current.status !== "complete") {
        await updateBatchManifest(batch.batchId, { status: "complete" });
      }
      break;
    }
  }

  const finalBatch = await loadBatchManifest(batch.batchId);
  console.log(
    "FINAL",
    JSON.stringify(
      finalBatch?.items.map((item) => ({
        rvtr: item.rvtr,
        artist: item.artist,
        title: item.title,
        downloadStatus: item.downloadStatus,
        confidence: item.confidence,
        reviewStatus: item.reviewStatus,
        finalFilePath: item.finalFilePath,
        errorMessage: item.errorMessage,
        vdjLabelStatus: item.vdjLabelStatus,
        genre: item.genre,
        genreSource: item.genreSource,
      })),
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
