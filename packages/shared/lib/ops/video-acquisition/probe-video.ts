import { execFile } from "child_process";
import { stat } from "fs/promises";
import { promisify } from "util";

import { findFfprobe } from "@/lib/ops/media-collections/validate-download";

import type { VideoProbeResult } from "./types";

const execFileAsync = promisify(execFile);

type FfprobeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
};

type FfprobeJson = {
  format?: {
    format_name?: string;
    duration?: string;
    size?: string;
  };
  streams?: FfprobeStream[];
};

export async function probeVideoFile(filePath: string): Promise<VideoProbeResult> {
  let fileSizeBytes = 0;
  try {
    const info = await stat(filePath);
    fileSizeBytes = info.size;
    if (info.size <= 0) {
      return {
        valid: false,
        filepath: filePath,
        fileSizeBytes: info.size,
        durationSeconds: null,
        videoCodec: null,
        audioCodec: null,
        width: null,
        height: null,
        container: null,
        reason: "file_empty",
      };
    }
  } catch {
    return {
      valid: false,
      filepath: filePath,
      fileSizeBytes: 0,
      durationSeconds: null,
      videoCodec: null,
      audioCodec: null,
      width: null,
      height: null,
      container: null,
      reason: "file_missing",
    };
  }

  const ffprobe = await findFfprobe();
  if (!ffprobe) {
    return {
      valid: false,
      filepath: filePath,
      fileSizeBytes,
      durationSeconds: null,
      videoCodec: null,
      audioCodec: null,
      width: null,
      height: null,
      container: null,
      reason: "ffprobe_not_found",
    };
  }

  try {
    const { stdout } = await execFileAsync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=format_name,duration,size:stream=codec_type,codec_name,width,height",
        "-of",
        "json",
        filePath,
      ],
      { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as FfprobeJson;
    const streams = parsed.streams ?? [];
    const video = streams.find((s) => s.codec_type === "video");
    const audio = streams.find((s) => s.codec_type === "audio");
    const durationSeconds = Number.parseFloat(parsed.format?.duration ?? "");
    const container = parsed.format?.format_name ?? null;

    if (!video) {
      return {
        valid: false,
        filepath: filePath,
        fileSizeBytes,
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
        videoCodec: null,
        audioCodec: audio?.codec_name ?? null,
        width: null,
        height: null,
        container,
        reason: "missing_video_stream",
      };
    }
    if (!audio) {
      return {
        valid: false,
        filepath: filePath,
        fileSizeBytes,
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
        videoCodec: video.codec_name ?? null,
        audioCodec: null,
        width: video.width ?? null,
        height: video.height ?? null,
        container,
        reason: "missing_audio_stream",
      };
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return {
        valid: false,
        filepath: filePath,
        fileSizeBytes,
        durationSeconds: null,
        videoCodec: video.codec_name ?? null,
        audioCodec: audio.codec_name ?? null,
        width: video.width ?? null,
        height: video.height ?? null,
        container,
        reason: "invalid_duration",
      };
    }

    return {
      valid: true,
      filepath: filePath,
      fileSizeBytes,
      durationSeconds,
      videoCodec: video.codec_name ?? null,
      audioCodec: audio.codec_name ?? null,
      width: video.width ?? null,
      height: video.height ?? null,
      container,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      filepath: filePath,
      fileSizeBytes,
      durationSeconds: null,
      videoCodec: null,
      audioCodec: null,
      width: null,
      height: null,
      container: null,
      reason: `ffprobe_failed: ${message.slice(0, 160)}`,
    };
  }
}

export function isVirtualDjCompatible(probe: VideoProbeResult): boolean {
  if (!probe.valid) return false;
  const container = probe.container?.toLowerCase() ?? "";
  const videoCodec = probe.videoCodec?.toLowerCase() ?? "";
  const audioCodec = probe.audioCodec?.toLowerCase() ?? "";
  const containerOk = container.includes("mp4") || container.includes("mov");
  const videoOk =
    !videoCodec ||
    videoCodec.includes("h264") ||
    videoCodec.includes("avc1") ||
    videoCodec.includes("mpeg4");
  const audioOk =
    !audioCodec ||
    audioCodec.includes("aac") ||
    audioCodec.includes("mp3") ||
    audioCodec.includes("mp4a");
  return containerOk && videoOk && audioOk;
}
