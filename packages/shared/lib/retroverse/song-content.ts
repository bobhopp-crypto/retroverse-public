import type { TrackPageData } from "@/lib/track/load-track-page";
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export class SongContentMutationError extends Error {
  constructor(public code: "stale" | "invalid" | "not-found", message: string) { super(message); }
}

export async function mutateLocalSongSection(input: { songId: string; section: string; status: ReviewStatus; expectedUpdatedAt?: string | null; reviewer?: string; note?: string; priority?: "Event" | "High" | "Normal" | "Low" }) {
  const safeId = input.songId.trim().toUpperCase();
  if (!/^RVTR\d{6}$/.test(safeId) || !/^[A-Za-z][A-Za-z0-9]*$/.test(input.section)) throw new SongContentMutationError("invalid", "Invalid song or section.");
  const file = path.join(process.cwd(), "..", "live", "data", "public-content", "songs", `${safeId}.json`);
  let raw: any;
  try { raw = JSON.parse(await fs.readFile(file, "utf8")); } catch { throw new SongContentMutationError("not-found", "Song content was not found."); }
  if (raw.songId?.toUpperCase() !== safeId || raw.version !== 1 || !Array.isArray(raw.sources)) throw new SongContentMutationError("invalid", "Invalid song content record.");
  if (input.expectedUpdatedAt && raw.updatedAt !== input.expectedUpdatedAt) throw new SongContentMutationError("stale", "This song content changed since you opened it. Reload before saving.");
  if (input.status === "approved") {
    const value = raw.sections?.[input.section] ?? raw.credits ?? raw.media;
    if (!value) throw new SongContentMutationError("invalid", "Section content is missing.");
    if (input.section !== "credits" && input.section !== "media" && !String(value.text ?? "").trim()) throw new SongContentMutationError("invalid", "Section content is empty.");
    for (const sourceId of value.sources ?? []) { const source = raw.sources.find((item: any) => item.id === sourceId); if (!source) throw new SongContentMutationError("invalid", `Attached source does not exist: ${sourceId}`); if (source.url && !/^https?:\/\//i.test(source.url)) throw new SongContentMutationError("invalid", `Unsafe source URL: ${source.url}`); }
    for (const item of value.items ?? []) if (item.url && !/^https?:\/\//i.test(item.url)) throw new SongContentMutationError("invalid", `Unsafe media URL: ${item.url}`);
  }
  const previousStatus = raw.sections?.[input.section]?.status ?? "draft";
  const previousPriority = raw.priority ?? "Normal";
  if (input.priority && !["Event", "High", "Normal", "Low"].includes(input.priority)) throw new SongContentMutationError("invalid", "Invalid priority.");
  raw.sections ??= {};
  if (input.section !== "priority") { raw.sections[input.section] ??= {}; raw.sections[input.section].status = input.status; }
  raw.updatedAt = new Date().toISOString();
  if (input.priority) raw.priority = input.priority;
  const backupDir = path.join(path.dirname(file), "..", "backups"); await fs.mkdir(backupDir, { recursive: true }); await fs.copyFile(file, path.join(backupDir, `${safeId}.${Date.now()}.json`));
  const temp = `${file}.${process.pid}.tmp`; const mode = (await fs.stat(file)).mode; await fs.writeFile(temp, `${JSON.stringify(raw, null, 2)}\n`, { mode }); await fs.rename(temp, file);
  const historyDir = path.join(path.dirname(file), "..", "review-history"); await fs.mkdir(historyDir, { recursive: true });
  await fs.appendFile(path.join(historyDir, `${safeId}.jsonl`), `${JSON.stringify({ eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date().toISOString(), songId: safeId, section: input.section, previousStatus, newStatus: input.status, previousPriority, newPriority: input.priority ?? previousPriority, operation: input.priority ? "priority-change" : input.status === "approved" ? "approve" : input.status === "rejected" ? "reject" : "draft", reviewer: input.reviewer ?? "BobOS", note: input.note ?? null })}\n`);
  return raw.updatedAt as string;
}

export type SongContentSection = {
  id: "overview" | "why-it-mattered" | "song-journey" | "related-music";
  title: string;
  summary?: string;
  facts: Array<{ label: string; value: string }>;
  status: "approved";
};

export type NormalizedSongContent = { sections: SongContentSection[] };

export type ReviewStatus = "draft" | "approved" | "rejected";
export type LocalSongSource = { id: string; name: string; url: string; importedAt: string; note?: string };
export type LocalSongContent = {
  songId: string;
  version: number;
  sections?: Record<string, { status?: string; text?: string; sources?: string[] }>;
  credits?: { status?: string; items?: Array<{ label?: string; value?: string }>; sources?: string[] };
  media?: { status?: string; items?: Array<{ type?: string; label?: string; url?: string; sourceId?: string }> };
  sources?: LocalSongSource[];
};

function approved(value: { status?: string; text?: string; sources?: string[] } | undefined): value is { status: "approved"; text: string; sources?: string[] } {
  return value?.status === "approved" && Boolean(value.text?.trim());
}

export async function loadApprovedLocalSongContent(songId: string): Promise<LocalSongContent | null> {
  const safeId = songId.trim().toUpperCase();
  if (!/^RVTR\d{6}$/.test(safeId)) return null;
  try {
    const candidates = [path.join(process.cwd(), "data", "public-content", "songs", `${safeId}.json`), path.join(process.cwd(), "..", "live", "data", "public-content", "songs", `${safeId}.json`), path.join(process.cwd(), "..", "..", "apps", "live", "data", "public-content", "songs", `${safeId}.json`)];
    let file: string | null = null;
    for (const candidate of candidates) { try { await fs.access(candidate); file = candidate; break; } catch { /* try next */ } }
    if (!file) return null;
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as LocalSongContent;
    if (raw.songId?.toUpperCase() !== safeId || raw.version !== 1 || !Array.isArray(raw.sources)) return null;
    const sourceIds = new Set(raw.sources.map((source) => source.id));
    const cleanSections = Object.fromEntries(Object.entries(raw.sections ?? {}).filter(([, section]) => approved(section) && (section.sources ?? []).every((id) => sourceIds.has(id))));
    const cleanCredits = raw.credits?.status === "approved" ? { ...raw.credits, items: (raw.credits.items ?? []).filter((item) => item.label?.trim() && item.value?.trim()) } : undefined;
    const cleanMedia = raw.media?.status === "approved" ? { ...raw.media, items: (raw.media.items ?? []).filter((item) => /^(https?:\/\/)/i.test(item.url ?? "") && /^(youtube|official|audio)$/i.test(item.type ?? "")) } : undefined;
    const usedSourceIds = new Set(Object.values(cleanSections).flatMap((section) => section.sources ?? []));
    for (const id of cleanCredits?.sources ?? []) usedSourceIds.add(id);
    for (const item of cleanMedia?.items ?? []) if (item.sourceId) usedSourceIds.add(item.sourceId);
    return { ...raw, sections: cleanSections, credits: cleanCredits, media: cleanMedia, sources: raw.sources.filter((source) => usedSourceIds.has(source.id)) };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn("[public-content] failed closed", { songId: safeId, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/** Builds only from trusted local Retroverse data; no editorial claims are inferred. */
export function normalizeSongContent(track: TrackPageData): NormalizedSongContent {
  const sections: SongContentSection[] = [];
  const chartFacts = [
    track.chartWeeks > 0 ? { label: "Weeks on chart", value: String(track.chartWeeks) } : null,
    track.peakHot100 != null ? { label: "Peak", value: `#${track.peakHot100}` } : null,
    track.firstChartDate ? { label: "Chart debut", value: track.firstChartDate } : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  if (chartFacts.length) {
    sections.push({ id: "song-journey", title: "Song Journey", summary: track.chartRunLabel, facts: chartFacts, status: "approved" });
  }
  const related = Array.from(new Map(track.relatedTracks.map((song) => [song.rvtr, song])).values()).slice(0, 6);
  if (related.length) {
    sections.push({ id: "related-music", title: "Related Music", summary: "More songs from the same artist in the Retroverse chart graph.", facts: related.map((song) => ({ label: song.title, value: song.releaseYear ? String(song.releaseYear) : "Same artist" })), status: "approved" });
  }
  return { sections };
}
