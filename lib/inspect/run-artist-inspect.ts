import { inspectPing, inspectQuery } from "./pg";
import { sanitizeInspectQuery } from "./sanitize";
import type {
  InspectAlbumRow,
  InspectChartRow,
  InspectPayload,
  InspectResolved,
  InspectTrackRow,
} from "./types";

type ArtistRow = { id: number; canonical_name: string };

function coverStatus(
  path: string | null,
  r2: string | null,
): { status: InspectAlbumRow["coverStatus"]; detail: string | null } {
  if (r2?.trim()) return { status: "ok", detail: `R2: ${r2.trim()}` };
  if (path?.trim()) return { status: "path_only", detail: path.trim() };
  return { status: "missing", detail: null };
}

async function resolveArtist(q: string): Promise<{
  resolved: InspectResolved;
  notes: string[];
}> {
  const notes: string[] = [];
  const exact = await inspectQuery<ArtistRow>(
    `
    SELECT id, canonical_name
    FROM artists
    WHERE lower(trim(canonical_name)) = lower(trim($1))
    LIMIT 5
    `,
    [q],
  );

  if (exact.length === 1) {
    notes.push(`Resolved artist by exact name match: "${exact[0]!.canonical_name}".`);
    return {
      resolved: {
        kind: "artist",
        artistId: exact[0]!.id,
        canonicalName: exact[0]!.canonical_name,
        matchType: "exact",
      },
      notes,
    };
  }

  if (exact.length > 1) {
    notes.push(`Multiple exact-case artists (${exact.length}); using first row.`);
    return {
      resolved: {
        kind: "ambiguous",
        artistId: exact[0]!.id,
        canonicalName: exact[0]!.canonical_name,
        matchType: "exact",
        candidates: exact.map((a) => ({ id: a.id, name: a.canonical_name })),
      },
      notes,
    };
  }

  const fuzzy = await inspectQuery<ArtistRow>(
    `
    SELECT id, canonical_name
    FROM artists
    WHERE canonical_name ILIKE '%' || $1 || '%'
    ORDER BY
      CASE WHEN lower(trim(canonical_name)) = lower(trim($1)) THEN 0 ELSE 1 END,
      canonical_name
    LIMIT 8
    `,
    [q],
  );

  if (fuzzy.length === 0) {
    notes.push("No artist row in local Postgres — graph artist panel may rely on Supabase/dossier JSON.");
    return { resolved: { kind: "none" }, notes };
  }

  if (fuzzy.length > 1) {
    notes.push(`Fuzzy match: ${fuzzy.length} candidates; showing primary "${fuzzy[0]!.canonical_name}".`);
    return {
      resolved: {
        kind: "ambiguous",
        artistId: fuzzy[0]!.id,
        canonicalName: fuzzy[0]!.canonical_name,
        matchType: "fuzzy",
        candidates: fuzzy.map((a) => ({ id: a.id, name: a.canonical_name })),
      },
      notes,
    };
  }

  notes.push(`Fuzzy single match: "${fuzzy[0]!.canonical_name}".`);
  return {
    resolved: {
      kind: "artist",
      artistId: fuzzy[0]!.id,
      canonicalName: fuzzy[0]!.canonical_name,
      matchType: "fuzzy",
    },
    notes,
  };
}

