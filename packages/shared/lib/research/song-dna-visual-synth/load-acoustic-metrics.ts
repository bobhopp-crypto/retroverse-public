import { readFile } from "fs/promises";
import { join } from "path";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { normLoudness, normMetric, normTempo } from "./normalize";
import type { AcousticMetrics } from "./types";

type RawRow = {
  artist: string;
  title: string;
  danceability: number | null;
  energy: number | null;
  valence: number | null;
  acousticness: number | null;
  instrumentalness: number | null;
  speechiness: number | null;
  liveness: number | null;
  tempo: number | null;
  loudness: number | null;
  key: number | null;
  mode: number | null;
  time_signature: number | null;
  source: string;
};

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function modeFromKeyLabel(keyLabel: string | null | undefined): number | null {
  if (!keyLabel?.trim()) return null;
  const k = keyLabel.trim();
  if (/m$/i.test(k) && !/maj/i.test(k)) return 0;
  if (/major|maj/i.test(k)) return 1;
  if (/minor|min/i.test(k)) return 0;
  return 1;
}

function keyPitchFromLabel(keyLabel: string | null | undefined): number | null {
  if (!keyLabel?.trim()) return null;
  const pitch = keyLabel.trim().replace(/major|minor|maj|min|m/gi, "").trim();
  const map: Record<string, number> = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
  };
  return map[pitch] ?? null;
}

async function loadTrackIdentity(rvtr: string): Promise<{ artist: string; title: string } | null> {
  const rows = await inspectQuery<{ canonical_title: string; canonical_artist_name: string }>(
    `
    SELECT canonical_title, canonical_artist_name
    FROM canonical_track_display
    WHERE upper(trim(track_id)) = upper(trim($1))
       OR upper(trim(coalesce(retroverse_track_id, ''))) = upper(trim($1))
    LIMIT 1
    `,
    [rvtr],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    artist: row.canonical_artist_name.trim(),
    title: row.canonical_title.trim(),
  };
}

async function loadFromAlbumTrackDisplay(rvtr: string): Promise<RawRow | null> {
  const rows = await inspectQuery<{
    energy: number | null;
    valence: number | null;
    danceability: number | null;
    acousticness: number | null;
    instrumentalness: number | null;
    liveness: number | null;
    speechiness: number | null;
    tempo: number | null;
    loudness: number | null;
    canonical_title: string;
    canonical_artist_name: string;
  }>(
    `
    SELECT catd.energy, catd.valence, catd.danceability, catd.acousticness, catd.instrumentalness,
           catd.liveness, catd.speechiness, catd.tempo, catd.loudness,
           ctd.canonical_title, ctd.canonical_artist_name
    FROM canonical_album_tracks cat
    JOIN canonical_album_track_display catd
      ON catd.album_id = cat.album_id AND catd.position = cat.position
    JOIN canonical_track_display ctd
      ON upper(trim(ctd.track_id)) = upper(trim(cat.canonical_track_key))
    WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
    ORDER BY catd.confidence_score DESC NULLS LAST
    LIMIT 1
    `,
    [rvtr],
  );

  const row = rows[0];
  if (!row || row.energy == null) return null;

  return {
    artist: row.canonical_artist_name.trim(),
    title: row.canonical_title.trim(),
    danceability: parseNum(row.danceability),
    energy: parseNum(row.energy),
    valence: parseNum(row.valence),
    acousticness: parseNum(row.acousticness),
    instrumentalness: parseNum(row.instrumentalness),
    liveness: parseNum(row.liveness),
    speechiness: parseNum(row.speechiness),
    tempo: parseNum(row.tempo),
    loudness: parseNum(row.loudness),
    key: null,
    mode: null,
    time_signature: null,
    source: "canonical_album_track_display",
  };
}

