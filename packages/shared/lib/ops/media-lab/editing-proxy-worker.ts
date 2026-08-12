import { spawn, type ChildProcess } from "node:child_process";
import { rename, rm, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import {
  EDITING_PROXY_PROFILE,
  buildEditingProxyFfmpegArguments,
  parseFfmpegProgress,
  parseFfprobeResult,
  proxyCacheKey,
  validateEditingProxy,
  type EditingProxyManifest,
  type MediaTechnicalMetadata,
} from "./editing-proxy";
import {
  ensureEditingProxyDirectory,
  inspectEditingProxy,
  removeIncompleteProxy,
  snapshotSourceFile,
  sourceSnapshotsMatch,
  writeEditingProxyManifest,
  type EditingProxyJobContext,
} from "./editing-proxy-store";

const execFileAsync = promisify(execFile);

export type ProxyGenerationStatus = {
  key: string;
  state: "preparing" | "ready" | "failed" | "cancelled";
  phase: "inspecting" | "encoding" | "validating" | "completed" | "failed" | "cancelled";
  progressPct: number;
  outTimeSec: number;
  elapsedSec: number;
  speed: number | null;
  startedAt: string;
  updatedAt: string;
  error: string | null;
  manifest: EditingProxyManifest | null;
  cancelRequested: boolean;
  process: ChildProcess | null;
};

const registryOwner = globalThis as typeof globalThis & {
  __retroverseEditingProxyJobs?: Map<string, ProxyGenerationStatus>;
};
const generationRegistry =
  registryOwner.__retroverseEditingProxyJobs ??
  (registryOwner.__retroverseEditingProxyJobs = new Map());

function publicStatus(status: ProxyGenerationStatus): ProxyGenerationStatus {
  return { ...status, process: null };
}

export function editingProxyGenerationKey(
  context: EditingProxyJobContext,
): string {
  return `${context.year}:${context.jobSlug}:${proxyCacheKey(
    context.job.sourceFingerprint!,
  )}`;
}

export function getProxyGenerationStatus(
  context: EditingProxyJobContext,
): ProxyGenerationStatus | null {
  const status = generationRegistry.get(editingProxyGenerationKey(context));
  if (!status) return null;
  const elapsedSec = Math.max(
    0,
    (Date.now() - Date.parse(status.startedAt)) / 1000,
  );
  return publicStatus({ ...status, elapsedSec });
}

async function inspectMedia(filePath: string): Promise<MediaTechnicalMetadata> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=format_name,start_time,duration,size,bit_rate:stream=index,codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,start_time,duration,sample_rate,channels,channel_layout",
      "-of",
      "json",
      filePath,
    ],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  return parseFfprobeResult(JSON.parse(stdout));
}

async function ffmpegVersion(): Promise<string> {
  const { stdout } = await execFileAsync("ffmpeg", ["-version"], {
    maxBuffer: 1024 * 1024,
  });
  return stdout.split("\n")[0]?.trim() ?? "unknown";
}

function updateStatus(
  key: string,
  patch: Partial<ProxyGenerationStatus>,
): ProxyGenerationStatus {
  const current = generationRegistry.get(key);
  if (!current) throw new Error("Proxy generation status disappeared");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  generationRegistry.set(key, next);
  return next;
}

function failureManifest(options: {
  context: EditingProxyJobContext;
  status: "invalid" | "cancelled";
  reason: string;
  args: string[];
  ffmpegVersion: string;
  sourceAfter?: Awaited<ReturnType<typeof snapshotSourceFile>>;
}): EditingProxyManifest {
  return {
    version: 1,
    sourceFingerprint: options.context.job.sourceFingerprint!,
    sourceFilename: options.context.job.sourceFilename,
    sourceDurationSec: options.context.job.durationSeconds!,
    proxyFilename: EDITING_PROXY_PROFILE.proxyFilename,
    proxyProfile: EDITING_PROXY_PROFILE.id,
    proxyDurationSec: null,
    width: null,
    height: null,
    frameRate: null,
    videoCodec: null,
    audioCodec: null,
    audioChannels: null,
    audioChannelLayout: null,
    audioSampleRate: null,
    keyframeIntervalSec: EDITING_PROXY_PROFILE.keyframeIntervalSec,
    createdAt: new Date().toISOString(),
    ffmpegVersion: options.ffmpegVersion,
    ffmpegArguments: options.args,
    ffprobeResult: {},
    validationStatus: options.status,
    failureReason: options.reason,
    sourceSnapshotBefore: options.context.sourceSnapshot,
    sourceSnapshotAfter: options.sourceAfter,
  };
}

