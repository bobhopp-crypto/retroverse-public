/**
 * Retroverse Experience Gallery — experience registry.
 * Signature and supporting experiences register here; the Gallery reads this list.
 */

export type ExperienceTier = "signature" | "supporting";

export type ExperienceRegistryStatus = "ready" | "in_progress" | "planned" | "coming_soon";

export type GalleryExperienceDefinition = {
  id: string;
  tier: ExperienceTier;
  title: string;
  tagline: string;
  question: string;
  stars: number;
  status: ExperienceRegistryStatus;
  /** Patron launch path — never Studio workspace */
  launchPath?: (rvtr: string) => string;
  estimatedMinutes?: number;
  sortOrder: number;
};

const registry: GalleryExperienceDefinition[] = [];

export function registerGalleryExperience(entry: GalleryExperienceDefinition): void {
  const idx = registry.findIndex((e) => e.id === entry.id);
  if (idx >= 0) registry[idx] = entry;
  else registry.push(entry);
}

export function listGalleryExperiences(tier?: ExperienceTier): GalleryExperienceDefinition[] {
  bootstrapRegistry();
  const list = tier ? registry.filter((e) => e.tier === tier) : [...registry];
  return list.sort((a, b) => a.sortOrder - b.sortOrder);
}

function bootstrapRegistry(): void {
  if (registry.length > 0) return;

  registerGalleryExperience({
    id: "chart_journey",
    tier: "signature",
    title: "Chart Journey",
    tagline: "What happened?",
    question: "How did this song become a hit?",
    stars: 5,
    status: "ready",
    launchPath: (rvtr) => `/retroverse-2/song/${rvtr}#chart-journey`,
    estimatedMinutes: 4,
    sortOrder: 1,
  });

  registerGalleryExperience({
    id: "song_dna",
    tier: "signature",
    title: "Song DNA",
    tagline: "Why does it feel this way?",
    question: "Why does this song feel the way it does?",
    stars: 5,
    status: "ready",
    launchPath: (rvtr) => `/experience/${rvtr}`,
    estimatedMinutes: 5,
    sortOrder: 2,
  });

  registerGalleryExperience({
    id: "recording_journey",
    tier: "signature",
    title: "Recording Journey",
    tagline: "How it was made",
    question: "What happened in the studio?",
    stars: 4,
    status: "coming_soon",
    sortOrder: 3,
  });

  registerGalleryExperience({
    id: "performance_journey",
    tier: "signature",
    title: "Performance Journey",
    tagline: "Live on stage",
    question: "How did audiences experience it live?",
    stars: 4,
    status: "coming_soon",
    sortOrder: 4,
  });

  registerGalleryExperience({
    id: "artist_journey",
    tier: "signature",
    title: "Artist Journey",
    tagline: "The artist's world",
    question: "Who made this and where did they come from?",
    stars: 4,
    status: "planned",
    sortOrder: 5,
  });

  registerGalleryExperience({
    id: "album_journey",
    tier: "signature",
    title: "Album Journey",
    tagline: "The album context",
    question: "Where does this song live on the record?",
    stars: 4,
    status: "planned",
    sortOrder: 6,
  });

  registerGalleryExperience({
    id: "legacy_journey",
    tier: "signature",
    title: "Legacy Journey",
    tagline: "Still alive today",
    question: "Why does this song still matter?",
    stars: 4,
    status: "planned",
    sortOrder: 7,
  });

  const supporting: Array<Omit<GalleryExperienceDefinition, "tier">> = [
    { id: "timeline", title: "Timeline", tagline: "Events", question: "What else happened?", stars: 3, status: "ready", launchPath: (r) => `/retroverse-2/song/${r}`, sortOrder: 10 },
    { id: "charts", title: "Charts", tagline: "Rankings", question: "Chart facts", stars: 3, status: "ready", launchPath: (r) => `/retroverse-2/song/${r}#chart-journey`, sortOrder: 11 },
    { id: "credits", title: "Credits", tagline: "Who made it", question: "Writers and producers", stars: 3, status: "in_progress", sortOrder: 12 },
    { id: "discography", title: "Discography", tagline: "Albums", question: "Related releases", stars: 3, status: "ready", launchPath: (r) => `/retroverse-2/song/${r}`, sortOrder: 13 },
    { id: "collector_sources", title: "Collector Sources", tagline: "Research", question: "Where the facts came from", stars: 3, status: "in_progress", sortOrder: 14 },
    { id: "photo_gallery", title: "Photo Gallery", tagline: "Images", question: "Visual archive", stars: 3, status: "in_progress", sortOrder: 15 },
    { id: "video_library", title: "Video Library", tagline: "Performances", question: "Watch it live", stars: 3, status: "in_progress", sortOrder: 16 },
    { id: "historical_documents", title: "Historical Documents", tagline: "Archive", question: "Primary sources", stars: 3, status: "planned", sortOrder: 17 },
    { id: "relationships", title: "Relationships", tagline: "Connected songs", question: "Musical neighbors", stars: 3, status: "ready", launchPath: (r) => `/retroverse-2/song/${r}`, sortOrder: 18 },
  ];

  for (const s of supporting) {
    registerGalleryExperience({ ...s, tier: "supporting" });
  }
}

export function getGalleryExperience(id: string): GalleryExperienceDefinition | null {
  bootstrapRegistry();
  return registry.find((e) => e.id === id) ?? null;
}

bootstrapRegistry();
