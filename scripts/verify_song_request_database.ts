import { loadEnvFile } from "node:process";

import { getPassPool, passPing, passQuery } from "../packages/shared/lib/retroverse-pass/pg";

async function main() {
  loadEnvFile(".env.local");
  const ping = await passPing();
  if (!ping.ok) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: ping.error }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  const rows = await passQuery<{
    passes: string | null;
    visitors: string | null;
    request_events: string | null;
    request_sources: string | null;
    catalog_tracks: string | null;
    song_requests: string | null;
  }>(`
    SELECT
      to_regclass('public.retroverse_passes')::text AS passes,
      to_regclass('public.retroverse_visitors')::text AS visitors,
      to_regclass('public.retroverse_request_events')::text AS request_events,
      to_regclass('public.retroverse_request_sources')::text AS request_sources,
      to_regclass('public.retroverse_request_catalog_tracks')::text AS catalog_tracks,
      to_regclass('public.retroverse_song_requests')::text AS song_requests
  `);
  process.stdout.write(`${JSON.stringify({ ok: true, identity: ping.identity, tables: rows[0] }, null, 2)}\n`);
  await getPassPool().end();
}

void main();
