import type { RvTagId } from "./vocabulary";
import { RV_TAG_VOCABULARY } from "./vocabulary";

export type FixedTagSlot =
  | { kind: "tag"; id: RvTagId }
  | { kind: "more" };

/** Fixed 4×2 style grid — positions never change. */
export const STYLE_FIXED_SLOTS: FixedTagSlot[] = [
  { kind: "tag", id: "BritishInvasion" },
  { kind: "tag", id: "Soul" },
  { kind: "tag", id: "Motown" },
  { kind: "tag", id: "Psychedelic" },
  { kind: "tag", id: "GarageRock" },
  { kind: "tag", id: "SummerOfLove" },
  { kind: "tag", id: "TVFavorite" },
  { kind: "more" },
];

export const STYLE_MORE_TAG_IDS: RvTagId[] = [
  "Novelty",
  "OneHitWonder",
  "DeepCut",
];

/** Fixed 3×2 crowd grid — positions never change. */
export const CROWD_FIXED_SLOTS: FixedTagSlot[] = [
  { kind: "tag", id: "SingAlong" },
  { kind: "tag", id: "CrowdFavorite" },
  { kind: "tag", id: "DanceFloor" },
  { kind: "tag", id: "PartyStarter" },
  { kind: "tag", id: "SlowDance" },
  { kind: "more" },
];

export const CROWD_MORE_TAG_IDS: RvTagId[] = [];

export function rvTagLabel(id: RvTagId): string {
  return RV_TAG_VOCABULARY.find((t) => t.id === id)?.label ?? id;
}

export function moreTagsActive(
  draft: RvTagId[],
  moreIds: RvTagId[],
): boolean {
  return moreIds.some((id) => draft.includes(id));
}
