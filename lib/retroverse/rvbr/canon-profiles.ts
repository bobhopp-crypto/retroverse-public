import { buildRvbrSeedRows, type RvbrSeedRow } from "@/lib/ops/rvbr/import-canon";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

let cachedProfiles: RvbrProfile[] | null = null;

function seedRowToProfile(row: RvbrSeedRow): RvbrProfile {
  return {
    id: row.id,
    retroverseEraId: row.retroverseEraId,
    slug: row.slug,
    name: row.name,
    eraStartYear: row.eraStartYear,
    eraEndYear: row.eraEndYear,
    narrative: row.narrative,
    visualIdentity: row.visualIdentityJson,
    promptFragments: row.promptFragmentsJson,
    notes: row.notes,
    createdAt: "",
    updatedAt: "",
  };
}

/** RVBR era profiles from Era Atlas canon — file-backed, no duplicate taxonomy. */
export function loadCanonRvbrProfiles(): RvbrProfile[] {
  if (!cachedProfiles) {
    cachedProfiles = buildRvbrSeedRows().map(seedRowToProfile);
  }
  return cachedProfiles;
}

/** What era does this song belong to? */
export function resolveRvbrProfileForYear(
  year: number | null | undefined,
): RvbrProfile | null {
  if (year == null || !Number.isFinite(year)) return null;
  return (
    loadCanonRvbrProfiles().find(
      (profile) => year >= profile.eraStartYear && year <= profile.eraEndYear,
    ) ?? null
  );
}
