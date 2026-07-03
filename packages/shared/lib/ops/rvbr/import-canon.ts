import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseYearRange, rverIdFromStartYear } from "./rver-id";
import type {
  RvbrCanonFile,
  RvbrPromptFragments,
  RvbrProfile,
  RvbrVisualIdentity,
} from "./types";

const CANON_PATH = join(process.cwd(), "data/rvbr/eras-canon.json");
const CANON_SOURCE = "data/rvbr/eras-canon.json";

/** Conservative era → Creative Lab links (named matches only; not invented canon). */
const ERA_PRESET_HINTS: Record<string, string[]> = {
  "1962-1965": ["british-invasion"],
  "1966-1969": ["summer-of-love", "woodstock"],
  "1982-1985": ["mtv-era"],
};

const ERA_WORLD_HINTS: Record<string, string[]> = {
  "1958-1961": ["vintage-television"],
  "1962-1965": ["collector-memorabilia"],
  "1966-1969": ["psychedelic-festival"],
  "1970-1973": ["psychedelic-festival"],
  "1974-1977": ["rock-poster"],
  "1978-1981": ["vintage-television"],
  "1982-1985": ["music-television-credential"],
  "1986-1989": ["concert-backstage-laminate"],
  "1990-1993": ["rock-poster"],
  "1994-1997": ["rock-poster"],
  "1998-2001": ["collector-memorabilia"],
  "2002-2005": ["concert-backstage-laminate"],
  "2006-2009": ["music-television-credential"],
  "2010-2013": ["concert-backstage-laminate"],
  "2014-2017": ["collector-memorabilia"],
  "2018-2021": ["concert-backstage-laminate"],
  "2022-2025": ["collector-memorabilia"],
};

export function loadErasCanon(): RvbrCanonFile {
  const raw = readFileSync(CANON_PATH, "utf8");
  return JSON.parse(raw) as RvbrCanonFile;
}

function buildNarrative(era: RvbrCanonFile["eras"][number]): string | null {
  const parts: string[] = [];
  if (era.summary?.trim()) parts.push(era.summary.trim());
  if (era.subtitle?.trim()) parts.push(era.subtitle.trim());
  return parts.length ? parts.join("\n\n") : null;
}

function buildVisualIdentity(era: RvbrCanonFile["eras"][number]): RvbrVisualIdentity {
  return {
    canonSource: CANON_SOURCE,
    title: era.title,
    subtitle: era.subtitle,
    accent: era.accent,
    sections: era.sections,
    definingAlbums: era.definingAlbums,
    definingSongs: era.definingSongs,
    chronology: era.chronology,
  };
}

function buildPromptFragments(slug: string): RvbrPromptFragments {
  const presets = ERA_PRESET_HINTS[slug] ?? [];
  const worlds = ERA_WORLD_HINTS[slug] ?? [];
  const fragments: RvbrPromptFragments = {
    designRules: ".cursor/rules/retroverse-design.mdc",
    passPromptModules: [
      "lib/ops/creative-lab/pass-concept-prompt.ts",
      "lib/ops/creative-lab/pass-back-prompt.ts",
    ],
  };
  if (presets.length) fragments.creativeLabPresets = presets;
  if (worlds.length) fragments.visualWorlds = worlds;
  if (!presets.length && !worlds.length) {
    fragments.notes = "No era-specific Creative Lab preset/world mapping yet.";
  }
  return fragments;
}

export type RvbrSeedRow = {
  id: string;
  retroverseEraId: string;
  slug: string;
  name: string;
  eraStartYear: number;
  eraEndYear: number;
  narrative: string | null;
  visualIdentityJson: RvbrVisualIdentity;
  promptFragmentsJson: RvbrPromptFragments;
  notes: string | null;
};

export function buildRvbrSeedRows(canon: RvbrCanonFile = loadErasCanon()): RvbrSeedRow[] {
  return canon.eras.map((era) => {
    const range = parseYearRange(era.slug);
    if (!range) throw new Error(`Invalid era slug: ${era.slug}`);
    const id = rverIdFromStartYear(range.start);
    return {
      id,
      retroverseEraId: id,
      slug: era.slug,
      name: era.title,
      eraStartYear: range.start,
      eraEndYear: range.end,
      narrative: buildNarrative(era),
      visualIdentityJson: buildVisualIdentity(era),
      promptFragmentsJson: buildPromptFragments(era.slug),
      notes: canon.source ? `Imported from ${canon.source}` : null,
    };
  });
}

export function rowToProfile(row: {
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
}): RvbrProfile {
  return {
    id: row.id,
    retroverseEraId: row.retroverse_era_id,
    slug: row.slug,
    name: row.name,
    eraStartYear: row.era_start_year,
    eraEndYear: row.era_end_year,
    narrative: row.narrative,
    visualIdentity: row.visual_identity_json ?? {},
    promptFragments: row.prompt_fragments_json ?? {},
    notes: row.notes,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}
