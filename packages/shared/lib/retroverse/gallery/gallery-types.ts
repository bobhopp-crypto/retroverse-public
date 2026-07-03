/** Client-safe Gallery types — no server imports, no functions. */

export type GalleryExperienceCard = {
  id: string;
  tier: "signature" | "supporting";
  title: string;
  tagline: string;
  question: string;
  stars: number;
  status: "ready" | "in_progress" | "planned" | "coming_soon";
  estimatedMinutes?: number;
  sortOrder: number;
  /** Pre-resolved patron launch URL for the current song */
  launchHref: string | null;
};

export type GalleryExperienceReadiness = {
  id: string;
  available: boolean;
  completionPct: number;
  sceneCount: number | null;
  creativeReviewScore: number | null;
  productionScore: number | null;
  lastUpdated: string | null;
  launchHref: string | null;
  statusLabel: string;
};

export type GallerySongContext = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  album: string | null;
  coverUrl: string | null;
  peakHot100: number | null;
  chartWeeks: number | null;
  published: boolean;
  experiences: GalleryExperienceReadiness[];
};

export type GalleryLibraryProgress = {
  experienceId: string;
  title: string;
  completeCount: number;
  status: GalleryExperienceCard["status"];
};

export type GalleryBrowseMode = {
  id: string;
  label: string;
  href: string;
};

export type GalleryPageData = {
  currentRvtr: string;
  song: GallerySongContext;
  signatureExperiences: GalleryExperienceCard[];
  supportingExperiences: GalleryExperienceCard[];
  libraryProgress: GalleryLibraryProgress[];
  navigation: {
    previousRvtr: string | null;
    nextRvtr: string | null;
    randomRvtr: string | null;
    index: number;
    total: number;
  };
  browseModes: GalleryBrowseMode[];
  liveRvtr: string | null;
};
