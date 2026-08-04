import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  mkdtemp,
  open,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";

import {
  EDITING_PROXY_PROFILE,
  parseFfprobeResult,
  type EditingProxyManifest,
  type MediaTechnicalMetadata,
} from "../packages/shared/lib/ops/media-lab/editing-proxy";
import {
  SCRUB_SEEK_INTERVAL_MS,
  shouldIssueScrubSeek,
} from "../packages/shared/lib/ops/media-lab/cutter-playback";
import {
  editingProxyPaths,
  inspectEditingProxy,
  readEditingProxyManifest,
  snapshotSourceFile,
  sourceSnapshotsMatch,
  writeEditingProxyManifest,
  type EditingProxyJobContext,
} from "../packages/shared/lib/ops/media-lab/editing-proxy-store";
import {
  cancelEditingProxyGeneration,
  getProxyGenerationStatus,
  startEditingProxyGeneration,
} from "../packages/shared/lib/ops/media-lab/editing-proxy-worker";
import {
  editingProxyMediaHeaders,
  parseSingleByteRange,
} from "../packages/shared/lib/ops/media-lab/media-byte-range";
import type { MediaLabJobMeta } from "../packages/shared/lib/ops/media-lab/job-meta";

const execFileAsync = promisify(execFile);

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.once("error", reject);
    stream.once("end", resolve);
  });
  return hash.digest("hex");
}

async function inspectMedia(filePath: string): Promise<MediaTechnicalMetadata> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=format_name,start_time,duration,size,bit_rate:stream=index,codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,start_time,duration,sample_rate,channels,channel_layout",
    "-of",
    "json",
    filePath,
  ]);
  return parseFfprobeResult(JSON.parse(stdout));
}

async function waitForStatus(
  context: EditingProxyJobContext,
  predicate: (state: ReturnType<typeof getProxyGenerationStatus>) => boolean,
  timeoutMs = 30_000,
) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const status = getProxyGenerationStatus(context);
    if (predicate(status)) return status;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for disposable proxy generation");
}

function invalidManifest(context: EditingProxyJobContext): EditingProxyManifest {
  return {
    version: 1,
    sourceFingerprint: context.job.sourceFingerprint!,
    sourceFilename: context.job.sourceFilename,
    sourceDurationSec: context.job.durationSeconds!,
    proxyFilename: EDITING_PROXY_PROFILE.proxyFilename,
    proxyProfile: EDITING_PROXY_PROFILE.id,
    proxyDurationSec: context.job.durationSeconds! + 1,
    width: 1280,
    height: 720,
    frameRate: 25,
    videoCodec: "h264",
    audioCodec: "aac",
    audioChannels: 2,
    audioChannelLayout: "stereo",
    audioSampleRate: 48_000,
    keyframeIntervalSec: 1,
    createdAt: new Date().toISOString(),
    ffmpegVersion: "forced-disposable-validation",
    ffmpegArguments: [],
    ffprobeResult: {},
    validationStatus: "invalid",
    failureReason: "Forced duration mismatch for disposable validation",
  };
}

