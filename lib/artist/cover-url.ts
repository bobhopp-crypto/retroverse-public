import { getPublicCoverDeliveryBase } from "@/lib/artwork/cover-origin";

const COVERS_SEGMENT = "retroverse/covers/";

function sanitizeCoverBase(raw: string): string | null {
  let b = raw.trim();
  if (!b) return null;
  // Mistaken Vercel/env values (e.g. literal "") must not prefix cover paths.
  if (b === '""' || b === "''" || /^["']{2}$/.test(b)) return null;
  b = b.replace(/\/+$/, "").replace(/\/retroverse\/covers$/i, "").replace(/\/+$/, "");
  if (!b) return null;
  if (b.startsWith("http://") || b.startsWith("https://")) return b;
  return null;
}

export function getRetroverseCoverBaseUrl(): string | null {
  for (const raw of [
    process.env.RETROVERSE_COVER_BASE_URL,
    process.env.NEXT_PUBLIC_RETROVERSE_COVER_BASE_URL,
  ]) {
    if (typeof raw !== "string") continue;
    const b = sanitizeCoverBase(raw);
    if (b) return b;
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
  const base = getPublicCoverDeliveryBase();
  const tryPath = (raw: string | null | undefined): string | null => {
    if (!raw?.trim()) return null;
    let p = raw.trim();
    p = p.replace(/^["']{2}\//, "/");
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    if (p.startsWith("/retroverse/covers/")) {
      return `${base.replace(/\/+$/, "")}${p}`;
    }
    const rel = normalizeRelativeCoverPath(p);
    if (!rel) return null;
    return `${base.replace(/\/+$/, "")}/${rel}`;
  };
  return tryPath(path) ?? tryPath(r2Key);
}
