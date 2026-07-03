/**
 * MB ingest apply guard — disabled until RETROVERSE_MB_INGEST_APPLY=1.
 * Usage: npm run mb:canary:apply (refuses by default)
 */
export function mbIngestApplyEnabled(): boolean {
  return process.env.RETROVERSE_MB_INGEST_APPLY?.trim() === "1";
}

export function refuseMbIngestApply(): never {
  throw new Error(
    "MB ingest apply is disabled. Set RETROVERSE_MB_INGEST_APPLY=1 to enable (future phase). " +
      "Phase 5D stages proposals only — no canonical writes.",
  );
}
