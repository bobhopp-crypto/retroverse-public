"use client";

import { ExperienceImage } from "../ExperienceImage";
import type { SceneTemplateProps } from "../scene-types";

export function FactStackScene({ scene, metadata }: SceneTemplateProps) {
  const imageUrl = scene.assets.imageUrls[0] ?? null;
  const facts =
    scene.assets.factTexts.length > 0
      ? scene.assets.factTexts
      : scene.supportingCopy
        ? [scene.supportingCopy]
        : [];

  return (
    <article className="rv-exp-scene rv-exp-scene--fact-stack">
      {imageUrl ? (
        <div className="rv-exp-scene__media rv-exp-scene__media--compact">
          <ExperienceImage src={imageUrl} alt={scene.headline} className="rv-exp-scene__image" />
        </div>
      ) : null}
      <div className="rv-exp-scene__copy">
        <p className="rv-exp-scene__eyebrow">{metadata.artist}</p>
        <h2 className="rv-exp-scene__headline">{scene.headline}</h2>
        <ul className="rv-exp-fact-stack">
          {facts.map((fact, index) => (
            <li key={`fact-stack-${scene.sceneNumber}-${index}`} className="rv-exp-fact-stack__item">
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
