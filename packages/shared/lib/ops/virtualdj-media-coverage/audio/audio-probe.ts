import "server-only";

import { execFile } from "child_process";
import { createHash } from "crypto";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import { findFfprobe } from "@/lib/ops/media-collections/validate-download";

import { writeJsonAtomic } from "../atomic-json";
import { isManagedAudioPath } from "../managed-roots";
import { audioProbeCacheDir } from "../paths";
import type { AudioProbeResult } from "../types";

const execFileAsync = promisify(execFile);
const LOSSLESS_CODECS = new Set(["flac", "alac", "pcm_s16le", "pcm_s24le", "pcm_s32le", "pcm_f32le"]);

type ProbeStream = {
  codec_type?: string;
  codec_name?: string;
  codec_long_name?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bit_rate?: string;
  bits_per_sample?: number;
  tags?: Record<string, string>;
};

type ProbePayload = {
  format?: {
    format_name?: string;
    duration?: string;
    size?: string;
    bit_rate?: string;
    tags?: Record<string, string>;
  };
  streams?: ProbeStream[];
};

function numberOrNull(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function tag(tags: Record<string, string> | undefined, ...keys: string[]): string | null {
  if (!tags) return null;
  const lower = new Map(Object.entries(tags).map(([key, value]) => [key.toLowerCase(), value]));
  for (const key of keys) {
    const value = lower.get(key.toLowerCase())?.trim();
    if (value) return value;
  }
  return null;
}

export async function audioFileFingerprint(filePath: string): Promise<{
  fingerprint: string;
  mtimeMs: number;
  size: number;
} | null> {
  if (!isManagedAudioPath(filePath)) return null;
  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) return null;
  const fingerprint = createHash("sha256")
    .update(`${filePath}\0${info.mtimeMs}\0${info.size}`)
    .digest("hex");
  return { fingerprint, mtimeMs: info.mtimeMs, size: info.size };
}

function failed(path: string, fingerprint: string, error: string): AudioProbeResult {
  return {
    ok: false,
    path,
    fingerprint,
    probedAt: new Date().toISOString(),
    formatName: null,
    durationSeconds: null,
    sizeBytes: null,
    formatBitRate: null,
    codecName: null,
    codecLongName: null,
    sampleRate: null,
    channels: null,
    channelLayout: null,
    streamBitRate: null,
    bitsPerSample: null,
    lossless: null,
    tags: { artist: null, title: null, album: null, year: null, track: null, comment: null },
    error,
  };
}

export async function probeManagedAudioFile(filePath: string): Promise<AudioProbeResult> {
  if (!isManagedAudioPath(filePath)) {
    return failed(filePath, "outside-managed-audio", "outside_managed_audio");
  }
  const file = await audioFileFingerprint(filePath);
  if (!file) return failed(filePath, "missing", "file_missing");
  const cachePath = join(audioProbeCacheDir(), `${file.fingerprint}.json`);
  try {
    return JSON.parse(await readFile(cachePath, "utf8")) as AudioProbeResult;
  } catch {
    // Cache miss.
  }

  const ffprobe = await findFfprobe();
  if (!ffprobe) return failed(filePath, file.fingerprint, "ffprobe_not_found");

  let result: AudioProbeResult;
  try {
    const { stdout } = await execFileAsync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=format_name,duration,size,bit_rate:format_tags=artist,title,album,date,year,track,comment:stream=codec_type,codec_name,codec_long_name,sample_rate,channels,channel_layout,bit_rate,bits_per_sample:stream_tags=artist,title,album,date,year,track,comment",
        "-of",
        "json",
        filePath,
      ],
      { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as ProbePayload;
    const audio = parsed.streams?.find((stream) => stream.codec_type === "audio");
    if (!audio) {
      result = failed(filePath, file.fingerprint, "missing_audio_stream");
    } else {
      const formatTags = parsed.format?.tags;
      const streamTags = audio.tags;
      const codecName = audio.codec_name?.toLowerCase() ?? null;
      result = {
        ok: true,
        path: filePath,
        fingerprint: file.fingerprint,
        probedAt: new Date().toISOString(),
        formatName: parsed.format?.format_name ?? null,
        durationSeconds: numberOrNull(parsed.format?.duration),
        sizeBytes: numberOrNull(parsed.format?.size) ?? file.size,
        formatBitRate: numberOrNull(parsed.format?.bit_rate),
        codecName,
        codecLongName: audio.codec_long_name ?? null,
        sampleRate: numberOrNull(audio.sample_rate),
        channels: numberOrNull(audio.channels),
        channelLayout: audio.channel_layout ?? null,
        streamBitRate: numberOrNull(audio.bit_rate),
        bitsPerSample: numberOrNull(audio.bits_per_sample),
        lossless: codecName ? LOSSLESS_CODECS.has(codecName) || codecName.startsWith("pcm_") : null,
        tags: {
          artist: tag(streamTags, "artist") ?? tag(formatTags, "artist"),
          title: tag(streamTags, "title") ?? tag(formatTags, "title"),
          album: tag(streamTags, "album") ?? tag(formatTags, "album"),
          year: tag(streamTags, "date", "year") ?? tag(formatTags, "date", "year"),
          track: tag(streamTags, "track") ?? tag(formatTags, "track"),
          comment: tag(streamTags, "comment") ?? tag(formatTags, "comment"),
        },
        error: null,
      };
    }
  } catch (error) {
    result = failed(
      filePath,
      file.fingerprint,
      `ffprobe_failed: ${error instanceof Error ? error.message.slice(0, 180) : String(error).slice(0, 180)}`,
    );
  }
  await writeJsonAtomic(cachePath, result);
  return result;
}

