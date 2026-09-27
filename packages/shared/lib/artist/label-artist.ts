import { ALTERNATE_ARTISTS, STARTER_ARTISTS, type StarterArtist } from "@/lib/artist/starter-artists";

const KNOWN = [...STARTER_ARTISTS, ...ALTERNATE_ARTISTS];

/** Case and spacing only. Accents stay, so Beyoncé and Beyonce remain distinct. */
export function normalizeLabelArtist(name: string): string {
  return name
    .normalize("NFC")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9\u00c0-\u024f]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isStarterLabel(name: string): boolean {
  const key = normalizeLabelArtist(name);
  if (!key) return false;
  return KNOWN.some((artist) => normalizeLabelArtist(artist.name) === key);
}

function starterByLabel(name: string): StarterArtist | null {
  const key = normalizeLabelArtist(name);
  if (!key) return null;
  return KNOWN.find((artist) => normalizeLabelArtist(artist.name) === key) ?? null;
}

/**
 * Credit string → primary label artist.
 * feat/ft/featuring always mark a featured credit.
 * with / & / and / x split only when the left side is already a known artist,
 * so band names are not torn apart.
 */
export function primaryLabelArtist(label: string): string {
  const clean = label.trim().replace(/\s+/g, " ");
  if (!clean) return "";

  const featured = clean.split(/\s+(?:feat\.?|ft\.?|featuring)\s+/i);
  if (featured.length > 1 && featured[0]?.trim()) return featured[0].trim();

  const withParts = clean.split(/\s+with\s+/i);
  if (withParts.length > 1 && withParts[0] && isStarterLabel(withParts[0])) return withParts[0].trim();

  for (const pattern of [/\s+&\s+/, /\s+and\s+/i, /\s+x\s+/i]) {
    const parts = clean.split(pattern);
    if (parts.length > 1 && parts[0] && isStarterLabel(parts[0])) return parts[0].trim();
  }

  return clean;
}

export function featuredLabelArtists(label: string, explicit: string[] = []): string[] {
  const primary = primaryLabelArtist(label);
  const fromCredit =
    primary && primary.length < label.trim().length
      ? label
          .trim()
          .slice(primary.length)
          .replace(/^\s*(?:feat\.?|ft\.?|featuring|with|&|and|x)\s+/i, "")
          .split(/\s*(?:,|&|\/|\band\b|\bx\b)\s*/i)
          .map((part) => part.trim())
          .filter(Boolean)
      : [];

  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of [...explicit, ...fromCredit]) {
    const cleaned = name.trim();
    const key = normalizeLabelArtist(cleaned);
    if (!key || key === normalizeLabelArtist(primary) || seen.has(key)) continue;
    seen.add(key);
    names.push(cleaned);
  }
  return names;
}

/** Public route for a locked starter artist. Featured-only credits do not qualify. */
export function starterArtistHref(label: string | null | undefined): string | null {
  const primary = primaryLabelArtist(label ?? "");
  const artist = starterByLabel(primary);
  return artist ? `/artist/${artist.slug}` : null;
}
