import type { PassMockLayoutId } from "./pass-mockup";
import type { ConceptStrategyId } from "./types";

export type RefinementTreatment = {
  layoutId: PassMockLayoutId;
  label: string;
};

/** Eight layout treatments per winning strategy — Round 2 refinement only. */
export const REFINEMENT_TREATMENTS: Record<ConceptStrategyId, RefinementTreatment[]> = {
  "broadcast-focus": [
    { layoutId: "broadcast-badge", label: "Broadcast badge layout" },
    { layoutId: "horizontal-credential", label: "Horizontal credential" },
    { layoutId: "foil-band", label: "Foil band header" },
    { layoutId: "vertical-credential", label: "Vertical guest pass" },
    { layoutId: "laminate-zones", label: "TV credential styling" },
    { layoutId: "large-year", label: "Large year block" },
    { layoutId: "numbered-edition", label: "Oversized numbering" },
    { layoutId: "ticket-stub", label: "Production ticket stub" },
  ],
  "credential-focus": [
    { layoutId: "laminate-zones", label: "Backstage emphasis" },
    { layoutId: "horizontal-credential", label: "Horizontal laminate" },
    { layoutId: "vertical-credential", label: "Vertical laminate" },
    { layoutId: "foil-band", label: "Foil band" },
    { layoutId: "large-year", label: "Large year block" },
    { layoutId: "numbered-edition", label: "Oversized numbering" },
    { layoutId: "broadcast-badge", label: "TV credential styling" },
    { layoutId: "numbered-edition", label: "Collectible emphasis" },
  ],
  "festival-focus": [
    { layoutId: "ticket-stub", label: "Ticket stub layout" },
    { layoutId: "large-year", label: "Large year marquee" },
    { layoutId: "horizontal-credential", label: "Horizontal field pass" },
    { layoutId: "foil-band", label: "Foil band festival" },
    { layoutId: "laminate-zones", label: "Multi-day zones" },
    { layoutId: "vertical-credential", label: "Vertical wristband" },
    { layoutId: "numbered-edition", label: "Oversized numbering" },
    { layoutId: "broadcast-badge", label: "Broadcast festival badge" },
  ],
  "collector-focus": [
    { layoutId: "numbered-edition", label: "Numbered edition" },
    { layoutId: "foil-band", label: "Foil band keepsake" },
    { layoutId: "large-year", label: "Large year block" },
    { layoutId: "vertical-credential", label: "Vertical collectible" },
    { layoutId: "horizontal-credential", label: "Horizontal archive card" },
    { layoutId: "laminate-zones", label: "Collectible emphasis" },
    { layoutId: "broadcast-badge", label: "TV credential styling" },
    { layoutId: "ticket-stub", label: "Commemorative stub" },
  ],
};

export function treatmentsForStrategy(strategyId: ConceptStrategyId): RefinementTreatment[] {
  return REFINEMENT_TREATMENTS[strategyId] ?? REFINEMENT_TREATMENTS["credential-focus"];
}
