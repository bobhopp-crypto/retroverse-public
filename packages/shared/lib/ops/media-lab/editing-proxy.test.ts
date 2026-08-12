import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";

import {
  EDITING_PROXY_PROFILE,
  assertProxyPathSafety,
  assessEditingProxy,
  buildEditingProxyFfmpegArguments,
  deterministicGopFrames,
  parseFfmpegProgress,
  parseFfprobeResult,
  proxyCacheKey,
  validateEditingProxy,
  type EditingProxyManifest,
  type MediaTechnicalMetadata,
} from "./editing-proxy";
import {
  editingProxyMediaHeaders,
  parseSingleByteRange,
} from "./media-byte-range";
import {
  editingProxyPaths,
  readEditingProxyManifest,
  removeIncompleteProxy,
  snapshotSourceFile,
  sourceSnapshotsMatch,
  writeEditingProxyManifest,
} from "./editing-proxy-store";
import { nodeReadableToWeb } from "./media-stream";

const metadata: MediaTechnicalMetadata = {
  durationSec: 10,
  startTimeSec: 0,
  width: 1280,
  height: 720,
  frameRate: 25,
  videoCodec: "h264",
  pixelFormat: "yuv420p",
  audioCodec: "aac",
  audioChannels: 2,
  audioChannelLayout: "stereo",
  audioSampleRate: 48000,
  raw: {},
};

const manifest: EditingProxyManifest = {
  version: 1,
  sourceFingerprint: "a".repeat(64),
  sourceFilename: "source.mp4",
  sourceDurationSec: 10,
  proxyFilename: EDITING_PROXY_PROFILE.proxyFilename,
  proxyProfile: EDITING_PROXY_PROFILE.id,
  proxyDurationSec: 10,
  width: 1280,
  height: 720,
  frameRate: 25,
  videoCodec: "h264",
  audioCodec: "aac",
  audioChannels: 2,
  audioChannelLayout: "stereo",
  audioSampleRate: 48000,
  keyframeIntervalSec: 1,
  createdAt: "2026-07-31T00:00:00.000Z",
  ffmpegVersion: "ffmpeg 8",
  ffmpegArguments: [],
  ffprobeResult: {},
  validationStatus: "valid",
};

test("proxy cache key includes source fingerprint and profile version", () => {
  assert.notEqual(proxyCacheKey("a".repeat(64)), proxyCacheKey("b".repeat(64)));
  assert.notEqual(
    proxyCacheKey("a".repeat(64), "profile-v1"),
    proxyCacheKey("a".repeat(64), "profile-v2"),
  );
});

test("proxy profile fixes the approved resolution, timing, and derived filenames", () => {
  assert.equal(EDITING_PROXY_PROFILE.maxWidth, 1280);
  assert.equal(EDITING_PROXY_PROFILE.maxHeight, 720);
  assert.equal(EDITING_PROXY_PROFILE.keyframeIntervalSec, 1);
  assert.equal(EDITING_PROXY_PROFILE.durationToleranceSec, 0.25);
  assert.equal(EDITING_PROXY_PROFILE.startTimeToleranceSec, 0.05);
  assert.equal(EDITING_PROXY_PROFILE.proxyFilename, "editing-720p.mp4");
  assert.equal(
    EDITING_PROXY_PROFILE.temporaryFilename,
    "temporary-generation-file.mp4",
  );
});

test("an absent proxy manifest remains an explicit missing state", () => {
  assert.equal(
    assessEditingProxy({
      manifest: null,
      sourceFingerprint: manifest.sourceFingerprint,
      sourceDurationSec: 10,
      proxyFileExists: false,
    }).state,
    "missing",
  );
});

test("a cached proxy with a material duration mismatch becomes stale", () => {
  assert.equal(
    assessEditingProxy({
      manifest: { ...manifest, proxyDurationSec: 10.251 },
      sourceFingerprint: manifest.sourceFingerprint,
      sourceDurationSec: 10,
      proxyFileExists: true,
    }).state,
    "stale",
  );
});

