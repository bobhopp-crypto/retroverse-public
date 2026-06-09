"use client";

import type { PlaybackResolveResult } from "./types";

export type PlayTrackInput = {
  rvtr: string;
  title?: string;
  artist?: string;
};

function logPlayback(stage: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[playback] ${stage}`, payload);
}

export async function playTrackByRvtr(input: PlayTrackInput): Promise<{
  ok: boolean;
  result?: PlaybackResolveResult;
  error?: string;
}> {
  const rvtr = input.rvtr.trim().toUpperCase();
  logPlayback("click", { rvtr, title: input.title, artist: input.artist });

  if (!/^RVTR\d{6}$/.test(rvtr)) {
    logPlayback("launch", { ok: false, reason: "invalid_rvtr", rvtr });
    return { ok: false, error: "invalid_rvtr" };
  }

  const params = new URLSearchParams();
  if (input.title?.trim()) params.set("title", input.title.trim());
  if (input.artist?.trim()) params.set("artist", input.artist.trim());

  let payload: { ok: boolean; error?: string } & Partial<PlaybackResolveResult>;
  try {
    const res = await fetch(`/api/playback/${encodeURIComponent(rvtr)}?${params}`, {
      cache: "no-store",
    });
    payload = (await res.json()) as typeof payload;
    logPlayback("lookup", {
      rvtr,
      status: res.status,
      source: payload.target?.source ?? null,
      url: payload.target?.url ?? null,
      hasVdjMedia: payload.hasVdjMedia ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    logPlayback("lookup", { rvtr, ok: false, error: message });
    return { ok: false, error: message };
  }

  if (!payload.ok || !payload.target?.url) {
    logPlayback("launch", { ok: false, rvtr, error: payload.error ?? "no_target" });
    return { ok: false, error: payload.error ?? "no_target" };
  }

  const url = payload.target.url;
  try {
    window.open(url, "_blank", "noopener,noreferrer");
    logPlayback("launch", { ok: true, rvtr, source: payload.target.source, url });
    return { ok: true, result: payload as PlaybackResolveResult };
  } catch (err) {
    const message = err instanceof Error ? err.message : "open_failed";
    logPlayback("launch", { ok: false, rvtr, error: message });
    return { ok: false, error: message };
  }
}