async function loadAlbums(artistId: number, artistName: string): Promise<InspectAlbumRow[]> {
  const rows = await inspectQuery<{
    pg_album_id: number;
    title: string;
    release_year: number | null;
    rval: string | null;
    sequence_tracks: number;
    b200_peak: number | null;
    b200_weeks: number | null;
    cover_path: string | null;
    r2_cover_key: string | null;
  }>(
    `
    SELECT
      al.id AS pg_album_id,
      al.title,
      al.release_year,
      aek.external_key AS rval,
      count(DISTINCT cat.id)::int AS sequence_tracks,
      min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak,
      max(ca.weeks_on_chart) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_weeks,
      al.canonical_cover_path AS cover_path,
      (
        SELECT aal.r2_cover_key
        FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS r2_cover_key
    FROM albums al
    LEFT JOIN album_external_keys aek ON aek.album_id = al.id
    LEFT JOIN canonical_album_tracks cat ON cat.album_id = al.id
    LEFT JOIN chart_appearances ca ON ca.album_id = al.id
    WHERE al.artist_id = $1
    GROUP BY al.id, al.title, al.release_year, aek.external_key, al.canonical_cover_path
    ORDER BY al.release_year DESC NULLS LAST, al.title
    LIMIT 40
    `,
    [artistId],
  );

  if (rows.length === 0) {
    const byName = await inspectQuery<typeof rows[0]>(
      `
      SELECT
        al.id AS pg_album_id,
        al.title,
        al.release_year,
        aek.external_key AS rval,
        count(DISTINCT cat.id)::int AS sequence_tracks,
        min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak,
        max(ca.weeks_on_chart) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_weeks,
        al.canonical_cover_path AS cover_path,
        (
          SELECT aal.r2_cover_key
          FROM album_artwork_links aal
          WHERE aal.album_id = al.id
          ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
          LIMIT 1
        ) AS r2_cover_key
      FROM artists ar
      JOIN albums al ON al.artist_id = ar.id
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id
      LEFT JOIN canonical_album_tracks cat ON cat.album_id = al.id
      LEFT JOIN chart_appearances ca ON ca.album_id = al.id
      WHERE lower(trim(ar.canonical_name)) = lower(trim($1))
      GROUP BY al.id, al.title, al.release_year, aek.external_key, al.canonical_cover_path
      ORDER BY al.release_year DESC NULLS LAST, al.title
      LIMIT 40
      `,
      [artistName],
    );
    return byName.map((r) => {
      const cov = coverStatus(r.cover_path, r.r2_cover_key);
      return {
        pgAlbumId: r.pg_album_id,
        title: r.title,
        releaseYear: r.release_year,
        rval: r.rval,
        sequenceTracks: r.sequence_tracks,
        b200Peak: r.b200_peak,
        b200Weeks: r.b200_weeks,
        coverStatus: cov.status,
        coverDetail: cov.detail,
      };
    });
  }

  return rows.map((r) => {
    const cov = coverStatus(r.cover_path, r.r2_cover_key);
    return {
      pgAlbumId: r.pg_album_id,
      title: r.title,
      releaseYear: r.release_year,
      rval: r.rval,
      sequenceTracks: r.sequence_tracks,
      b200Peak: r.b200_peak,
      b200Weeks: r.b200_weeks,
      coverStatus: cov.status,
      coverDetail: cov.detail,
    };
  });
}

async function loadTracks(artistName: string): Promise<InspectTrackRow[]> {
  const rows = await inspectQuery<{
    track_id: string;
    canonical_title: string;
    peak_hot100_position: number | null;
    chart_weeks: number;
    has_hot100: boolean;
    has_vdj_media: boolean;
    has_video: boolean;
  }>(
    `
    SELECT
      track_id,
      canonical_title,
      peak_hot100_position,
      chart_weeks,
      has_hot100,
      has_vdj_media,
      has_video
    FROM canonical_track_display
    WHERE lower(trim(canonical_artist_name)) = lower(trim($1))
    ORDER BY
      has_hot100 DESC,
      peak_hot100_position ASC NULLS LAST,
      chart_weeks DESC,
      canonical_title ASC
    LIMIT 24
    `,
    [artistName],
  );

  return rows.map((r) => ({
    rvtr: r.track_id,
    title: r.canonical_title,
    peakHot100: r.peak_hot100_position,
    chartWeeks: r.chart_weeks,
    charted: r.has_hot100,
    inLibrary: r.has_vdj_media,
    hasVideo: r.has_video || r.has_vdj_media,
  }));
}

