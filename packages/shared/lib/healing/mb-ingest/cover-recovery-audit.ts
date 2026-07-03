import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { buildDiscogsSearchUrl } from "@/lib/cover-integrity/discogs-url";
import { expectedDossierCoverRelPath } from "@/lib/covers/backfill/dossier-path";
import { coverFsRoot } from "@/lib/covers/backfill/paths";
import { loadMbIngestProposal } from "@/lib/healing/mb-ingest/apply-plan";
import { WAVE_10_CUMULATIVE_IDS } from "@/lib/healing/mb-ingest/wave-10-apply";
import { loadAlbumPage } from "@/lib/album/load-album-page";
import { inspectQuery } from "@/lib/inspect/pg";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const CAA_BASE = "https://coverartarchive.org/release";
const ITUNES_SEARCH = "https://itunes.apple.com/search";
const UA = "RetroverseMbCoverAudit/1.0 (research@retroverse.local)";

export type CoverRecoveryClass =
  | "exists_unlinked"
  | "auto_recoverable"
  | "review_recoverable"
  | "no_source";

export type ArtworkLinkRow = {
  id: number;
  source: string | null;
  canonical_cover_path: string | null;
  local_cover_path: string | null;
  r2_cover_key: string | null;
  review_flag: string | null;
  confidence_score: number | null;
  source_url: string | null;
};

export type MediaAssetCandidate = {
  id: number;
  source_path: string | null;
  artist: string | null;
  title: string | null;
  r2_media_key: string | null;
};

export type MbCoverProbe = {
  mbReleaseId: string;
  hasFront: boolean;
  imageCount: number;
  frontUrl: string | null;
  status: number | "error";
  note: string;
};

export type ItunesProbe = {
  resultCount: number;
  topMatch: {
    collectionName: string;
    artistName: string;
    releaseDate: string;
    artworkUrl100: string;
  } | null;
  exactAlbumMatch: boolean;
  yearMatch: boolean;
  note: string;
};

export type AlbumCoverAuditRow = {
  proposalId: number;
  rval: string;
  albumId: number;
  artist: string;
  album: string;
  releaseYear: number | null;
  mbReleaseId: string;
  albumUrl: string;
  publicCoverUrl: string | null;
  canonicalCoverPath: string | null;
  artworkLinks: ArtworkLinkRow[];
  mediaAssets: MediaAssetCandidate[];
  localFiles: string[];
  expectedDossierPath: string;
  localExpectedExists: boolean;
  mbCover: MbCoverProbe;
  itunes: ItunesProbe;
  discogsSearchUrl: string;
  recoveryClass: CoverRecoveryClass;
  classLabel: string;
  fastestPath: string;
  notes: string[];
};

