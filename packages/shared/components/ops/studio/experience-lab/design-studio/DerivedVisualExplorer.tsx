"use client";

import { useEffect, useMemo, useState } from "react";

import { ExperienceImage } from "@/components/retroverse/renderer/ExperienceImage";
import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";
import { derivedStylePreviewFilter, sceneSuitabilityLabel } from "@/lib/retroverse/experience-design/derived-preview";
import {
  loadDerivedFavorites,
  toggleDerivedFavorite,
} from "@/lib/retroverse/experience-design/favorites-storage";
import type { ComposedScene } from "@/lib/retroverse/scene-composer/types";
import { buildDerivedVisualStudioState } from "@/lib/retroverse/visual-assets/preview-builder";
import type { VisualStyleId } from "@/lib/retroverse/visual-assets/types";

type Props = {
  rvtr: string;
  experience: ParsedExperience;
  songDna: CollectorSongDna | null;
  artDirection: ArtDirectionProfile;
  selectedStyleId: VisualStyleId | null;
  onSelectStyle: (id: VisualStyleId) => void;
  currentScene: ComposedScene | null;
};

export function DerivedVisualExplorer({
  rvtr,
  experience,
  songDna,
  artDirection,
  selectedStyleId,
  onSelectStyle,
  currentScene,
}: Props) {
  const [frameId, setFrameId] = useState<string | undefined>();
  const [favorites, setFavorites] = useState<VisualStyleId[]>([]);

  useEffect(() => {
    setFavorites(loadDerivedFavorites(rvtr));
  }, [rvtr]);

  const studio = useMemo(
    () =>
      buildDerivedVisualStudioState({
        rvtr,
        experience,
        songDna,
        artDirection,
        selectedStyleId: selectedStyleId ?? undefined,
        frameId,
      }),
    [rvtr, experience, songDna, artDirection, selectedStyleId, frameId],
  );

  const { preview, allStyles } = studio;
  const filter = derivedStylePreviewFilter(preview.selectedStyle.id);
  const suitability = currentScene
    ? sceneSuitabilityLabel(currentScene.momentType, preview.preferredSceneTypes)
    : "—";

  return (
    <div className="ds-workspace ds-workspace--derived">
      <div className="ds-derived-layout">
        <div className="ds-derived-col">
          <h4 className="ds-workspace__detail-title">Original frame</h4>
          {preview.allFrames.length > 1 ? (
            <select
              className="ds-select"
              value={preview.frame?.id ?? ""}
              onChange={(e) => setFrameId(e.target.value || undefined)}
            >
              {preview.allFrames.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.caption ?? f.id}
                </option>
              ))}
            </select>
          ) : null}
          {preview.frame ? (
            <ExperienceImage
              src={preview.frame.imageUrl}
              alt="Source frame"
              className="ds-derived-source"
              priority
            />
          ) : (
            <p className="ds-workspace__hint">No frames available.</p>
          )}
        </div>

        <div className="ds-derived-col ds-derived-col--preview">
          <h4 className="ds-workspace__detail-title">Style preview (CSS hint)</h4>
          {preview.frame ? (
            <div className="ds-derived-preview-wrap" style={filter ? { filter } : undefined}>
              <ExperienceImage
                src={preview.frame.imageUrl}
                alt={preview.selectedStyle.name}
                className="ds-derived-preview"
                priority
              />
            </div>
          ) : null}
          <p className="ds-workspace__hint">{preview.selectedStyle.name} · {suitability}</p>
        </div>
      </div>

      <h4 className="ds-workspace__detail-title">All suggested styles</h4>
      <div className="ds-style-grid">
        {allStyles.map((style) => {
          const suggestion = preview.suggestions.find((s) => s.style.id === style.id);
          const isFav = favorites.includes(style.id);
          return (
            <div key={style.id} className="ds-style-row">
              <button
                type="button"
                className={
                  preview.selectedStyle.id === style.id
                    ? "ds-style-btn ds-style-btn--active"
                    : "ds-style-btn"
                }
                onClick={() => onSelectStyle(style.id)}
              >
                <span>{style.name}</span>
                {suggestion ? <span className="ds-style-btn__score">{suggestion.score}</span> : null}
              </button>
              <button
                type="button"
                className={isFav ? "ds-fav-btn ds-fav-btn--on" : "ds-fav-btn"}
                onClick={() => setFavorites(toggleDerivedFavorite(rvtr, favorites, style.id))}
                aria-label={isFav ? "Remove favorite" : "Add favorite"}
              >
                {isFav ? "★" : "☆"}
              </button>
            </div>
          );
        })}
      </div>

      <h4 className="ds-workspace__detail-title">Generated prompt</h4>
      <pre className="ds-prompt">{preview.derivedVisual.prompt}</pre>

      <p className="ds-workspace__reason">
        <strong>DNA reasoning:</strong> {preview.selectionReason}
      </p>

      <h4 className="ds-workspace__detail-title">Scene suitability</h4>
      <ul className="ds-tags">
        {preview.identifiedSceneTypes.map((sceneType) => (
          <li
            key={sceneType.id}
            className={currentScene?.momentType === sceneType.label ? "ds-tags__item ds-tags__item--active" : "ds-tags__item"}
          >
            {sceneType.label.replace(/_/g, " ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
