import type { SongExperience } from "@/lib/retroverse/experience/experience-types";

export type HomepageDocumentModel = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  albumTitle: string | null;
  heroUrl: string | null;
  coverUrl: string | null;
  experience: SongExperience;
};
