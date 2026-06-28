import "server-only";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { normVdjPath, scanVdjDatabase, vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";

type RawAcousticRow = {
  energy: number | null;
  valence: number | null;
  danceability: number | null;
  acousticness: number | null;
  instrumentalness: number | null;
  liveness: number | null;
  speechiness: number | null;
  tempo: number | null;
  key: number | null;
  mode: number | null;
  time_signature: number | null;
  source: string;
};

export type MusicalDnaSource = RawAcousticRow;

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function loadFromAlbumTrackDisplay(rvtr: string): Promise<RawAcousticRow | null> {
  const rows = await inspectQuery<{
    energy: number | null;
    valence: number | null;
    danceability: number | null;
    acousticness: number | null;
    instrumentalness: number | null;
    liveness: number | null;
    speechiness: number | null;
    tempo: number | null;
  }>(
    `
    SELECT catd.energy, catd.valence, catd.danceability, catd.acousticness, catd.instrumentalness,
           catd.liveness, catd.speechiness, catd.tempo
    FROM canonical_album_tracks cat
    JOIN canonical_album_track_display catd ON catd.album_id = cat.album_id AND catd.position = cat.position
    WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
    ORDER BY catd.confidence_score DESC NULLS LAST
    LIMIT 1
    `,
    [rvtr],
  );

  const row = rows[0];
  if (!row || row.energy == null) return null;

  return {
    energy: parseNum(row.energy),
    valence: parseNum(row.valence),
    danceability: parseNum(row.danceability),
    acousticness: parseNum(row.acousticness),
    instrumentalness: parseNum(row.instrumentalness),
    liveness: parseNum(row.liveness),
    speechiness: parseNum(row.speechiness),
    tempo: parseNum(row.tempo),
    key: null,
    mode: null,
    time_signature: null,
    source: "canonical_album_track_display",
  };
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadFromStagingAcousticTracks(
  artist: string,
  title: string,
): Promise<RawAcousticRow | null> {
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
    source_artist: string;
    source_song: string;
  }>(
    `
    SELECT energy, valence, danceability, acousticness, instrumentalness, liveness, speechiness, tempo,
           source_artist, source_song
    FROM staging_acoustic_tracks
    WHERE lower(trim(source_artist)) = lower(trim($1))
      AND lower(trim(source_song)) LIKE '%' || lower(trim($2)) || '%'
    ORDER BY length(source_song) ASC
    LIMIT 5
    `,
    [artist, title],
  );

  if (rows.length === 0) return null;

  const exact = rows.find((r) => normalizeTitle(r.source_song) === normTitle);
  const pick = exact ?? rows[0]!;

  return {
    energy: parseNum(pick.energy),
    valence: parseNum(pick.valence),
    danceability: parseNum(pick.danceability),
    acousticness: parseNum(pick.acousticness),
    instrumentalness: parseNum(pick.instrumentalness),
    liveness: parseNum(pick.liveness),
    speechiness: parseNum(pick.speechiness),
    tempo: parseNum(pick.tempo),
    key: null,
    mode: null,
    time_signature: null,
    source: "staging_acoustic_tracks",
  };
}

async function loadKeyModeFromFeatures(
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

export async function loadVdjMusicalHints(filePaths: string[]): Promise<{
  tempo: number | null;
  key: string | null;
}> {
  if (filePaths.length === 0) return { tempo: null, key: null };

  const scan = await scanVdjDatabase();
  const wanted = new Set(filePaths.map(normVdjPath));
  for (const entry of scan.entries) {
    if (!wanted.has(entry.filePathNorm)) continue;
    const inner = await loadVdjSongScan(entry.filePath);
    return inner;
  }
  return { tempo: null, key: null };
}

async function loadVdjSongScan(filePath: string): Promise<{ tempo: number | null; key: string | null }> {
  const { readFile } = await import("fs/promises");
  try {
    const xml = await readFile(vdjDatabasePath(), "utf8");
    const escaped = filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`<Song\\s+FilePath="([^"]*)"[^>]*>([\\s\\S]*?)<\\/Song>`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const path = m[1]!.replace(/&apos;/g, "'").replace(/\\/g, "/");
      if (normVdjPath(path) !== normVdjPath(filePath)) continue;
      const inner = m[2] ?? "";
      const tags = inner.match(/<Tags([^>]*)\/?>/)?.[1] ?? "";
      const scan = inner.match(/<Scan([^>]*)\/?>/)?.[1] ?? "";
      const readAttr = (block: string, name: string) => {
        const match = block.match(new RegExp(`\\s${name}="([^"]*)"`));
        return match?.[1] ?? null;
      };
      const tagBpm = readAttr(tags, "Bpm") ?? readAttr(scan, "Bpm");
      const key = readAttr(tags, "Key") || readAttr(scan, "Key");
      let tempo: number | null = null;
      if (tagBpm) {
        const n = Number(tagBpm);
        if (Number.isFinite(n)) tempo = n > 40 ? Math.round(n) : n > 0 && n < 2 ? Math.round(60 / n) : Math.round(n);
      }
      return { tempo, key: key || null };
    }
  } catch {
    // fall through
  }
  return { tempo: null, key: null };
}

export async function loadMusicalDnaSource(input: {
  rvtr: string;
  artist: string;
  title: string;
  mediaPaths?: string[];
}): Promise<MusicalDnaSource | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  let row =
    (await loadFromAlbumTrackDisplay(input.rvtr)) ??
    (await loadFromStagingAcousticTracks(input.artist, input.title));

  const keyMode = await loadKeyModeFromFeatures(input.artist, input.title);
  const vdj = await loadVdjMusicalHints(input.mediaPaths ?? []);

  if (!row && !vdj.tempo && !vdj.key) return null;

  if (!row) {
    row = {
      energy: null,
      valence: null,
      danceability: null,
      acousticness: null,
      instrumentalness: null,
      liveness: null,
      speechiness: null,
      tempo: vdj.tempo,
      key: keyMode.key,
      mode: keyMode.mode,
      time_signature: keyMode.time_signature,
      source: "virtualdj",
    };
  } else {
    if (row.key == null) row.key = keyMode.key;
    if (row.mode == null) row.mode = keyMode.mode;
    if (row.time_signature == null) row.time_signature = keyMode.time_signature;
    if (row.tempo == null && vdj.tempo != null) row.tempo = vdj.tempo;
  }

  if (vdj.key && row.key == null) {
    return {
      ...row,
      source: `${row.source}+virtualdj_key`,
    };
  }

  return row;
}
