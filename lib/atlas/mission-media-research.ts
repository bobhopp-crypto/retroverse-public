import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { opsVideoMediaAndClause } from "@/lib/ops/ops-video-media";

import { confidenceTier } from "./mission-confidence";
import { normText } from "./mission-safe";
import type { MissionEvidenceSignal, MissionMediaCandidate } from "./mission-types";
import type { AppearanceKind } from "./mission-appearances-store";

const TV_PATH_RE =
  /\b(tv|television|midnight special|soul train|bandstand|totp|top of the pops|american bandstand|snl|saturday night live|carson|sullivan|midnight special)\b/i;
const MOVIE_PATH_RE =
  /\b(movie|film|soundtrack|cinema|trailer|feature|bollywood)\b|from the film|from the movie/i;

const TV_SQL_PATH =
  "(coalesce(ma.source_path,'') || ' ' || coalesce(ma.directory_path,'') || ' ' || coalesce(ma.filename,'')) ~* '(tv|television|midnight special|soul train|bandstand|snl|saturday night live|carson|sullivan)'";
const MOVIE_SQL_PATH =
  "(coalesce(ma.source_path,'') || ' ' || coalesce(ma.directory_path,'') || ' ' || coalesce(ma.filename,'')) ~* '(movie|film|soundtrack|cinema|trailer|feature)'";

type MediaRow = {
  media_id: number;
  artist_text: string | null;
  title_text: string | null;
  filename: string | null;
  source_path: string | null;
};

function pathLabel(row: MediaRow): string {
  const path = row.source_path?.trim() || row.filename?.trim() || "Video file";
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? path;
}

function scoreMatch(
  row: MediaRow,
  artist: string,
  title: string,
  pathHint: string | null,
  kind: AppearanceKind,
): number {
  let score = 0.35;
  const rowArtist = normText(row.artist_text).toLowerCase();
  const rowTitle = normText(row.title_text).toLowerCase();
  const wantArtist = artist.toLowerCase();
  const wantTitle = title.toLowerCase();

  if (rowArtist && wantArtist && rowArtist.includes(wantArtist.slice(0, 8))) score += 0.25;
  if (rowTitle && wantTitle && rowTitle.includes(wantTitle.slice(0, 6))) score += 0.25;

  const path = `${row.source_path ?? ""} ${row.filename ?? ""}`;
  if (kind === "tv" && TV_PATH_RE.test(path)) score += 0.15;
  if (kind === "movie" && MOVIE_PATH_RE.test(path)) score += 0.15;
  if (pathHint && path.includes(pathHint.split("/").pop() ?? "")) score += 0.1;

  return Math.min(0.99, score);
}

function buildMediaEvidence(
  row: MediaRow | null,
  artist: string,
  title: string,
  pathHint: string | null,
  kind: AppearanceKind,
  confidencePct: number,
): MissionEvidenceSignal[] {
  const signals: MissionEvidenceSignal[] = [];
  if (pathHint && row == null) {
    signals.push({
      id: "source-path",
      label: "Your performance file path",
      detail: pathHint.split("/").pop() ?? pathHint,
      source: "VDJ file path",
    });
  }
  if (row?.artist_text?.trim()) {
    signals.push({
      id: "media-artist",
      label: "Library artist field",
      detail: row.artist_text.trim(),
      source: "media_assets",
    });
  }
  if (row?.title_text?.trim()) {
    signals.push({
      id: "media-title",
      label: "Library title field",
      detail: row.title_text.trim(),
      source: "media_assets",
    });
  }
  const path = `${row?.source_path ?? pathHint ?? ""} ${row?.filename ?? ""}`;
  if (kind === "tv" && TV_PATH_RE.test(path)) {
    signals.push({
      id: "tv-path",
      label: "TV folder pattern",
      detail: "Path contains TV / bandstand / Soul Train signal",
      source: "media_assets path",
    });
  }
  if (kind === "movie" && MOVIE_PATH_RE.test(path)) {
    signals.push({
      id: "movie-path",
      label: "Movie folder pattern",
      detail: "Path contains movie / soundtrack / film signal",
      source: "media_assets path",
    });
  }
  if (row?.source_path?.trim()) {
    signals.push({
      id: "full-path",
      label: "Source file",
      detail: row.source_path.trim(),
      source: "media_assets",
    });
  }
  signals.push({
    id: "title-match",
    label: "Title match score",
    detail: `${confidencePct}% match for “${title}” by ${artist}`,
    source: "Retroverse scan",
  });
  return signals;
}

