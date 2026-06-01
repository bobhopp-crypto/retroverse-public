/**
 * Single-album cover backfill proof — acquire + promote + verify one RVAL.
 *
 * Usage:
 *   RETROVERSE_PG_SSL=0 npx tsx tools/test-cover-backfill-one.ts RVAL906016
 */
import { join } from "node:path";

import {
  acquireCoverViaWelcome,
  findAcquiredCoverRelPath,
} from "@/lib/covers/backfill/acquire-welcome";
import { coverFsRoot } from "@/lib/covers/backfill/paths";
import { promoteDossierCoverToPg } from "@/lib/covers/backfill/promote-dossier";
import { loadMissingCoverQueue } from "@/lib/covers/backfill/queue";
import { verifyCoverPromotedByRval } from "@/lib/covers/backfill/verify-rval";

const rvalArg = (process.argv[2] ?? "RVAL906016").trim().toUpperCase();

async function main() {
  const queue = await loadMissingCoverQueue();
  const row = queue.find((r) => r.rval === rvalArg);
  if (!row) {
    console.error(`RVAL not in missing-cover queue: ${rvalArg}`);
    process.exit(1);
  }

  console.log("=== COVER BACKFILL ONE-ALBUM TEST ===");
  console.log(`requested_rval=${row.rval}`);
  console.log(`requested_artist=${row.artist}`);
  console.log(`requested_album=${row.album}`);
  console.log(`requested_year=${row.releaseYear ?? ""}`);

  let coverPath = await findAcquiredCoverRelPath(row.rval);
  let acquireResult: Awaited<ReturnType<typeof acquireCoverViaWelcome>> | null = null;

  if (coverPath) {
    console.log(`acquire_result=FOUND`);
    console.log(`search_term=(pre-existing)`);
  } else {
    acquireResult = await acquireCoverViaWelcome(row);
    console.log(`acquire_result=${acquireResult.directResult ?? acquireResult.reason}`);
    console.log(`search_term=${acquireResult.searchTerm ?? ""}`);
    if (!acquireResult.ok) {
      console.log(`acquire_reason=${acquireResult.reason}`);
      console.log(`download_path=`);
      console.log(`promotion_path=`);
      console.log(`final_result=NOT_FOUND`);
      process.exit(1);
    }
    coverPath = acquireResult.deployRel ?? (await findAcquiredCoverRelPath(row.rval));
  }

  const fsRoot = coverFsRoot();
  const downloadAbs = coverPath ? join(fsRoot, coverPath) : "";
  console.log(`download_rel=${coverPath ?? ""}`);
  console.log(`download_path=${downloadAbs}`);

  if (!coverPath) {
    console.log(`promotion_path=`);
    console.log(`final_result=NOT_FOUND`);
    process.exit(1);
  }

  await promoteDossierCoverToPg({
    albumId: row.albumId,
    rval: row.rval,
    canonicalCoverPath: coverPath,
  });

  const verified = await verifyCoverPromotedByRval(row.rval);
  console.log(`promotion_path=${verified.canonicalCoverPath ?? coverPath}`);
  console.log(`pg_verify=${verified.ok ? "ok" : "missing_or_mismatch"}`);
  console.log(`final_result=${verified.ok ? "PROMOTED" : "NOT_FOUND"}`);

  if (!verified.ok) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
