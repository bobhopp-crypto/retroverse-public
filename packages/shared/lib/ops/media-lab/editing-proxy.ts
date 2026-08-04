import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";

export const EDITING_PROXY_PROFILE = {
  id: "browser-edit-720p-v1",
  proxyFilename: "editing-720p.mp4",
  temporaryFilename: "temporary-generation-file.mp4",
  manifestFilename: "proxy-manifest.json",
  maxWidth: 1280,
  maxHeight: 720,
  keyframeIntervalSec: 1,
  durationToleranceSec: 0.25,
  startTimeToleranceSec: 0.05,
  crf: 22,
  preset: "faster",
  audioBitrate: "160k",
} as const;

export type EditingProxyProfile = typeof EDITING_PROXY_PROFILE;

export type MediaTechnicalMetadata = {
  durationSec: number;
  startTimeSec: number;
  width: number;
  height: number;
  frameRate: number;
  videoCodec: string;
  pixelFormat: string;
  audioCodec: string | null;
  audioChannels: number | null;
  audioChannelLayout: string | null;
  audioSampleRate: number | null;
  raw: unknown;
};

export type SourceFileSnapshot = {
  path: string;
  size: number;
  mtimeMs: number;
  fingerprint: string;
};

export type EditingProxyManifest = {
  version: 1;
  sourceFingerprint: string;
  sourceFilename: string;
  sourceDurationSec: number;
  proxyFilename: string;
  proxyProfile: string;
  proxyDurationSec: number | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  audioChannels: number | null;
  audioChannelLayout: string | null;
  audioSampleRate: number | null;
  keyframeIntervalSec: number;
  createdAt: string;
  ffmpegVersion: string;
  ffmpegArguments: string[];
  ffprobeResult: unknown;
  validationStatus: "valid" | "invalid" | "cancelled";
  failureReason?: string;
  sourceSnapshotBefore?: SourceFileSnapshot;
  sourceSnapshotAfter?: SourceFileSnapshot;
  proxySizeBytes?: number;
  generationWallTimeSec?: number;
  generationSpeed?: number;
};

export type ProxyReadiness =
  | { state: "missing"; reason: string }
  | { state: "ready"; reason: string; manifest: EditingProxyManifest }
  | { state: "stale"; reason: string; manifest: EditingProxyManifest }
  | { state: "failed"; reason: string; manifest: EditingProxyManifest }
  | { state: "cancelled"; reason: string; manifest: EditingProxyManifest };

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function parseNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return finite(parsed) ? parsed : Number.NaN;
}

function parseFrameRate(value: unknown): number {
  if (typeof value === "number") return finite(value) ? value : Number.NaN;
  if (typeof value !== "string") return Number.NaN;
  const [numerator, denominator = "1"] = value.split("/");
  const top = Number(numerator);
  const bottom = Number(denominator);
  return finite(top) && finite(bottom) && bottom !== 0
    ? top / bottom
    : Number.NaN;
}

export function proxyCacheKey(
  sourceFingerprint: string,
  profileId = EDITING_PROXY_PROFILE.id,
): string {
  return createHash("sha256")
    .update(`${sourceFingerprint}\0${profileId}`)
    .digest("hex");
}

export function isContainedPath(candidate: string, parent: string): boolean {
  const target = resolve(candidate);
  const root = resolve(parent);
  return target === root || target.startsWith(`${root}${sep}`);
}

export function assertProxyPathSafety(options: {
  jobDirectory: string;
  sourcePath: string;
  proxyDirectory: string;
  outputPath: string;
  temporaryPath: string;
}): void {
  if (!isContainedPath(options.proxyDirectory, options.jobDirectory)) {
    throw new Error("Proxy directory escapes the Media Lab job");
  }
  if (!isContainedPath(options.outputPath, options.proxyDirectory)) {
    throw new Error("Proxy output escapes the approved proxy directory");
  }
  if (!isContainedPath(options.temporaryPath, options.proxyDirectory)) {
    throw new Error("Temporary proxy escapes the approved proxy directory");
  }
  if (resolve(options.outputPath) === resolve(options.sourcePath)) {
    throw new Error("Proxy output would overwrite the source");
  }
  if (resolve(options.temporaryPath) === resolve(options.sourcePath)) {
    throw new Error("Temporary proxy would overwrite the source");
  }
}

