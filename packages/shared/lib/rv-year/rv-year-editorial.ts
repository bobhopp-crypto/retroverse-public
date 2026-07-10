/** Editorial framing for RV Year worlds — magazine voice, chart-page editorial. */

import {
  RV_YEAR_EDITORIAL_MAX,
  RV_YEAR_EDITORIAL_MIN,
  RV_YEAR_EDITORIAL_RECORDS,
  type RvYearEditorialRecord,
} from "./rv-year-editorial-data";

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
    headline: "Charts Tell the Story",
    lead:
      "Move month by month through the hits that shaped this year — singles and albums trading the spotlight as listeners argued, danced, and rewound the ones that stuck. Every week on the chart left a trace you can still follow.",
    theme: "Chart chronology",
    keywords: ["Hot 100", "album chart", "number ones", "pop music"],
    definingMoments: [
      "Weekly chart leaders mapped the year's momentum",
      "Singles and albums took turns owning the conversation",
      "Each month added another chapter to the story",
    ],
  };
}

export function rvYearEditorialYears(): number[] {
  return [...BY_YEAR.keys()].sort((a, b) => a - b);
}
