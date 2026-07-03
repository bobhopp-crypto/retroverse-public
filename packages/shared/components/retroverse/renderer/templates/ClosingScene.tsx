"use client";

import { ExperienceImage } from "../ExperienceImage";
import type { SceneTemplateProps } from "../scene-types";

export function ClosingScene({ scene, metadata }: SceneTemplateProps) {
  const imageUrl = scene.assets.imageUrls[0] ?? null;

  return (
    <article className="rv-exp-scene rv-exp-scene--closing">
      <div className="rv-exp-scene__media">
        <ExperienceImage
          src={imageUrl}
          alt={`${metadata.title} — closing`}
          className="rv-exp-scene__image rv-exp-scene__image--closing"
        />
      </div>
      <div className="rv-exp-scene__copy rv-exp-scene__copy--closing">
        <p className="rv-exp-scene__eyebrow">{metadata.artist}</p>
        <h2 className="rv-exp-scene__headline">{metadata.title}</h2>
        {scene.supportingCopy ? (
          <p className="rv-exp-scene__body">{scene.supportingCopy}</p>
        ) : null}
        <p className="rv-exp-closing__fin">End of story</p>
      </div>
    </article>
  );
}
