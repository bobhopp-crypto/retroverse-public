"use client";

import { ExperienceImage } from "../ExperienceImage";
import type { SceneTemplateProps } from "../scene-types";

export function QuoteScene({ scene, metadata }: SceneTemplateProps) {
  const imageUrl = scene.assets.imageUrls[0] ?? null;
  const quoteText =
    scene.assets.factTexts[0] ||
    scene.supportingCopy ||
    scene.headline;

  return (
    <article className="rv-exp-scene rv-exp-scene--quote">
      {imageUrl ? (
        <div className="rv-exp-scene__media rv-exp-scene__media--compact">
          <ExperienceImage src={imageUrl} alt="" className="rv-exp-scene__image" />
        </div>
      ) : null}
      <blockquote className="rv-exp-quote">
        <p className="rv-exp-quote__text">{quoteText}</p>
        <footer className="rv-exp-quote__attribution">{metadata.artist}</footer>
      </blockquote>
      {scene.headline && scene.headline !== quoteText ? (
        <p className="rv-exp-scene__body rv-exp-scene__body--centered">{scene.headline}</p>
      ) : null}
    </article>
  );
}
