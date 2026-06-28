const FILE_PATH_ONLY =
  /^(?:\/Users\/|\/DJ MEDIA\/|\\|[A-Z]:\\)[^\s]+$/i;
const FILE_PATH_PATTERN =
  /(?:\/Users\/|\/DJ MEDIA\/|\\|[A-Z]:\\)[^\s]+|\.(?:mp4|mp3|m4a|wav|flac)\b/gi;

function tLengthWithoutPaths(text: string): number {
  return text.replace(FILE_PATH_PATTERN, "").trim().length;
}

/** True duplicate / corrupt / unsafe-only — not "low rank". */
export function isInvalidCollectorFact(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return true;
  if (FILE_PATH_ONLY.test(t)) return true;
  if (/^[\d\s·plays:]+$/i.test(t)) return true;
  if (/^retroverse track identity:/i.test(t)) return true;
  if (/^\/Users\/bobhopp\/DJ MEDIA\/[^\s]{0,20}$/.test(t)) return true;
  if (/Hook - When You'?re In Love With A Beautiful Woman\.mp4/i.test(t)) return true;
  if (/^Hook · Title:/i.test(t) && t.length < 90) return true;
  if (/^· Year: 1981 · Genre:/i.test(t)) return true;
  if (/^Cover URL is graph-owned/i.test(t)) return true;
  if (/^Canonical cover assignment for RVTR/i.test(t)) return true;
  if (/^When You'?re In Love With A Beautiful Woman is performed by/i.test(t)) return true;
  if (FILE_PATH_PATTERN.test(t) && tLengthWithoutPaths(t) < 24) return true;
  return false;
}

export function normalizeFactText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}
