"use client";

import { ExperienceImage } from "@/components/retroverse/renderer/ExperienceImage";
import type { RenderSpecMetadata } from "@/lib/retroverse/renderer/types";
import type { SimulatedScene } from "@/lib/retroverse/experience-design/scene-simulation";
import { derivedStylePreviewFilter } from "@/lib/retroverse/experience-design/derived-preview";
import type { VisualStyleId } from "@/lib/retroverse/visual-assets/types";

type Props = {
  scene: SimulatedScene;
  metadata: RenderSpecMetadata;
  publicationClassName: string;
  derivedStyleId: VisualStyleId | null;
  publicationName: string;
};

function bodyForScene(scene: SimulatedScene): string | null {
  const fact = scene.assets.factTexts.find((f) => f.trim());
  if (scene.presentation === "quote" && fact) return fact;
  if (scene.presentation === "minimal") return fact ?? scene.headline;
  if (fact && scene.momentType === "did_you_know") return fact;
  const copy = scene.supportingCopy.trim();
  if (copy && copy !== scene.headline) return copy;
  return fact ?? null;
}

export function DesignPreviewPane({
  scene,
  metadata,
  publicationClassName,
  derivedStyleId,
  publicationName,
}: Props) {
  const image = scene.assets.imageUrls[0] ?? null;
  const body = bodyForScene(scene);
  const filter = derivedStylePreviewFilter(derivedStyleId);
  const isGallery = scene.presentation === "gallery" && scene.assets.imageUrls.length > 1;
  const isFullscreen = scene.presentation === "fullscreen" || scene.displayImportance === "hero";
  const isMinimal = scene.presentation === "minimal";
  const isQuote = scene.presentation === "quote";

  return (
    <article
      className={[
        "ds-preview",
        publicationClassName,
        isFullscreen ? "ds-preview--fullscreen" : "",
        isGallery ? "ds-preview--gallery" : "",
        isMinimal ? "ds-preview--minimal" : "",
        isQuote ? "ds-preview--quote" : "",
        `ds-preview--importance-${scene.displayImportance}`,
        scene.simulated ? "ds-preview--simulated" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="ds-preview__meta">
        <span className="ds-preview__pub">{publicationName}</span>
        <span className="ds-preview__moment">{scene.momentLabel}</span>
        {scene.simulated ? (
          <span className="ds-preview__sim">{scene.presentation.replace(/_/g, " ")}</span>
        ) : null}
      </header>

      {isGallery ? (
        <div className="ds-preview__gallery">
          {scene.previewImages.map((image) => (
            <div key={image.id} className="ds-preview__media" style={filter ? { filter } : undefined}>
              <ExperienceImage src={image.text} alt="" className="ds-preview__image" />
            </div>
          ))}
        </div>
      ) : (
        <div className="ds-preview__media" style={filter ? { filter } : undefined}>
          <ExperienceImage src={image} alt={scene.headline} className="ds-preview__image" priority />
        </div>
      )}

      <div className="ds-preview__copy">
        <h2 className="ds-preview__headline">{scene.headline}</h2>
        {body ? (
          <p className={isQuote ? "ds-preview__quote" : "ds-preview__body"}>{body}</p>
        ) : null}
        <p className="ds-preview__artist">{metadata.artist}</p>
      </div>
    </article>
  );
}
