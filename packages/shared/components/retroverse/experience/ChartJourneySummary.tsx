import type { ChartJourneyModel } from "@/lib/chart-journey/types";

import { buildChartJourneyStory } from "@/lib/chart-journey/chart-journey-story";

type Props = {
  model: ChartJourneyModel;
  summary?: string | null;
  className?: string;
};

export function ChartJourneySummary({ model, summary, className }: Props) {
  const story = summary ?? buildChartJourneyStory(model);
  if (!story) return null;

  const panelClass = ["rv-exp-cj__story", className].filter(Boolean).join(" ");

  return (
    <div className="rv-exp-cj__story-wrap">
      <p className={panelClass} aria-label="Chart journey summary">
        {story}
      </p>
    </div>
  );
}
