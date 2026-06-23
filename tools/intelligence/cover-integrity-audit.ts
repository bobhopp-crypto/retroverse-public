#!/usr/bin/env npx tsx
/**
 * Album cover assignment integrity audit — read-only.
 *
 * Usage:
 *   npm run intelligence:cover-integrity-audit
 */
import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

import { resolveAlbumCoverUrlFromRow } from "../../lib/artwork/resolve-album-cover-url.ts";
import {
  assessAlbumCoverEvidence,
  buildQuarantineList,
  type QuarantineEntry,
} from "../../lib/cover-integrity/album-cover-evidence.ts";
import { defaultCoverFsRoot, resolveCoverFilePath } from "../../lib/cover-integrity/score.ts";
import { inspectPing, inspectQuery } from "../../lib/inspect/pg.ts";
import { resolveArtistFromSlug } from "../../lib/artist/resolve-artist.ts";

const REPORT_PATH = join(process.cwd(), "reports/intelligence/cover-integrity-audit.md");
const JSON_PATH = join(process.cwd(), "reports/intelligence/cover-integrity-audit.json");
const HOLD_PATH = join(process.cwd(), "reports/intelligence/cover-integrity-hold.json");

const ARTIST_SLUGS = ["fleetwood-mac", "gary-wright"] as const;

const SPOTLIGHT_TITLES = [
  "in chicago",
  "the dance",
  "the dream weaver",
  "dream weaver",
  "light of smiles",
  "headin home",
  "rumours",
];

type AlbumRow = {
  pg_album_id: number;
  title: string;
  release_year: number | null;
  rval: string | null;
  cover_path: string | null;
  artwork_path: string | null;
  r2_cover_key: string | null;
  link_source: string | null;
  link_confidence: number | null;
  review_flag: string | null;
};

async function headCdn(url: string | null): Promise<number | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8_000) });
    return res.status;
  } catch {
    return 0;
  }
}

