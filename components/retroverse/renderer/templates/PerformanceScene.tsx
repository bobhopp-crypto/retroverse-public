"use client";

import { ExperienceImage } from "../ExperienceImage";
import type { SceneTemplateProps } from "../scene-types";

export function PerformanceScene({ scene, metadata, performanceTitle }: SceneTemplateProps) {
  const imageUrl = scene.assets.imageUrls[0] ?? null;

  return (
    <article className="rv-exp-scene rv-exp-scene--performance">
      <div className="rv-exp-scene__media">
        <ExperienceImage
          src={imageUrl}
          alt={performanceTitle || scene.headline}
          className="rv-exp-scene__image rv-exp-scene__image--performance"
        />
      </div>
      <div className="rv-exp-scene__copy">
        <p className="rv-exp-scene__eyebrow">Performance</p>
        <h2 className="rv-exp-scene__headline">{scene.headline}</h2>
        {performanceTitle && performanceTitle !== "Unknown" ? (
          <p className="rv-exp-scene__performance-title">{performanceTitle}</p>
        ) : null}
        {scene.assets.performanceId ? (
          <p className="rv-exp-scene__meta">{scene.assets.performanceId}</p>
        ) : null}
        {scene.supportingCopy ? (
          <p className="rv-exp-scene__body">{scene.supportingCopy}</p>
        ) : null}
        {scene.assets.factTexts.map((fact, index) => (
          <p key={`perf-fact-${scene.sceneNumber}-${index}`} className="rv-exp-scene__fact">
            {fact}
          </p>
        ))}
      </div>
    </article>
  );
}
