/**
 * Sample N random missing-cover albums through direct-RVAL iTunes acquisition.
 *
 * Usage:
 *   RETROVERSE_PG_SSL=0 npx tsx tools/sample-cover-backfill-acquire.ts 10
 */
import { acquireCoverViaWelcome } from "@/lib/covers/backfill/acquire-welcome";
import { loadMissingCoverQueue } from "@/lib/covers/backfill/queue";

const SAMPLE_SIZE = Number.parseInt(process.argv[2] ?? "10", 10);
const EXCLUDE_RVALS = new Set(
  (process.env.COVER_BACKFILL_EXCLUDE_RVALS ?? "RVAL906016")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
);

function isPunctuationOnlyTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return true;
  return !/[a-zA-Z0-9]/.test(t);
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function main() {
  const queue = await loadMissingCoverQueue();
  const eligible = queue.filter(
    (row) => !EXCLUDE_RVALS.has(row.rval) && !isPunctuationOnlyTitle(row.album),
  );
  const sample = shuffle(eligible).slice(0, Math.max(1, SAMPLE_SIZE));

  console.log(`eligible=${eligible.length} sample=${sample.length}`);
  console.log("");

  type Row = {
    rval: string;
    artist: string;
    album: string;
    result: "FOUND" | "DOWNLOADED" | "NOT_FOUND";
    reason: string;
  };

  const rows: Row[] = [];

  for (const row of sample) {
    process.stderr.write(`acquiring ${row.rval}…\n`);
    const acquired = await acquireCoverViaWelcome(row);
    const result: Row["result"] =
      acquired.directResult === "FOUND" || acquired.directResult === "DOWNLOADED"
        ? acquired.directResult
        : "NOT_FOUND";
    rows.push({
      rval: row.rval,
      artist: row.artist,
      album: row.album,
      result,
      reason: acquired.reason,
    });
  }

  const found = rows.filter((r) => r.result === "FOUND");
  const downloaded = rows.filter((r) => r.result === "DOWNLOADED");
  const notFound = rows.filter((r) => r.result === "NOT_FOUND");
  const success = found.length + downloaded.length;
  const successRate = sample.length > 0 ? (100 * success) / sample.length : 0;

  console.log("=== RESULTS ===");
  for (const r of rows) {
    console.log(`${r.rval}\t${r.artist}\t${r.album}\t${r.result}`);
  }

  console.log("");
  console.log("=== FOUND ===");
  for (const r of found) {
    console.log(`${r.rval}\t${r.artist}\t${r.album}`);
  }
  if (found.length === 0) console.log("(none)");

  console.log("");
  console.log("=== DOWNLOADED ===");
  for (const r of downloaded) {
    console.log(`${r.rval}\t${r.artist}\t${r.album}`);
  }
  if (downloaded.length === 0) console.log("(none)");

  console.log("");
  console.log("=== NOT_FOUND ===");
  for (const r of notFound) {
    console.log(`${r.rval}\t${r.artist}\t${r.album}\t${r.reason}`);
  }
  if (notFound.length === 0) console.log("(none)");

  console.log("");
  console.log(
    `success_rate=${successRate.toFixed(1)}% (${success}/${sample.length}) [FOUND=${found.length} DOWNLOADED=${downloaded.length} NOT_FOUND=${notFound.length}]`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
