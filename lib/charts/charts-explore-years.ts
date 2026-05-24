import { MAX_RV_YEAR, MIN_RV_YEAR } from "@/lib/search/normalize-rv-year";

export function chartExploreDecades(): number[] {
  const decades: number[] = [];
  for (let start = Math.floor(MIN_RV_YEAR / 10) * 10; start <= MAX_RV_YEAR; start += 10) {
    decades.push(start);
  }
  return decades;
}

export function chartExploreYearsInDecade(decadeStart: number): number[] {
  const years: number[] = [];
  for (let y = decadeStart; y <= decadeStart + 9; y += 1) {
    if (y >= MIN_RV_YEAR && y <= MAX_RV_YEAR) years.push(y);
  }
  return years;
}

export function chartExploreDecadeLabel(decadeStart: number): string {
  return `${decadeStart}s`;
}