test("valid proxy is reused and stale variants are rejected", () => {
  assert.equal(
    assessEditingProxy({
      manifest,
      sourceFingerprint: manifest.sourceFingerprint,
      sourceDurationSec: 10,
      proxyFileExists: true,
    }).state,
    "ready",
  );
  assert.equal(
    assessEditingProxy({
      manifest,
      sourceFingerprint: "b".repeat(64),
      sourceDurationSec: 10,
      proxyFileExists: true,
    }).state,
    "stale",
  );
  assert.equal(
    assessEditingProxy({
      manifest: { ...manifest, proxyProfile: "old-profile" },
      sourceFingerprint: manifest.sourceFingerprint,
      sourceDurationSec: 10,
      proxyFileExists: true,
    }).state,
    "stale",
  );
  assert.equal(
    assessEditingProxy({
      manifest,
      sourceFingerprint: manifest.sourceFingerprint,
      sourceDurationSec: 10,
      proxyFileExists: false,
    }).state,
    "stale",
  );
});

test("invalid and cancelled manifests never become active", () => {
  assert.equal(
    assessEditingProxy({
      manifest: { ...manifest, validationStatus: "invalid" },
      sourceFingerprint: manifest.sourceFingerprint,
      sourceDurationSec: 10,
      proxyFileExists: true,
    }).state,
    "failed",
  );
  assert.equal(
    assessEditingProxy({
      manifest: { ...manifest, validationStatus: "cancelled" },
      sourceFingerprint: manifest.sourceFingerprint,
      sourceDurationSec: 10,
      proxyFileExists: true,
    }).state,
    "cancelled",
  );
});

test("proxy paths are job-contained and source overwrite is blocked", () => {
  assert.doesNotThrow(() =>
    assertProxyPathSafety({
      jobDirectory: "/data/job",
      sourcePath: "/data/job/source.mp4",
      proxyDirectory: "/data/job/proxy",
      outputPath: "/data/job/proxy/editing-720p.mp4",
      temporaryPath: "/data/job/proxy/temporary-generation-file.mp4",
    }),
  );
  assert.throws(() =>
    assertProxyPathSafety({
      jobDirectory: "/data/job",
      sourcePath: "/data/job/source.mp4",
      proxyDirectory: "/data/job/proxy",
      outputPath: "/data/out.mp4",
      temporaryPath: "/data/job/proxy/temp.mp4",
    }),
  );
  assert.throws(() =>
    assertProxyPathSafety({
      jobDirectory: "/data/job",
      sourcePath: "/data/job/source.mp4",
      proxyDirectory: "/data/job/proxy",
      outputPath: "/data/job/source.mp4",
      temporaryPath: "/data/job/proxy/temp.mp4",
    }),
  );
});

