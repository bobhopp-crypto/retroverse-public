"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { buildArtDirectionProfile } from "@/lib/retroverse/art-direction/build-art-direction-profile";
import { composeScenes } from "@/lib/retroverse/scene-composer/compose-scenes";
import type { ComposedScene } from "@/lib/retroverse/scene-composer/types";
import {
  defaultSceneOrder,
  defaultSceneOverrides,
  simulateScenes,
} from "@/lib/retroverse/experience-design/scene-simulation";
import { buildPublicationTheme } from "@/lib/retroverse/experience-design/publication-theme";
import {
  defaultPublicationId,
  PUBLICATION_BY_ID,
  suggestPublications,
} from "@/lib/retroverse/experience-design/publications";
import type { DesignWorkspaceId, PublicationId, SceneOverride } from "@/lib/retroverse/experience-design/types";
import type { ExperienceLabPayload } from "@/lib/retroverse/experience-lab/types";
import { suggestVisualStyles } from "@/lib/retroverse/visual-assets/derived-visual";
import type { VisualStyleId } from "@/lib/retroverse/visual-assets/types";

import { ArtDirectionPanel } from "./ArtDirectionPanel";
import { DesignPreviewPane } from "./design-studio/DesignPreviewPane";
import { DesignStudio } from "./design-studio/DesignStudio";
import { OperatorFeedbackPanel } from "./design-studio/OperatorFeedbackPanel";
import { SceneBreakdownPanel } from "./SceneBreakdownPanel";

type Props = {
  payload: ExperienceLabPayload;
};

