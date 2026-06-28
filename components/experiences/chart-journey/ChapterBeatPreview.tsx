"use client";

import { CHART_ARCHETYPE_LABELS } from "@/lib/chart-journey/chart-archetype";
import type {
  ChartJourneyChapter,
  ChartJourneyExperience,
  ChartJourneyOpeningPayload,
  ChartJourneyPeakPayload,
  ChartJourneyRisePayload,
} from "@/lib/experiences/chart-journey/types";

import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { ChartJourneyLineViz } from "./ChartJourneyLineViz";

type Props = {
  chapter: ChartJourneyChapter;
  experience: ChartJourneyExperience;
};

function payload<T>(chapter: ChartJourneyChapter): T | null {
  return (chapter.payload as T | undefined) ?? null;
}

export function ChapterBeatPreview({ chapter, experience }: Props) {
  const { model, track } = experience;

  switch (chapter.id) {
    case "opening": {
      const p = payload<ChartJourneyOpeningPayload>(chapter);
      return (
        <div className="cj-beat cj-beat--opening">
          <div className="cj-beat__vinyl" aria-hidden />
          {p?.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.coverUrl} alt="" className="cj-beat__cover" />
          ) : (
            <div className="cj-beat__cover cj-beat__cover--placeholder" />
          )}
          <div className="cj-beat__copy">
            <p className="cj-beat__eyebrow">{CHART_ARCHETYPE_LABELS[p?.archetype ?? "steady_climber"]}</p>
            <h2 className="cj-beat__title">{p?.title}</h2>
            <p className="cj-beat__artist">{p?.artist}</p>
            <p className="cj-beat__hook">{p?.openingLine}</p>
          </div>
        </div>
      );
    }
    case "release":
      return (
        <div className="cj-beat cj-beat--release">
          <p className="cj-beat__eyebrow">Release</p>
          <h2 className="cj-beat__title">{payload<{ albumTitle: string | null }>(chapter)?.albumTitle ?? "Single release"}</h2>
          <p className="cj-beat__stat">{track.releaseYear ?? "—"}</p>
          <p className="cj-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "entered_charts":
      return (
        <div className="cj-beat cj-beat--entered">
          <p className="cj-beat__eyebrow">Entered Charts</p>
          <p className="cj-beat__mega">#{payload<{ debutRank: number }>(chapter)?.debutRank}</p>
          <p className="cj-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "rapid_rise": {
      const p = payload<ChartJourneyRisePayload>(chapter);
      return (
        <div className="cj-beat cj-beat--rise">
          <p className="cj-beat__eyebrow">Rapid Rise</p>
          <ChartJourneyLineViz model={model} highlightIndex={p?.highlightWeekIndex} />
          {p?.biggestClimb != null ? (
            <p className="cj-beat__stat">+{p.biggestClimb} positions in one week</p>
          ) : null}
          <p className="cj-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    }
    case "top_40":
    case "top_10":
      return (
        <div className={`cj-beat cj-beat--${chapter.id.replace("_", "-")}`}>
          <p className="cj-beat__eyebrow">{chapter.title}</p>
          <p className="cj-beat__mega">#{payload<{ debutRank: number }>(chapter)?.debutRank}</p>
          <p className="cj-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "peak_week": {
      const p = payload<ChartJourneyPeakPayload>(chapter);
      return (
        <div className="cj-beat cj-beat--peak">
          <p className="cj-beat__eyebrow">Peak Week</p>
          <p className="cj-beat__mega cj-beat__mega--peak">#{p?.peakRank}</p>
          <p className="cj-beat__celebration">{p?.celebrationCopy}</p>
          <div className="cj-beat__confetti" aria-hidden />
        </div>
      );
    }
    case "competition":
      return (
        <div className="cj-beat cj-beat--placeholder">
          <p className="cj-beat__eyebrow">Competition</p>
          <p className="cj-beat__hook">Top 10 battlefield — awaiting chart-week graph data.</p>
          <p className="cj-beat__note">{chapter.skipReason}</p>
        </div>
      );
    case "longevity":
      return (
        <div className="cj-beat cj-beat--longevity">
          <p className="cj-beat__eyebrow">Weeks on Chart</p>
          <p className="cj-beat__mega">{model.metrics.weeksOnChart}</p>
          <p className="cj-beat__stat">weeks total</p>
          {model.gaps.map((gap) => (
            <p key={gap.returnDate} className="cj-beat__gap">
              Returned after {gap.weeksAbsent} weeks
            </p>
          ))}
          <p className="cj-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "international": {
      const p = payload<{ regions: Array<{ code: string; label: string; tier: string }>; summary: string }>(chapter);
      return (
        <div className="cj-beat cj-beat--international">
          <p className="cj-beat__eyebrow">International Journey</p>
          <ul className="cj-beat__map">
            {(p?.regions ?? []).map((r) => (
              <li key={r.code} className={`cj-beat__region cj-beat__region--${r.tier}`}>
                <span>{r.label}</span>
                <span>{r.tier.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
          <p className="cj-beat__hook">{p?.summary}</p>
        </div>
      );
    }
    case "awards": {
      const p = payload<{ milestones: Array<{ label: string; kind: string }> }>(chapter);
      return (
        <div className="cj-beat cj-beat--awards">
          <p className="cj-beat__eyebrow">Awards &amp; Certifications</p>
          <ul className="cj-beat__milestones">
            {(p?.milestones ?? []).map((m) => (
              <li key={m.label} className={`cj-beat__milestone cj-beat__milestone--${m.kind}`}>
                {m.label}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "legacy": {
      const p = payload<{ headline: string; threads: string[] }>(chapter);
      return (
        <div className="cj-beat cj-beat--legacy">
          <p className="cj-beat__eyebrow">Legacy</p>
          <h2 className="cj-beat__title">{p?.headline}</h2>
          <ul className="cj-beat__threads">
            {(p?.threads ?? []).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      );
    }
    default:
      return (
        <div className="cj-beat">
          <ChartJourney
            weeks={model.rows.map((r) => r.week)}
            peak={model.metrics.peakPosition}
            chartLabel={model.chartLabel}
            focusTrackId={track.rvtr}
            releaseYear={track.releaseYear}
            variant="rv2"
          />
        </div>
      );
  }
}
