import { loadEnvFile } from "node:process";

import { getPassPool, passQuery } from "../packages/shared/lib/retroverse-pass/pg";
import type { VirtualDjSourceNode } from "../packages/shared/lib/song-requests/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function flatten<T extends { children: T[] }>(nodes: T[]): T[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

async function main() {
  loadEnvFile(".env.local");
  const pin = process.env.RETROVERSE_OPS_PIN?.trim() || "6324";
  const auth = await fetch("http://127.0.0.1:3000/api/internal/ops-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  assert(auth.ok, `Operator authentication failed: ${auth.status}`);
  const cookie = auth.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert(cookie, "Operator cookie was not issued.");

  const sourceResponse = await fetch("http://127.0.0.1:3000/api/ops/song-requests/source", {
    headers: { Cookie: cookie },
  });
  assert(sourceResponse.ok, `Source endpoint failed: ${sourceResponse.status}`);
  const sourcePayload = await sourceResponse.json() as {
    databaseReady: boolean;
    activeEvent: { sourceLabel: string; eligibleTrackCount: number } | null;
    discovery: {
      defaultSourceKey: string | null;
      groups: Array<{ children: VirtualDjSourceNode[] }>;
    };
  };
  const sourceNodes = flatten(sourcePayload.discovery.groups.flatMap((group) => group.children));
  const defaultSource = sourceNodes.find((node) => node.sourceKey === sourcePayload.discovery.defaultSourceKey);
  assert(sourcePayload.databaseReady, "Request database is not ready.");
  assert(defaultSource?.displayPath === "VIDEO/1960's", "Default source is not the main VIDEO/1960's node.");
  assert(defaultSource.eligibleTrackCount === 813, "Unexpected eligible track count.");
  assert(sourcePayload.activeEvent?.sourceLabel === "VIDEO/1960's", "Active event source is incorrect.");

  const passes = await passQuery<{ serial: string }>(
    `SELECT serial FROM retroverse_passes WHERE claimed = true AND visitor_id IS NOT NULL ORDER BY claimed_at DESC NULLS LAST LIMIT 1`,
  );
  const serial = passes[0]?.serial;
  assert(serial, "No claimed pass is available for read-only guest verification.");

  const guestStateResponse = await fetch(
    `http://127.0.0.1:3100/api/pass/song-request?serial=${encodeURIComponent(serial)}`,
  );
  assert(guestStateResponse.ok, `Guest state failed: ${guestStateResponse.status}`);
  const guestState = await guestStateResponse.json() as Record<string, unknown>;
  assert(
    Object.keys(guestState).sort().join(",") ===
      "availableSongCount,canRequest,catalogName,enabled,eventTitle,lastRequest",
    `Guest state exposed unexpected fields: ${Object.keys(guestState).join(",")}`,
  );
  assert(guestState.catalogName === "1960s Video Collection", "Guest catalog name is incorrect.");
  assert(guestState.availableSongCount === 813, "Guest catalog count is incorrect.");

  const catalogResponse = await fetch(
    `http://127.0.0.1:3100/api/pass/song-request/catalog?serial=${encodeURIComponent(serial)}&q=Beatles&sort=artist`,
  );
  assert(catalogResponse.ok, `Guest catalog failed: ${catalogResponse.status}`);
  const catalog = await catalogResponse.json() as {
    total: number;
    tracks: Array<Record<string, unknown>>;
  };
  assert(catalog.total > 0 && catalog.tracks.length > 0, "Guest catalog search returned no Beatles tracks.");
  assert(
    catalog.tracks.every((track) =>
      `${String(track.artist)} ${String(track.title)}`.toLocaleLowerCase().includes("beatles"),
    ),
    "Guest catalog search returned a non-matching track.",
  );
  const guestTrackKeys = Object.keys(catalog.tracks[0]!).sort();
  assert(
    guestTrackKeys.join(",") === "artist,key,title,year",
    `Guest catalog exposed unexpected fields: ${guestTrackKeys.join(",")}`,
  );

  const fullCatalogResponse = await fetch(
    `http://127.0.0.1:3100/api/pass/song-request/catalog?serial=${encodeURIComponent(serial)}&sort=title`,
  );
  assert(fullCatalogResponse.ok, `Full guest catalog failed: ${fullCatalogResponse.status}`);
  const fullCatalog = await fullCatalogResponse.json() as {
    total: number;
    tracks: Array<Record<string, unknown>>;
  };
  assert(fullCatalog.total === 813, "Full guest catalog count is incorrect.");
  assert(fullCatalog.tracks.length === 813, "Full guest catalog was truncated.");

  process.stdout.write(`${JSON.stringify({
    ok: true,
    source: { displayPath: defaultSource.displayPath, eligibleTrackCount: defaultSource.eligibleTrackCount },
    guestStateFields: Object.keys(guestState).sort(),
    guestCatalogFields: guestTrackKeys,
    guestSearchMatches: catalog.total,
    guestCatalogTrackCount: fullCatalog.tracks.length,
    sample: {
      artist: catalog.tracks[0]!.artist,
      title: catalog.tracks[0]!.title,
      year: catalog.tracks[0]!.year,
    },
  }, null, 2)}\n`);
  await getPassPool().end();
}

void main();