async function runProxyGeneration(
  context: EditingProxyJobContext,
  key: string,
): Promise<void> {
  let args: string[] = [];
  let version = "unavailable";
  const startMs = Date.now();
  try {
    if (!context.sourceFingerprintMatches) {
      throw new Error("Source fingerprint mismatch; proxy generation is blocked");
    }
    await ensureEditingProxyDirectory(context.paths);
    await removeIncompleteProxy(context.paths);
    const [sourceMetadata, detectedVersion] = await Promise.all([
      inspectMedia(context.sourcePath),
      ffmpegVersion(),
    ]);
    version = detectedVersion;
    args = buildEditingProxyFfmpegArguments({
      sourcePath: context.sourcePath,
      temporaryPath: context.paths.temporaryPath,
      sourceFrameRate: sourceMetadata.frameRate,
    });
    updateStatus(key, { phase: "encoding" });
    const child = spawn("ffmpeg", args, {
      cwd: context.paths.proxyDirectory,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    updateStatus(key, { process: child });
    let stdoutBuffer = "";
    let stderrTail = "";
    const progressValues: Record<string, string> = {};
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const separator = line.indexOf("=");
        if (separator <= 0) continue;
        progressValues[line.slice(0, separator)] = line.slice(separator + 1);
        if (line.startsWith("progress=")) {
          const parsed = parseFfmpegProgress(progressValues);
          updateStatus(key, {
            outTimeSec: parsed.outTimeSec,
            progressPct: Math.max(
              0,
              Math.min(
                99.5,
                (parsed.outTimeSec / context.job.durationSeconds!) * 100,
              ),
            ),
            speed: parsed.speed,
            elapsedSec: (Date.now() - startMs) / 1000,
          });
        }
      }
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderrTail = `${stderrTail}${chunk}`.slice(-12_000);
    });
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    const afterEncoding = generationRegistry.get(key);
    if (afterEncoding?.cancelRequested) {
      throw Object.assign(new Error("Proxy preparation cancelled"), {
        cancelled: true,
      });
    }
    if (exitCode !== 0) {
      throw new Error(
        `ffmpeg exited with code ${exitCode}: ${stderrTail.trim().slice(-2_000)}`,
      );
    }

    updateStatus(key, { phase: "validating", process: null, progressPct: 99.5 });
    const proxyStat = await stat(context.paths.temporaryPath);
    const proxyMetadata = await inspectMedia(context.paths.temporaryPath);
    const validation = validateEditingProxy({
      metadata: proxyMetadata,
      sourceDurationSec: context.job.durationSeconds!,
      fileSize: proxyStat.size,
    });
    const sourceAfter = await snapshotSourceFile(context.sourcePath);
    if (!sourceSnapshotsMatch(context.sourceSnapshot, sourceAfter)) {
      validation.errors.push("Source changed during proxy generation");
      validation.valid = false;
    }
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }

    await rename(context.paths.temporaryPath, context.paths.proxyPath);
    const finalStat = await stat(context.paths.proxyPath);
    const generationWallTimeSec = (Date.now() - startMs) / 1000;
    const manifest: EditingProxyManifest = {
      version: 1,
      sourceFingerprint: context.job.sourceFingerprint!,
      sourceFilename: context.job.sourceFilename,
      sourceDurationSec: context.job.durationSeconds!,
      proxyFilename: EDITING_PROXY_PROFILE.proxyFilename,
      proxyProfile: EDITING_PROXY_PROFILE.id,
      proxyDurationSec: proxyMetadata.durationSec,
      width: proxyMetadata.width,
      height: proxyMetadata.height,
      frameRate: proxyMetadata.frameRate,
      videoCodec: proxyMetadata.videoCodec,
      audioCodec: proxyMetadata.audioCodec,
      audioChannels: proxyMetadata.audioChannels,
      audioChannelLayout: proxyMetadata.audioChannelLayout,
      audioSampleRate: proxyMetadata.audioSampleRate,
      keyframeIntervalSec: EDITING_PROXY_PROFILE.keyframeIntervalSec,
      createdAt: new Date().toISOString(),
      ffmpegVersion: version,
      ffmpegArguments: args,
      ffprobeResult: proxyMetadata.raw,
      validationStatus: "valid",
      sourceSnapshotBefore: context.sourceSnapshot,
      sourceSnapshotAfter: sourceAfter,
      proxySizeBytes: finalStat.size,
      generationWallTimeSec,
      generationSpeed:
        context.job.durationSeconds! / Math.max(0.001, generationWallTimeSec),
    };
    await writeEditingProxyManifest(context.paths.manifestPath, manifest);
    updateStatus(key, {
      state: "ready",
      phase: "completed",
      progressPct: 100,
      outTimeSec: context.job.durationSeconds!,
      elapsedSec: generationWallTimeSec,
      process: null,
      error: null,
      manifest,
    });
  } catch (error) {
    const cancelled = Boolean(
      (error as Error & { cancelled?: boolean }).cancelled ||
        generationRegistry.get(key)?.cancelRequested,
    );
    const reason = error instanceof Error ? error.message : "Proxy generation failed";
    await rm(context.paths.temporaryPath, { force: true }).catch(() => undefined);
    const sourceAfter = await snapshotSourceFile(context.sourcePath).catch(
      () => undefined,
    );
    const manifest = failureManifest({
      context,
      status: cancelled ? "cancelled" : "invalid",
      reason,
      args,
      ffmpegVersion: version,
      sourceAfter,
    });
    await writeEditingProxyManifest(context.paths.manifestPath, manifest).catch(
      () => undefined,
    );
    updateStatus(key, {
      state: cancelled ? "cancelled" : "failed",
      phase: cancelled ? "cancelled" : "failed",
      process: null,
      error: reason,
      manifest,
      elapsedSec: (Date.now() - startMs) / 1000,
    });
  }
}

