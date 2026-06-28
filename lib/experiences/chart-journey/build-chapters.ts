import {
  buildChartJourneyOpening,
  detectChartArchetype,
} from "@/lib/chart-journey/chart-archetype";
import type { ChartJourneyModel } from "@/lib/chart-journey/types";
import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { TrackPageData } from "@/lib/track/load-track-page";

import { extractAwardsHints, extractInternationalHints, extractLegacyHints } from "./enrichment";
import type {
  ChartJourneyChapter,
  ChartJourneyChapterId,
  ChartJourneyVisualLanguage,
} from "./types";

export const CHART_JOURNEY_VISUAL_LANGUAGE: ChartJourneyVisualLanguage = {
  palette: ["#1a7a7a", "#e85d04", "#f7f2e8", "#1a1a1a", "#ffd166", "#8b0000"],
  typography: {
    display: "Cooper Black / chart headline",
    stat: "tabular bold sans — ESPN stat wall",
    body: "Georgia editorial — Ken Burns documentary",
  },
  texture: "Newsprint grain · Billboard ink · vinyl gloss · museum panel matte",
  signature: "The Retroverse Chart Journey — animated climb, peak celebration, living timeline",
};

function weeksToPeak(run: ChartJourneyModel["runs"][number]): number {
  const peakIndex = run.weeks.findIndex((week) => week.rank === run.peakRank);
  return peakIndex >= 0 ? peakIndex + 1 : run.weekCount;
}

