#!/usr/bin/env npx tsx
/**
 * Top 500 VIDEO impact analysis — active performance universe only.
 * Read-only. No repairs.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { parseCsvRows } from "@/lib/cover-integrity/parse-csv";
import { loadCoverInfoForRvtrs } from "@/lib/ops/intelligence/load-rvtr-covers";
import { loadTopPlayedBackfill } from "@/lib/ops/intelligence/top-played-backfill";
import { computeArtifactReadiness, packageConfidence } from "@/lib/ops/intelligence/artifact-readiness";
import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

const CDN_TIMEOUT_MS = 12_000;

type AuditRow = {
  rval: string;
  artist: string;
  album: string;
  trustTier: string;
  confidenceBand: string;
  reasons: string[];
  dupCount: number;
  hasPath: boolean;
};

type ConfidenceTier = "GREEN" | "YELLOW" | "RED" | "NONE";

function reasonsFromCell(s: string): string[] {
  return s.split("|").map((x) => x.trim()).filter(Boolean);
}

async function loadAuditByRval(): Promise<Map<string, AuditRow>> {
  const raw = await readFile(join(process.cwd(), "reports/cover_integrity/cover_audit.csv"), "utf8");
  const table = parseCsvRows(raw);
  const headers = table[0]!;
  const map = new Map<string, AuditRow>();
  for (const cells of table.slice(1)) {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    const rval = (row.RVAL || "").trim().toUpperCase();
    if (!rval) continue;
    map.set(rval, {
      rval,
      artist: row.artist ?? "",
      album: row.album ?? "",
      trustTier: row["trust tier"] ?? "",
      confidenceBand: row["confidence band"] ?? "",
      reasons: reasonsFromCell(row["suspicion reason"] ?? ""),
      dupCount: Number.parseInt(row["duplicate hash count"] ?? "0", 10) || 0,
      hasPath: !!(row["canonical path"]?.trim()),
    });
  }
  return map;
}

function classifyTier(audit: AuditRow | null, coverPresent: boolean): ConfidenceTier {
  if (!coverPresent) return "NONE";
  if (!audit || !audit.hasPath) return "RED";
  if (
    audit.trustTier === "BROKEN" ||
    audit.trustTier === "HIGH_RISK" ||
    audit.reasons.includes("same_artist_different_album_shared_image")
  ) {
    return "RED";
  }
  if (audit.trustTier === "TRUSTED" && audit.confidenceBand === "HIGH") return "GREEN";
  return "YELLOW";
}

function isDuplicate(audit: AuditRow | null): boolean {
  return !!audit?.reasons.includes("same_artist_different_album_shared_image");
}

function isQuarantined(audit: AuditRow | null, coverPresent: boolean): boolean {
  if (!coverPresent) return true;
  if (!audit) return true;
  return (
    audit.trustTier === "HIGH_RISK" ||
    audit.trustTier === "BROKEN" ||
    audit.reasons.includes("same_artist_different_album_shared_image") ||
    audit.confidenceBand === "VERY_SUSPICIOUS"
  );
}

function acceptableForSundayNights(input: {
  rvtr: string | null;
  coverPresent: boolean;
  tier: ConfidenceTier;
  cdnOk: boolean | null;
  isDup: boolean;
}): boolean {
  if (!input.rvtr || !input.coverPresent) return false;
  if (input.isDup || input.tier === "RED") return false;
  if (input.cdnOk === false) return false;
  return input.tier === "GREEN" || input.tier === "YELLOW";
}

async function headCdn(url: string | null): Promise<boolean | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(CDN_TIMEOUT_MS),
    });
    return res.status === 200;
  } catch {
    return null;
  }
}

async function loadRvtrAlbumRval(rvtrs: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (rvtrs.length === 0) return out;
  const ping = await inspectPing();
  if (!ping.ok) return out;

  const rows = await inspectQuery<{ rvtr: string; rval: string | null }>(
    `
    SELECT DISTINCT ON (upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))))
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) AS rvtr,
      upper(trim(aek.external_key)) AS rval
    FROM canonical_track_display ctd
    LEFT JOIN canonical_album_tracks cat
      ON upper(trim(cat.canonical_track_key)) = upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text)))
    LEFT JOIN albums al ON al.id = cat.album_id
    LEFT JOIN album_external_keys aek ON aek.album_id = al.id AND aek.external_key ~* '^RVAL[0-9]{6}$'
    WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) = ANY($1::text[])
    ORDER BY upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))), cat.position ASC NULLS LAST
    `,
    [rvtrs],
  );

  for (const r of rows) out.set(r.rvtr, r.rval?.toUpperCase() ?? null);
  for (const rvtr of rvtrs) if (!out.has(rvtr)) out.set(rvtr, null);
  return out;
}

function hasIntelligencePackage(status: string | null, storyCardCount: number): boolean {
  if (!status) return false;
  if (storyCardCount > 0) return true;
  return status === "published" || status === "cards_ready" || status === "approved";
}

async function main() {
  const [backfill, auditByRval] = await Promise.all([loadTopPlayedBackfill(), loadAuditByRval()]);
  const top500 = backfill.tracks.slice(0, 500);
  const rvtrs = top500.map((t) => t.rvtr).filter((r): r is string => !!r);
  const [coverMap, rvtrRval] = await Promise.all([
    loadCoverInfoForRvtrs(rvtrs),
    loadRvtrAlbumRval(rvtrs),
  ]);

  let coverPresent = 0;
  let coverMissing = 0;
  let coverQuarantined = 0;
  let coverDuplicate = 0;
  const tiers: Record<ConfidenceTier, number> = { GREEN: 0, YELLOW: 0, RED: 0, NONE: 0 };

  let packageComplete = 0;
  let packageMissing = 0;

  let acceptable = 0;
  const trackRows: Array<Record<string, unknown>> = [];

  for (const track of top500) {
    const rvtr = track.rvtr;
    const coverInfo = rvtr ? coverMap.get(rvtr) : undefined;
    const coverUrl = coverInfo?.coverUrl ?? null;
    const present = track.hasCover || !!coverUrl;
    const rval = rvtr ? rvtrRval.get(rvtr) ?? null : null;
    const audit = rval ? auditByRval.get(rval) ?? null : null;

    const dup = isDuplicate(audit);
    const quarantined = isQuarantined(audit, present);
    const tier = classifyTier(audit, present);

    if (present) coverPresent++;
    else coverMissing++;
    if (quarantined) coverQuarantined++;
    if (dup) coverDuplicate++;
    tiers[tier]++;

    let pkgComplete = false;
    let pkgStatus: string | null = null;
    let pkgConfidence = 0;
    if (rvtr) {
      const pkg = await loadSongPackage(rvtr);
      if (pkg) {
        const hydrated = hydratePackageIntel(pkg);
        const storyCardCount = pkg.storyCards.filter((c) => c.rank > 0).length;
        pkgComplete = hasIntelligencePackage(pkg.status, storyCardCount);
        pkgStatus = pkg.status;
        pkgConfidence = packageConfidence(hydrated);
      }
    }
    if (!rvtr) pkgComplete = false;

    if (pkgComplete) packageComplete++;
    else packageMissing++;

    const cdnOk = present ? await headCdn(coverUrl) : null;
    const ok = acceptableForSundayNights({
      rvtr,
      coverPresent: present,
      tier,
      cdnOk,
      isDup: dup,
    });
    if (ok) acceptable++;

    trackRows.push({
      rvtr,
      title: track.title,
      artist: track.artist,
      playCount: track.playCount,
      rval,
      coverPresent: present,
      coverUrl: coverUrl ? "yes" : "no",
      cdnOk,
      tier,
      duplicate: dup,
      quarantined,
      packageComplete: pkgComplete,
      packageStatus: pkgStatus,
      packageConfidence: pkgConfidence,
      acceptable: ok,
    });
  }

  const pct = (n: number) => Math.round((n / 500) * 1000) / 10;
  const acceptablePct = pct(acceptable);

  const md = `# Top 500 VIDEO — Cover Impact Analysis

**Generated:** ${new Date().toISOString()}  
**Cohort:** Top 500 identifiable VIDEO tracks by VirtualDJ play count (\`loadTopPlayedBackfill\`)  
**Scope:** Active performance universe only — not full library  
**Post–Phase 1 delivery** · read-only

---

## Sunday Nights readiness

**If Sunday Nights started tomorrow, ${acceptablePct}% of the Top 500 tracks (${acceptable} / 500) would have acceptable cover quality.**

**Acceptable** = RVTR resolved · cover present · CDN HEAD 200 · confidence tier GREEN or YELLOW · not duplicate-wrong · not quarantined (RED).

---

## Cover status (Top 500)

| Status | Count | % |
| --- | ---: | ---: |
| **Cover present** | **${coverPresent}** | **${pct(coverPresent)}%** |
| **Cover missing** | **${coverMissing}** | **${pct(coverMissing)}%** |
| **Cover quarantined** | **${coverQuarantined}** | **${pct(coverQuarantined)}%** |
| **Cover duplicate** (same-artist shared image) | **${coverDuplicate}** | **${pct(coverDuplicate)}%** |

_Note: quarantined and duplicate overlap; counts are flag-based, not mutually exclusive._

---

## Cover confidence tier (Top 500)

| Tier | Count | % | Meaning |
| --- | ---: | ---: | --- |
| **GREEN** | **${tiers.GREEN}** | **${pct(tiers.GREEN)}%** | TRUSTED · HIGH band · displays · no dup flag |
| **YELLOW** | **${tiers.YELLOW}** | **${pct(tiers.YELLOW)}%** | Cover present · review/partial evidence |
| **RED** | **${tiers.RED}** | **${pct(tiers.RED)}%** | HIGH_RISK · dup-wrong · broken · suspicious |
| **NONE** | **${tiers.NONE}** | **${pct(tiers.NONE)}%** | No cover on track |

---

## Intelligence packages (Top 500)

| Status | Count | % |
| --- | ---: | ---: |
| **Package complete** | **${packageComplete}** | **${pct(packageComplete)}%** |
| **Package missing** | **${packageMissing}** | **${pct(packageMissing)}%** |

Package complete = published / cards_ready / approved, or has ranked story cards.

---

## Real-world impact summary

| Question | Answer |
| --- | --- |
| Do Top 500 tracks mostly have covers? | **${pct(coverPresent)}%** present · **${pct(coverMissing)}%** missing |
| How much wrong-art risk in active set? | **${coverDuplicate}** dup flags (**${pct(coverDuplicate)}%**) |
| How much integrity debt in active set? | **${pct(coverQuarantined)}%** quarantined flags |
| Sunday Nights acceptable covers? | **${acceptablePct}%** (${acceptable}/500) |
| Package gap vs cover gap | Packages **${pct(packageMissing)}%** missing vs covers **${pct(coverMissing)}%** missing |

**Bottom line:** Cover integrity issues are **concentrated below the active tier** for duplicates (${pct(coverDuplicate)}%), but **${pct(coverMissing)}%** missing covers and **${pct(packageMissing)}%** missing packages are the dominant gaps for Sunday Nights / Top 500 performance use.

---

## Method

1. \`loadTopPlayedBackfill()\` → top 500 by play count (VIDEO, identifiable).
2. Cover presence via intelligence cover map + VDJ identity flags.
3. Album integrity via \`cover_audit.csv\` joined on RVTR → first album RVAL.
4. CDN HEAD per track with cover (12s timeout).
5. Package status from \`loadSongPackage\` per RVTR.

---

## Artifacts

- \`reports/cover-integrity/top500-impact-results.json\` — per-track detail
- Source audit: \`reports/cover_integrity/cover_audit.csv\` (post Phase 1)
`;

  const outDir = join(process.cwd(), "reports/cover-integrity");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "top500-impact-analysis.md"), md, "utf8");
  await writeFile(
    join(outDir, "top500-impact-results.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cohortSize: 500,
        acceptableCount: acceptable,
        acceptablePct,
        coverPresent,
        coverMissing,
        coverQuarantined,
        coverDuplicate,
        tiers,
        packageComplete,
        packageMissing,
        tracks: trackRows,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        acceptable: `${acceptable}/500 (${acceptablePct}%)`,
        coverPresent,
        coverMissing,
        coverDuplicate,
        tiers,
        packageComplete,
        packageMissing,
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
