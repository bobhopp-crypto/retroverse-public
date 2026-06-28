"use client";

import { ExperienceImage } from "../ExperienceImage";
import type { SceneTemplateProps } from "../scene-types";

export function HeroScene({ scene, metadata }: SceneTemplateProps) {
  const imageUrl = scene.assets.imageUrls[0] ?? null;

  return (
    <article className="rv-exp-scene rv-exp-scene--hero">
      <div className="rv-exp-scene__media">
        <ExperienceImage
          src={imageUrl}
          alt={`${metadata.title} — ${metadata.artist}`}
          className="rv-exp-scene__image rv-exp-scene__image--hero"
          priority
        />
      </div>
      <div className="rv-exp-scene__copy">
        <p className="rv-exp-scene__eyebrow">{metadata.artist}</p>
        <h1 className="rv-exp-scene__headline">{scene.headline}</h1>
        {scene.supportingCopy ? (
          <p className="rv-exp-scene__body">{scene.supportingCopy}</p>
        ) : null}
        {scene.assets.factTexts[0] ? (
          <p className="rv-exp-scene__fact">{scene.assets.factTexts[0]}</p>
        ) : null}
      </div>
    </article>
  );
}
