/** Sunday Nights program years — featured on the public homepage. */

export type HomeFeaturedYear = {
  year: number;
  href: string;
  descriptor: string;
};

export const HOME_FEATURED_YEARS: HomeFeaturedYear[] = [
  {
    year: 1967,
    href: "/rv/1967",
    descriptor: "Summer of Love · British Invasion · Psychedelia",
  },
  {
    year: 1978,
    href: "/rv/1978",
    descriptor: "Disco · Arena Rock · New Wave",
  },
  {
    year: 1992,
    href: "/rv/1992",
    descriptor: "Grunge · Hip-Hop · MTV Era",
  },
];

export type YearCoverStrip = {
  year: number;
  coverUrls: string[];
};
