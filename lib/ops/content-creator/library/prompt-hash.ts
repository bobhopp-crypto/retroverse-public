import { createHash } from "node:crypto";

/** Stable hash of front + back prompt text for dedup / lineage. */
export function hashPrompts(frontPrompt: string, backPrompt: string): string {
  return createHash("sha256").update(frontPrompt).update("\n---\n").update(backPrompt).digest("hex").slice(0, 16);
}
