"use client";

import { ExperienceImage } from "../ExperienceImage";
import type { SceneTemplateProps } from "../scene-types";

export function TimelineScene({ scene, metadata }: SceneTemplateProps) {
  const imageUrl = scene.assets.imageUrls[0] ?? null;
  const events = scene.assets.timelineEvents.filter((e) => e.label);

  return (
    <article className="rv-exp-scene rv-exp-scene--timeline">
      {imageUrl ? (
        <div className="rv-exp-scene__media rv-exp-scene__media--compact">
          <ExperienceImage src={imageUrl} alt={scene.headline} className="rv-exp-scene__image" />
        </div>
      ) : null}
      <div className="rv-exp-scene__copy">
        <p className="rv-exp-scene__eyebrow">{metadata.artist}</p>
        <h2 className="rv-exp-scene__headline">{scene.headline}</h2>
        {scene.supportingCopy ? (
          <p className="rv-exp-scene__body">{scene.supportingCopy}</p>
        ) : null}
        <ol className="rv-exp-timeline">
          {events.map((event, i) => (
            <li key={`${event.year}-${event.label}-${i}`} className="rv-exp-timeline__item">
              {event.year ? (
                <span className="rv-exp-timeline__year">{event.year}</span>
              ) : null}
              <span className="rv-exp-timeline__label">{event.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
