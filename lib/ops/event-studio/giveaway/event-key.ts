export function slugifyEventKey(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "event";
}

export function giveawayRegistrationPath(eventKey: string, giveawayId: string): string {
  return `/giveaway/${encodeURIComponent(eventKey)}?g=${encodeURIComponent(giveawayId)}`;
}
