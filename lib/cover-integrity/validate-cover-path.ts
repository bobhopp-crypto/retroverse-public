const RE_SAFE_COVER =
  /^retroverse\/covers\/RVAL\d{6}\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|gif)$/i;

/** Read-only ops thumbnail gate — blocks path traversal. */
export function isSafeCanonicalCoverPath(raw: string): boolean {
  const p = raw.trim().replace(/^\/+/, "").replace(/^public\//, "");
  if (!p || p.includes("..")) return false;
  return RE_SAFE_COVER.test(p);
}
