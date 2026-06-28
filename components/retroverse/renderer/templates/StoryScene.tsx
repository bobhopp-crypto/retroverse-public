"use client";

import { ExperienceImage } from "../ExperienceImage";
import type { SceneTemplateProps } from "../scene-types";

export function StoryScene({ scene, metadata }: SceneTemplateProps) {
  const imageUrl = scene.assets.imageUrls[0] ?? null;

  return (
    <article className="rv-exp-scene rv-exp-scene--story">
      <div className="rv-exp-scene__media">
        <ExperienceImage
          src={imageUrl}
          alt={scene.headline}
          className="rv-exp-scene__image"
        />
      </div>
      <div className="rv-exp-scene__copy">
        <p className="rv-exp-scene__eyebrow">{metadata.artist}</p>
        <h2 className="rv-exp-scene__headline">{scene.headline}</h2>
        {scene.supportingCopy ? (
          <p className="rv-exp-scene__body">{scene.supportingCopy}</p>
        ) : null}
        {scene.assets.factTexts.map((fact, index) => (
          <p key={`story-fact-${scene.sceneNumber}-${index}`} className="rv-exp-scene__fact">
            {fact}
          </p>
        ))}
      </div>
    </article>
  );
}
