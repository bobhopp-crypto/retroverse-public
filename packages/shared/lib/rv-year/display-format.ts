/**
 * RV Year presentation-layer title case — does not mutate stored chart data.
 */

import { displayArtistName } from "@/lib/artist/slug";

const KNOWN_ARTIST_DISPLAY: Record<string, string> = {
  "ac/dc": "AC/DC",
  "r.e.m.": "R.E.M.",
  "rem": "R.E.M.",
  "*nsync": "*NSYNC",
  nsync: "*NSYNC",
  "kc and the sunshine band": "KC and the Sunshine Band",
};

function hasIntentionalCasing(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const upperish = words.filter((w) => /[A-Z]/.test(w.slice(1))).length;
  return upperish >= Math.min(2, Math.ceil(words.length * 0.35));
}

function isMostlyLowercase(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (!letters) return false;
  const upperCount = (letters.match(/[A-Z]/g) ?? []).length;
  return upperCount / letters.length < 0.12;
}

function capitalizeToken(token: string): string {
  const w = token.trim();
  if (!w) return w;
  if (/^\d/.test(w)) return w;

  const match = w.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)([^a-zA-Z0-9]*)$/);
  if (!match) return w;
  const [, lead, core, trail] = match;
  if (core.length <= 3 && core === core.toUpperCase()) return w;
  return `${lead}${core.charAt(0).toUpperCase()}${core.slice(1).toLowerCase()}${trail}`;
}

function titleCaseAllWords(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => {
      if (word.includes("-")) {
        return word.split("-").map(capitalizeToken).join("-");
      }
      return capitalizeToken(word);
    })
    .join(" ");
}

/** Artist names on RV year pages. */
export function formatRvYearArtist(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const known = KNOWN_ARTIST_DISPLAY[t.toLowerCase()];
  if (known) return known;
  if (hasIntentionalCasing(t) && !isMostlyLowercase(t)) return t;
  return displayArtistName(t);
}

/** Song and album titles on RV year pages. */
export function formatRvYearTitle(text: string): string {
  const t = text.trim();
  if (!t || t === "—") return t;
  if (hasIntentionalCasing(t) && !isMostlyLowercase(t)) return t;
  return titleCaseAllWords(t);
}