test("ffmpeg arguments use no shell and encode the complete Safari profile", () => {
  const args = buildEditingProxyFfmpegArguments({
    sourcePath: "/data/job/source video.mp4",
    temporaryPath: "/data/job/proxy/temporary-generation-file.mp4",
    sourceFrameRate: 25,
  });
  assert.equal(args.includes("/data/job/source video.mp4"), true);
  assert.equal(args.includes("libx264"), true);
  assert.equal(args.includes("yuv420p"), true);
  assert.equal(args.includes("aac"), true);
  assert.equal(args.includes("+faststart"), true);
  assert.equal(args.includes("25"), true);
  assert.equal(args.includes("0"), true);
  assert.equal(args.includes("/data/job/proxy/temporary-generation-file.mp4"), true);
  assert.equal(args.some((arg) => /[;&|`]/.test(arg)), false);
  const scale = args[args.indexOf("-vf") + 1];
  assert.match(scale, /force_original_aspect_ratio=decrease/);
  assert.match(scale, /min\(1280,iw\)/);
  assert.match(scale, /min\(720,ih\)/);
});

test("GOP derives deterministically from the preserved source frame rate", () => {
  assert.equal(deterministicGopFrames(25), 25);
  assert.equal(deterministicGopFrames(29.97), 30);
  assert.throws(() => deterministicGopFrames(Number.NaN));
});

test("ffprobe requires a readable video stream and records optional audio", () => {
  const parsed = parseFfprobeResult({
    streams: [
      {
        codec_type: "video",
        codec_name: "h264",
        pix_fmt: "yuv420p",
        width: 1280,
        height: 720,
        avg_frame_rate: "25/1",
        start_time: "0",
        duration: "10",
      },
      {
        codec_type: "audio",
        codec_name: "aac",
        channels: 2,
        channel_layout: "stereo",
        sample_rate: "48000",
      },
    ],
    format: { duration: "10", start_time: "0" },
  });
  assert.equal(parsed.videoCodec, "h264");
  assert.equal(parsed.audioCodec, "aac");
  assert.equal(parsed.audioChannels, 2);
  assert.equal(parsed.audioSampleRate, 48000);
  assert.throws(() => parseFfprobeResult({ streams: [], format: {} }));
});

test("ffprobe records a video-only proxy with explicit absent audio status", () => {
  const parsed = parseFfprobeResult({
    streams: [
      {
        codec_type: "video",
        codec_name: "h264",
        pix_fmt: "yuv420p",
        width: 1280,
        height: 720,
        avg_frame_rate: "25/1",
      },
    ],
    format: { duration: "10", start_time: "0" },
  });
  assert.equal(parsed.audioCodec, null);
  assert.equal(parsed.audioChannels, null);
  assert.equal(parsed.audioSampleRate, null);
});

test("duration tolerance passes at 0.25 seconds and fails above it", () => {
  assert.equal(
    validateEditingProxy({
      metadata: { ...metadata, durationSec: 10.25 },
      sourceDurationSec: 10,
      fileSize: 100,
    }).valid,
    true,
  );
  assert.equal(
    validateEditingProxy({
      metadata: { ...metadata, durationSec: 10.251 },
      sourceDurationSec: 10,
      fileSize: 100,
    }).valid,
    false,
  );
});

test("validation rejects empty, offset, oversized, and incompatible proxy media", () => {
  const result = validateEditingProxy({
    metadata: {
      ...metadata,
      startTimeSec: 0.2,
      width: 1920,
      videoCodec: "hevc",
      pixelFormat: "yuv444p",
      audioCodec: "opus",
    },
    sourceDurationSec: 10,
    fileSize: 0,
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length >= 5, true);
});

test("zero-offset validation passes and rejects offsets beyond profile tolerance", () => {
  assert.equal(
    validateEditingProxy({
      metadata: { ...metadata, startTimeSec: 0 },
      sourceDurationSec: 10,
      fileSize: 100,
    }).valid,
    true,
  );
  assert.equal(
    validateEditingProxy({
      metadata: { ...metadata, startTimeSec: 0.051 },
      sourceDurationSec: 10,
      fileSize: 100,
    }).valid,
    false,
  );
});

test("ffmpeg progress parses elapsed media time, speed, and completion", () => {
  assert.deepEqual(
    parseFfmpegProgress({ out_time_us: "2500000", speed: "3.5x", progress: "continue" }),
    { outTimeSec: 2.5, speed: 3.5, completed: false },
  );
  assert.equal(parseFfmpegProgress({ progress: "end" }).completed, true);
});

test("Safari byte ranges support closed, open, and suffix requests", () => {
  assert.deepEqual(parseSingleByteRange("bytes=0-1", 100), {
    ok: true,
    start: 0,
    end: 1,
    length: 2,
  });
  assert.deepEqual(parseSingleByteRange("bytes=90-", 100), {
    ok: true,
    start: 90,
    end: 99,
    length: 10,
  });
  assert.deepEqual(parseSingleByteRange("bytes=-10", 100), {
    ok: true,
    start: 90,
    end: 99,
    length: 10,
  });
});

test("invalid or multi-range requests return a 416 contract", () => {
  assert.equal(parseSingleByteRange("bytes=100-101", 100).ok, false);
  assert.equal(parseSingleByteRange("bytes=0-1,4-5", 100).ok, false);
  assert.equal(parseSingleByteRange("items=0-1", 100).ok, false);
});

test("proxy media headers are cacheable, fingerprint-bound, and range-correct", () => {
  assert.deepEqual(
    editingProxyMediaHeaders({
      fileSize: 100,
      etag: "cache-key",
      range: { start: 10, end: 19 },
    }),
    {
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: '"cache-key"',
      "Content-Length": "10",
      "Content-Range": "bytes 10-19/100",
    },
  );
});

test("full proxy responses advertise the complete length without a range", () => {
  const headers = editingProxyMediaHeaders({
    fileSize: 100,
    etag: "cache-key",
  });
  assert.equal(headers["Content-Length"], "100");
  assert.equal(headers["Content-Range"], undefined);
  assert.equal(headers["Accept-Ranges"], "bytes");
});

test("proxy store keeps outputs job-bound and writes readable manifests atomically", async () => {
  const root = await mkdtemp(join(tmpdir(), "retroverse-proxy-store-"));
  try {
    const sourcePath = join(root, "source.mp4");
    await writeFile(sourcePath, "fixture");
    const paths = editingProxyPaths(root, sourcePath);
    await writeEditingProxyManifest(paths.manifestPath, manifest);
    assert.deepEqual(await readEditingProxyManifest(paths.manifestPath), manifest);
    assert.equal(JSON.parse(await readFile(paths.manifestPath, "utf8")).version, 1);
    assert.equal(paths.proxyPath.startsWith(`${root}/proxy/`), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("proxy store rejects malformed manifests and cleans only the temporary file", async () => {
  const root = await mkdtemp(join(tmpdir(), "retroverse-proxy-clean-"));
  try {
    const sourcePath = join(root, "source.mp4");
    await writeFile(sourcePath, "source");
    const paths = editingProxyPaths(root, sourcePath);
    await writeEditingProxyManifest(paths.manifestPath, {
      ...manifest,
      version: 2,
    } as unknown as EditingProxyManifest);
    assert.equal(await readEditingProxyManifest(paths.manifestPath), null);
    await writeFile(paths.temporaryPath, "partial");
    await writeFile(paths.proxyPath, "valid");
    await removeIncompleteProxy(paths);
    await assert.rejects(stat(paths.temporaryPath));
    assert.equal((await stat(paths.proxyPath)).size, 5);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source snapshots detect any source replacement during generation", async () => {
  const root = await mkdtemp(join(tmpdir(), "retroverse-proxy-source-"));
  try {
    const sourcePath = join(root, "source.mp4");
    await writeFile(sourcePath, "before");
    const before = await snapshotSourceFile(sourcePath);
    assert.equal(sourceSnapshotsMatch(before, await snapshotSourceFile(sourcePath)), true);
    await writeFile(sourcePath, "after replacement");
    const after = await snapshotSourceFile(sourcePath);
    assert.equal(sourceSnapshotsMatch(before, after), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("proxy streaming closes cleanly when Safari cancels a range request", async () => {
  const source = new PassThrough();
  const reader = nodeReadableToWeb(source).getReader();
  source.write(Buffer.from("range"));
  const first = await reader.read();
  assert.equal(Buffer.from(first.value ?? []).toString("utf8"), "range");
  await reader.cancel();
  assert.equal(source.destroyed, true);
  assert.doesNotThrow(() => source.write(Buffer.from("late data")));
});
