const COVERS_SEGMENT = "retroverse/covers/";

export function getRetroverseCoverBaseUrl(): string | null {
  for (const raw of [
    process.env.RETROVERSE_COVER_BASE_URL,
    process.env.NEXT_PUBLIC_RETROVERSE_COVER_BASE_URL,
  ]) {
    if (typeof raw === "string" && raw.trim()) {
      let b = raw.trim().replace(/\/+$/, "");
      b = b.replace(/\/retroverse\/covers$/i, "").replace(/\/+$/, "");
      return b;
    }
  }
  return null;
}

function normalizeRelativeCoverPath(raw: string): string | null {
  let rel = raw.trim().replace(/^\/+/, "").replace(/^public\//, "");
  if (!rel) return null;
  rel = rel.replace(/^(retroverse\/covers\/)+/i, COVERS_SEGMENT);
  if (!rel.startsWith(COVERS_SEGMENT) && /^RVAL[0-9]{6}\//i.test(rel)) {
    rel = `${COVERS_SEGMENT}${rel}`;
  }
  return rel;
}

export function coverPathToUrl(
  path: string | null | undefined,
  r2Key?: string | null,
): string | null {
  const base = getRetroverseCoverBaseUrl();
  const tryPath = (raw: string | null | undefined): string | null => {
    if (!raw?.trim()) return null;
    const p = raw.trim();
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    if (p.startsWith("/retroverse/covers/")) return p;
    const rel = normalizeRelativeCoverPath(p);
    if (!rel) return null;
    if (base) return `${base.replace(/\/+$/, "")}/${rel}`;
    return `/${rel}`;
  };
  return tryPath(path) ?? tryPath(r2Key);
}
