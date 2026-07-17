const RE_RVAL = /^RVAL\d{6}$/i;

/** Public album identity is RVAL-only. Titles and slugs never determine identity. */
export async function resolveAlbumRvalParam(idParam: string): Promise<string | null> {
  const raw = decodeURIComponent(idParam).trim();
  return RE_RVAL.test(raw) ? raw.toUpperCase() : null;
}
