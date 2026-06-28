"use client";

import { ExperienceImage } from "../ExperienceImage";
import type { SceneTemplateProps } from "../scene-types";

export function GalleryScene({ scene, metadata }: SceneTemplateProps) {
  const images = scene.assets.imageUrls;

  return (
    <article className="rv-exp-scene rv-exp-scene--gallery">
      <div className="rv-exp-scene__copy rv-exp-scene__copy--tight">
        <p className="rv-exp-scene__eyebrow">{metadata.artist}</p>
        <h2 className="rv-exp-scene__headline">{scene.headline}</h2>
        {scene.supportingCopy ? (
          <p className="rv-exp-scene__body">{scene.supportingCopy}</p>
        ) : null}
      </div>
      <div className="rv-exp-gallery">
        {images.length > 0 ? (
          images.map((url, i) => (
            <ExperienceImage
              key={`${url}-${i}`}
              src={url}
              alt={`${scene.headline} — image ${i + 1}`}
              className="rv-exp-gallery__image"
            />
          ))
        ) : (
          <ExperienceImage src={null} alt={scene.headline} className="rv-exp-gallery__image" />
        )}
      </div>
    </article>
  );
}