async function loadFromStaging(artist: string, title: string): Promise<RawRow | null> {
  const normTitle = normalizeTitle(title);
  const rows = await inspectQuery<{
    energy: number | null;
    valence: number | null;
    danceability: number | null;
    acousticness: number | null;
    instrumentalness: number | null;
    liveness: number | null;
    speechiness: number | null;
    tempo: number | null;
    loudness: number | null;
    source_artist: string;
    source_song: string;
  }>(
    `
    SELECT energy, valence, danceability, acousticness, instrumentalness, liveness, speechiness, tempo, loudness,
           source_artist, source_song
    FROM staging_acoustic_tracks
    WHERE lower(trim(source_artist)) = lower(trim($1))
      AND lower(trim(source_song)) LIKE '%' || lower(trim($2)) || '%'
    ORDER BY length(source_song) ASC
    LIMIT 8
    `,
    [artist, title],
  );

  if (rows.length === 0) return null;

  const exact = rows.find((r) => normalizeTitle(r.source_song) === normTitle);
  const pick = exact ?? rows[0]!;

  return {
    artist,
    title,
    danceability: parseNum(pick.danceability),
    energy: parseNum(pick.energy),
    valence: parseNum(pick.valence),
    acousticness: parseNum(pick.acousticness),
    instrumentalness: parseNum(pick.instrumentalness),
    liveness: parseNum(pick.liveness),
    speechiness: parseNum(pick.speechiness),
    tempo: parseNum(pick.tempo),
    loudness: parseNum(pick.loudness),
    key: null,
    mode: null,
    time_signature: null,
    source: "staging_acoustic_tracks",
  };
}

async function loadKeyMode(
  artist: string,
  title: string,
): Promise<{ key: number | null; mode: number | null; time_signature: number | null }> {
  const rows = await inspectQuery<{
    key: number | null;
    mode: number | null;
    time_signature: number | null;
  }>(
    `
    SELECT key, mode, time_signature
    FROM staging_acoustic_features
    WHERE lower(trim(artist)) = lower(trim($1))
      AND lower(trim(song)) = lower(trim($2))
    LIMIT 1
    `,
    [artist, title],
  );
  const row = rows[0];
  return {
    key: parseNum(row?.key),
    mode: parseNum(row?.mode),
    time_signature: parseNum(row?.time_signature),
  };
}

async function loadFromSongDnaJson(rvtr: string): Promise<RawRow | null> {
  const path = join(
    process.cwd(),
    "data/ops/intelligence/research-department",
    rvtr.toUpperCase(),
    "song-dna.json",
  );
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as {
      artist?: string;
      title?: string;
      musical?: Record<
        string,
        { value?: number | string | null; label?: string | null } | undefined
      >;
    };
    const musical = raw.musical;
    if (!musical) return null;

    const readMetric = (name: string) => parseNum(musical[name]?.value);
    const keyLabel =
      typeof musical.key?.value === "string"
        ? musical.key.value
        : typeof musical.key?.label === "string"
          ? musical.key.label
          : null;

    return {
      artist: raw.artist?.trim() ?? "",
      title: raw.title?.trim() ?? "",
      danceability: readMetric("danceability"),
      energy: readMetric("energy"),
      valence: readMetric("valence"),
      acousticness: readMetric("acousticness"),
      instrumentalness: readMetric("instrumentalness"),
      liveness: readMetric("liveness"),
      speechiness: readMetric("speechiness"),
      tempo: readMetric("tempo"),
      loudness: readMetric("loudness"),
      key: keyPitchFromLabel(keyLabel),
      mode: modeFromKeyLabel(keyLabel) ?? parseNum(musical.mode?.value),
      time_signature: readMetric("timeSignature"),
      source: "song-dna.json",
    };
  } catch {
    return null;
  }
}

function toMetrics(row: RawRow, rvtr: string): AcousticMetrics {
  const mode =
    row.mode != null
      ? row.mode >= 0.5
        ? 1
        : 0
      : null;

  return {
    rvtr: rvtr.toUpperCase(),
    artist: row.artist,
    title: row.title,
    source: row.source,
    danceability: normMetric(row.danceability),
    energy: normMetric(row.energy),
    valence: normMetric(row.valence),
    acousticness: normMetric(row.acousticness),
    instrumentalness: normMetric(row.instrumentalness),
    speechiness: normMetric(row.speechiness),
    liveness: normMetric(row.liveness),
    tempo: row.tempo ?? 120,
    loudness: row.loudness ?? -12,
    key: row.key,
    mode,
    timeSignature: row.time_signature,
  };
}