async function loadCharts(artistId: number, artistName: string): Promise<InspectChartRow[]> {
  const rows = await inspectQuery<{
    chart_name: string;
    chart_date: string;
    chart_position: number;
    weeks_on_chart: number | null;
    track_title: string;
  }>(
    `
    SELECT
      ca.chart_name,
      ca.chart_date::text AS chart_date,
      ca.chart_position,
      ca.weeks_on_chart,
      t.title AS track_title
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    WHERE ar.id = $1
      AND ca.chart_name = 'Billboard Hot 100'
    ORDER BY ca.chart_date DESC, ca.chart_position ASC
    LIMIT 20
    `,
    [artistId],
  );

  if (rows.length > 0) {
    return rows.map((r) => ({
      chartName: r.chart_name,
      chartDate: r.chart_date,
      position: r.chart_position,
      weeksOnChart: r.weeks_on_chart,
      trackTitle: r.track_title,
    }));
  }

  const fallback = await inspectQuery<typeof rows[0]>(
    `
    SELECT
      ca.chart_name,
      ca.chart_date::text AS chart_date,
      ca.chart_position,
      ca.weeks_on_chart,
      t.title AS track_title
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    WHERE lower(trim(ar.canonical_name)) = lower(trim($1))
      AND ca.chart_name = 'Billboard Hot 100'
    ORDER BY ca.chart_date DESC, ca.chart_position ASC
    LIMIT 20
    `,
    [artistName],
  );

  return fallback.map((r) => ({
    chartName: r.chart_name,
    chartDate: r.chart_date,
    position: r.chart_position,
    weeksOnChart: r.weeks_on_chart,
    trackTitle: r.track_title,
  }));
}

async function loadCorpusStats(): Promise<{ totalTracks: number }> {
  const rows = await inspectQuery<{ total: number }>(
    `SELECT count(*)::int AS total FROM canonical_track_display`,
  );
  return { totalTracks: rows[0]?.total ?? 0 };
}

async function compareHomeSearch(q: string): Promise<NonNullable<InspectPayload["homeSearchCompare"]>> {
  const base =
    process.env.SEARCH_UPSTREAM_BASE_URL?.trim() ||
    process.env.RETROVERSE_WELCOME_URL?.trim() ||
    "http://localhost:3000";
  const url = `${base.replace(/\/$/, "")}/api/home-search?q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) {
      return { artistNames: [], albumCount: 0, trackCount: 0, error: `home-search HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      artists?: { name: string }[];
      albums?: unknown[];
      tracks?: unknown[];
      incomplete?: boolean;
    };
    return {
      artistNames: (body.artists ?? []).map((a) => a.name),
      albumCount: body.albums?.length ?? 0,
      trackCount: body.tracks?.length ?? 0,
      incomplete: body.incomplete,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { artistNames: [], albumCount: 0, trackCount: 0, error: message };
  }
}

