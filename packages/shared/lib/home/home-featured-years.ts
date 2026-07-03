/** Homepage featured year metadata — defaults; live values come from event control config. */

import { rvYearEditorial } from "@/lib/rv-year/rv-year-editorial";

export type HomeFeaturedYear = {
  year: number;
  href: string;
  descriptor: string;
};

/** Known year card copy — used as fallback when ops picks a year without bespoke copy. */
export const YEAR_DESCRIPTORS: Record<number, string> = {
  1967: "Summer of Love · British Invasion · Psychedelia",
  1978: "Disco · Arena Rock · New Wave",
  1992: "Grunge · Hip-Hop · MTV Era",
};

export const HOME_FEATURED_YEARS: HomeFeaturedYear[] = [1967, 1978, 1992].map((year) => ({
  year,
  href: `/rv/${year}`,
  descriptor: YEAR_DESCRIPTORS[year]!,
}));

export function descriptorForYear(year: number): string {
  const known = YEAR_DESCRIPTORS[year];
  if (known) return known;
  return rvYearEditorial(year).headline;
}

export type YearCoverStrip = {
  year: number;
  coverUrls: string[];
};