export async function loadAcousticMetrics(rvtr: string): Promise<AcousticMetrics | null> {
  const normalized = rvtr.trim().toUpperCase();
  const ping = await inspectPing();

  let row: RawRow | null = null;

  if (ping.ok) {
    row = await loadFromAlbumTrackDisplay(normalized);

    if (!row) {
      const identity = await loadTrackIdentity(normalized);
      if (identity) {
        row = await loadFromStaging(identity.artist, identity.title);
      }
    }

    if (row) {
      const keyMode = await loadKeyMode(row.artist, row.title);
      if (row.key == null) row.key = keyMode.key;
      if (row.mode == null) row.mode = keyMode.mode;
      if (row.time_signature == null) row.time_signature = keyMode.time_signature;
    }
  }

  if (!row || row.energy == null) {
    const fallback = await loadFromSongDnaJson(normalized);
    if (fallback?.energy != null) row = fallback;
  }

  if (row && row.loudness == null && ping.ok) {
    const loudRows = await inspectQuery<{ loudness: number | null }>(
      `
      SELECT catd.loudness
      FROM canonical_album_tracks cat
      JOIN canonical_album_track_display catd
        ON catd.album_id = cat.album_id AND catd.position = cat.position
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
      ORDER BY catd.confidence_score DESC NULLS LAST
      LIMIT 1
      `,
      [normalized],
    );
    const loud = parseNum(loudRows[0]?.loudness);
    if (loud != null) row.loudness = loud;
    else if (row.artist && row.title) {
      const staging = await loadFromStaging(row.artist, row.title);
      if (staging?.loudness != null) row.loudness = staging.loudness;
    }
  }

  if (!row || row.energy == null) return null;

  return toMetrics(row, normalized);
}

export function describeMetricEffects(metrics: AcousticMetrics): Record<string, string> {
  const tempoNorm = normTempo(metrics.tempo);
  const loudNorm = normLoudness(metrics.loudness);

  return {
    valence:
      metrics.valence < 0.4
        ? "Cool violet/charcoal palette dominates."
        : metrics.valence > 0.7
          ? "Warm gold/orange/red highlights dominate."
          : "Balanced mid-valence palette between cool and warm.",
    energy:
      metrics.energy > 0.7
        ? "Thick, high-intensity brush strokes."
        : metrics.energy < 0.45
          ? "Thin, restrained strokes."
          : "Moderate brush weight.",
    danceability:
      metrics.danceability > 0.55
        ? "Flowing curved paths with wide sweeps."
        : "Straighter, less undulating motion.",
    tempo:
      tempoNorm > 0.6
        ? "Many strokes with tight spacing."
        : tempoNorm < 0.35
          ? "Fewer strokes with wide spacing."
          : "Mid-density stroke rhythm.",
    loudness:
      loudNorm > 0.65
        ? "High opacity and strong contrast."
        : loudNorm < 0.4
          ? "Soft, translucent layering."
          : "Moderate contrast.",
    acousticness:
      metrics.acousticness > 0.4
        ? "Heavy watercolor bleed and blur."
        : "Crisp edges with minimal bleed.",
    instrumentalness:
      metrics.instrumentalness > 0.15
        ? "Fine-detail micro-strokes added."
        : "Minimal fine-detail overlay.",
    speechiness:
      metrics.speechiness > 0.08
        ? "Sharp ink-like angular marks."
        : "Smooth continuous curves only.",
    liveness:
      metrics.liveness > 0.5
        ? "Visible jitter and imperfect control points."
        : "Clean, controlled geometry.",
    mode:
      metrics.mode === 1
        ? "Major — warmer highlight bias."
        : metrics.mode === 0
          ? "Minor — cooler shadow bias."
          : "Neutral warmth (mode unknown).",
  };
}
