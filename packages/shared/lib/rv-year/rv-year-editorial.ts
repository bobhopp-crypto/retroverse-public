/** Editorial framing for RV Year worlds — magazine voice, chart-page editorial. */

import {
  RV_YEAR_EDITORIAL_MAX,
  RV_YEAR_EDITORIAL_MIN,
  RV_YEAR_EDITORIAL_RECORDS,
  type RvYearEditorialRecord,
} from "./editorial-records";

export type { RvYearEditorialRecord };
export { RV_YEAR_EDITORIAL_MIN, RV_YEAR_EDITORIAL_MAX };

export type RvYearEditorial = Pick<
  RvYearEditorialRecord,
  "headline" | "lead" | "theme" | "keywords" | "definingMoments" | "shortDeck" | "accentMood"
>;

const BY_YEAR = new Map<number, RvYearEditorialRecord>(
  RV_YEAR_EDITORIAL_RECORDS.map((record) => [record.year, record]),
);

export function hasRvYearEditorial(year: number): boolean {
  return BY_YEAR.has(year);
}

export function rvYearEditorialRecord(year: number): RvYearEditorialRecord | null {
  return BY_YEAR.get(year) ?? null;
}

export function rvYearEditorial(year: number): RvYearEditorial {
  const record = BY_YEAR.get(year);
  if (record) {
    return {
      headline: record.headline,
      lead: record.lead,
      theme: record.theme,
      keywords: record.keywords,
      definingMoments: record.definingMoments,
      shortDeck: record.shortDeck,
      accentMood: record.accentMood,
    };
  }

  return {
    headline: "A Year in Popular Music",
    lead: `Move through the months and rediscover what people were playing, sharing, and arguing about in ${year}.`,
    theme: "Chart history",
    keywords: ["Billboard Hot 100", "pop music", "charts"],
    definingMoments: [
      "Weekly #1 singles shaped the story of the year",
      "Albums and singles traded the spotlight month by month",
      "Every chart week left a mark on the culture",
    ],
  };
}

export function rvYearEditorialYears(): number[] {
  return [...BY_YEAR.keys()].sort((a, b) => a - b);
}
