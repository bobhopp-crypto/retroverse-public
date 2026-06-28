"use client";

import { ExperienceImage } from "@/components/retroverse/renderer/ExperienceImage";
import type { ChartJourneyPresentationProps } from "@/lib/chart-journey/chart-journey-presentation";

import { ChartJourney } from "./ChartJourney";

import "./chart-journey-installation.css";

type Props = ChartJourneyPresentationProps & {
  backgroundImageUrl?: string | null;
  museumV3?: boolean;
  className?: string;
};

/** Museum exhibit shell — cinematic frame around the canonical Chart Journey. */
export function ChartJourneyInstallation({
  backgroundImageUrl,
  museumV3 = false,
  className,
  ...chartProps
}: Props) {
  const rootClass = [
    "rv-chart-installation",
    museumV3 ? "rv-chart-installation--v3" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      {backgroundImageUrl ? (
        <ExperienceImage
          src={backgroundImageUrl}
          alt=""
          className="rv-chart-installation__bg"
          priority
        />
      ) : null}
      <div className="rv-chart-installation__overlay" aria-hidden />
      <div className="rv-chart-installation__panel">
        <ChartJourney {...chartProps} variant="exhibit" className="rv-chart-installation__chart" />
      </div>
    </div>
  );
}