async function fileHash(path: string | null): Promise<string | null> {
  if (!path || !existsSync(path)) return null;
  const { readFile } = await import("fs/promises");
  const buf = await readFile(path);
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

async function loadArtistAlbums(artistId: number): Promise<AlbumRow[]> {
  return inspectQuery<AlbumRow>(
    `
    SELECT
      al.id AS pg_album_id,
      al.title,
      al.release_year,
      aek.external_key AS rval,
      al.canonical_cover_path AS cover_path,
      (
        SELECT aal.canonical_cover_path FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS r2_cover_key,
      (
        SELECT aal.source FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS link_source,
      (
        SELECT aal.confidence_score FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS link_confidence,
      (
        SELECT aal.review_flag FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS review_flag
    FROM albums al
    LEFT JOIN album_external_keys aek ON aek.album_id = al.id AND aek.external_key ~* '^RVAL[0-9]{6}$'
    WHERE al.artist_id = $1
    ORDER BY al.release_year ASC NULLS LAST, al.title ASC
    `,
    [artistId],
  );
}

function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isSpotlight(title: string): boolean {
  const n = normTitle(title);
  return SPOTLIGHT_TITLES.some((t) => n.includes(t));
}

function rootCauseLabel(reasons: string[]): string {
  if (reasons.includes("cover_asset_missing_on_cdn")) return "r2_publish_gap";
  if (reasons.includes("same_artist_different_album_shared_image")) return "reused_cover_cache";
  if (reasons.includes("artist_only_evidence_not_allowed_for_canonical")) return "artist_only_fallback";
  if (reasons.includes("rval_path_mismatch")) return "wrong_rval_join";
  if (reasons.includes("album_title_filename_mismatch")) return "bad_stored_assignment";
  if (reasons.includes("missing_cover_assignment")) return "missing_assignment";
  if (reasons.includes("album_title_partial_match_only")) return "weak_title_evidence";
  return "review_needed";
}

async function auditArtist(slug: string, fsRoot: string) {
  const resolved = await resolveArtistFromSlug(slug);
  if (!resolved) throw new Error(`Artist not found: ${slug}`);

  const albums = await loadArtistAlbums(resolved.artistId);
  const hashByAlbum = new Map<number, string | null>();

  for (const a of albums) {
    const path = a.artwork_path ?? a.cover_path ?? a.r2_cover_key;
    const local = resolveCoverFilePath(fsRoot, path);
    hashByAlbum.set(a.pg_album_id, await fileHash(local));
  }

  const hashOwners = new Map<string, number[]>();
  for (const [albumId, hash] of hashByAlbum) {
    if (!hash) continue;
    const list = hashOwners.get(hash) ?? [];
    list.push(albumId);
    hashOwners.set(hash, list);
  }

  const audited = [];
  for (const a of albums) {
    const rval = a.rval?.toUpperCase() ?? null;
    const assignedPath = a.artwork_path ?? a.cover_path ?? a.r2_cover_key;
    const assignedUrl = resolveAlbumCoverUrlFromRow(a);
    const localPath = resolveCoverFilePath(fsRoot, assignedPath);
    const fileExistsLocally = localPath ? existsSync(localPath) : false;
    const cdnStatus = await headCdn(assignedUrl);
    const hash = hashByAlbum.get(a.pg_album_id) ?? null;
    const sameArtistSharedHash =
      !!hash && (hashOwners.get(hash)?.length ?? 0) > 1;

    const evidence = assessAlbumCoverEvidence({
      albumTitle: a.title,
      artistName: resolved.canonicalName,
      rval: rval ?? "UNKNOWN",
      assignedPath,
      coverSource: a.link_source,
      linkConfidence: a.link_confidence,
      reviewFlag: a.review_flag,
      cdnHttpStatus: cdnStatus,
      fileExistsLocally,
      sameArtistSharedHash,
    });

    audited.push({
      artist: resolved.displayName,
      slug,
      albumId: a.pg_album_id,
      title: a.title,
      releaseYear: a.release_year,
      rval,
      assignedPath,
      assignedUrl,
      coverSource: a.link_source,
      linkConfidence: a.link_confidence,
      reviewFlag: a.review_flag,
      cdnHttpStatus: cdnStatus,
      fileExistsLocally,
      contentHash: hash,
      sameArtistSharedHash,
      evidence,
      spotlight: isSpotlight(a.title),
      rootCause: rootCauseLabel(evidence.reasons),
      titleMatchesAlbum: evidence.titleExactMatch || evidence.titlePartialMatch,
    });
  }

  return {
    artist: resolved.displayName,
    slug,
    artistId: resolved.artistId,
    totalAlbums: albums.length,
    withRval: albums.filter((a) => a.rval).length,
    missingCover: audited.filter((a) => a.evidence.status === "missing").length,
    brokenCover: audited.filter((a) => a.evidence.status === "broken").length,
    reviewNeeded: audited.filter((a) => a.evidence.status === "review_needed").length,
    canonical: audited.filter((a) => a.evidence.status === "canonical").length,
    albums: audited,
  };
}

function renderArtistSection(data: Awaited<ReturnType<typeof auditArtist>>): string[] {
  const lines = [
    `## ${data.artist}`,
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Albums in graph | ${data.totalAlbums} |`,
    `| With RVAL | ${data.withRval} |`,
    `| Canonical covers | ${data.canonical} |`,
    `| Review needed | ${data.reviewNeeded} |`,
    `| Broken (path but no asset) | ${data.brokenCover} |`,
    `| Missing assignment | ${data.missingCover} |`,
    "",
    "### Discography",
    "",
    "| Year | Album | RVAL | CDN | Status | Title match | Source | Root cause |",
    "| ---: | --- | --- | ---: | --- | --- | --- | --- |",
  ];

  for (const a of data.albums) {
    lines.push(
      `| ${a.releaseYear ?? "—"} | ${a.title} | ${a.rval ?? "—"} | ${a.cdnHttpStatus ?? "—"} | ${a.evidence.status} | ${a.titleMatchesAlbum ? "yes" : "no"} | ${a.coverSource ?? "—"} | ${a.rootCause} |`,
    );
  }

  const spotlights = data.albums.filter((a) => a.spotlight);
  if (spotlights.length > 0) {
    lines.push("", "### Spotlight albums", "");
    for (const a of spotlights) {
      lines.push(
        `**${a.title}** (${a.releaseYear ?? "?"}) · id ${a.albumId} · ${a.rval ?? "no RVAL"}`,
        `- Assigned: ${a.assignedUrl ?? "—"}`,
        `- Status: **${a.evidence.status}** · ${a.rootCause}`,
        `- Reasons: ${a.evidence.reasons.join(", ") || "—"}`,
        "",
      );
    }
  }

  return lines;
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error(`Postgres unavailable: ${ping.error}`);

  const fsRoot = defaultCoverFsRoot();
  const artistReports = [];
  for (const slug of ARTIST_SLUGS) {
    console.log(`Auditing ${slug}…`);
    artistReports.push(await auditArtist(slug, fsRoot));
  }

  const allRows = artistReports.flatMap((ar) =>
    ar.albums.map((a) => ({
      artist: a.artist,
      album: a.title,
      releaseYear: a.releaseYear,
      albumId: a.albumId,
      rval: a.rval ?? "—",
      status: a.evidence.status,
      reasons: a.evidence.reasons,
      assignedPath: a.assignedPath,
      assignedUrl: a.assignedUrl,
      quarantine: a.evidence.quarantine,
    })),
  );

  const quarantine = buildQuarantineList(allRows);

  const fleetwood = artistReports.find((a) => a.slug === "fleetwood-mac")!;
  const gary = artistReports.find((a) => a.slug === "gary-wright")!;

  const lines = [
    "# Cover Integrity Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Intelligence hold",
    "",
    "**Active.** Overnight intelligence scaling is paused until cover integrity is repaired.",
    "",
    "## Executive summary",
    "",
    `| Artist | Albums | Canonical | Review | Broken | Missing |`,
    `| --- | ---: | ---: | ---: | ---: | ---: |`,
    `| Fleetwood Mac | ${fleetwood.totalAlbums} | ${fleetwood.canonical} | ${fleetwood.reviewNeeded} | ${fleetwood.brokenCover} | ${fleetwood.missingCover} |`,
    `| Gary Wright | ${gary.totalAlbums} | ${gary.canonical} | ${gary.reviewNeeded} | ${gary.brokenCover} | ${gary.missingCover} |`,
    "",
    "### Root cause distribution (quarantined albums)",
    "",
  ];

  const causeCounts = new Map<string, number>();
  for (const q of quarantine) {
    const albums = artistReports.flatMap((r) => r.albums);
    const row = albums.find((a) => a.albumId === q.albumId);
    const cause = row?.rootCause ?? "unknown";
    causeCounts.set(cause, (causeCounts.get(cause) ?? 0) + 1);
  }
  for (const [cause, n] of [...causeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${cause}**: ${n}`);
  }

  lines.push(
    "",
    "## Findings",
    "",
    "### Gary Wright",
    "- Graph paths are **RVAL-correct** per album (Dream Weaver / Light of Smiles / Headin' Home each have distinct paths).",
    "- **Light of Smiles** and **Headin' Home** are **broken**: assigned paths return CDN **404** (staging exists locally, not published).",
    "- **The Dream Weaver** is canonical with CDN **200**.",
    "",
    "### Fleetwood Mac",
    `- **${fleetwood.missingCover}** albums have no cover assignment — major discography gap.`,
    `- **${fleetwood.brokenCover}** albums have paths but CDN 404.`,
    `- **${fleetwood.reviewNeeded}** albums flagged review_needed (weak evidence or broken delivery).`,
    "- Spotlight: check **In Chicago**, **The Dance**, **Rumours** in table below.",
    "",
    "## Cover matching logic (current system)",
    "",
    "| Surface | Match key | Risk |",
    "| --- | --- | --- |",
    "| Artist album grid | RVAL → artwork_links → canonical path | Low if RVAL-scoped |",
    "| Album page | album_id via RVAL | Low |",
    "| RVTR package cover | RVTR → first album track position | Medium — wrong album link poisons track |",
    "| Cover recovery (intelligence) | External probes; 78+ auto-accept | **High** — artist-only iTunes fuzzy at 55–68 |",
    "| Artist page track fallback | First album cover on discography | **High** — unlinked RVTRs get wrong art |",
    "",
    "**Not root cause for album tiles:** UI rendering bug, loose RVAL join (paths are per-album).",
    "",
    "**Primary root causes:** CDN publish gap, missing assignments, cover recovery threshold too low for artist-only hits.",
    "",
    "## Safety rule (new)",
    "",
    "Album canonical covers require **strong album-title evidence** in the assigned filename/path:",
    "- Title exact match OR (partial + artist + RVAL path match)",
    "- Deliverable asset on public CDN (**HTTP 200**)",
    "- **Artist-only matching is not allowed** for album-level canonical covers",
    "",
    "Weak evidence → **REVIEW NEEDED** (quarantine), not canonical.",
    "",
    "## Quarantine list",
    "",
    `${quarantine.length} albums quarantined (no data mutated).`,
    "",
    "| Artist | Album | Year | RVAL | Status | Reasons |",
    "| --- | --- | ---: | --- | --- | --- |",
  );

  for (const q of quarantine.slice(0, 80)) {
    lines.push(
      `| ${q.artist} | ${q.album} | ${q.releaseYear ?? "—"} | ${q.rval} | ${q.status} | ${q.reasons.slice(0, 2).join("; ") || "—"} |`,
    );
  }
  if (quarantine.length > 80) {
    lines.push(`| … | ${quarantine.length - 80} more | | | | |`);
  }

  lines.push("");
  for (const ar of artistReports) {
    lines.push(...renderArtistSection(ar));
  }

  lines.push(
    "## Recommendations (no auto-fix applied)",
    "",
    "1. Publish missing R2 assets for broken assignments (Gary Wright + Fleetwood Mac 404s).",
    "2. Raise intelligence cover recovery floor — require album title match, not artist-only.",
    "3. Quarantine REVIEW NEEDED covers before package/artifact generation.",
    "4. Clear `cover-integrity-hold.json` only after spotlight albums pass CDN + title checks.",
    "",
  );

  await mkdir(join(process.cwd(), "reports/intelligence"), { recursive: true });
  await writeFile(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
  await writeFile(
    JSON_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), artistReports, quarantine }, null, 2) + "\n",
    "utf8",
  );
  await writeFile(
    HOLD_PATH,
    `${JSON.stringify(
      {
        active: true,
        reason: "Cover integrity audit — album assignment gaps and CDN publish failures",
        since: new Date().toISOString(),
        reportPath: "reports/intelligence/cover-integrity-audit.md",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`Hold:   ${HOLD_PATH}`);
  console.log(`Quarantine: ${quarantine.length} albums`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
