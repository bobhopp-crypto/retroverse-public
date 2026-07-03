import type { MetricTooltip } from "./types";

export const METRIC_TOOLTIPS: Record<string, MetricTooltip> = {
  patronValue: {
    label: "Patron Value",
    meaning: "Estimated audience appeal for this song (1–10).",
    whyItMatters: "Prioritizes Sunday Nights, Top 100, and overnight batches.",
    goodValue: "7+ for priority production; 9+ for headline experiences.",
  },
  confidence: {
    label: "Confidence",
    meaning: "Research completeness: Early, Developing, Good, or Strong.",
    whyItMatters: "Low confidence means Director may block render until gaps are filled.",
    goodValue: "Good or Strong before publishing.",
  },
  productionReady: {
    label: "Production Ready",
    meaning: "Song has passed readiness gates and can ship to patron surfaces.",
    whyItMatters: "This is your finished inventory count.",
    goodValue: "Rising count week over week.",
  },
  needsAttention: {
    label: "Needs Attention",
    meaning: "Songs blocked by review, missing items, or failed queue steps.",
    whyItMatters: "These block overnight runs and patron delivery.",
    goodValue: "Zero before leaving Studio unattended.",
  },
  renderReady: {
    label: "Render Ready",
    meaning: "Director render spec exists and passes readiness checks.",
    whyItMatters: "Required before any patron render pipeline.",
    goodValue: "Matches songs you intend to publish soon.",
  },
  collectorCoverage: {
    label: "Collector Coverage",
    meaning: "Percent of identified videos with a collector.json package.",
    whyItMatters: "Nothing downstream works without Collector.",
    goodValue: "90%+ for active library; 100% for priority cohorts.",
  },
  editorCoverage: {
    label: "Editor Coverage",
    meaning: "Percent of packages with a completed editor.json.",
    whyItMatters: "Editor produces the narrative patrons experience.",
    goodValue: "Track gap vs Collector — Editor should follow within days.",
  },
  directorCoverage: {
    label: "Director Coverage",
    meaning: "Percent of packages with director approval and render spec.",
    whyItMatters: "Director is the quality gate before publish.",
    goodValue: "High for Top 100; growing for full library.",
  },
  queueWaiting: {
    label: "Queue · Waiting",
    meaning: "Jobs queued but not yet executing.",
    whyItMatters: "Shows backlog depth overnight.",
    goodValue: "Drains to zero by morning after unattended runs.",
  },
  queueRunning: {
    label: "Queue · Running",
    meaning: "Jobs actively processing songs right now.",
    whyItMatters: "Confirms Studio is working while you watch or overnight.",
    goodValue: "1+ during batch runs; 0 when idle is fine.",
  },
  queueBlocked: {
    label: "Queue · Blocked",
    meaning: "Jobs waiting on missing prerequisites (AI offline, missing package, etc.).",
    whyItMatters: "Blocked jobs stall overnight batches.",
    goodValue: "Zero before unattended runs.",
  },
  queueFailed: {
    label: "Queue · Failed",
    meaning: "Jobs or songs that errored in the last 24 hours.",
    whyItMatters: "Failures need retry or manual fix.",
    goodValue: "Zero; investigate any failure same day.",
  },
  workerStatus: {
    label: "Worker Status",
    meaning: "Department workers: ready, working, or offline.",
    whyItMatters: "Offline workers block automated production.",
    goodValue: "All ready or working; none offline.",
  },
  storyStatus: {
    label: "Story Status",
    meaning: "Editorial narrative state for this RVTR.",
    whyItMatters: "Incomplete stories block Director approval.",
    goodValue: "Approved or ready for review before Director run.",
  },
  performanceCount: {
    label: "Performance Count",
    meaning: "Distinct performances Collector cataloged.",
    whyItMatters: "Multiple performances need Director to pick a recommended take.",
    goodValue: "1+ with a clear recommended performance for multi-take songs.",
  },
  assetCount: {
    label: "Asset Count",
    meaning: "Approved visual assets in the Editor package.",
    whyItMatters: "Missing assets appear on Director's missing-items list.",
    goodValue: "Covers minimum assets required by Director checklist.",
  },
  avgPatronValue: {
    label: "Avg Patron Value",
    meaning: "Mean patron value score across scored packages.",
    whyItMatters: "Library-wide quality indicator for programming decisions.",
    goodValue: "Stable or rising; investigate if dropping.",
  },
  avgConfidence: {
    label: "Avg Confidence",
    meaning: "Mean confidence score (1=Early, 4=Strong).",
    whyItMatters: "Shows research depth across the catalog.",
    goodValue: "3+ (Good) for production cohorts.",
  },
};

export function getMetricTooltip(id: string): MetricTooltip | undefined {
  return METRIC_TOOLTIPS[id];
}