function toCandidate(
  row: MediaRow,
  artist: string,
  title: string,
  pathHint: string | null,
  kind: AppearanceKind,
  index: number,
): MissionMediaCandidate {
  const confidence = scoreMatch(row, artist, title, pathHint, kind);
  const confidencePct = Math.round(confidence * 100);
  const tier = confidenceTier(confidencePct);
  const label =
    normText(row.title_text) ||
    normText(row.filename, `${artist} — ${title}`);
  const detail = pathLabel(row);
  const id = `media-${row.media_id}`;
  const evidence = buildMediaEvidence(row, artist, title, pathHint, kind, confidencePct);

  return {
    id,
    label,
    detail,
    confidence,
    confidencePct,
    recommended: index === 0 && tier === "high",
    researchNote:
      tier === "high"
        ? `Best ${kind === "tv" ? "TV" : "movie"} match in your library`
        : `${evidence.length} evidence signals · ${confidencePct}%`,
    confidenceTier: tier,
    evidence,
  };
}

export async function loadMediaAppearanceCandidates(input: {
  artist: string;
  title: string;
  filePath: string | null;
  kind: AppearanceKind;
  limit?: number;
  rejectedIds?: Set<string>;
}): Promise<MissionMediaCandidate[]> {
  const artist = normText(input.artist, "Unknown artist");
  const title = normText(input.title, "Unknown title");
  const limit = input.limit ?? 3;
  const rejected = input.rejectedIds ?? new Set<string>();
  const pathHint = input.filePath?.trim() || null;

  const pathCandidates: MissionMediaCandidate[] = [];
  if (pathHint) {
    const path = pathHint;
    if (
      (input.kind === "tv" && TV_PATH_RE.test(path)) ||
      (input.kind === "movie" && MOVIE_PATH_RE.test(path))
    ) {
      pathCandidates.push({
        id: "source-file",
        label: `${title} (your file)`,
        detail: path.split("/").pop() ?? path,
        confidence: 0.92,
        confidencePct: 92,
        recommended: true,
        researchNote: "Your performance file path suggests this source",
        confidenceTier: "high",
        evidence: buildMediaEvidence(null, artist, title, path, input.kind, 92),
      });
    }
  }

  const ping = await inspectPing();
  if (!ping.ok) {
    return pathCandidates.filter((c) => !rejected.has(c.id)).slice(0, limit);
  }

  const pathFilter = input.kind === "tv" ? TV_SQL_PATH : MOVIE_SQL_PATH;
  const rows = await inspectQuery<MediaRow>(
    `
    SELECT ma.id AS media_id, ma.artist_text, ma.title_text, ma.filename, ma.source_path
    FROM media_assets ma
    WHERE ${pathFilter}
      ${opsVideoMediaAndClause("ma")}
      AND (
        lower(coalesce(ma.artist_text, '')) LIKE '%' || lower($1) || '%'
        OR lower(coalesce(ma.title_text, '')) LIKE '%' || lower($2) || '%'
        OR lower(coalesce(ma.filename, '')) LIKE '%' || lower($1) || '%'
      )
    ORDER BY ma.updated_at DESC NULLS LAST
    LIMIT 12
    `,
    [artist.slice(0, 40), title.slice(0, 40)],
  );

  const fromDb = rows
    .map((row, i) => toCandidate(row, artist, title, pathHint, input.kind, i))
    .filter((c) => !rejected.has(c.id))
    .sort((a, b) => b.confidence - a.confidence);

  const merged = [...pathCandidates, ...fromDb];
  const seen = new Set<string>();
  const out: MissionMediaCandidate[] = [];

  for (const c of merged.sort((a, b) => b.confidence - a.confidence)) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    const tier = confidenceTier(c.confidencePct);
    out.push({
      ...c,
      recommended: out.length === 0 && tier === "high",
      rank: out.length + 1,
    });
    if (out.length >= limit) break;
  }

  return out;
}

export function mediaResearchHeadline(
  kind: AppearanceKind,
  candidates: MissionMediaCandidate[],
): string | null {
  const pick = candidates.find((c) => c.recommended) ?? candidates[0];
  if (!pick) {
    return kind === "tv"
      ? "No TV evidence found — confirm none or skip"
      : "No movie evidence found — confirm none or skip";
  }
  if (pick.confidenceTier === "high") {
    return `Strong ${kind === "tv" ? "TV" : "movie"} evidence: “${pick.label}” — ${pick.confidencePct}%`;
  }
  if (pick.confidenceTier === "medium") {
    return `Review ${kind === "tv" ? "TV" : "movie"} evidence: “${pick.label}” — ${pick.confidencePct}%`;
  }
  return `Research needed — “${pick.label}” only ${pick.confidencePct}% match`;
}
