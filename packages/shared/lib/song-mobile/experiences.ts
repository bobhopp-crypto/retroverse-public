import { QUEEN_RADIO_GA_GA } from "./queen-radio-ga-ga";
import type { MobileSongExperience } from "./types";

/**
 * Registry of hardcoded Mobile Experiences, keyed by RVTR.
 *
 * No generator, no CMS. To add a future song: write a new data file
 * like `queen-radio-ga-ga.ts` and add one line here.
 */
const REGISTRY: Record<string, MobileSongExperience> = {
  [QUEEN_RADIO_GA_GA.rvtr]: QUEEN_RADIO_GA_GA,
};

export function getMobileSongExperience(rvtrRaw: string): MobileSongExperience | null {
  const rvtr = rvtrRaw.trim().toUpperCase();
  return REGISTRY[rvtr] ?? null;
}