function findRiseHighlight(model: ChartJourneyModel): {
  biggestClimb: number | null;
  climbWeeks: number;
  fromRank: number;
  toRank: number;
  highlightWeekIndex: number;
} {
  const primary = model.runs[0];
  if (!primary) {
    return { biggestClimb: null, climbWeeks: 0, fromRank: 100, toRank: 100, highlightWeekIndex: 0 };
  }

  let bestIndex = 0;
  let bestDelta = 0;
  for (let i = 1; i < model.rows.length; i++) {
    const delta = model.rows[i]!.week.delta ?? 0;
    if (delta > bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }

  const highlight = model.rows[bestIndex];
  const previous = bestIndex > 0 ? model.rows[bestIndex - 1] : null;

  return {
    biggestClimb: model.metrics.biggestWeeklyClimb,
    climbWeeks: weeksToPeak(primary),
    fromRank: previous?.week.rank ?? primary.weeks[0]?.rank ?? 100,
    toRank: highlight?.week.rank ?? primary.peakRank,
    highlightWeekIndex: bestIndex,
  };
}

function peakWeekData(model: ChartJourneyModel): { peakDate: string; weeksAtPeak: number } {
  const peak = model.metrics.peakPosition;
  if (peak == null) return { peakDate: model.metrics.firstChartDate ?? "", weeksAtPeak: 0 };

  const peakRows = model.rows.filter((row) => row.week.rank === peak);
  return {
    peakDate: peakRows[0]?.week.issueDate ?? model.metrics.firstChartDate ?? "",
    weeksAtPeak: peakRows.length,
  };
}

function chapterOrder(): ChartJourneyChapterId[] {
  return [
    "opening",
    "release",
    "entered_charts",
    "rapid_rise",
    "top_40",
    "top_10",
    "peak_week",
    "competition",
    "longevity",
    "international",
    "awards",
    "legacy",
  ];
}

function firstWeekAtOrBelow(model: ChartJourneyModel, threshold: number): number | null {
  const index = model.rows.findIndex((row) => row.week.rank <= threshold);
  return index >= 0 ? index : null;
}

export function buildChartJourneyChapters(input: {
  model: ChartJourneyModel;
  track: TrackPageData;
  collector: CollectorPackage | null;
}): { chapters: ChartJourneyChapter[]; skipped: ChartJourneyChapter[] } {
  const { model, track, collector } = input;
  const archetype = detectChartArchetype(model);
  const openingLine = buildChartJourneyOpening(model);
  const primary = model.runs[0];
  const rise = findRiseHighlight(model);
  const peak = peakWeekData(model);
  const intl = extractInternationalHints(collector);
  const awards = extractAwardsHints(collector);
  const legacy = extractLegacyHints(collector, model.metrics.weeksOnChart);

  const albumTitle = collector?.identity?.albumTitle ?? track.albums[0]?.title ?? null;
  const label = null;

  const defs: ChartJourneyChapter[] = [
    {
      id: "opening",
      title: "Opening",
      subtitle: "Meet the hit before the climb",
      visualConcept: "Album artwork · release date · label · artist portrait · large title · animated vinyl",
      motionConcept: "vinyl_spin",
      narrativeHook: openingLine,
      included: true,
      payload: {
        coverUrl: track.coverUrl,
        title: track.title,
        artist: track.artistName,
        releaseYear: track.releaseYear,
        label,
        archetype,
        openingLine,
      },
    },
    {
      id: "release",
      title: "Release",
      subtitle: "Where the story begins",
      visualConcept: "Record sleeve reveal · release date lockup · label stamp",
      motionConcept: "magazine_reveal",
      narrativeHook: albumTitle
        ? `Released on ${albumTitle}${track.releaseYear ? ` (${track.releaseYear})` : ""}.`
        : "The record entered the world — then waited for its moment.",
      included: Boolean(track.releaseYear || albumTitle || track.firstChartDate),
      skipReason: "No release year or album context",
      payload: {
        releaseDate: track.firstChartDate,
        releaseYear: track.releaseYear,
        albumTitle,
        label,
      },
    },
    {
      id: "entered_charts",
      title: "Entered Charts",
      subtitle: "First footprint on the Hot 100",
      visualConcept: "Debut week spotlight · chart door opening · first rank typography",
      motionConcept: "fade_up",
      narrativeHook: primary
        ? `First appeared ${primary.startDate.slice(0, 10)} at #${primary.weeks[0]?.rank ?? "?"}.`
        : "The song stepped onto the chart.",
      included: model.rows.length > 0,
      skipReason: "No chart trajectory data",
      payload: {
        debutRank: primary?.weeks[0]?.rank ?? model.rows[0]!.week.rank,
        debutDate: primary?.startDate ?? model.metrics.firstChartDate ?? "",
        chartLabel: model.chartLabel,
      },
    },
    {
      id: "rapid_rise",
      title: "Rapid Rise",
      subtitle: "The climb that turned heads",
      visualConcept: "Animated line climbing week by week · expandable points · movement badges",
      motionConcept: "line_draw",
      narrativeHook:
        rise.biggestClimb != null && rise.biggestClimb >= 5
          ? `Jumped ${rise.biggestClimb} positions in a single week on the way up.`
          : "Week after week — a patient or explosive climb toward the summit.",
      included:
        (rise.biggestClimb != null && rise.biggestClimb >= 5) ||
        rise.climbWeeks <= 8 ||
        ["rocket", "instant_smash", "steady_climber"].includes(archetype),
      skipReason: "No significant climb narrative detected",
      payload: rise,
    },
    {
      id: "top_40",
      title: "Top 40",
      subtitle: "Crossed into mainstream territory",
      visualConcept: "Threshold line · rank badge · momentum pulse",
      motionConcept: "fade_up",
      narrativeHook: (() => {
        const idx = firstWeekAtOrBelow(model, 40);
        const rank = idx != null ? model.rows[idx]!.week.rank : null;
        return rank != null ? `Broke into the Top 40 at #${rank}.` : "Entered mainstream chart territory.";
      })(),
      included: firstWeekAtOrBelow(model, 40) != null,
      skipReason: "Never reached Top 40",
      payload: {
        debutRank: model.rows[firstWeekAtOrBelow(model, 40) ?? 0]?.week.rank ?? 40,
        debutDate: model.rows[firstWeekAtOrBelow(model, 40) ?? 0]?.week.issueDate ?? "",
        chartLabel: model.chartLabel,
      },
    },
    {
      id: "top_10",
      title: "Top 10",
      subtitle: "Elite chart company",
      visualConcept: "Top 10 spotlight · bold rank typography · heat band shift",
      motionConcept: "milestone_pulse",
      narrativeHook: (() => {
        const idx = firstWeekAtOrBelow(model, 10);
        const rank = idx != null ? model.rows[idx]!.week.rank : null;
        return rank != null ? `Reached the Top 10 at #${rank}.` : "Joined the elite Top 10.";
      })(),
      included: firstWeekAtOrBelow(model, 10) != null,
      skipReason: "Never reached Top 10",
      payload: {
        debutRank: model.rows[firstWeekAtOrBelow(model, 10) ?? 0]?.week.rank ?? 10,
        debutDate: model.rows[firstWeekAtOrBelow(model, 10) ?? 0]?.week.issueDate ?? "",
        chartLabel: model.chartLabel,
      },
    },
    {
      id: "peak_week",
      title: "Peak Week",
      subtitle: "The moment it mattered most",
      visualConcept: "Large typography · confetti · magazine cover · Billboard front page energy",
      motionConcept: "confetti_pulse",
      narrativeHook:
        model.metrics.peakPosition != null
          ? `Peaked at #${model.metrics.peakPosition}${peak.peakDate ? ` on ${peak.peakDate.slice(0, 10)}` : ""}.`
          : "The summit week — celebrate it.",
      included: model.metrics.peakPosition != null,
      skipReason: "Peak position unknown",
      payload: {
        peakRank: model.metrics.peakPosition ?? 0,
        peakDate: peak.peakDate,
        weeksAtPeak: peak.weeksAtPeak,
        celebrationCopy:
          model.metrics.peakPosition === 1
            ? "Number one. The chart belonged to this song."
            : `#${model.metrics.peakPosition} — as high as the world would let it climb.`,
      },
    },
    {
      id: "competition",
      title: "Competition",
      subtitle: "Who blocked #1?",
      visualConcept: "Top 10 covers · movement arrows · rival artists",
      motionConcept: "cover_slide",
      narrativeHook: "The chart is a battlefield — see who stood in the way.",
      included: false,
      skipReason: "Chart-week competition data not yet wired (future: ChartWeekContextHooks)",
      payload: {
        placeholder: true,
        note: "Requires numberOne / neighbors / movers from chart date graph.",
      },
    },
    {
      id: "longevity",
      title: "Weeks on Chart",
      subtitle: "How long it stayed in the conversation",
      visualConcept: "Animated calendar · re-entry gaps · holiday return markers",
      motionConcept: "calendar_flip",
      narrativeHook:
        model.metrics.reEntryCount > 0
          ? `${model.metrics.weeksOnChart} total weeks — with ${model.metrics.reEntryCount} return${model.metrics.reEntryCount > 1 ? "s" : ""} after falling off.`
          : `${model.metrics.weeksOnChart} weeks on the chart — outlasting most of its peers.`,
      included: model.metrics.weeksOnChart >= 8 || model.metrics.reEntryCount > 0,
      skipReason: "Chart run too short for longevity chapter",
      payload: {
        weeksOnChart: model.metrics.weeksOnChart,
        reEntryCount: model.metrics.reEntryCount,
        returnedAfterWeeks: model.metrics.returnedAfterFalloffWeeks,
        lastChartDate: model.metrics.lastChartDate,
      },
    },
    {
      id: "international",
      title: "International Journey",
      subtitle: "The world discovered it",
      visualConcept: "World map · countries illuminate · tier colors (Top 40 / Top 10 / #1)",
      motionConcept: "map_illuminate",
      narrativeHook: intl?.summary ?? "Beyond the home market.",
      included: Boolean(intl && intl.regions.length >= 2),
      skipReason: "No international chart hints in package",
      payload: intl ?? { regions: [], summary: "" },
    },
    {
      id: "awards",
      title: "Gold / Platinum",
      subtitle: "Milestones earned",
      visualConcept: "Certification plaques · Grammy · RIAA · Hall of Fame badges",
      motionConcept: "milestone_pulse",
      narrativeHook: awards
        ? awards.milestones.map((m) => m.label).join(" · ")
        : "Industry recognition along the journey.",
      included: Boolean(awards && awards.milestones.length > 0),
      skipReason: "No certification or award hints found",
      payload: awards ?? { milestones: [] },
    },
    {
      id: "legacy",
      title: "Legacy",
      subtitle: "Still alive today",
      visualConcept: "Film · TV · covers · streaming · Artist Universe connections",
      motionConcept: "timeline_scroll",
      narrativeHook: legacy?.headline ?? "The song kept living beyond its chart run.",
      included: Boolean(legacy),
      skipReason: "No legacy / cultural threads detected",
      payload: legacy ?? { headline: "", threads: [] },
    },
  ];

  const order = chapterOrder();
  const sorted = order.map((id) => defs.find((d) => d.id === id)!).filter(Boolean);

  return {
    chapters: sorted.filter((c) => c.included),
    skipped: sorted.filter((c) => !c.included),
  };
}
