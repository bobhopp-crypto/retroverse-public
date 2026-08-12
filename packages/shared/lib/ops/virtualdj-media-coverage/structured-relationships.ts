import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";

import type { CoverageTargetSong } from "./types";
import { artistTitleKey } from "./vdj-index";

type RelationshipRow = {
  rvtr: string | null;
  canonical_title: string;
  canonical_artist_name: string;
  source_path: string | null;
};

export type StructuredTargetRelationship = {
  rvtr: string | null;
  xmlPaths: string[];
};

function compact(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function loadStructuredRelationships(
  targets: CoverageTargetSong[],
): Promise<Map<string, StructuredTargetRelationship>> {
  const titleKeys = [...new Set(targets.map((target) => compact(target.title)).filter(Boolean))];
  if (titleKeys.length === 0) return new Map();
  let rows: RelationshipRow[];
  try {
    rows = await inspectQuery<RelationshipRow>(
      `
      SELECT
        upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
        ctd.canonical_title,
        ctd.canonical_artist_name,
        ma.source_path
      FROM canonical_track_display ctd
      LEFT JOIN canonical_track_versions ctv
        ON ctv.canonical_track_id = ctd.id AND ctv.is_primary IS TRUE
      LEFT JOIN media_track_links mtl ON mtl.track_id = ctv.graph_track_id
      LEFT JOIN media_assets ma ON ma.id = mtl.media_asset_id
      WHERE regexp_replace(lower(ctd.canonical_title), '[^a-z0-9]+', '', 'g') = ANY($1::text[])
      `,
      [titleKeys],
    );
  } catch {
    return new Map();
  }

  const out = new Map<string, StructuredTargetRelationship>();
  const targetKeys = new Set(targets.map((target) => artistTitleKey(target.artist, target.title)));
  for (const row of rows) {
    const key = artistTitleKey(row.canonical_artist_name, row.canonical_title);
    if (!targetKeys.has(key)) continue;
    const current = out.get(key) ?? { rvtr: null, xmlPaths: [] };
    if (/^RVTR\d{6}$/i.test(row.rvtr?.trim() ?? "")) current.rvtr = row.rvtr!.trim().toUpperCase();
    if (row.source_path?.trim() && !current.xmlPaths.includes(row.source_path.trim())) {
      current.xmlPaths.push(row.source_path.trim());
    }
    out.set(key, current);
  }
  return out;
}