export function deterministicGopFrames(
  frameRate: number,
  profile: EditingProxyProfile = EDITING_PROXY_PROFILE,
): number {
  if (!finite(frameRate) || frameRate <= 0) {
    throw new Error("Source frame rate is required for the proxy GOP");
  }
  return Math.max(1, Math.round(frameRate * profile.keyframeIntervalSec));
}

export function buildEditingProxyFfmpegArguments(options: {
  sourcePath: string;
  temporaryPath: string;
  sourceFrameRate: number;
  profile?: EditingProxyProfile;
}): string[] {
  const profile = options.profile ?? EDITING_PROXY_PROFILE;
  const gopFrames = deterministicGopFrames(options.sourceFrameRate, profile);
  const scale = `scale=w='min(${profile.maxWidth},iw)':h='min(${profile.maxHeight},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;
  return [
    "-hide_banner",
    "-nostdin",
    "-y",
    "-i",
    options.sourcePath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-vf",
    scale,
    "-c:v",
    "libx264",
    "-preset",
    profile.preset,
    "-crf",
    String(profile.crf),
    "-pix_fmt",
    "yuv420p",
    "-g",
    String(gopFrames),
    "-keyint_min",
    String(gopFrames),
    "-sc_threshold",
    "0",
    "-bf",
    "0",
    "-flags",
    "+cgop",
    "-x264-params",
    `keyint=${gopFrames}:min-keyint=${gopFrames}:scenecut=0:open-gop=0`,
    "-c:a",
    "aac",
    "-b:a",
    profile.audioBitrate,
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    "-max_muxing_queue_size",
    "1024",
    "-progress",
    "pipe:1",
    "-nostats",
    options.temporaryPath,
  ];
}

export function parseFfprobeResult(raw: unknown): MediaTechnicalMetadata {
  if (!raw || typeof raw !== "object") {
    throw new Error("ffprobe returned no readable container metadata");
  }
  const candidate = raw as {
    streams?: Array<Record<string, unknown>>;
    format?: Record<string, unknown>;
  };
  const streams = Array.isArray(candidate.streams) ? candidate.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error("ffprobe found no video stream");
  const audio = streams.find((stream) => stream.codec_type === "audio");
  const durationSec = parseNumber(
    candidate.format?.duration ?? video.duration,
  );
  const startTimeSec = parseNumber(
    candidate.format?.start_time ?? video.start_time ?? 0,
  );
  const frameRate = parseFrameRate(video.avg_frame_rate ?? video.r_frame_rate);
  return {
    durationSec,
    startTimeSec: finite(startTimeSec) ? startTimeSec : 0,
    width: parseNumber(video.width),
    height: parseNumber(video.height),
    frameRate,
    videoCodec: String(video.codec_name ?? ""),
    pixelFormat: String(video.pix_fmt ?? ""),
    audioCodec: audio ? String(audio.codec_name ?? "") || null : null,
    audioChannels: audio ? parseNumber(audio.channels) : null,
    audioChannelLayout: audio
      ? String(audio.channel_layout ?? "") || null
      : null,
    audioSampleRate: audio ? parseNumber(audio.sample_rate) : null,
    raw,
  };
}

export function validateEditingProxy(options: {
  metadata: MediaTechnicalMetadata;
  sourceDurationSec: number;
  fileSize: number;
  profile?: EditingProxyProfile;
}): { valid: boolean; errors: string[]; durationDifferenceSec: number } {
  const profile = options.profile ?? EDITING_PROXY_PROFILE;
  const errors: string[] = [];
  const metadata = options.metadata;
  const durationDifferenceSec = Math.abs(
    metadata.durationSec - options.sourceDurationSec,
  );
  if (!finite(options.fileSize) || options.fileSize <= 0) {
    errors.push("Proxy file is empty");
  }
  if (!finite(metadata.durationSec) || metadata.durationSec <= 0) {
    errors.push("Proxy duration is unreadable");
  } else if (durationDifferenceSec > profile.durationToleranceSec) {
    errors.push(
      `Proxy duration differs from source by ${durationDifferenceSec.toFixed(3)} seconds`,
    );
  }
  if (!finite(metadata.startTimeSec) || Math.abs(metadata.startTimeSec) > profile.startTimeToleranceSec) {
    errors.push("Proxy start time is not compatible with one-to-one source time");
  }
  if (!metadata.videoCodec) errors.push("Proxy video codec is unreadable");
  if (metadata.videoCodec && metadata.videoCodec !== "h264") {
    errors.push(`Proxy video codec ${metadata.videoCodec} is not H.264`);
  }
  if (metadata.pixelFormat && metadata.pixelFormat !== "yuv420p") {
    errors.push(`Proxy pixel format ${metadata.pixelFormat} is not yuv420p`);
  }
  if (
    !finite(metadata.width) ||
    !finite(metadata.height) ||
    metadata.width <= 0 ||
    metadata.height <= 0
  ) {
    errors.push("Proxy dimensions are unreadable");
  } else if (metadata.width > profile.maxWidth || metadata.height > profile.maxHeight) {
    errors.push("Proxy dimensions exceed the editing profile");
  }
  if (!finite(metadata.frameRate) || metadata.frameRate <= 0) {
    errors.push("Proxy frame rate is unreadable");
  }
  if (metadata.audioCodec && metadata.audioCodec !== "aac") {
    errors.push(`Proxy audio codec ${metadata.audioCodec} is not AAC`);
  }
  return { valid: errors.length === 0, errors, durationDifferenceSec };
}

export function assessEditingProxy(options: {
  manifest: EditingProxyManifest | null;
  sourceFingerprint: string;
  sourceDurationSec: number;
  proxyFileExists: boolean;
  profile?: EditingProxyProfile;
}): ProxyReadiness {
  const profile = options.profile ?? EDITING_PROXY_PROFILE;
  const manifest = options.manifest;
  if (!manifest) return { state: "missing", reason: "No editing proxy has been prepared" };
  if (manifest.validationStatus === "cancelled") {
    return { state: "cancelled", reason: manifest.failureReason ?? "Proxy preparation was cancelled", manifest };
  }
  if (manifest.validationStatus !== "valid") {
    return { state: "failed", reason: manifest.failureReason ?? "Proxy validation failed", manifest };
  }
  if (manifest.sourceFingerprint !== options.sourceFingerprint) {
    return { state: "stale", reason: "Proxy source fingerprint is stale", manifest };
  }
  if (manifest.proxyProfile !== profile.id) {
    return { state: "stale", reason: "Proxy profile version is stale", manifest };
  }
  if (!options.proxyFileExists) {
    return { state: "stale", reason: "Proxy media file is missing", manifest };
  }
  if (
    manifest.proxyDurationSec == null ||
    Math.abs(manifest.proxyDurationSec - options.sourceDurationSec) >
      profile.durationToleranceSec
  ) {
    return { state: "stale", reason: "Proxy duration no longer matches the source", manifest };
  }
  return { state: "ready", reason: "Validated editing proxy is ready", manifest };
}

export function parseFfmpegProgress(lines: Record<string, string>): {
  outTimeSec: number;
  speed: number | null;
  completed: boolean;
} {
  const outTimeUs = Number(lines.out_time_us ?? lines.out_time_ms ?? "0");
  const speedText = lines.speed?.replace(/x$/i, "") ?? "";
  const speed = Number(speedText);
  return {
    outTimeSec: finite(outTimeUs) ? outTimeUs / 1_000_000 : 0,
    speed: finite(speed) ? speed : null,
    completed: lines.progress === "end",
  };
}
