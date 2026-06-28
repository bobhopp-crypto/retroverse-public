"use client";

import type { ExperienceCriticReport } from "@/lib/ops/studio/publisher/experience/critic/types";
import { EXPERIENCE_CRITIC_AREA_LABELS } from "@/lib/ops/studio/publisher/experience/critic/types";

type Props = {
  report: ExperienceCriticReport;
};

function toneClass(tone: string): string {
  switch (tone) {
    case "praise":
      return "rs-exp-critic__obs--praise";
    case "concern":
      return "rs-exp-critic__obs--concern";
    default:
      return "rs-exp-critic__obs--note";
  }
}

export function ExperienceCriticPanel({ report }: Props) {
  const grouped = report.observations.reduce<
    Record<string, typeof report.observations>
  >((acc, obs) => {
    const list = acc[obs.area] ?? [];
    list.push(obs);
    acc[obs.area] = list;
    return acc;
  }, {});

  return (
    <section className="rs-studio-review-panel rs-studio-review-panel--attention rs-exp-critic">
      <header className="rs-exp-critic__head">
        <h2 className="rs-exp-critic__title">Experience Critic</h2>
        <p className="rs-exp-critic__meta">
          {report.exhibitCount} exhibits · curator walkthrough
        </p>
      </header>
      <p className="rs-exp-critic__lead">
        Internal review pass — observations only. Nothing here rewrites the package.
      </p>

      {report.exhibitSequence.length > 0 ? (
        <p className="rs-exp-critic__path">{report.exhibitSequence.join(" → ")}</p>
      ) : null}

      <div className="rs-exp-critic__groups">
        {Object.entries(grouped).map(([area, observations]) => (
          <div key={area} className="rs-exp-critic__group">
            <h3 className="rs-exp-critic__area">
              {EXPERIENCE_CRITIC_AREA_LABELS[area as keyof typeof EXPERIENCE_CRITIC_AREA_LABELS] ??
                area}
            </h3>
            <ul className="rs-exp-critic__list">
              {observations.map((obs) => (
                <li key={obs.id} className={`rs-exp-critic__obs ${toneClass(obs.tone)}`}>
                  {obs.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
