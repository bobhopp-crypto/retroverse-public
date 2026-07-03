/**
 * Pure, data-driven helpers for turning arbitrary JSON into a human-readable
 * document. No knowledge of any particular schema, stage, or product area —
 * presentation only, never interpretation.
 */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function splitKeyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const KEY_ACRONYMS: Record<string, string> = {
  rvtr: "RVTR",
  rvar: "RVAR",
  rval: "RVAL",
  url: "URL",
  urls: "URLs",
  id: "ID",
  ids: "IDs",
  vdj: "VirtualDJ",
  dj: "DJ",
  dna: "DNA",
  tv: "TV",
};

/** "playCount" → "Play Count", "rvtr" → "RVTR", "coverUrl" → "Cover URL" */
export function humanizeKey(key: string): string {
  if (!key) return "";
  return splitKeyWords(key)
    .map((word) => {
      const lower = word.toLowerCase();
      if (KEY_ACRONYMS[lower]) return KEY_ACRONYMS[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

const TECHNICAL_WORDS = new Set([
  "metadata",
  "schema",
  "version",
  "spec",
  "internal",
  "debug",
  "path",
  "generated",
]);

/** True for fields that are clearly internal/technical, not document content. */
export function isTechnicalKey(key: string): boolean {
  const words = splitKeyWords(key).map((w) => w.toLowerCase());
  return words.some((w) => TECHNICAL_WORDS.has(w));
}

const IMAGE_WORDS = new Set([
  "image",
  "thumbnail",
  "thumb",
  "artwork",
  "cover",
  "hero",
  "photo",
  "picture",
  "avatar",
  "poster",
]);

/** True for fields that should render as an image, not a URL string. */
export function isImageKey(key: string): boolean {
  const words = splitKeyWords(key).map((w) => w.toLowerCase());
  return words.some((w) => IMAGE_WORDS.has(w));
}

/** True for string values that look like a URL or app-relative link. */
export function isUrlLike(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || /\s/.test(v)) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^\/\//.test(v)) return true;
  if (v.startsWith("/") && v.length > 1) return true;
  return false;
}

const FILE_EXTENSION_RE = /\.(mp4|mov|m4v|mp3|wav|pdf|jpg|jpeg|png|gif|webp|svg)(\?|$)/i;

/** Display label for a URL link — "Open file" for media/docs, else "View asset". */
export function urlLinkLabel(value: string): string {
  return FILE_EXTENSION_RE.test(value) ? "Open file" : "View asset";
}

function isRawEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (typeof value === "number") return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

/**
 * True if the value has anything worth displaying, after technical fields
 * and empty values are accounted for at every depth. Prevents empty
 * sections ("Recording" with nothing under it) from rendering.
 */
export function hasRenderableContent(value: unknown): boolean {
  if (isRawEmpty(value)) return false;

  if (Array.isArray(value)) {
    return value.some((item) => hasRenderableContent(item));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).some(
      ([key, nested]) => !isTechnicalKey(key) && hasRenderableContent(nested),
    );
  }

  return true;
}

const ITEM_HEADING_PRIORITY = ["title", "name", "label", "category", "source"];

/** Picks a field to use as a list-item's heading, e.g. a source log entry's "source". */
export function pickItemHeadingKey(item: Record<string, unknown>): string | null {
  for (const candidate of ITEM_HEADING_PRIORITY) {
    const match = Object.keys(item).find((k) => k.toLowerCase() === candidate);
    const value = match ? item[match] : undefined;
    if (match && typeof value === "string" && value.trim()) return match;
  }
  return null;
}

export function headingTag(depth: number): "h2" | "h3" | "h4" {
  if (depth <= 0) return "h2";
  if (depth === 1) return "h3";
  return "h4";
}
