import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { CoverTrustRecord } from "@/lib/cover-integrity/trust-tier";

export type CoverTrustRegistry = {
  version: 1;
  generatedAt: string;
  records: Record<string, CoverTrustRecord>;
  tierCounts: Record<CoverTrustRecord["trustTier"], number>;
};

export function buildTrustRegistry(records: CoverTrustRecord[]): CoverTrustRegistry {
  const byRval: Record<string, CoverTrustRecord> = {};
  const tierCounts = { TRUSTED: 0, REVIEW: 0, HIGH_RISK: 0, BROKEN: 0 };

  for (const r of records) {
    byRval[r.rval] = r;
    tierCounts[r.trustTier] += 1;
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    records: byRval,
    tierCounts,
  };
}

export async function persistTrustRegistry(
  outDir: string,
  registry: CoverTrustRegistry,
): Promise<string> {
  const path = join(outDir, "trust_registry.json");
  await writeFile(path, JSON.stringify(registry, null, 2));
  return path;
}
