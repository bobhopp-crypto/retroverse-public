/** Strip internal Retroverse implementation language from patron-facing copy. */

const REPLACEMENTS: Array<{ pattern: RegExp; replace: string }> = [
  { pattern: /retroverse track identity:\s*RVTR\d{6}\.?/gi, replace: "" },
  { pattern: /\bRV(?:TR|AL|AR)\d{6}\b/g, replace: "" },
  { pattern: /canonical cover art is assigned[^.!?]*[.!?]?/gi, replace: "" },
  { pattern: /original album artwork is assigned[^.!?]*[.!?]?/gi, replace: "" },
  { pattern: /\btrack identity\b[^.!?]*[.!?]?/gi, replace: "" },
  { pattern: /\bcanonical cover library\b[^.!?]*[.!?]?/gi, replace: "" },
  { pattern: /\bexperience ready\b/gi, replace: "" },
  { pattern: /\bresearch vault\b/gi, replace: "" },
  { pattern: /\bintelligence package\b/gi, replace: "" },
  { pattern: /\bconnected in the graph\b/gi, replace: "" },
  { pattern: /\bgraph connections?\b/gi, replace: "" },
  { pattern: /\bRetroverse\b/g, replace: "" },
  { pattern: /\bVDJ:[^\s]+/gi, replace: "" },
];

/** Local library paths and VDJ path identities. Canonical RVTR/RVAL/RVAR tokens are separate. */
const PRIVATE_PATH =
  /(?:\/Users\/|\/USERS\/|\/home\/|[A-Za-z]:\\Users\\|DJ MEDIA[\\/])[^"<>\n]*?\.(?:mp4|mp3|m4v|m4a|wav|aiff|flac|jpg|jpeg|png|webp)/gi;

const PATH_FIELDS = new Set([
  "filepath",
  "filePath",
  "filePathNorm",
  "physicalPath",
  "physicalVideoPath",
  "vdjPath",
  "localMediaPath",
  "ownedVideoPath",
  "sourceRelativePath",
  "sourcePath",
  "videoInfo",
  "displayPath",
]);

function tidyWhitespace(text: string): string {
  return text
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^[,.;:\-–—]\s*/, "")
    .trim();
}

export function hasPrivatePath(value: string): boolean {
  return /\/Users\/|\/USERS\/|\/home\/|DJ MEDIA[\\/]|[A-Za-z]:\\Users\\/i.test(value);
}

export function isLibraryDump(value: string): boolean {
  return (
    /Path:\s*(?:\/Users\/|\/USERS\/|DJ MEDIA)/i.test(value) ||
    (/Artist:\s/i.test(value) && /\bTitle:\s/i.test(value) && /[·|]/.test(value))
  );
}

function hasLeakSignal(value: string): boolean {
  return (
    hasPrivatePath(value) ||
    isLibraryDump(value) ||
    /\bVDJ:/i.test(value) ||
    /^Chart story\b/im.test(value) ||
    /^Graph compilation anchor:/im.test(value) ||
    /^Song release\b/im.test(value) ||
    /^.+ was released in (?:19|20)\d{2}\.?$/im.test(value)
  );
}

function dropLeakedPiece(piece: string): boolean {
  const text = piece.trim();
  if (!text) return true;
  if (hasPrivatePath(text)) return true;
  if (/^Artist:\s/i.test(text) && /\bTitle:\s/i.test(text)) return true;
  if (/^Graph compilation anchor:/i.test(text)) return true;
  if (/^Chart story\b/i.test(text)) return true;
  if (/^Song release\b/i.test(text)) return true;
  if (/^.+ was released in (?:19|20)\d{2}\.?$/i.test(text)) return true;
  if (/\b(?:PlayCount|LastPlayed|User2\/Tags|Path):\s/i.test(text)) return true;
  if (/^VDJ:/i.test(text)) return true;
  return false;
}

export function opaquePublicKey(value: string): string {
  let hash = 2166136261;
  const normalized = value.trim().toLowerCase();
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const head = (hash >>> 0).toString(16).padStart(8, "0");
  const tail = (Math.imul(hash ^ normalized.length, 0x85ebca6b) >>> 0).toString(16).padStart(8, "0");
  return `${head}${tail}`;
}

export function replacePrivatePaths(value: string): string {
  let next = value.replace(/VDJ:\s*(?=\/Users\/|\/USERS\/|DJ MEDIA)/gi, "");
  next = next.replace(PRIVATE_PATH, (path) => opaquePublicKey(path));
  if (hasPrivatePath(next)) {
    next = next.replace(
      /(?:\/Users\/|\/USERS\/|\/home\/|DJ MEDIA[\\/])[^"<>\n]+/i,
      (path) => opaquePublicKey(path),
    );
  }
  return next;
}

function withoutLeakedPieces(text: string): string {
  if (!hasLeakSignal(text)) return text;
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((piece) => piece.trim())
    .filter((piece) => !dropLeakedPiece(piece))
    .join(" ");
}

/** Remove filesystem paths, library dumps, and catalog ids. Leaves ordinary sentences alone. */
export function redactPublicProse(text: string): string {
  let out = withoutLeakedPieces(text);
  out = out.replace(/\bRV(?:TR|AL|AR)\d{6}\b/g, "");
  out = out.replace(/\bVDJ:[^\s]+/gi, "");
  if (hasPrivatePath(out)) out = replacePrivatePaths(out);
  return tidyWhitespace(out);
}

export function sanitizePublicCopy(text: string): string {
  let out = withoutLeakedPieces(text);
  for (const { pattern, replace } of REPLACEMENTS) {
    out = out.replace(pattern, replace);
  }
  return tidyWhitespace(out);
}

export function sanitizePublicCopyOrNull(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const cleaned = sanitizePublicCopy(text);
  return cleaned.length >= 12 ? cleaned : null;
}

/** Patron-facing stage id. Canonical RVTR stays; filesystem identities become opaque. */
export function publicStageId(value: string): string {
  const trimmed = value.trim();
  if (/^RVTR\d{6}$/i.test(trimmed)) return trimmed.toUpperCase();
  if (!hasPrivatePath(trimmed) && !/^VDJ:/i.test(trimmed)) return trimmed;
  const redacted = replacePrivatePaths(trimmed).trim();
  return /^RVTR\d{6}$/i.test(redacted) ? redacted.toUpperCase() : redacted;
}

function redactString(value: string, key: string | null): string | null {
  if (key && PATH_FIELDS.has(key)) return null;
  if (isLibraryDump(value) || (hasPrivatePath(value) && hasLeakSignal(value) && /\s/.test(value) && /[A-Za-z]{3}/.test(value) && /Path:|Artist:|Chart story|was released in|Graph compilation/i.test(value))) {
    return sanitizePublicCopy(value);
  }
  if (!hasPrivatePath(value) && !/^VDJ:/i.test(value)) return value;
  return replacePrivatePaths(value);
}

/** Walk a public JSON payload and remove local filesystem paths before it leaves the server. */
export function redactPublicTree<T>(value: T, key: string | null = null): T {
  if (typeof value === "string") return redactString(value, key) as T;
  if (Array.isArray(value)) return value.map((item) => redactPublicTree(item)) as T;
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value)) {
      output[entryKey] = PATH_FIELDS.has(entryKey) ? null : redactPublicTree(entryValue, entryKey);
    }
    return output as T;
  }
  return value;
}
