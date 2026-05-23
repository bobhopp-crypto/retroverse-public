/** Editorial display helpers — no search/corpus logic. */

const SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "by",
  "vs",
  "feat",
  "ft",
]);

function formatWord(word: string, index: number): string {
  const w = word.trim();
  if (!w) return w;
  if (/^\d/.test(w)) return w;
  const bare = w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
  if (bare.length <= 2 && bare === bare.toUpperCase()) return w;
  if (index > 0 && SMALL_WORDS.has(bare.toLowerCase())) return bare.toLowerCase();
  return bare.charAt(0).toUpperCase() + bare.slice(1).toLowerCase() + w.slice(bare.length);
}

function hasIntentionalCasing(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const upperish = words.filter((w) => /[A-Z]/.test(w.slice(1))).length;
  return upperish >= Math.min(2, Math.ceil(words.length * 0.35));
}

export function formatDisplayTitle(text: string): string {
  const t = text.trim();
  if (!t || t === "—") return t;
  if (hasIntentionalCasing(t)) return t;
  return t
    .split(/\s+/)
    .map((word, i) => {
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part, j) => formatWord(part, i + j))
          .join("-");
      }
      return formatWord(word, i);
    })
    .join(" ");
}

export function formatDisplayArtist(text: string): string {
  return formatDisplayTitle(text);
}

/** Lower = better match for ordering. */
export function textMatchScore(text: string, query: string): number {
  const t = text.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (!t || !q) return 99;
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((tok) => t.includes(tok))) return 2;
  if (t.includes(q)) return 3;
  return 50;
}

export function parseYearFromText(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  const match = text.match(/\b(19|20)\d{2}\b/);
  if (!match) return null;
  const y = Number(match[0]);
  return Number.isFinite(y) && y > 0 ? y : null;
}

export function parsePeakPosition(subtitle: string | null | undefined): number | null {
  if (!subtitle) return null;
  const m = subtitle.match(/peak\s*#?\s*(\d+)/i);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) ? n : null;
}

export function formatChartMeta(subtitle: string | null | undefined): string | undefined {
  if (!subtitle?.trim()) return undefined;
  const t = subtitle.trim().replace(/\s+/g, " ");
  if (/^peak\s*#/i.test(t)) return t.replace(/^peak\s*#/i, "Peak #");
  return t;
}

export function normalizeDedupeKey(...parts: string[]): string {
  return parts
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .join("::");
}
