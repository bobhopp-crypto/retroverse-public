import type { SmartRecommendation, SmartRecommendationId } from "./types";

export const SMART_RECOMMENDATIONS: Record<SmartRecommendationId, SmartRecommendation> = {
  "needs-collector": {
    id: "needs-collector",
    headline: "Needs Collector",
    action: "Queue Run Collector from the batch bar or open this RVTR in Collector.",
    actionHref: "/ops/studio/collector",
    actionLabel: "Open Collector",
  },
  "needs-editor": {
    id: "needs-editor",
    headline: "Needs Editor",
    action: "Collector is complete — queue Run Editor or open the Editor office for this RVTR.",
    actionHref: "/ops/studio/editor",
    actionLabel: "Open Editor",
  },
  "needs-director": {
    id: "needs-director",
    headline: "Needs Director",
    action: "Editor handoff ready — queue Run Director or review in the Director office.",
    actionHref: "/ops/studio/director",
    actionLabel: "Open Director",
  },
  "needs-story-review": {
    id: "needs-story-review",
    headline: "Needs Story Review",
    action: "Open the research package and approve or edit story content before Director.",
    actionLabel: "Review package",
  },
  "missing-performance": {
    id: "missing-performance",
    headline: "Missing Performance",
    action: "Re-run Collector to catalog performances, then pick a recommended take in Director.",
    actionLabel: "Queue Collector",
  },
  "low-patron-value": {
    id: "low-patron-value",
    headline: "Low Patron Value",
    action: "Consider deprioritizing unless chart/significance warrants — focus on 7+ first.",
  },
  "ready-for-publisher": {
    id: "ready-for-publisher",
    headline: "Ready for Publisher",
    action: "Package is publish-ready — Publisher department will ship when available (Phase 2+).",
  },
  "ready-to-render": {
    id: "ready-to-render",
    headline: "Ready to Render",
    action: "Director render spec is approved — hold for Renderer when that pipeline opens.",
  },
  "needs-identity": {
    id: "needs-identity",
    headline: "Needs Identity",
    action: "Assign RVTR in Classic Browser+ match workflow before Studio production.",
    actionHref: "/ops/browser-plus",
    actionLabel: "Open Browser+",
  },
  "needs-research": {
    id: "needs-research",
    headline: "Needs Research",
    action: "Queue research build or Run Collector to create the intelligence package.",
    actionLabel: "Build research",
  },
};

export function getSmartRecommendation(id: SmartRecommendationId): SmartRecommendation {
  return SMART_RECOMMENDATIONS[id];
}

/** Map BP2 next-action strings to recommendation ids. */
export function recommendationFromNextAction(
  nextAction: string,
  studio?: { needsCollector?: boolean; needsEditor?: boolean; needsDirector?: boolean; readyToPublish?: boolean },
): SmartRecommendation | null {
  switch (nextAction) {
    case "Assign RVTR":
      return SMART_RECOMMENDATIONS["needs-identity"];
    case "Build Research":
      return SMART_RECOMMENDATIONS["needs-research"];
    case "Review Package":
    case "Fix Renderability":
      return SMART_RECOMMENDATIONS["needs-story-review"];
    case "Acquire Cover":
      return null;
    case "Experience Ready":
      return studio?.readyToPublish
        ? SMART_RECOMMENDATIONS["ready-for-publisher"]
        : SMART_RECOMMENDATIONS["ready-to-render"];
    default:
      break;
  }
  if (studio?.needsCollector) return SMART_RECOMMENDATIONS["needs-collector"];
  if (studio?.needsEditor) return SMART_RECOMMENDATIONS["needs-editor"];
  if (studio?.needsDirector) return SMART_RECOMMENDATIONS["needs-director"];
  return null;
}

export function recommendationFromStudioFlags(studio: {
  needsCollector: boolean;
  needsEditor: boolean;
  needsDirector: boolean;
  readyToPublish: boolean;
  patronValue: number | null;
  performanceCount: number;
  confidenceLabel: string;
}): SmartRecommendation | null {
  if (studio.needsCollector) return SMART_RECOMMENDATIONS["needs-collector"];
  if (studio.needsEditor) return SMART_RECOMMENDATIONS["needs-editor"];
  if (studio.needsDirector) return SMART_RECOMMENDATIONS["needs-director"];
  if (studio.readyToPublish) return SMART_RECOMMENDATIONS["ready-for-publisher"];
  if (studio.patronValue !== null && studio.patronValue < 7) {
    return SMART_RECOMMENDATIONS["low-patron-value"];
  }
  if (studio.performanceCount === 0 && !studio.needsCollector) {
    return SMART_RECOMMENDATIONS["missing-performance"];
  }
  if (studio.confidenceLabel === "Early" || studio.confidenceLabel === "Developing") {
    return SMART_RECOMMENDATIONS["needs-story-review"];
  }
  return null;
}
