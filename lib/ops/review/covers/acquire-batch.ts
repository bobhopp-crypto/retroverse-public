import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { TRAINING_BATCH_SIZE } from "@/lib/cover-integrity/training-batch";
import { inspectQuery } from "@/lib/inspect/pg";
import { reviewedRvalSet, loadTrainingDecisions } from "@/lib/rv12/training-decisions";

export type AcquireBatchRow = {
  rval: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  b200Peak: number | null;
};

export type AcquireBatchManifest = {
  batchId: string;
  rvals: string[];
  size: number;
  generatedAt: string;
  excludedReviewed: number;
};

export function acquireBatchManifestPath(): string {
  return join(process.cwd(), "reports/cover_integrity/acquire_batch_current.json");
}

export async function loadAcquireBatchManifest(): Promise<AcquireBatchManifest | null> {
  try {
    const raw = await readFile(acquireBatchManifestPath(), "utf8");
    return JSON.parse(raw) as AcquireBatchManifest;
  } catch {
    return null;
  }
}

export async function saveAcquireBatchManifest(manifest: AcquireBatchManifest): Promise<void> {
  await mkdir(join(process.cwd(), "reports/cover_integrity"), { recursive: true });
  await writeFile(acquireBatchManifestPath(), JSON.stringify(manifest, null, 2));
}

async function loadCandidatePool(reviewed: Set<string>): Promise<AcquireBatchRow[]> {
  const rows = await inspectQuery<{
    rval: string;
    artist: string;
    album: string;
    release_year: number | null;
    b200_peak: number | null;
  }>(
    `
    SELECT
      upper(trim(aek.external_key)) AS rval,
      ar.canonical_name AS artist,
      al.title AS album,
      al.release_year,
      min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak
    FROM albums al
    JOIN artists ar ON ar.id = al.artist_id
    JOIN album_external_keys aek ON aek.album_id = al.id
    LEFT JOIN chart_appearances ca ON ca.album_id = al.id
    WHERE nullif(trim(al.canonical_cover_path), '') IS NULL
      AND aek.external_key ~* '^RVAL[0-9]{6}$'
    GROUP BY aek.external_key, ar.canonical_name, al.title, al.release_year, al.id
    ORDER BY b200_peak ASC NULLS LAST, al.release_year DESC NULLS LAST, al.title ASC
    LIMIT 500
    `,
  );

  return rows
    .filter((r) => !reviewed.has(r.rval))
    .map((row) => {
      let score = 10;
      if (row.b200_peak != null) {
        if (row.b200_peak <= 10) score += 200;
        else if (row.b200_peak <= 40) score += 120;
        else if (row.b200_peak <= 100) score += 60;
        else score += 20;
      }
      return {
        row: {
          rval: row.rval,
          artist: row.artist.trim(),
          album: row.album.trim(),
          releaseYear: row.release_year,
          b200Peak: row.b200_peak,
        },
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.row);
}

export async function loadAcquireBatchRows(): Promise<{
  manifest: AcquireBatchManifest;
  rows: AcquireBatchRow[];
}> {
  const training = await loadTrainingDecisions();
  const reviewed = reviewedRvalSet(training);

  let manifest = await loadAcquireBatchManifest();
  if (!manifest || manifest.rvals.length === 0) {
    manifest = await generateNextAcquireBatch();
  }

  const pool = await loadCandidatePool(reviewed);
  const byRval = new Map(pool.map((r) => [r.rval, r]));
  const rows = manifest.rvals
    .map((id) => byRval.get(id) ?? null)
    .filter((r): r is AcquireBatchRow => !!r);

  if (rows.length === 0 && pool.length > 0) {
    manifest = await generateNextAcquireBatch();
    const nextByRval = new Map(pool.map((r) => [r.rval, r]));
    return {
      manifest,
      rows: manifest.rvals
        .map((id) => nextByRval.get(id) ?? null)
        .filter((r): r is AcquireBatchRow => !!r),
    };
  }

  return { manifest, rows };
}

export async function generateNextAcquireBatch(): Promise<AcquireBatchManifest> {
  const training = await loadTrainingDecisions();
  const reviewed = reviewedRvalSet(training);
  const pool = await loadCandidatePool(reviewed);
  const batchRows = pool.slice(0, TRAINING_BATCH_SIZE);

  const prev = await loadAcquireBatchManifest();
  const nextNum = prev ? Number(prev.batchId) + 1 : 1;
  const batchId = String(nextNum).padStart(3, "0");

  const manifest: AcquireBatchManifest = {
    batchId,
    rvals: batchRows.map((r) => r.rval),
    size: batchRows.length,
    generatedAt: new Date().toISOString(),
    excludedReviewed: reviewed.size,
  };
  await saveAcquireBatchManifest(manifest);
  return manifest;
}
