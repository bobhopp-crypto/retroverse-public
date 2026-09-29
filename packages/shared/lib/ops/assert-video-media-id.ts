import { inspectQuery } from "@/lib/inspect/pg";
import { opsVideoMediaAndClause } from "./ops-video-media";

/** Historical Studio match check, kept separate from public video-path helpers. */
export async function assertOpsVideoMediaId(mediaId: number): Promise<boolean> {
  const rows = await inspectQuery<{ ok: number }>(
    `SELECT 1::int AS ok FROM media_assets ma WHERE ma.id = $1 ${opsVideoMediaAndClause("ma")} LIMIT 1`,
    [mediaId],
  );
  return rows.length > 0;
}
