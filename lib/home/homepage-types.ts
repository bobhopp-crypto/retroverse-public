export type HomeMediaCard = {
  rvtr: string | null;
  title: string;
  artist: string;
  year: number | null;
  coverUrl: string | null;
  href: string;
  playCount?: number | null;
};

export type HomeNowPlaying = {
  title: string;
  artist: string;
  year: number | null;
  coverUrl: string | null;
  rvtr: string | null;
  liveHref: string;
};

export type HomeDiscoverSong = {
  title: string;
  artist: string;
  year: number | null;
  coverUrl: string | null;
  rvtr: string;
  songHref: string;
};

export type HomeFeaturedArtist = {
  slug: string;
  name: string;
  href: string;
  coverUrl: string | null;
};

export type HomepageData = {
  nowPlaying: HomeNowPlaying | null;
  discoverSong: HomeDiscoverSong | null;
  recentVideos: HomeMediaCard[];
  popularSongs: HomeMediaCard[];
  featuredArtists: HomeFeaturedArtist[];
  years: number[];
};
