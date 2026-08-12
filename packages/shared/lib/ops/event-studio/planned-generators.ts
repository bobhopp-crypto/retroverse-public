export type PlannedGeneratorSlug =
  | "poster"
  | "facebook"
  | "landing-page"
  | "blog"
  | "registration"
  | "social"
  | "qr"
  | "prize";

export type PlannedGenerator = {
  slug: PlannedGeneratorSlug;
  title: string;
  lead: string;
  relatedHref?: string;
  relatedLabel?: string;
};

export const EVENT_STUDIO_PLANNED_GENERATORS: Record<PlannedGeneratorSlug, PlannedGenerator> = {
  poster: {
    slug: "poster",
    title: "Generate Poster",
    lead: "Venue poster artwork will inherit Identity settings — theme, palette, and featured years.",
  },
  facebook: {
    slug: "facebook",
    title: "Generate Facebook Graphic",
    lead: "Facebook event cover and share graphics will publish from approved Assets.",
  },
  "landing-page": {
    slug: "landing-page",
    title: "Generate Landing Page",
    lead: "Public landing hero and programming blocks will ship from Identity and approved Assets.",
    relatedHref: "/ops/event-control",
    relatedLabel: "Edit homepage in Event Control",
  },
  blog: {
    slug: "blog",
    title: "Generate Blog Article",
    lead: "Editorial write-ups for the event theme will inherit Identity voice and featured years.",
  },
  registration: {
    slug: "registration",
    title: "Generate Registration Page",
    lead: "QR registration and pass signup flows will connect to Audience registrations.",
    relatedHref: "/bobos/pass-management",
    relatedLabel: "Open pass registrations",
  },
  social: {
    slug: "social",
    title: "Generate Social Images",
    lead: "Instagram squares, stories, and carousel frames will inherit approved event artwork.",
  },
  qr: {
    slug: "qr",
    title: "Generate QR Artwork",
    lead: "Standalone QR art for print and signage will reuse pass registration targets.",
  },
  prize: {
    slug: "prize",
    title: "Generate Prize Graphics",
    lead: "Giveaway prize cards and winner reveal art will connect to Audience drawing tools.",
    relatedHref: "/ops/event-studio/audience",
    relatedLabel: "Open Audience",
  },
};

export function isPlannedGeneratorSlug(value: string): value is PlannedGeneratorSlug {
  return value in EVENT_STUDIO_PLANNED_GENERATORS;
}

export function plannedGeneratorHref(slug: PlannedGeneratorSlug): string {
  return `/ops/event-studio/create/${slug}`;
}
