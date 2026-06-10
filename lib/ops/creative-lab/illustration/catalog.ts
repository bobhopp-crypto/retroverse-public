import type { ArtDirectionId } from "../art-directions";
import { CARTOON_ASSETS } from "./cartoon";
import { COLLECTOR_ASSETS } from "./collector";
import { PSYCHEDELIC_ASSETS } from "./psychedelic";
import { TELEVISION_ASSETS } from "./television";
import type { IllustrationAsset, IllustrationLayer } from "./types";

export const ILLUSTRATION_CATALOG: IllustrationAsset[] = [
  ...PSYCHEDELIC_ASSETS,
  ...CARTOON_ASSETS,
  ...TELEVISION_ASSETS,
  ...COLLECTOR_ASSETS,
];

export const ILLUSTRATION_BY_CATEGORY: Record<ArtDirectionId, IllustrationAsset[]> = {
  "psychedelic-festival": PSYCHEDELIC_ASSETS,
  "saturday-morning-cartoon": CARTOON_ASSETS,
  "vintage-television": TELEVISION_ASSETS,
  "collector-memorabilia": COLLECTOR_ASSETS,
};

export function assetsForCategory(id: ArtDirectionId): IllustrationAsset[] {
  return ILLUSTRATION_BY_CATEGORY[id] ?? [];
}

export function assetsByLayer(id: ArtDirectionId, layer: IllustrationLayer): IllustrationAsset[] {
  return assetsForCategory(id).filter((a) => a.layer === layer);
}

export function catalogStats(): Record<ArtDirectionId, number> & { total: number } {
  const counts = {
    "psychedelic-festival": PSYCHEDELIC_ASSETS.length,
    "saturday-morning-cartoon": CARTOON_ASSETS.length,
    "vintage-television": TELEVISION_ASSETS.length,
    "collector-memorabilia": COLLECTOR_ASSETS.length,
    total: ILLUSTRATION_CATALOG.length,
  };
  return counts;
}
