import type { RawImportImage } from "./types";

/** First run of digits anywhere in the filename — Gamma-style exports are
 * typically "1.png", "Slide 12.png", "12-queen-radio-gaga.png", etc. */
function leadingNumber(filename: string): number | null {
  const match = filename.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

/** Sort images numerically by filename; ties/unnumbered files fall back to
 * plain alphabetical order so the result is always deterministic. */
export function sortByNumericFilename(images: RawImportImage[]): RawImportImage[] {
  return [...images].sort((a, b) => {
    const na = leadingNumber(a.filename);
    const nb = leadingNumber(b.filename);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    if (na !== null && nb === null) return -1;
    if (na === null && nb !== null) return 1;
    return a.filename.localeCompare(b.filename);
  });
}
