/**
 * Mobile Experience Renderer v1 — hardcoded per-song content.
 *
 * This is a presentation-only shape. No editor, no CMS, no generator.
 * To add a future song, add a new entry to the registry in
 * `lib/song-mobile/experiences.ts` — nothing else changes.
 */

export type MobileSongFact = string;

export type MobileRelatedSong = {
  rvtr: string;
  title: string;
  artist: string;
  coverUrl: string;
  href: string;
};

export type MobileAlbum = {
  title: string;
  year: number;
  coverUrl: string;
};

export type MobileBandMember = {
  name: string;
  role: string;
};

export type MobileTimelineEvent = {
  year: string;
  label: string;
};

export type MobileSongExperience = {
  rvtr: string;
  artist: string;
  artistHref: string;
  title: string;
  year: number;

  hero: {
    imageUrl: string;
    imageAlt: string;
  };

  story: {
    paragraph: string;
  };

  liveAid: {
    headline: string;
    paragraph: string;
    imageUrl: string;
    imageAlt: string;
  };

  charts: {
    peakPosition: string;
    countries: string;
    release: string;
    album: string;
  };

  didYouKnow: MobileSongFact[];

  relatedSongs: MobileRelatedSong[];

  explore: {
    albums: MobileAlbum[];
    bandMembers: MobileBandMember[];
    timeline: MobileTimelineEvent[];
  };
};
