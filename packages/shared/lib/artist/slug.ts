/** Known launch artists — slug → graph lookup name */
export const ARTIST_SLUGS: Record<string, string> = {
  "fleetwood-mac": "Fleetwood Mac",
  eagles: "Eagles",
  madonna: "Madonna",
  "elton-john": "Elton John",
  "bruce-springsteen": "Bruce Springsteen",
};

export function artistNameFromSlug(slug: string): string | null {
  const key = slug.trim().toLowerCase();
  return ARTIST_SLUGS[key] ?? null;
}

export function slugFromArtistName(name: string): string {
  const entry = Object.entries(ARTIST_SLUGS).find(
    ([, n]) => n.toLowerCase() === name.trim().toLowerCase(),
  );
  if (entry) return entry[0];
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function displayArtistName(canonical: string): string {
  return canonical
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .replace(/\bDj\b/g, "DJ");
}

export function artistFileCode(artistId: number, displayName: string): string {
  const parts = displayName.replace(/[^a-zA-Z\s]/g, "").trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
      : (parts[0]?.slice(0, 2) ?? "RV").toUpperCase();
  return `${initials}-${String(artistId).padStart(3, "0")}`;
}
