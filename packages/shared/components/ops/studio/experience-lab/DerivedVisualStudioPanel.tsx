"use client";

import { useMemo, useState } from "react";

import { ExperienceImage } from "@/components/retroverse/renderer/ExperienceImage";
import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";
import { buildDerivedVisualStudioState } from "@/lib/retroverse/visual-assets/preview-builder";
import type { VisualStyleId } from "@/lib/retroverse/visual-assets/types";

type Props = {
  rvtr: string;
  experience: ParsedExperience;
  songDna: CollectorSongDna | null;
  artDirection: ArtDirectionProfile;
};

export function DerivedVisualStudioPanel({
  rvtr,
  experience,
  songDna,
  artDirection,
}: Props) {
  const [selectedStyleId, setSelectedStyleId] = useState<VisualStyleId | undefined>();
  const [selectedFrameId, setSelectedFrameId] = useState<string | undefined>();

  const studio = useMemo(
    () =>
      buildDerivedVisualStudioState({
        rvtr,
        experience,
        songDna,
        artDirection,
        selectedStyleId,
        frameId: selectedFrameId,
      }),
    [rvtr, experience, songDna, artDirection, selectedStyleId, selectedFrameId],
  );

  const { preview } = studio;

  return (
    <section className="elab-dvs" aria-label="Derived Visual Studio">
      <header className="elab-dvs__header">
        <h2 className="elab-dvs__title">Derived Visual Studio</h2>
        <p className="elab-dvs__subtitle">
          Preview-only metadata · no AI generation · grounded in performance frames
        </p>
      </header>

      <div className="elab-pipeline">
        <div className="elab-pipeline__step">
          <h3 className="elab-pipeline__label">Original frame</h3>
          {preview.allFrames.length > 1 ? (
            <select
              className="elab-dvs__select"
              value={preview.frame?.id ?? ""}
              onChange={(e) => setSelectedFrameId(e.target.value || undefined)}
            >
              {preview.allFrames.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.role.replace(/_/g, " ")} · {f.caption ?? f.id}
                </option>
              ))}
            </select>
          ) : null}
          {preview.frame ? (
            <div className="elab-dvs__frame">
              <ExperienceImage
                src={preview.frame.imageUrl}
                alt={preview.frame.caption ?? "Performance frame"}
                className="elab-dvs__frame-image"
                priority
              />
              <p className="elab-dvs__frame-meta">
                {preview.frame.id}
                {preview.frame.performanceId ? ` · ${preview.frame.performanceId}` : ""}
              </p>
            </div>
          ) : (
            <p className="elab-dvs__empty">No performance frames in render spec.</p>
          )}
        </div>

        <div className="elab-pipeline__arrow" aria-hidden="true">
          ↓
        </div>

        <div className="elab-pipeline__step">
          <h3 className="elab-pipeline__label">Suggested styles</h3>
          <div className="elab-dvs__styles">
            {preview.suggestions.map((suggestion) => (
              <button
                key={suggestion.style.id}
                type="button"
                className={
                  preview.selectedStyle.id === suggestion.style.id
                    ? "elab-dvs__style-btn elab-dvs__style-btn--active"
                    : "elab-dvs__style-btn"
                }
                onClick={() => setSelectedStyleId(suggestion.style.id)}
              >
                <span className="elab-dvs__style-name">{suggestion.style.name}</span>
                <span className="elab-dvs__style-score">score {suggestion.score}</span>
              </button>
            ))}
          </div>
          <details className="elab-dvs__all-styles">
            <summary>All {studio.allStyles.length} library styles</summary>
            <div className="elab-dvs__styles elab-dvs__styles--all">
              {studio.allStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={
                    preview.selectedStyle.id === style.id
                      ? "elab-dvs__style-btn elab-dvs__style-btn--active"
                      : "elab-dvs__style-btn"
                  }
                  onClick={() => setSelectedStyleId(style.id)}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </details>
        </div>

        <div className="elab-pipeline__arrow" aria-hidden="true">
          ↓
        </div>

        <div className="elab-pipeline__step">
          <h3 className="elab-pipeline__label">Generated prompt</h3>
          <pre className="elab-dvs__prompt">{preview.derivedVisual.prompt}</pre>
        </div>

        <div className="elab-pipeline__arrow" aria-hidden="true">
          ↓
        </div>

        <div className="elab-pipeline__step">
          <h3 className="elab-pipeline__label">Preferred scene types</h3>
          <ul className="elab-dvs__tags">
            {preview.identifiedSceneTypes.map((sceneType) => (
              <li key={sceneType.id}>{sceneType.label.replace(/_/g, " ")}</li>
            ))}
          </ul>
          <p className="elab-dvs__reason">
            <strong>Why this style:</strong> {preview.selectionReason}
          </p>
          {preview.derivedVisual.palette.length > 0 ? (
            <div className="elab-dvs__palette">
              {preview.identifiedPalette.map((swatch) => (
                <span
                  key={swatch.id}
                  className="elab-dvs__swatch"
                  style={{ background: swatch.label }}
                  title={swatch.label}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
