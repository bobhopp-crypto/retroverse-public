import type { ChartJourneyModel } from "@/lib/chart-journey/types";

type Props = {
  model: ChartJourneyModel;
  className?: string;
};

export function ChartJourneySummary({ model, className }: Props) {
  const { metrics } = model;
  const facts = [
    metrics.weeksOnChart > 0
      ? { label: "Weeks on Chart", value: String(metrics.weeksOnChart) }
      : null,
    metrics.peakPosition
      ? { label: "Peak Position", value: `#${metrics.peakPosition}` }
      : null,
    metrics.biggestWeeklyClimb && metrics.biggestWeeklyClimb > 0
      ? { label: "Biggest Climb", value: `+${metrics.biggestWeeklyClimb}` }
      : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  if (facts.length === 0) return null;

  const panelClass = ["rv-exp-cj__summary", className].filter(Boolean).join(" ");

  return (
    <dl className={panelClass} aria-label="Chart journey summary">
      {facts.map((fact) => (
        <div key={fact.label} className="rv-exp-cj__summary-item">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