export type MbCoverRecoveryAudit = {
  generatedAt: string;
  scope: string;
  albums: AlbumCoverAuditRow[];
  summary: {
    total: number;
    publicCoverPresent: number;
    existsUnlinked: number;
    autoRecoverable: number;
    reviewRecoverable: number;
    noSource: number;
    gainableToday: number;
    fastestPath: string;
  };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeAlbumKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function classMeta(cls: CoverRecoveryClass): { label: string; fastestPath: string } {
  switch (cls) {
    case "exists_unlinked":
      return {
        label: "1 — Cover exists but not linked",
        fastestPath: "promoteDossierCoverToPg — link existing path to albums.canonical_cover_path",
      };
    case "auto_recoverable":
      return {
        label: "2 — Cover recoverable automatically",
        fastestPath: "MB CAA download → dossier path → promoteDossierCoverToPg (or iTunes fill batch)",
      };
    case "review_recoverable":
      return {
        label: "3 — Cover recoverable with review",
        fastestPath: "Human verify iTunes/Discogs candidate → manual promote",
      };
    case "no_source":
      return {
        label: "4 — No cover source found",
        fastestPath: "Manual curator ingest or alternate edition search",
      };
  }
}

async function probeMbCover(mbReleaseId: string): Promise<MbCoverProbe> {
  const id = mbReleaseId.trim();
  if (!id) {
    return {
      mbReleaseId: id,
      hasFront: false,
      imageCount: 0,
      frontUrl: null,
      status: "error",
      note: "missing mb_release_id",
    };
  }
  try {
    const res = await fetch(`${CAA_BASE}/${id}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.status === 404) {
      return {
        mbReleaseId: id,
        hasFront: false,
        imageCount: 0,
        frontUrl: null,
        status: 404,
        note: "CAA release not indexed",
      };
    }
    if (!res.ok) {
      return {
        mbReleaseId: id,
        hasFront: false,
        imageCount: 0,
        frontUrl: null,
        status: res.status,
        note: `CAA HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      images?: Array<{ front?: boolean; image?: string; thumbnails?: { small?: string } }>;
    };
    const images = data.images ?? [];
    const front = images.find((i) => i.front) ?? images[0];
    const frontUrl = front?.image ?? front?.thumbnails?.small ?? null;
    return {
      mbReleaseId: id,
      hasFront: Boolean(frontUrl),
      imageCount: images.length,
      frontUrl,
      status: res.status,
      note: frontUrl ? "CAA front image available" : "CAA indexed but no front image",
    };
  } catch (e) {
    return {
      mbReleaseId: id,
      hasFront: false,
      imageCount: 0,
      frontUrl: null,
      status: "error",
      note: e instanceof Error ? e.message : "CAA fetch failed",
    };
  }
}

async function probeItunes(
  artist: string,
  album: string,
  releaseYear: number | null,
): Promise<ItunesProbe> {
  const term = encodeURIComponent(`${artist} ${album}`);
  try {
    const res = await fetch(
      `${ITUNES_SEARCH}?term=${term}&entity=album&limit=5`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) {
      return {
        resultCount: 0,
        topMatch: null,
        exactAlbumMatch: false,
        yearMatch: false,
        note: `iTunes HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      resultCount: number;
      results?: Array<{
        collectionName: string;
        artistName: string;
        releaseDate: string;
        artworkUrl100: string;
      }>;
    };
    const results = data.results ?? [];
    const albumKey = normalizeAlbumKey(album);
    const exact = results.find(
      (r) => normalizeAlbumKey(r.collectionName) === albumKey,
    );
    const top = exact ?? results[0] ?? null;
    const yearFromDate = top?.releaseDate ? Number(top.releaseDate.slice(0, 4)) : null;
    const yearMatch =
      releaseYear != null && yearFromDate != null
        ? Math.abs(releaseYear - yearFromDate) <= 1
        : false;
    return {
      resultCount: data.resultCount ?? results.length,
      topMatch: top
        ? {
            collectionName: top.collectionName,
            artistName: top.artistName,
            releaseDate: top.releaseDate,
            artworkUrl100: top.artworkUrl100,
          }
        : null,
      exactAlbumMatch: Boolean(exact),
      yearMatch,
      note:
        exact && yearMatch
          ? "iTunes exact album+year match"
          : exact
            ? "iTunes album title match (year drift)"
            : results.length > 0
              ? "iTunes fuzzy results only"
              : "iTunes no results",
    };
  } catch (e) {
    return {
      resultCount: 0,
      topMatch: null,
      exactAlbumMatch: false,
      yearMatch: false,
      note: e instanceof Error ? e.message : "iTunes fetch failed",
    };
  }
}

async function listLocalCoverFiles(rval: string): Promise<string[]> {
  const id = rval.trim().toUpperCase();
  const dir = join(coverFsRoot(), "retroverse", "covers", id);
  if (!existsSync(dir)) return [];
  try {
    const names = await readdir(dir);
    return names.filter((n) => IMAGE_EXT.test(n)).map((n) => `retroverse/covers/${id}/${n}`);
  } catch {
    return [];
  }
}

function classifyRow(input: {
  publicCoverUrl: string | null;
  canonicalCoverPath: string | null;
  artworkLinks: ArtworkLinkRow[];
  localFiles: string[];
  localExpectedExists: boolean;
  mbCover: MbCoverProbe;
  itunes: ItunesProbe;
}): CoverRecoveryClass {
  const hasLinkedCover = Boolean(input.publicCoverUrl);
  if (hasLinkedCover) return "auto_recoverable"; // already done — treat as done

  const unlinkedPath =
    input.artworkLinks.find(
      (l) =>
        (l.canonical_cover_path?.trim() || l.r2_cover_key?.trim() || l.local_cover_path?.trim()) &&
        (l.review_flag === "ok" || l.review_flag === "curated"),
    ) ?? null;
  if (unlinkedPath || input.localFiles.length > 0 || input.localExpectedExists) {
    return "exists_unlinked";
  }

  if (input.mbCover.hasFront) return "auto_recoverable";
  if (input.itunes.exactAlbumMatch && input.itunes.yearMatch) return "auto_recoverable";
  if (input.itunes.exactAlbumMatch || input.itunes.resultCount > 0) return "review_recoverable";
  if (input.mbCover.imageCount > 0) return "review_recoverable";

  return "no_source";
}

async function loadAppliedAlbums(): Promise<
  Array<{
    proposalId: number;
    rval: string;
    mbReleaseId: string;
    artist: string;
    album: string;
    releaseYear: number | null;
    albumId: number;
  }>
> {
  const out: Array<{
    proposalId: number;
    rval: string;
    mbReleaseId: string;
    artist: string;
    album: string;
    releaseYear: number | null;
    albumId: number;
  }> = [];

  for (const proposalId of WAVE_10_CUMULATIVE_IDS) {
    const p = await loadMbIngestProposal(proposalId);
    if (!p || p.status !== "applied") continue;
    const rval = (p.applied_rval ?? p.proposed_rval).trim().toUpperCase();
    const albumId = p.applied_album_id;
    if (!albumId) continue;
    out.push({
      proposalId,
      rval,
      mbReleaseId: p.mb_release_id?.trim() ?? "",
      artist: p.artist_name.trim(),
      album: p.proposed_album_title.trim(),
      releaseYear: p.proposed_album_year,
      albumId,
    });
  }
  return out;
}

async function loadArtworkLinks(albumId: number): Promise<ArtworkLinkRow[]> {
  return inspectQuery<ArtworkLinkRow>(
    `
    SELECT
      id,
      source,
      canonical_cover_path,
      local_cover_path,
      r2_cover_key,
      review_flag,
      confidence_score,
      source_url
    FROM album_artwork_links
    WHERE album_id = $1
    ORDER BY updated_at DESC NULLS LAST
    `,
    [albumId],
  );
}

async function loadMediaAssetCandidates(
  artist: string,
  album: string,
): Promise<MediaAssetCandidate[]> {
  return inspectQuery<MediaAssetCandidate>(
    `
    SELECT id, source_path, artist, title, r2_media_key
    FROM media_assets
    WHERE lower(trim(coalesce(artist, ''))) = lower(trim($1))
      AND (
        lower(trim(coalesce(title, ''))) = lower(trim($2))
        OR lower(trim(coalesce(title, ''))) LIKE '%' || lower(trim($2)) || '%'
      )
    LIMIT 5
    `,
    [artist, album],
  );
}

async function loadAlbumPgCover(albumId: number): Promise<string | null> {
  const rows = await inspectQuery<{ canonical_cover_path: string | null }>(
    `SELECT nullif(trim(canonical_cover_path), '') AS canonical_cover_path FROM albums WHERE id = $1`,
    [albumId],
  );
  return rows[0]?.canonical_cover_path ?? null;
}

export async function runMbCoverRecoveryAudit(): Promise<MbCoverRecoveryAudit> {
  const applied = await loadAppliedAlbums();
  const albums: AlbumCoverAuditRow[] = [];

  for (let i = 0; i < applied.length; i++) {
    const row = applied[i]!;
    if (i > 0) await sleep(1100); // MB + iTunes rate courtesy

    const [artworkLinks, mediaAssets, canonicalCoverPath, albumPage] = await Promise.all([
      loadArtworkLinks(row.albumId),
      loadMediaAssetCandidates(row.artist, row.album),
      loadAlbumPgCover(row.albumId),
      loadAlbumPage(row.rval),
    ]);

    const localFiles = await listLocalCoverFiles(row.rval);
    const expectedDossierPath = expectedDossierCoverRelPath(row.rval, row.artist, row.album);
    const localExpectedExists = existsSync(
      join(coverFsRoot(), expectedDossierPath.replace(/^\/+/, "")),
    );

    const mbCover = await probeMbCover(row.mbReleaseId);
    await sleep(400);
    const itunes = await probeItunes(row.artist, row.album, row.releaseYear);

    const publicCoverUrl = albumPage?.coverUrl ?? null;
    const recoveryClass = classifyRow({
      publicCoverUrl,
      canonicalCoverPath,
      artworkLinks,
      localFiles,
      localExpectedExists,
      mbCover,
      itunes,
    });

    const notes: string[] = [];
    if (!canonicalCoverPath) notes.push("albums.canonical_cover_path empty");
    if (artworkLinks.length === 0) notes.push("no album_artwork_links rows");
    if (mediaAssets.length === 0) notes.push("no media_assets album matches");
    if (localFiles.length === 0 && !localExpectedExists) notes.push("no local cover files");
    if (mbCover.hasFront) notes.push(`MB CAA front: ${mbCover.frontUrl}`);
    if (itunes.exactAlbumMatch) notes.push(`iTunes: ${itunes.topMatch?.collectionName}`);

    const meta = classMeta(recoveryClass);
    albums.push({
      proposalId: row.proposalId,
      rval: row.rval,
      albumId: row.albumId,
      artist: row.artist,
      album: row.album,
      releaseYear: row.releaseYear,
      mbReleaseId: row.mbReleaseId,
      albumUrl: `/album/${row.rval}`,
      publicCoverUrl,
      canonicalCoverPath,
      artworkLinks,
      mediaAssets,
      localFiles,
      expectedDossierPath,
      localExpectedExists,
      mbCover,
      itunes,
      discogsSearchUrl: buildDiscogsSearchUrl(row.artist, row.album, row.releaseYear),
      recoveryClass,
      classLabel: meta.label,
      fastestPath: meta.fastestPath,
      notes,
    });
  }

  const existsUnlinked = albums.filter((a) => a.recoveryClass === "exists_unlinked").length;
  const autoRecoverable = albums.filter((a) => a.recoveryClass === "auto_recoverable").length;
  const reviewRecoverable = albums.filter((a) => a.recoveryClass === "review_recoverable").length;
  const noSource = albums.filter((a) => a.recoveryClass === "no_source").length;
  const publicCoverPresent = albums.filter((a) => a.publicCoverUrl).length;
  const gainableToday = albums.filter(
    (a) =>
      !a.publicCoverUrl &&
      (a.recoveryClass === "exists_unlinked" || a.recoveryClass === "auto_recoverable"),
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    scope: "Wave 5 + Wave 10 applied MB ingest albums (RVAL000005–RVAL000024 subset, 10 live)",
    albums,
    summary: {
      total: albums.length,
      publicCoverPresent,
      existsUnlinked,
      autoRecoverable,
      reviewRecoverable,
      noSource,
      gainableToday,
      fastestPath:
        "Targeted MB Cover Art Archive fetch (mb_release_id known) → write dossier path → promoteDossierCoverToPg; iTunes backfill as fallback for CAA misses.",
    },
  };
}

function classShort(cls: CoverRecoveryClass): string {
  if (cls === "exists_unlinked") return "1-unlinked";
  if (cls === "auto_recoverable") return "2-auto";
  if (cls === "review_recoverable") return "3-review";
  return "4-none";
}

export async function writeMbCoverRecoveryReport(): Promise<{
  reportPath: string;
  jsonPath: string;
  audit: MbCoverRecoveryAudit;
}> {
  const audit = await runMbCoverRecoveryAudit();
  const { albums, summary } = audit;

  const report = `# MB Cover Recovery Audit — Phase 7A

**Generated:** ${audit.generatedAt}  
**Scope:** ${audit.scope}  
**Mode:** Read-only audit — no writes, no full-catalog backfill

---

## Executive summary

| Question | Answer |
|----------|--------|
| Live ingested albums audited | **${summary.total}** |
| Already showing public cover | **${summary.publicCoverPresent}** / ${summary.total} |
| **Can gain covers today** | **${summary.gainableToday}** / ${summary.total} |
| Class 1 — exists unlinked | ${summary.existsUnlinked} |
| Class 2 — auto recoverable | ${summary.autoRecoverable} |
| Class 3 — review recoverable | ${summary.reviewRecoverable} |
| Class 4 — no source | ${summary.noSource} |

### Fastest path to visual completeness

${summary.fastestPath}

---

## Per-album audit

| RVAL | Album | Class | Public cover | artwork_links | Local files | MB CAA | iTunes | Album URL |
|------|-------|-------|:------------:|:-------------:|:-----------:|:------:|:------:|-----------|
${albums
  .map(
    (a) =>
      `| ${a.rval} | ${a.album} | **${classShort(a.recoveryClass)}** | ${a.publicCoverUrl ? "yes" : "no"} | ${a.artworkLinks.length} | ${a.localFiles.length} | ${a.mbCover.hasFront ? "front" : a.mbCover.status} | ${a.itunes.exactAlbumMatch ? "exact" : a.itunes.resultCount > 0 ? "fuzzy" : "none"} | [${a.albumUrl}](${a.albumUrl}) |`,
  )
  .join("\n")}

---

## Detailed findings

${albums
  .map(
    (a) => `### ${a.rval} — ${a.album} (${a.artist}, ${a.releaseYear ?? "—"})

| Field | Value |
|-------|-------|
| Proposal | ${a.proposalId} |
| Album ID | ${a.albumId} |
| MB release | \`${a.mbReleaseId}\` |
| Class | **${a.classLabel}** |
| Public cover URL | ${a.publicCoverUrl ?? "—"} |
| \`albums.canonical_cover_path\` | ${a.canonicalCoverPath ?? "—"} |
| Expected dossier path | \`${a.expectedDossierPath}\` |
| Local expected exists | ${a.localExpectedExists ? "yes" : "no"} |
| Local files | ${a.localFiles.length ? a.localFiles.map((f) => `\`${f}\``).join(", ") : "none"} |
| \`album_artwork_links\` | ${a.artworkLinks.length} row(s) |
| \`media_assets\` candidates | ${a.mediaAssets.length} |
| MB CAA | ${a.mbCover.note} (${a.mbCover.imageCount} images) |
| iTunes | ${a.itunes.note} |
| Discogs search | [open](${a.discogsSearchUrl}) |
| Fastest path | ${a.fastestPath} |

**Notes:** ${a.notes.join("; ") || "—"}
`,
  )
  .join("\n")}

---

## artwork_links detail

${albums
  .map((a) => {
    if (a.artworkLinks.length === 0) return `### ${a.rval}\n\n_no rows_`;
    const rows = a.artworkLinks
      .map(
        (l) =>
          `- id=${l.id} source=${l.source ?? "—"} flag=${l.review_flag ?? "—"} path=${l.canonical_cover_path ?? "—"} r2=${l.r2_cover_key ?? "—"}`,
      )
      .join("\n");
    return `### ${a.rval}\n\n${rows}`;
  })
  .join("\n\n")}

---

## Classification key

| Class | Meaning |
|-------|---------|
| **1 — exists unlinked** | File or artwork_link present but \`albums.canonical_cover_path\` not wired |
| **2 — auto recoverable** | MB CAA front and/or iTunes exact match — scripted fetch + promote |
| **3 — review recoverable** | Fuzzy iTunes or partial CAA — human verify before promote |
| **4 — no source** | No CAA, iTunes, local, or linked candidate |

---

## Recommended 4-hour execution (10 albums only)

1. **MB CAA batch** — For each applied proposal, \`GET coverartarchive.org/release/{mb_release_id}\`, download front image to \`expectedDossierCoverRelPath\`.
2. **Promote** — \`promoteDossierCoverToPg({ albumId, rval, canonicalCoverPath })\` per album.
3. **iTunes fallback** — For CAA 404/miss only: \`acquireCoverViaWelcome\` with \`ITUNES_FILL_RVAL\` (existing backfill script).
4. **Verify** — \`loadAlbumPage(rval).coverUrl\` non-null; re-run \`npm run mb:real-world:audit\` → pacing **coherent**.

**Do not** run full-catalog \`cover-backfill\` queue — scoped batch only.

\`\`\`bash
npm run mb:cover:audit
\`\`\`

JSON: \`tools/out/mb-cover-recovery-audit.json\`
`;

  const reportPath = join(process.cwd(), "reports/mb-cover-recovery-audit.md");
  const jsonPath = join(process.cwd(), "tools/out/mb-cover-recovery-audit.json");
  await writeFile(reportPath, report);
  await writeFile(jsonPath, JSON.stringify(audit, null, 2));

  return { reportPath, jsonPath, audit };
}