export async function runArtistInspect(rawQuery: string): Promise<InspectPayload> {
  const q = sanitizeInspectQuery(rawQuery);
  const debugNotes: string[] = [];

  if (q.length < 2) {
    return {
      ok: true,
      q,
      devOnly: true,
      db: { connected: false },
      resolved: { kind: "none" },
      summary: {
        albumsFound: 0,
        tracksFound: 0,
        chartedTracks: 0,
        inLibraryTracks: 0,
        missingRvalAlbums: 0,
        missingCoverAlbums: 0,
      },
      albums: [],
      tracks: [],
      chartAppearances: [],
      debugNotes: ["Enter at least 2 characters to inspect the local graph."],
    };
  }

  const ping = await inspectPing();
  if (!ping.ok) {
    return {
      ok: false,
      q,
      devOnly: true,
      db: { connected: false, error: ping.error },
      resolved: { kind: "none" },
      summary: {
        albumsFound: 0,
        tracksFound: 0,
        chartedTracks: 0,
        inLibraryTracks: 0,
        missingRvalAlbums: 0,
        missingCoverAlbums: 0,
      },
      albums: [],
      tracks: [],
      chartAppearances: [],
      debugNotes: [
        "Local Postgres unreachable. Start PostgreSQL and confirm database `retroverse` exists.",
        ping.error ?? "connection failed",
      ],
    };
  }

  const stats = await loadCorpusStats();
  debugNotes.push(`Graph corpus: ${stats.totalTracks.toLocaleString()} rows in canonical_track_display.`);

  const { resolved, notes: resolveNotes } = await resolveArtist(q);
  debugNotes.push(...resolveNotes);

  if (resolved.kind === "none" || !resolved.canonicalName) {
    const homeSearchCompare = await compareHomeSearch(q);
    if (homeSearchCompare.error) {
      debugNotes.push(`home-search compare: ${homeSearchCompare.error}`);
    } else if (homeSearchCompare.trackCount > 0) {
      debugNotes.push(
        `Public search still returned ${homeSearchCompare.trackCount} tracks — likely Supabase/dossier, not local PG artist row.`,
      );
    }

    return {
      ok: true,
      q,
      devOnly: true,
      db: { connected: true },
      resolved,
      summary: {
        albumsFound: 0,
        tracksFound: 0,
        chartedTracks: 0,
        inLibraryTracks: 0,
        missingRvalAlbums: 0,
        missingCoverAlbums: 0,
      },
      albums: [],
      tracks: [],
      chartAppearances: [],
      debugNotes,
      homeSearchCompare,
    };
  }

  const artistName = resolved.canonicalName;
  const artistId = resolved.artistId!;

  const [albums, tracks, chartAppearances, homeSearchCompare] = await Promise.all([
    loadAlbums(artistId, artistName),
    loadTracks(artistName),
    loadCharts(artistId, artistName),
    compareHomeSearch(q),
  ]);

  const chartedTracks = tracks.filter((t) => t.charted).length;
  const inLibraryTracks = tracks.filter((t) => t.inLibrary).length;
  const missingRvalAlbums = albums.filter((a) => !a.rval).length;
  const missingCoverAlbums = albums.filter((a) => a.coverStatus === "missing").length;

  if (tracks.length === 0) {
    debugNotes.push(
      "No tracks in canonical_track_display for this artist — home-search track panel may use Supabase or Hot 100 SQLite.",
    );
  } else {
    debugNotes.push(
      `Track ordering matches home-search graph path (Hot 100 peak, then chart weeks). Showing ${tracks.length} of corpus.`,
    );
  }

  if (missingRvalAlbums > 0) {
    debugNotes.push(`Missing Link: ${missingRvalAlbums} album(s) without RVAL in album_external_keys.`);
  }
  if (missingCoverAlbums > 0) {
    debugNotes.push(`Missing Cover: ${missingCoverAlbums} album(s) without R2 or canonical_cover_path.`);
  }

  if (homeSearchCompare.error) {
    debugNotes.push(`home-search: ${homeSearchCompare.error}`);
  } else {
    const pgTracks = tracks.length;
    const hsTracks = homeSearchCompare.trackCount;
    if (hsTracks > 0 && pgTracks === 0) {
      debugNotes.push("Search UI has tracks but local graph view is empty — check RETROVERSE_CANONICAL_GRAPH on welcome.");
    } else if (hsTracks === 0 && pgTracks > 0) {
      debugNotes.push("Local graph has tracks but home-search returned none — Supabase gate or proxy port mismatch.");
    } else if (Math.abs(hsTracks - pgTracks) > 4) {
      debugNotes.push(
        `Track count delta: graph panel ${pgTracks} vs home-search ${hsTracks} (merge/dedupe differs).`,
      );
    }
  }

  if (resolved.kind === "ambiguous" && resolved.candidates?.length) {
    debugNotes.push(`Ambiguous: also consider ${resolved.candidates.slice(1, 4).map((c) => c.name).join(", ")}.`);
  }

  return {
    ok: true,
    q,
    devOnly: true,
    db: { connected: true },
    resolved,
    summary: {
      albumsFound: albums.length,
      tracksFound: tracks.length,
      chartedTracks,
      inLibraryTracks,
      missingRvalAlbums,
      missingCoverAlbums,
    },
    albums,
    tracks,
    chartAppearances,
    debugNotes,
    homeSearchCompare,
  };
}
