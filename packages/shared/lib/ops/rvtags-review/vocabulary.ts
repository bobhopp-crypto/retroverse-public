/** Approved RV Tags vocabulary (VirtualDJ User2 / RV Tags). */

export type RvTagId =
  | "BritishInvasion"
  | "Motown"
  | "Soul"
  | "Psychedelic"
  | "GarageRock"
  | "SummerOfLove"
  | "SunshinePop"
  | "FolkRock"
  | "BaroquePop"
  | "CountryRock"
  | "BlueEyedSoul"
  | "TVTheme"
  | "TVFavorite"
  | "Novelty"
  | "OneHitWonder"
  | "DeepCut"
  | "SingAlong"
  | "CrowdFavorite"
  | "DanceFloor"
  | "PartyStarter"
  | "SlowDance";

export type RvTagDef = {
  id: RvTagId;
  hash: string;
  label: string;
  group: "editorial" | "energy";
};

export const RV_TAG_VOCABULARY: RvTagDef[] = [
  { id: "BritishInvasion", hash: "#BritishInvasion", label: "British Invasion", group: "editorial" },
  { id: "Motown", hash: "#Motown", label: "Motown", group: "editorial" },
  { id: "Soul", hash: "#Soul", label: "Soul", group: "editorial" },
  { id: "Psychedelic", hash: "#Psychedelic", label: "Psychedelic", group: "editorial" },
  { id: "GarageRock", hash: "#GarageRock", label: "Garage Rock", group: "editorial" },
  { id: "SummerOfLove", hash: "#SummerOfLove", label: "Summer of Love", group: "editorial" },
  { id: "SunshinePop", hash: "#SunshinePop", label: "Sunshine Pop", group: "editorial" },
  { id: "FolkRock", hash: "#FolkRock", label: "Folk Rock", group: "editorial" },
  { id: "BaroquePop", hash: "#BaroquePop", label: "Baroque Pop", group: "editorial" },
  { id: "CountryRock", hash: "#CountryRock", label: "Country Rock", group: "editorial" },
  { id: "BlueEyedSoul", hash: "#BlueEyedSoul", label: "Blue-Eyed Soul", group: "editorial" },
  { id: "Novelty", hash: "#Novelty", label: "Novelty", group: "editorial" },
  { id: "TVTheme", hash: "#TVTheme", label: "TV Theme", group: "editorial" },
  { id: "DeepCut", hash: "#DeepCut", label: "Deep Cut", group: "editorial" },
  { id: "OneHitWonder", hash: "#OneHitWonder", label: "One Hit Wonder", group: "editorial" },
  { id: "TVFavorite", hash: "#TVFavorite", label: "TV Favorite", group: "editorial" },
  { id: "SingAlong", hash: "#SingAlong", label: "Sing Along", group: "energy" },
  { id: "CrowdFavorite", hash: "#CrowdFavorite", label: "Crowd Favorite", group: "energy" },
  { id: "DanceFloor", hash: "#DanceFloor", label: "Dance Floor", group: "energy" },
  { id: "PartyStarter", hash: "#PartyStarter", label: "Party Starter", group: "energy" },
  { id: "SlowDance", hash: "#SlowDance", label: "Slow Dance", group: "energy" },
];

const HASH_TO_ID = new Map(RV_TAG_VOCABULARY.map((t) => [t.hash.toLowerCase(), t.id]));

export function normalizeRvTags(input: string[]): RvTagId[] {
  const out: RvTagId[] = [];
  for (const raw of input) {
    const token = raw.trim().startsWith("#") ? raw.trim() : `#${raw.trim()}`;
    const id = HASH_TO_ID.get(token.toLowerCase());
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Performance / DJ-set judgments — not Retroverse Tags on the review universe. */
export const REVIEW_UNIVERSE_PERFORMANCE_TAG_IDS: RvTagId[] = [
  "TVFavorite",
  "SingAlong",
  "CrowdFavorite",
  "DanceFloor",
  "PartyStarter",
  "SlowDance",
];

/** Approved historical/cultural Retroverse Tags for 1967 review universe. */
export const REVIEW_UNIVERSE_1967_TAG_IDS: RvTagId[] = [
  "BritishInvasion",
  "Motown",
  "Soul",
  "Psychedelic",
  "GarageRock",
  "SunshinePop",
  "SummerOfLove",
  "FolkRock",
  "BaroquePop",
  "CountryRock",
  "BlueEyedSoul",
  "Novelty",
  "TVTheme",
  "DeepCut",
  "OneHitWonder",
];

const REVIEW_UNIVERSE_1967_TAG_SET = new Set<RvTagId>(REVIEW_UNIVERSE_1967_TAG_IDS);

export function reviewUniverse1967TagDefs(): RvTagDef[] {
  return REVIEW_UNIVERSE_1967_TAG_IDS.map(
    (id) => RV_TAG_VOCABULARY.find((t) => t.id === id)!,
  );
}

/** Strip performance tags; keep approved historical tags only. */
export function filterReviewUniverseTags(tags: RvTagId[]): RvTagId[] {
  return tags.filter(
    (id) =>
      REVIEW_UNIVERSE_1967_TAG_SET.has(id) &&
      !REVIEW_UNIVERSE_PERFORMANCE_TAG_IDS.includes(id),
  );
}

/** Excluded from pilot AI pre-select until chart-history rules exist. */
export const AI_AUTO_SELECT_EXCLUDED: RvTagId[] = ["OneHitWonder"];

export function applyPilotAutoSelect(tags: RvTagId[]): RvTagId[] {
  return tags.filter((id) => !AI_AUTO_SELECT_EXCLUDED.includes(id));
}

export function parseRvTagString(value: string | null | undefined): RvTagId[] {
  if (!value?.trim()) return [];
  const tokens = value.trim().split(/\s+/).filter((t) => t.startsWith("#"));
  return normalizeRvTags(tokens);
}

export function formatRvTags(ids: RvTagId[]): string {
  const order = RV_TAG_VOCABULARY.map((t) => t.id);
  return ids
    .slice()
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((id) => RV_TAG_VOCABULARY.find((t) => t.id === id)!.hash)
    .join(" ");
}
