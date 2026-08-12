import {
  loadCanonRvbrProfiles,
} from "@/lib/retroverse/rvbr/canon-profiles";
import type { RvbrProfile } from "./types";

/**
 * RVBR era profiles — Era Atlas canon (`data/rvbr/eras-canon.json`).
 *
 * Source of truth is file-backed via loadCanonRvbrProfiles().
 * There is no rvbr_profiles Postgres table; callers must not expect one.
 */

export async function listRvbrProfiles(): Promise<RvbrProfile[]> {
  return loadCanonRvbrProfiles().slice().sort((a, b) => a.eraStartYear - b.eraStartYear);
}

export async function getRvbrProfileBySlug(slug: string): Promise<RvbrProfile | null> {
  return loadCanonRvbrProfiles().find((profile) => profile.slug === slug) ?? null;
}

export async function rvbrProfileCount(): Promise<number> {
  return loadCanonRvbrProfiles().length;
}
