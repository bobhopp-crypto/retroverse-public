import type { ConceptStrategyId } from "./types";

export type InfluenceId =
  | "flintstones"
  | "jetsons"
  | "johnny-quest"
  | "rocky-bullwinkle"
  | "looney-tunes"
  | "classic-disney"
  | "tv-1960s"
  | "tv-credentials"
  | "festival-tickets"
  | "backstage-passes";

export type InfluenceDef = {
  id: InfluenceId;
  label: string;
  era: string;
  category: "animation" | "television" | "credential";
  description: string;
};

export const INFLUENCE_LIBRARY: InfluenceDef[] = [
  { id: "flintstones", label: "The Flintstones", era: "1960s", category: "animation", description: "Stone-age sitcom graphics, bold primaries, prehistoric playfulness." },
  { id: "jetsons", label: "The Jetsons", era: "1960s", category: "animation", description: "Space-age optimism, atomic curves, retro-futurist chrome." },
  { id: "johnny-quest", label: "Johnny Quest", era: "1960s", category: "animation", description: "Adventure serial energy, exotic locales, pulp illustration." },
  { id: "rocky-bullwinkle", label: "Rocky & Bullwinkle", era: "1960s", category: "animation", description: "Witty limited animation, flat color blocks, deadpan charm." },
  { id: "looney-tunes", label: "Looney Tunes", era: "1940s–60s", category: "animation", description: "Rubber-hose dynamism, slapstick motion lines, cel-bright inks." },
  { id: "classic-disney", label: "Classic Disney", era: "1950s–60s", category: "animation", description: "Storybook warmth, hand-inked charm, collectible appeal." },
  { id: "tv-1960s", label: "1960s Television", era: "1960s", category: "television", description: "Network-era graphics, variety-show typography, living-room broadcast." },
  { id: "tv-credentials", label: "TV Credentials", era: "1960s–80s", category: "credential", description: "Studio guest plates, ON AIR badges, production access laminates." },
  { id: "festival-tickets", label: "Festival Tickets", era: "1960s–70s", category: "credential", description: "Field passes, perforated stubs, multi-day wristband energy." },
  { id: "backstage-passes", label: "Backstage Passes", era: "1970s–90s", category: "credential", description: "All-access laminates, security color blocks, tour credential hierarchy." },
];

/** Preset → primary influence tags for concept mock panels. */
export const PRESET_INFLUENCE_MAP: Record<string, InfluenceId[]> = {
  "sunday-nights-classic": ["tv-credentials", "backstage-passes", "tv-1960s"],
  "collector-edition": ["classic-disney", "rocky-bullwinkle", "looney-tunes"],
  "live-aid": ["festival-tickets", "backstage-passes", "tv-1960s"],
  woodstock: ["festival-tickets", "tv-1960s", "looney-tunes"],
  "retro-tv-broadcast": ["tv-credentials", "tv-1960s", "looney-tunes"],
  "music-bingo": ["looney-tunes", "flintstones", "tv-1960s"],
};

/** Strategy → emphasis influences layered on preset tags. */
export const STRATEGY_INFLUENCE_MAP: Record<ConceptStrategyId, InfluenceId[]> = {
  "credential-focus": ["tv-credentials", "backstage-passes"],
  "collector-focus": ["classic-disney", "rocky-bullwinkle"],
  "broadcast-focus": ["tv-1960s", "tv-credentials"],
  "festival-focus": ["festival-tickets", "jetsons"],
};

export function influenceById(id: string): InfluenceDef | undefined {
  return INFLUENCE_LIBRARY.find((i) => i.id === id);
}

export function influencesForConcept(
  presetId: string | undefined,
  strategyId: string | undefined,
): InfluenceDef[] {
  const seen = new Set<InfluenceId>();
  const out: InfluenceDef[] = [];
  const add = (ids: InfluenceId[]) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      const def = influenceById(id);
      if (def) {
        seen.add(id);
        out.push(def);
      }
    }
  };
  if (presetId && PRESET_INFLUENCE_MAP[presetId]) add(PRESET_INFLUENCE_MAP[presetId]);
  if (strategyId && strategyId in STRATEGY_INFLUENCE_MAP) {
    add(STRATEGY_INFLUENCE_MAP[strategyId as ConceptStrategyId]);
  }
  return out.slice(0, 6);
}
