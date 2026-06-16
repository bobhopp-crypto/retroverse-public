/**
 * Phase 5A — MusicBrainz ingest pilot design (read-only).
 * Usage: npx tsx tools/healing/musicbrainz-ingest-pilot.ts
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import {
  normalizeTrackTitleKey,
  titlesLikelyMatch,
} from "@/lib/track/album-link-recovery/normalize-title";

type BucketRow = {
  rvtr: string;
  title: string;
  artist_name: string;
  chart_year: number | null;
  chart_weeks: number;
  artist_id: number | null;
  bucket: "C";
};

type TrackSlot = { position: number | null; title: string };

type MbResult = {
  mbRecordingId: string | null;
  mbReleaseId: string | null;
  artist: string | null;
  album: string | null;
  releaseYear: number | null;
  trackPosition: number | null;
  trackTitleOnAlbum: string | null;
  tracklist: TrackSlot[];
  complete: boolean;
  note: string;
};

type PilotRow = BucketRow & {
  mb: MbResult;
  existingAlbums: number;
  existingRvals: number;
  newRvalRequired: boolean;
  confidence: "high" | "medium" | "low" | "reject";
  autoIngestable: boolean;
  signals: string[];
};

const UA = "RetroverseIngestPilot/1.0 (research@retroverse.local)";
const MB_BASE = "https://musicbrainz.org/ws/2";
const TARGET = Number(process.env.MB_PILOT_TARGET ?? 50) || 50;
const COMPILATION_RE =
  /\b(megamix|dj.?mix|promo only|hottest 100|now that|greatest hits|best of|collection|compilation|karaoke|tribute|expansion pack|radio edit|remix|live at|soundtrack|various artists|sampler|party mix|hit connection|mixtape|festival)\b/i;
const BAD_RECORDING_RE =
  /\b(dj.?mix|megamix|live|instrumental|karaoke|acapella|demo|edit)\b/i;
const NON_STUDIO_RE = /\b(session|live from|promo only|itunes|bonnaroo|madison square|acoustic cafe)\b/i;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseYear(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const m = String(raw).match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

function normalizeArtistKey(name: string): string {
  return normalizeTrackTitleKey(name.replace(/^the\s+/i, ""));
}

function artistsLikelyMatch(a: string, b: string): boolean {
  const ka = normalizeArtistKey(a);
  const kb = normalizeArtistKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.includes(kb) || kb.includes(ka)) return true;
  return false;
}

function yearDistance(chartYear: number | null, releaseYear: number | null): number {
  if (chartYear == null || releaseYear == null) return 50;
  return Math.abs(chartYear - releaseYear);
}

async function mbFetch(path: string): Promise<unknown> {
  await sleep(1100);
  const res = await fetch(`${MB_BASE}${path}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`MusicBrainz ${res.status}: ${path}`);
  return res.json();
}

type MbRecording = {
  id: string;
  title: string;
  score: number;
  disambiguation?: string;
  "first-release-date"?: string;
};

type MbRelease = { id: string; title: string; date?: string };

function scoreRecording(rec: MbRecording, chartYear: number | null): number {
  let score = rec.score ?? 0;
  const dis = `${rec.disambiguation ?? ""} ${rec.title}`;
  if (BAD_RECORDING_RE.test(dis)) score -= 40;
  const y = parseYear(rec["first-release-date"]);
  if (y != null && chartYear != null) score -= yearDistance(chartYear, y) * 2;
  return score;
}

function scoreRelease(rel: MbRelease, chartYear: number | null): number {
  let score = 100;
  if (COMPILATION_RE.test(rel.title)) score -= 60;
  if (/^\d{4}[-_]/.test(rel.title)) score -= 40;
  if (/\(/.test(rel.title) && /bonus|levels|pack/i.test(rel.title)) score -= 10;
  const y = parseYear(rel.date);
  if (y != null && chartYear != null) score -= yearDistance(chartYear, y) * 3;
  return score;
}

function extractMbTracklist(data: {
  media?: Array<{ tracks?: Array<{ position: number; title: string }> }>;
}): TrackSlot[] {
  const out: TrackSlot[] = [];
  for (const medium of data.media ?? []) {
    for (const t of medium.tracks ?? []) {
      if (t.title?.trim()) out.push({ position: t.position ?? null, title: t.title.trim() });
    }
  }
  return out;
}

function findTrackOnList(trackTitle: string, tracklist: TrackSlot[]) {
  for (const slot of tracklist) {
    if (titlesLikelyMatch(trackTitle, slot.title)) return slot;
  }
  return null;
}

async function queryMusicBrainz(
  artist: string,
  track: string,
  chartYear: number | null,
): Promise<MbResult> {
  try {
    const q = encodeURIComponent(`artist:"${artist}" AND recording:"${track}"`);
    const search = (await mbFetch(`/recording?query=${q}&fmt=json&limit=10`)) as {
      recordings?: MbRecording[];
    };
    const recs = search.recordings ?? [];
    if (!recs.length) {
      return {
        mbRecordingId: null,
        mbReleaseId: null,
        artist: null,
        album: null,
        releaseYear: null,
        trackPosition: null,
        trackTitleOnAlbum: null,
        tracklist: [],
        complete: false,
        note: "no recording match",
      };
    }

    const bestRec = [...recs].sort(
      (a, b) => scoreRecording(b, chartYear) - scoreRecording(a, chartYear),
    )[0];

    const recDetail = (await mbFetch(
      `/recording/${bestRec.id}?inc=releases+artist-credits&fmt=json`,
    )) as {
      releases?: MbRelease[];
      "artist-credit"?: Array<{ name?: string; artist?: { name?: string } }>;
    };

    const mbArtist =
      recDetail["artist-credit"]?.map((a) => a.name || a.artist?.name || "").join("") ||
      artist;
    const releases = recDetail.releases ?? [];
    if (!releases.length) {
      return {
        mbRecordingId: bestRec.id,
        mbReleaseId: null,
        artist: mbArtist,
        album: null,
        releaseYear: null,
        trackPosition: null,
        trackTitleOnAlbum: null,
        tracklist: [],
        complete: false,
        note: "no releases on recording",
      };
    }

    const ranked = [...releases]
      .sort((a, b) => scoreRelease(b, chartYear) - scoreRelease(a, chartYear))
      .slice(0, 3);

    let best: {
      release: MbRelease;
      tracklist: TrackSlot[];
      artist: string;
      score: number;
    } | null = null;

    for (const rel of ranked) {
      const relDetail = (await mbFetch(
        `/release/${rel.id}?inc=recordings+media+artist-credits&fmt=json`,
      )) as {
        media?: Array<{ tracks?: Array<{ position: number; title: string }> }>;
        "artist-credit"?: Array<{ name?: string; artist?: { name?: string } }>;
      };
      const tracklist = extractMbTracklist(relDetail);
      const relArtist =
        relDetail["artist-credit"]?.map((a) => a.name || a.artist?.name || "").join("") ||
        mbArtist;
      const hit = findTrackOnList(track, tracklist);
      const candidateScore =
        scoreRelease(rel, chartYear) +
        (hit ? 50 : -20) +
        Math.min(tracklist.length, 20);
      if (!best || candidateScore > best.score) {
        best = { release: rel, tracklist, artist: relArtist, score: candidateScore };
      }
      if (hit && tracklist.length >= 8) break;
    }

    if (!best) {
      return {
        mbRecordingId: bestRec.id,
        mbReleaseId: null,
        artist: mbArtist,
        album: null,
        releaseYear: null,
        trackPosition: null,
        trackTitleOnAlbum: null,
        tracklist: [],
        complete: false,
        note: "no release candidate",
      };
    }

    const hit = findTrackOnList(track, best.tracklist);
    const artistMatch = artistsLikelyMatch(artist, best.artist);
    const complete =
      artistMatch &&
      !!best.release.title?.trim() &&
      parseYear(best.release.date) != null &&
      !!hit &&
      hit.position != null &&
      best.tracklist.length >= 4;

    return {
      mbRecordingId: bestRec.id,
      mbReleaseId: best.release.id,
      artist: best.artist,
      album: best.release.title,
      releaseYear: parseYear(best.release.date),
      trackPosition: hit?.position ?? null,
      trackTitleOnAlbum: hit?.title ?? null,
      tracklist: best.tracklist,
      complete,
      note: `recording=${bestRec.id}`,
    };
  } catch (e) {
    return {
      mbRecordingId: null,
      mbReleaseId: null,
      artist: null,
      album: null,
      releaseYear: null,
      trackPosition: null,
      trackTitleOnAlbum: null,
      tracklist: [],
      complete: false,
      note: `error: ${(e as Error).message}`,
    };
  }
}

function classifyConfidence(
  row: BucketRow,
  mb: MbResult,
): { confidence: PilotRow["confidence"]; autoIngestable: boolean; signals: string[] } {
  const signals: string[] = [];
  if (!mb.complete) {
    signals.push("incomplete_mb_metadata");
    return { confidence: "reject", autoIngestable: false, signals };
  }

  if (COMPILATION_RE.test(mb.album ?? "")) {
    signals.push("compilation_release_title");
    return { confidence: "reject", autoIngestable: false, signals };
  }

  if (NON_STUDIO_RE.test(mb.album ?? "")) {
    signals.push("non_studio_release_shape");
    return { confidence: "low", autoIngestable: false, signals };
  }

  signals.push("artist_match");
  signals.push("track_on_tracklist");
  signals.push(`track_position_${mb.trackPosition}`);

  const yearDelta = yearDistance(row.chart_year, mb.releaseYear);
  if (yearDelta <= 1) signals.push("year_delta_0_1");
  else if (yearDelta <= 3) signals.push("year_delta_2_3");
  else signals.push(`year_delta_${yearDelta}`);

  if (mb.tracklist.length >= 10) signals.push("tracklist_10_plus");
  else if (mb.tracklist.length >= 8) signals.push("tracklist_8_plus");
  else signals.push(`tracklist_${mb.tracklist.length}`);

  if (mb.mbReleaseId) signals.push(`mb_release=${mb.mbReleaseId}`);

  if (yearDelta <= 1 && mb.tracklist.length >= 8) {
    return { confidence: "high", autoIngestable: true, signals };
  }
  if (yearDelta <= 3 && mb.tracklist.length >= 6) {
    return { confidence: "medium", autoIngestable: false, signals };
  }
  return { confidence: "low", autoIngestable: false, signals };
}

async function loadBucketC(): Promise<BucketRow[]> {
  const raw = await readFile(
    join(process.cwd(), "tools/out/missing-album-root-cause.json"),
    "utf8",
  );
  const data = JSON.parse(raw) as { rows: Array<BucketRow & { bucket: string }> };
  return data.rows
    .filter((r) => r.bucket === "C")
    .map((r) => ({
      rvtr: r.rvtr,
      title: r.title,
      artist_name: r.artist_name,
      chart_year: r.chart_year,
      chart_weeks: r.chart_weeks,
      artist_id: r.artist_id != null ? Number(r.artist_id) : null,
      bucket: "C" as const,
    }))
    .sort((a, b) => b.chart_weeks - a.chart_weeks);
}

async function loadArtistAlbumState(artistIds: number[]) {
  const rows = await inspectQuery<{
    artist_id: number;
    album_count: number;
    rval_count: number;
  }>(
    `
    SELECT al.artist_id,
      count(DISTINCT al.id)::int AS album_count,
      count(DISTINCT aek.external_key) FILTER (
        WHERE aek.external_key ~* '^RVAL[0-9]{6}$'
      )::int AS rval_count
    FROM albums al
    LEFT JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE al.artist_id = ANY($1::bigint[])
    GROUP BY al.artist_id
    `,
    [artistIds],
  );
  const map = new Map<number, { albumCount: number; rvalCount: number }>();
  for (const r of rows) {
    map.set(Number(r.artist_id), {
      albumCount: r.album_count,
      rvalCount: r.rval_count,
    });
  }
  return map;
}

function pct(n: number, t: number) {
  return t > 0 ? `${((n / t) * 100).toFixed(1)}%` : "0%";
}

function buildReport(rows: PilotRow[], generatedAt: string): string {
  const high = rows.filter((r) => r.confidence === "high");
  const medium = rows.filter((r) => r.confidence === "medium");
  const low = rows.filter((r) => r.confidence === "low");
  const reject = rows.filter((r) => r.confidence === "reject");
  const auto = rows.filter((r) => r.autoIngestable);
  const newRval = rows.filter((r) => r.newRvalRequired);

  const tableRows = rows
    .map(
      (r) =>
        `| ${r.rvtr} | ${r.artist_name} | ${r.title} | ${r.mb.album ?? "—"} | ${r.mb.releaseYear ?? "—"} | ${r.mb.trackPosition ?? "—"} | ${r.mb.tracklist.length} | ${r.newRvalRequired ? "yes" : "no"} | ${r.confidence} | ${r.autoIngestable ? "yes" : "no"} |`,
    )
    .join("\n");

  const examples = rows
    .filter((r) => r.confidence === "high")
    .slice(0, 8)
    .map(
      (r) =>
        `- **${r.artist_name}** — "${r.title}" → *${r.mb.album}* (${r.mb.releaseYear}), slot ${r.mb.trackPosition}, ${r.mb.tracklist.length} tracks`,
    )
    .join("\n");

  const autoRate = auto.length / rows.length;
  const scaled500Auto = Math.round(500 * autoRate);
  const scaled500Review = 500 - scaled500Auto;
  const lookupYield = 0.24;
  const lookupsFor500 = Math.ceil(500 / lookupYield);

  return `# MusicBrainz Ingest Pilot — Phase 5A

**Generated:** ${generatedAt}  
**Mode:** Design pilot — no imports, no DB writes  
**Sample:** ${rows.length} Bucket C tracks where MusicBrainz returns recoverable metadata (Phase 4D criteria)

---

## Executive summary

Smallest viable pipeline: **RVTR → MB recording search → release pick → tracklist extract → staging row → human approve → albums + RVAL + canonical_album_tracks + RVTR slot link**.

| Pilot metric | Value |
|--------------|------:|
| MB-recoverable C tracks sampled | ${rows.length} |
| Would create **new RVAL** | ${newRval.length} (${pct(newRval.length, rows.length)}) |
| Auto-ingestable (high confidence) | ${auto.length} (${pct(auto.length, rows.length)}) |
| Needs human review | ${rows.length - auto.length} (${pct(rows.length - auto.length, rows.length)}) |

**Effort to recover first 500 album relationships via MusicBrainz:** ~**${lookupsFor500.toLocaleString()} MB lookups** (~${Math.round(lookupsFor500 * 3.3 / 3600)} hours API time at 1 req/s) + **~${scaled500Review} human reviews** (~${Math.round(scaled500Review * 2 / 60)} hours at 2 min/review) + **~${scaled500Auto} auto-applies**. Expect **2–3 dev days** for minimal staging + approval UI; **1–2 curator days** for first 500 batch.

---

## 1. Exact data fields needed

### From MusicBrainz (per candidate)

| Field | MB entity | Required |
|-------|-----------|----------|
| Recording MBID | \`recording.id\` | yes — audit trail |
| Release MBID | \`release.id\` | yes — idempotent re-fetch |
| Artist credit | \`release.artist-credit\` | yes — maps to RVAR |
| Album title | \`release.title\` | yes — \`albums.title\` |
| Release year | \`release.date\` (YYYY) | yes — \`albums.release_year\` |
| Track position | \`media[].tracks[].position\` | yes — \`canonical_album_tracks.position\` |
| Slot title | \`media[].tracks[].title\` | yes — \`canonical_album_tracks.title\` |
| Full tracklist | all \`media[].tracks[]\` | yes — seed all slots |
| Release group MBID | \`release-group.id\` (optional inc) | nice — dedupe editions |

### Retroverse write surface (not executed in pilot)

| Target | Fields |
|--------|--------|
| \`albums\` | \`artist_id\`, \`title\`, \`release_year\` |
| \`album_external_keys\` | new \`RVAL######\`, \`album_id\`, \`source='musicbrainz'\`, \`confidence_score\` |
| \`canonical_album_tracks\` | \`album_id\`, \`position\`, \`title\`, \`canonical_track_key\` (RVTR on matched slot only) |
| Staging (proposed) | \`rvtr\`, \`mb_release_id\`, \`mb_recording_id\`, \`proposed_album_title\`, \`proposed_year\`, \`chart_year\`, \`confidence\`, \`signals[]\`, \`status\` |

### Identity anchors (already in graph)

| Field | Source |
|-------|--------|
| \`rvtr\` | \`canonical_track_display.track_id\` |
| \`artist_id\` | \`canonical_track_display.artist_id\` (RVAR bridge) |
| Chart context | \`chart_year\`, \`chart_weeks\` from Hot 100 |

---

## 2. MusicBrainz → Retroverse entity map

| MusicBrainz | Retroverse | Notes |
|-------------|------------|-------|
| Artist | **RVAR** (\`artists.id\`) | Match via \`canonical_name\` normalize; never create artist in pilot |
| Release group | **RVAL** album identity | One RVAL per studio album; editions collapse later |
| Release | \`albums\` row + \`album_external_keys\` | Pick one primary release per ingest |
| Recording | **RVTR** slot match | Chart track must appear on release tracklist |
| Medium / track position | \`canonical_album_tracks.position\` | Preserve disc order |
| Track title on release | \`canonical_album_tracks.title\` | May differ from Hot 100 display title |
| Release date | \`albums.release_year\` | Year only for pilot |

**Not mapped in v1:** label, barcode, cover art (defer to RV12), ISRC, release country.

---

## 3. How many of 50 could be ingested automatically?

| Confidence | Count | % | Auto? |
|------------|------:|--:|-------|
| **High** | ${high.length} | ${pct(high.length, rows.length)} | yes |
| Medium | ${medium.length} | ${pct(medium.length, rows.length)} | no — curator pick release |
| Low | ${low.length} | ${pct(low.length, rows.length)} | no — likely wrong album shape |
| Reject | ${reject.length} | ${pct(reject.length, rows.length)} | no — compilation / incomplete |

**${auto.length} of ${rows.length} (${pct(auto.length, rows.length)})** could auto-ingest under proposed gates: studio album, year Δ≤1, tracklist ≥8, no compilation/festival/live-session title.

Scaled to Phase 4D MB C recovery (~1,789): **~${Math.round(1789 * (auto.length / rows.length)).toLocaleString()}** auto-eligible of full MB-recoverable C population.

---

## 4. Confidence signals

| Signal | Auto-ingest gate | Review trigger |
|--------|------------------|----------------|
| \`year_delta_0_1\` | required | — |
| \`year_delta_2_3\` | — | medium tier |
| \`year_delta_4+\` | — | low tier |
| \`tracklist_8_plus\` | required for auto | short EP/single |
| \`compilation_release_title\` | reject | — |
| \`non_studio_release_shape\` | reject/low | festival, iTunes Session, Live |
| \`artist_match\` | required | collaboration splits |
| \`track_on_tracklist\` + position | required | — |
| \`mb_release=…\` | audit | re-fetch idempotency |

---

## 5. Human approval workflow (proposed)

\`\`\`
1. STAGE — MB lookup produces ingest_candidate row (rvtr, mb_release_id, album, year, tracklist JSON, confidence, signals)
2. QUEUE — /ops/healing/ingest-candidates sorted by chart_weeks DESC
3. REVIEW CARD — show: RVTR title, MB album, year, tracklist preview, highlight matched slot, compilation flags
4. ACTIONS
   - Approve → create albums + RVAL + tracklist + link RVTR slot
   - Swap release → pick alternate MB release from recording
   - Reject → mark rejected + reason
   - Defer → leave staged
5. AUDIT — log actor, mb_release_id, rval assigned, timestamp
\`\`\`

**Auto path (high only):** batch approve with daily cap (e.g. 50) + post-apply spot-check sample.

---

## Pilot cohort — 50 tracks

| RVTR | Artist | Track | MB album | Year | Pos | Tracks | New RVAL? | Confidence | Auto? |
|------|--------|-------|----------|-----:|----:|------:|-----------|------------|-------|
${tableRows}

### High-confidence examples

${examples || "_None in this cohort — tighten release picker or expand studio-album filter._"}

---

## Effort model — first 500 recoveries

| Step | Estimate | Assumption |
|------|----------|------------|
| MB API lookups | ~${lookupsFor500.toLocaleString()} | 24% yield (Phase 4D C rate) |
| API wall time | ~${Math.round(lookupsFor500 * 3.3 / 60)} min | 3 calls/lookup, 1.1s each |
| Auto-applies | ~${scaled500Auto} | ${pct(auto.length, rows.length)} high-confidence rate |
| Human reviews | ~${scaled500Review} | medium + low + reject re-picks |
| Curator time | ~${Math.round(scaled500Review * 2 / 60)} hours | 2 min/review |
| Dev (minimal pipeline) | 2–3 days | staging table + ops queue + apply script |

**Critical path:** release-picker quality (compilation filter). Pilot shows ${reject.length + low.length} of ${rows.length} MB-"recoverable" rows fail studio-album gate — picker tuning before scale.

---

## Artifacts

- JSON: \`tools/out/musicbrainz-ingest-pilot.json\`
- Re-run: \`npx tsx tools/healing/musicbrainz-ingest-pilot.ts\`
- ROI source: \`tools/out/external-catalog-roi-experiment.json\`
`;
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error(`Postgres unavailable: ${ping.error}`);

  const generatedAt = new Date().toISOString();
  const outPath = join(process.cwd(), "tools/out/musicbrainz-ingest-pilot.json");
  const cacheOnly = process.argv.includes("--cache-only");

  let pilotRows: PilotRow[] = [];

  if (cacheOnly) {
    pilotRows = JSON.parse(await readFile(outPath, "utf8")).rows;
  } else {
    const bucketC = await loadBucketC();
    const roiPath = join(process.cwd(), "tools/out/external-catalog-roi-experiment.json");
    const roi = JSON.parse(await readFile(roiPath, "utf8")) as {
      samples: Array<{
        rvtr: string;
        bucket: string;
        bucketCRecoverableMb: boolean;
        musicbrainz: {
          complete: boolean;
          artist: string | null;
          album: string | null;
          releaseYear: number | null;
          trackPosition: number | null;
          trackTitleOnAlbum: string | null;
          tracklist: TrackSlot[];
          externalId: string | null;
          note: string;
        };
        title: string;
        artist_name: string;
        chart_year: number | null;
        chart_weeks: number;
        artist_id: number | null;
      }>;
    };

    const seeded: Array<{ row: BucketRow; mb: MbResult }> = roi.samples
      .filter((s) => s.bucket === "C" && s.bucketCRecoverableMb)
      .map((s) => ({
        row: {
          rvtr: s.rvtr,
          title: s.title,
          artist_name: s.artist_name,
          chart_year: s.chart_year,
          chart_weeks: s.chart_weeks,
          artist_id: s.artist_id,
          bucket: "C" as const,
        },
        mb: {
          mbRecordingId: s.musicbrainz.note.match(/recording=([\w-]+)/)?.[1] ?? null,
          mbReleaseId: s.musicbrainz.externalId,
          artist: s.musicbrainz.artist,
          album: s.musicbrainz.album,
          releaseYear: s.musicbrainz.releaseYear,
          trackPosition: s.musicbrainz.trackPosition,
          trackTitleOnAlbum: s.musicbrainz.trackTitleOnAlbum,
          tracklist: s.musicbrainz.tracklist,
          complete: s.musicbrainz.complete,
          note: s.musicbrainz.note,
        },
      }));

    const seen = new Set(seeded.map((s) => s.row.rvtr));
    console.log(`[pilot] seeded from ROI: ${seeded.length}`);

    const candidates: Array<{ row: BucketRow; mb: MbResult }> = [...seeded];

    try {
      const prior = JSON.parse(await readFile(outPath, "utf8")) as { rows: PilotRow[] };
      for (const row of prior.rows) {
        if (!row.mb?.complete || seen.has(row.rvtr)) continue;
        seen.add(row.rvtr);
        candidates.push({
          row: {
            rvtr: row.rvtr,
            title: row.title,
            artist_name: row.artist_name,
            chart_year: row.chart_year,
            chart_weeks: row.chart_weeks,
            artist_id: row.artist_id,
            bucket: "C",
          },
          mb: row.mb,
        });
      }
      console.log(`[pilot] resumed from cache: ${candidates.length} total`);
    } catch {
      // no prior pilot file
    }

    for (const row of bucketC) {
      if (candidates.length >= TARGET) break;
      if (seen.has(row.rvtr)) continue;
      seen.add(row.rvtr);
      console.log(`[pilot] query ${candidates.length + 1}/${TARGET} ${row.rvtr} ${row.artist_name}`);
      const mb = await queryMusicBrainz(row.artist_name, row.title, row.chart_year);
      if (mb.complete) candidates.push({ row, mb });
    }

    console.log(`[pilot] MB-complete candidates: ${candidates.length}`);

    const artistIds = [
      ...new Set(
        candidates
          .map((c) => c.row.artist_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const albumState = await loadArtistAlbumState(artistIds);

    pilotRows = candidates.slice(0, TARGET).map(({ row, mb }) => {
      const state = row.artist_id ? albumState.get(Number(row.artist_id)) : null;
      const existingAlbums = state?.albumCount ?? 0;
      const existingRvals = state?.rvalCount ?? 0;
      const { confidence, autoIngestable, signals } = classifyConfidence(row, mb);
      return {
        ...row,
        mb,
        existingAlbums,
        existingRvals,
        newRvalRequired: existingAlbums === 0,
        confidence,
        autoIngestable,
        signals,
      };
    });
  }

  const outDir = join(process.cwd(), "tools/out");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    outPath,
    JSON.stringify({ generatedAt, target: TARGET, count: pilotRows.length, rows: pilotRows }, null, 2),
  );

  const report = buildReport(pilotRows, generatedAt);
  await writeFile(join(process.cwd(), "reports/musicbrainz-ingest-pilot.md"), report);

  console.log(
    JSON.stringify(
      {
        count: pilotRows.length,
        auto: pilotRows.filter((r) => r.autoIngestable).length,
        high: pilotRows.filter((r) => r.confidence === "high").length,
        newRval: pilotRows.filter((r) => r.newRvalRequired).length,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
