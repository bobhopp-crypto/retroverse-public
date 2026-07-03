import { descriptorForYear, type HomeFeaturedYear } from "@/lib/home/home-featured-years";

import type { EventControlConfig } from "./types";

/** Build homepage year cards from event control config (hero year first when set). */
export function buildFeaturedYearsFromConfig(config: EventControlConfig): HomeFeaturedYear[] {
  const years = [...config.featuredYears];
  const hero = config.homepage.heroYear;

  if (hero != null && years.includes(hero)) {
    years.sort((a, b) => {
      if (a === hero) return -1;
      if (b === hero) return 1;
      return a - b;
    });
  }

  return years.map((year) => ({
    year,
    href: `/rv/${year}`,
    descriptor: descriptorForYear(year),
  }));
}