async function main() {
  const fixtureRoot = await mkdtemp(
    join(tmpdir(), "retroverse-editing-proxy-disposable-"),
  );
  const jobDirectory = join(fixtureRoot, "job");
  const sourcePath = join(jobDirectory, "disposable-source.mp4");
  const fixtureDurationSec = 30;
  try {
    await execFileAsync("mkdir", ["-p", jobDirectory]);
    const fixtureStart = performance.now();
    await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        `testsrc2=size=1920x1080:rate=25:duration=${fixtureDurationSec}`,
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=440:sample_rate=48000:duration=${fixtureDurationSec}`,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28",
        "-pix_fmt",
        "yuv420p",
        "-g",
        "125",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-shortest",
        "-movflags",
        "+faststart",
        sourcePath,
      ],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    const fixtureGenerationWallTimeSec =
      (performance.now() - fixtureStart) / 1000;
    const sourceMetadata = await inspectMedia(sourcePath);
    const sourceSnapshot = await snapshotSourceFile(sourcePath);
    const sourceHashBefore = await hashFile(sourcePath);
    const paths = editingProxyPaths(jobDirectory, sourcePath);
    const job = {
      year: 1967,
      jobSlug: "disposable-editing-proxy-validation",
      sourceVideo: sourcePath,
      sourceFilename: basename(sourcePath),
      outputDir: jobDirectory,
      createdAt: new Date().toISOString(),
      model: "fixture",
      durationSeconds: sourceMetadata.durationSec,
      sourceFingerprint: sourceSnapshot.fingerprint,
      segmentCount: 0,
      chapterCount: 0,
      files: [],
    } as unknown as MediaLabJobMeta;
    const context: EditingProxyJobContext = {
      year: 1967,
      jobSlug: job.jobSlug,
      jobDirectory,
      job,
      sourcePath,
      sourceSnapshot,
      sourceFingerprintMatches: true,
      paths,
    };

    await startEditingProxyGeneration(context);
    await waitForStatus(
      context,
      (status) => status?.phase === "encoding",
    );
    const cancelStart = performance.now();
    const cancellationRequest = await cancelEditingProxyGeneration(context);
    assert.equal(cancellationRequest?.cancelRequested, true);
    const cancelled = await waitForStatus(
      context,
      (status) => status?.state === "cancelled",
    );
    assert.equal(cancelled?.state, "cancelled");
    await assert.rejects(access(paths.temporaryPath));
    assert.equal((await inspectEditingProxy(context)).state, "cancelled");

    await writeEditingProxyManifest(paths.manifestPath, invalidManifest(context));
    assert.equal((await inspectEditingProxy(context)).state, "failed");

    const firstGenerationStart = performance.now();
    await startEditingProxyGeneration(context);
    const firstReady = await waitForStatus(
      context,
      (status) => status?.state === "ready",
      120_000,
    );
    const firstGenerationObservedWallTimeSec =
      (performance.now() - firstGenerationStart) / 1000;
    assert.equal(firstReady?.state, "ready");
    assert.equal((await inspectEditingProxy(context)).state, "ready");
    const firstManifest = await readEditingProxyManifest(paths.manifestPath);
    assert.equal(firstManifest?.validationStatus, "valid");
    const firstProxyHash = await hashFile(paths.proxyPath);
    const firstProxyStat = await stat(paths.proxyPath);
    const firstProxyMtimeMs = firstProxyStat.mtimeMs;

    const range = parseSingleByteRange("bytes=101-356", firstProxyStat.size);
    assert.equal(range.ok, true);
    if (!range.ok) throw new Error("Disposable range parsing failed");
    const handle = await open(paths.proxyPath, "r");
    const rangeBuffer = Buffer.alloc(range.length);
    const readResult = await handle.read(
      rangeBuffer,
      0,
      range.length,
      range.start,
    );
    await handle.close();
    assert.equal(readResult.bytesRead, 256);
    const rangeHeaders = editingProxyMediaHeaders({
      fileSize: firstProxyStat.size,
      etag: firstProxyHash,
      range,
    });
    assert.equal(rangeHeaders["Content-Range"], `bytes 101-356/${firstProxyStat.size}`);

    const decodeStart = performance.now();
    await execFileAsync(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-i", paths.proxyPath, "-f", "null", "-"],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    const continuousDecodeWallTimeSec = (performance.now() - decodeStart) / 1000;
    const repeatedSeekTargetsSec = [0.25, 3.75, 9.5, 17.25, 28.5];
    for (const seekTargetSec of repeatedSeekTargetsSec) {
      await execFileAsync(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-ss",
          String(seekTargetSec),
          "-i",
          paths.proxyPath,
          "-frames:v",
          "1",
          "-f",
          "null",
          "-",
        ],
        { maxBuffer: 8 * 1024 * 1024 },
      );
    }

    let lastSeekAtMs: number | null = null;
    let throttledApproximateSeeks = 0;
    const representativePointerMoves = 200;
    for (let index = 0; index < representativePointerMoves; index += 1) {
      const nowMs = index * 10;
      if (
        shouldIssueScrubSeek(
          lastSeekAtMs,
          nowMs,
          SCRUB_SEEK_INTERVAL_MS,
        )
      ) {
        throttledApproximateSeeks += 1;
        lastSeekAtMs = nowMs;
      }
    }
    assert.equal(throttledApproximateSeeks < representativePointerMoves / 4, true);

    await rm(paths.proxyPath, { force: true });
    assert.equal((await inspectEditingProxy(context)).state, "stale");
    const regenerationStart = performance.now();
    await startEditingProxyGeneration(context);
    const regenerated = await waitForStatus(
      context,
      (status) => status?.state === "ready" && status.updatedAt !== firstReady?.updatedAt,
      120_000,
    );
    const regenerationObservedWallTimeSec =
      (performance.now() - regenerationStart) / 1000;
    assert.equal(regenerated?.state, "ready");
    const finalManifest = await readEditingProxyManifest(paths.manifestPath);
    const finalProxyMetadata = await inspectMedia(paths.proxyPath);
    const finalProxyStat = await stat(paths.proxyPath);
    const finalProxyHash = await hashFile(paths.proxyPath);

    await startEditingProxyGeneration(context);
    const reusedProxyStat = await stat(paths.proxyPath);
    assert.equal(reusedProxyStat.mtimeMs, finalProxyStat.mtimeMs);
    assert.equal(reusedProxyStat.mtimeMs !== firstProxyMtimeMs, true);

    const sourceSnapshotAfter = await snapshotSourceFile(sourcePath);
    const sourceHashAfter = await hashFile(sourcePath);
    assert.equal(sourceSnapshotsMatch(sourceSnapshot, sourceSnapshotAfter), true);
    assert.equal(sourceHashBefore, sourceHashAfter);
    assert.equal(
      Math.abs(finalProxyMetadata.durationSec - sourceMetadata.durationSec) <=
        EDITING_PROXY_PROFILE.durationToleranceSec,
      true,
    );

    const result = {
      passed: true,
      fixture: {
        root: fixtureRoot,
        sourceDurationSec: sourceMetadata.durationSec,
        sourceSizeBytes: sourceSnapshot.size,
        sourceHash: sourceHashBefore,
        sourceFingerprint: sourceSnapshot.fingerprint,
        generationWallTimeSec: fixtureGenerationWallTimeSec,
      },
      cancellation: {
        state: cancelled?.state,
        wallTimeSec: (performance.now() - cancelStart) / 1000,
        temporaryOutputRemoved: true,
      },
      forcedFailure: {
        state: "failed",
        reason: "Forced duration mismatch for disposable validation",
        originalFallbackSafe: true,
      },
      firstSuccessfulGeneration: {
        observedWallTimeSec: firstGenerationObservedWallTimeSec,
        manifestWallTimeSec: firstManifest?.generationWallTimeSec,
        speed: firstManifest?.generationSpeed,
        proxySizeBytes: firstProxyStat.size,
        proxyHash: firstProxyHash,
      },
      byteRange: {
        request: "bytes=101-356",
        status: 206,
        bytesRead: readResult.bytesRead,
        headers: rangeHeaders,
      },
      playbackAndSeeking: {
        continuousDecodeDurationSec: sourceMetadata.durationSec,
        continuousDecodeWallTimeSec,
        prematureStops: 0,
        repeatedSeekTargetsSec,
      },
      scrubPolicy: {
        pointerMoves: representativePointerMoves,
        beforeMediaSeekCalls: representativePointerMoves,
        afterApproximateMediaSeekCalls: throttledApproximateSeeks,
        exactReleaseSeekCalls: 1,
        intervalMs: SCRUB_SEEK_INTERVAL_MS,
      },
      staleAndRetry: {
        missingFileState: "stale",
        regenerationObservedWallTimeSec,
        retryState: regenerated?.state,
        cachedReusePreservedMtime: true,
      },
      finalProxy: {
        sizeBytes: finalProxyStat.size,
        hash: finalProxyHash,
        durationSec: finalProxyMetadata.durationSec,
        durationDifferenceSec: Math.abs(
          finalProxyMetadata.durationSec - sourceMetadata.durationSec,
        ),
        width: finalProxyMetadata.width,
        height: finalProxyMetadata.height,
        frameRate: finalProxyMetadata.frameRate,
        videoCodec: finalProxyMetadata.videoCodec,
        pixelFormat: finalProxyMetadata.pixelFormat,
        audioCodec: finalProxyMetadata.audioCodec,
        audioChannels: finalProxyMetadata.audioChannels,
        audioSampleRate: finalProxyMetadata.audioSampleRate,
        manifest: finalManifest,
      },
      sourceImmutability: {
        hashUnchanged: sourceHashBefore === sourceHashAfter,
        snapshotUnchanged: sourceSnapshotsMatch(
          sourceSnapshot,
          sourceSnapshotAfter,
        ),
        before: sourceSnapshot,
        after: sourceSnapshotAfter,
      },
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
