import "server-only";

import { execFile } from "child_process";
import { promisify } from "util";

import { findYtDlp } from "@/lib/ops/media-collections/ytdlp";

import { classifyYouTubeCandidate } from "./classify-candidate";
import { defaultSearchQuery } from "./filenames";
import { youtubeThumbnailUrl } from "./paths";
import type { VideoCandidate } from "./types";

const execFileAsync = promisify(execFile);

type YtDlpFlatEntry = {
  id?: string;
  title?: string;
  url?: string;
  webpage_url?: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  upload_date?: string;
  view_count?: number;
  availability?: string;
  live_status?: string;
};

type YtDlpSearchJson = {
  entries?: YtDlpFlatEntry[];
};

function entryToCandidate(entry: YtDlpFlatEntry): VideoCandidate | null {
  const videoId = entry.id?.trim();
  if (!videoId) return null;
  const title = entry.title?.trim() || videoId;
  const channel = entry.channel?.trim() || entry.uploader?.trim() || "Unknown channel";
  const webpageUrl =
    entry.webpage_url?.trim() ||
    entry.url?.trim() ||
    `https://www.youtube.com/watch?v=${videoId}`;
  const durationSeconds =
    typeof entry.duration === "number" && Number.isFinite(entry.duration) ? entry.duration : null;

  return {
    videoId,
    title,
    webpageUrl,
    thumbnailUrl: youtubeThumbnailUrl(videoId),
    channel,
    durationSeconds,
    uploadDate: entry.upload_date?.trim() || null,
    viewCount:
      typeof entry.view_count === "number" && Number.isFinite(entry.view_count)
        ? entry.view_count
        : null,
    availability: entry.availability?.trim() || null,
    liveStatus: entry.live_status?.trim() || null,
    candidateType: classifyYouTubeCandidate(title, channel, durationSeconds),
  };
}

export async function searchYouTubeCandidates(input: {
  artist: string;
  title: string;
  query?: string | null;
  limit?: number;
}): Promise<{ query: string; candidates: VideoCandidate[]; error?: string }> {
  const ytdlp = await findYtDlp();
  if (!ytdlp) {
    return {
      query: input.query?.trim() || defaultSearchQuery(input.artist, input.title),
      candidates: [],
      error: "yt-dlp not found on PATH",
    };
  }

  const query = (input.query?.trim() || defaultSearchQuery(input.artist, input.title)).replace(/\s+/g, " ").trim();
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 8);
  const searchTarget = `ytsearch${limit}:${query}`;

  try {
    const { stdout } = await execFileAsync(
      ytdlp,
      ["--flat-playlist", "-J", "--no-warnings", searchTarget],
      { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as YtDlpSearchJson | YtDlpFlatEntry;
    const entries = Array.isArray((parsed as YtDlpSearchJson).entries)
      ? ((parsed as YtDlpSearchJson).entries ?? [])
      : [parsed as YtDlpFlatEntry];

    const candidates: VideoCandidate[] = [];
    const seen = new Set<string>();
    for (const entry of entries) {
      const candidate = entryToCandidate(entry);
      if (!candidate || seen.has(candidate.videoId)) continue;
      seen.add(candidate.videoId);
      candidates.push(candidate);
      if (candidates.length >= limit) break;
    }

    return { query, candidates };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { query, candidates: [], error: message.slice(0, 400) };
  }
}
