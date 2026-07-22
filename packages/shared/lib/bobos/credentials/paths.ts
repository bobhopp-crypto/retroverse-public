import { join } from "node:path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

/** Durable Credentials-owned artwork. This is intentionally outside Content Creator. */
export function credentialsArtworkRoot(): string {
  return join(retroverseDataRoot(), "credentials", "artwork");
}

export function credentialsArtworkRunDir(runId: string): string {
  return join(credentialsArtworkRoot(), runId);
}

export function credentialsArtworkFileUrl(runId: string, filename: string): string {
  return `/api/bobos/credentials/files/${encodeURIComponent(runId)}/${encodeURIComponent(filename)}`;
}
