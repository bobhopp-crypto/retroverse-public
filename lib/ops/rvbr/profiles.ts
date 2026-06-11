import { inspectQuery } from "@/lib/inspect/pg";

import { rowToProfile } from "./import-canon";
import type { RvbrProfile, RvbrPromptFragments, RvbrVisualIdentity } from "./types";

type RvbrRow = {
  id: string;
  retroverse_era_id: string;
  slug: string;
  name: string;
  era_start_year: number;
  era_end_year: number;
  narrative: string | null;
  visual_identity_json: RvbrVisualIdentity;
  prompt_fragments_json: RvbrPromptFragments;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

const SELECT_FIELDS = `
  id,
  retroverse_era_id,
  slug,
  name,
  era_start_year,
  era_end_year,
  narrative,
  visual_identity_json,
  prompt_fragments_json,
  notes,
  created_at,
  updated_at
`;

export async function listRvbrProfiles(): Promise<RvbrProfile[]> {
  const rows = await inspectQuery<RvbrRow>(
    `SELECT ${SELECT_FIELDS}
     FROM rvbr_profiles
     ORDER BY era_start_year ASC`,
  );
  return rows.map(rowToProfile);
}

export async function getRvbrProfileBySlug(slug: string): Promise<RvbrProfile | null> {
  const rows = await inspectQuery<RvbrRow>(
    `SELECT ${SELECT_FIELDS}
     FROM rvbr_profiles
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );
  return rows[0] ? rowToProfile(rows[0]) : null;
}

export async function rvbrProfileCount(): Promise<number> {
  const rows = await inspectQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM rvbr_profiles`,
  );
  return rows[0]?.n ?? 0;
}