export function ExperienceLabShell({ payload }: Props) {
  const { experience, songDna, visualLibrary } = payload;
  const { scenes: originalScenes, spec } = experience;
  const rvtr = spec.metadata.rvtr;

  const composition = useMemo(
    () => composeScenes({ scenes: originalScenes, songDna, totalDurationSec: experience.totalDurationSec }),
    [originalScenes, songDna, experience.totalDurationSec],
  );

  const composedScenes = composition.composedScenes;

  const [workspace, setWorkspace] = useState<DesignWorkspaceId>("publication");
  const [publicationId, setPublicationId] = useState<PublicationId>(() => {
    const suggested = suggestPublications(songDna, 1);
    return suggested[0]?.id ?? defaultPublicationId();
  });
  const [derivedStyleId, setDerivedStyleId] = useState<VisualStyleId | null>(() => {
    const styles = suggestVisualStyles(songDna, 1);
    return styles[0]?.style.id ?? null;
  });
  const [sceneOrder, setSceneOrder] = useState<number[]>(() => defaultSceneOrder(composedScenes.length));
  const [sceneOverrides, setSceneOverrides] = useState<Record<number, SceneOverride>>(() =>
    defaultSceneOverrides(composedScenes),
  );
  const [previewSceneIndex, setPreviewSceneIndex] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  useEffect(() => {
    setSceneOrder(defaultSceneOrder(composedScenes.length));
    setSceneOverrides(defaultSceneOverrides(composedScenes));
    setPreviewSceneIndex(0);
    const suggested = suggestPublications(songDna, 1);
    setPublicationId(suggested[0]?.id ?? defaultPublicationId());
    const styles = suggestVisualStyles(songDna, 1);
    setDerivedStyleId(styles[0]?.style.id ?? null);
  }, [rvtr, composedScenes]);

  const publication = PUBLICATION_BY_ID[publicationId];

  const artDirection = useMemo(
    () =>
      buildArtDirectionProfile({
        songDna,
        experience,
        layoutId: publication.preferredLayout,
        rvtr,
      }),
    [songDna, experience, publication.preferredLayout, rvtr],
  );

  const { themeVars, className: publicationClassName } = useMemo(
    () => buildPublicationTheme(publicationId, artDirection),
    [publicationId, artDirection],
  );

  const simulatedScenes = useMemo(
    () => simulateScenes(composedScenes, sceneOrder, sceneOverrides),
    [composedScenes, sceneOrder, sceneOverrides],
  );

  const previewScene = simulatedScenes[previewSceneIndex];

  const handleSceneOverrideChange = useCallback(
    (sceneNumber: number, patch: Partial<SceneOverride>) => {
      setSceneOverrides((prev) => ({
        ...prev,
        [sceneNumber]: { ...(prev[sceneNumber] ?? { importance: "medium", presentation: "default" }), ...patch },
      }));
    },
    [],
  );

  useEffect(() => {
    if (previewSceneIndex >= simulatedScenes.length) {
      setPreviewSceneIndex(Math.max(0, simulatedScenes.length - 1));
    }
  }, [simulatedScenes.length, previewSceneIndex]);

  if (!previewScene) {
    return <p className="elab-empty">No composed scenes available.</p>;
  }

  return (
    <div className="elab-shell elab-shell--design">
      <header className="elab-header">
        <div className="elab-header__titles">
          <p className="elab-header__kicker">Experience Lab · Design Studio</p>
          <h1 className="elab-header__title">{spec.metadata.title}</h1>
          <p className="elab-header__artist">{spec.metadata.artist} · {rvtr}</p>
        </div>
      </header>

      <DesignStudio
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        rvtr={rvtr}
        experience={experience}
        songDna={songDna}
        artDirection={artDirection}
        composedScenes={composedScenes}
        simulatedScenes={simulatedScenes}
        publicationId={publicationId}
        onPublicationChange={setPublicationId}
        derivedStyleId={derivedStyleId}
        onDerivedStyleChange={setDerivedStyleId}
        sceneOrder={sceneOrder}
        onSceneOrderChange={setSceneOrder}
        sceneOverrides={sceneOverrides}
        onSceneOverrideChange={handleSceneOverrideChange}
        previewSceneIndex={previewSceneIndex}
        onPreviewSceneIndexChange={setPreviewSceneIndex}
        visualLibrary={visualLibrary}
      />

      <section className="ds-preview-section">
        <header className="ds-preview-section__header">
          <h2 className="ds-preview-section__title">Renderer Preview</h2>
          <p className="ds-preview-section__hint">
            Reflects publication · derived style · scene emphasis · story order
          </p>
        </header>

        <div className="ds-preview-section__nav">
          <button
            type="button"
            className="elab-scene-nav__btn"
            disabled={previewSceneIndex <= 0}
            onClick={() => setPreviewSceneIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </button>
          <span className="elab-scene-nav__count">
            {previewSceneIndex + 1} / {simulatedScenes.length} · {previewScene.momentLabel}
          </span>
          <button
            type="button"
            className="elab-scene-nav__btn"
            disabled={previewSceneIndex >= simulatedScenes.length - 1}
            onClick={() => setPreviewSceneIndex((i) => Math.min(simulatedScenes.length - 1, i + 1))}
          >
            Next
          </button>
        </div>

        <div className="ds-preview-stage" style={themeVars}>
          <DesignPreviewPane
            scene={previewScene}
            metadata={spec.metadata}
            publicationClassName={publicationClassName}
            derivedStyleId={derivedStyleId}
            publicationName={publication.name}
          />
        </div>
      </section>

      <OperatorFeedbackPanel
        rvtr={rvtr}
        sceneLabel={previewScene.momentLabel}
        publicationName={publication.name}
      />

      <section className="ds-inspector">
        <button
          type="button"
          className="ds-inspector__toggle"
          onClick={() => setInspectorOpen((v) => !v)}
        >
          {inspectorOpen ? "Hide pipeline inspector" : "Pipeline inspector"}
        </button>
        {inspectorOpen ? (
          <div className="ds-inspector__body">
            <SceneBreakdownPanel composition={composition} />
            <ArtDirectionPanel songDna={songDna} profile={artDirection} layoutId={publication.preferredLayout} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
