/** Prefer position-first canonical scan filename for display. */
export function displayCanonicalFile(input: {
  canonicalFile?: string | null;
  sourceFile?: string | null;
  scanFilename?: string | null;
}): string {
  return input.canonicalFile?.trim() || input.sourceFile?.trim() || input.scanFilename?.trim() || "—";
}