export async function startEditingProxyGeneration(
  context: EditingProxyJobContext,
): Promise<ProxyGenerationStatus> {
  const existingReadiness = await inspectEditingProxy(context);
  if (existingReadiness.state === "ready") {
    const now = new Date().toISOString();
    return {
      key: editingProxyGenerationKey(context),
      state: "ready",
      phase: "completed",
      progressPct: 100,
      outTimeSec: context.job.durationSeconds!,
      elapsedSec: existingReadiness.manifest.generationWallTimeSec ?? 0,
      speed: existingReadiness.manifest.generationSpeed ?? null,
      startedAt: existingReadiness.manifest.createdAt,
      updatedAt: now,
      error: null,
      manifest: existingReadiness.manifest,
      cancelRequested: false,
      process: null,
    };
  }
  const key = editingProxyGenerationKey(context);
  const current = generationRegistry.get(key);
  if (current?.state === "preparing") return publicStatus(current);
  const now = new Date().toISOString();
  const status: ProxyGenerationStatus = {
    key,
    state: "preparing",
    phase: "inspecting",
    progressPct: 0,
    outTimeSec: 0,
    elapsedSec: 0,
    speed: null,
    startedAt: now,
    updatedAt: now,
    error: null,
    manifest: null,
    cancelRequested: false,
    process: null,
  };
  generationRegistry.set(key, status);
  void runProxyGeneration(context, key);
  return publicStatus(status);
}

export async function cancelEditingProxyGeneration(
  context: EditingProxyJobContext,
): Promise<ProxyGenerationStatus | null> {
  const key = editingProxyGenerationKey(context);
  const current = generationRegistry.get(key);
  if (!current || current.state !== "preparing") return null;
  const next = updateStatus(key, { cancelRequested: true });
  next.process?.kill("SIGTERM");
  return publicStatus(next);
}
