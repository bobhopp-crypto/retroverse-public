import type { ExperienceTimelineEvent } from "@/lib/chart-journey/derive-timeline-events";

type Props = {
  dateLabel: string;
  label: string;
  kind: ExperienceTimelineEvent["kind"];
};

export function TimelineEvent({ dateLabel, label, kind }: Props) {
  return (
    <li className={`rv-exp-timeline__item rv-exp-timeline__item--${kind}`}>
      <span className="rv-exp-timeline__date">{dateLabel}</span>
      <span className="rv-exp-timeline__dot" aria-hidden />
      <span className="rv-exp-timeline__label">{label}</span>
    </li>
  );
}
