"use client";

import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";
import type { ComposedScene } from "@/lib/retroverse/scene-composer/types";
import type { SimulatedScene } from "@/lib/retroverse/experience-design/scene-simulation";
import type {
  DesignWorkspaceId,
  PublicationId,
  SceneOverride,
} from "@/lib/retroverse/experience-design/types";
import type { VisualStyleId } from "@/lib/retroverse/visual-assets/types";

import { DerivedVisualExplorer } from "./DerivedVisualExplorer";
import { PublicationExplorer } from "./PublicationExplorer";
import { SceneImportanceSimulator } from "./SceneImportanceSimulator";
import { StoryFlowBoard } from "./StoryFlowBoard";
import { VisualLibraryWorkspace } from "./VisualLibraryWorkspace";
import type { VisualLibrary } from "@/lib/retroverse/visual-library/types";

const WORKSPACES: { id: DesignWorkspaceId; label: string }[] = [
  { id: "publication", label: "Publication Explorer" },
  { id: "derived_visual", label: "Derived Visual Explorer" },
  { id: "visual_library", label: "Visual Library" },
  { id: "scene_importance", label: "Scene Importance" },
  { id: "story_flow", label: "Story Flow" },
];

type Props = {
  workspace: DesignWorkspaceId;
  onWorkspaceChange: (id: DesignWorkspaceId) => void;
  rvtr: string;
  experience: ParsedExperience;
  songDna: CollectorSongDna | null;
  artDirection: ArtDirectionProfile;
  composedScenes: ComposedScene[];
  simulatedScenes: SimulatedScene[];
  publicationId: PublicationId;
  onPublicationChange: (id: PublicationId) => void;
  derivedStyleId: VisualStyleId | null;
  onDerivedStyleChange: (id: VisualStyleId) => void;
  sceneOrder: number[];
  onSceneOrderChange: (order: number[]) => void;
  sceneOverrides: Record<number, SceneOverride>;
  onSceneOverrideChange: (sceneNumber: number, patch: Partial<SceneOverride>) => void;
  previewSceneIndex: number;
  onPreviewSceneIndexChange: (index: number) => void;
  visualLibrary: VisualLibrary | null;
};

export function DesignStudio(props: Props) {
  const {
    workspace,
    onWorkspaceChange,
    rvtr,
    experience,
    songDna,
    artDirection,
    composedScenes,
    simulatedScenes,
    publicationId,
    onPublicationChange,
    derivedStyleId,
    onDerivedStyleChange,
    sceneOrder,
    onSceneOrderChange,
    sceneOverrides,
    onSceneOverrideChange,
    previewSceneIndex,
    onPreviewSceneIndexChange,
    visualLibrary,
  } = props;

  const currentComposed = composedScenes[sceneOrder[previewSceneIndex] ?? 0] ?? null;

  return (
    <section className="ds-studio" aria-label="Design Studio">
      <header className="ds-studio__header">
        <h2 className="ds-studio__title">Design Studio</h2>
        <p className="ds-studio__subtitle">Experimental surface · reversible · no package writes</p>
      </header>

      <nav className="ds-studio__tabs" aria-label="Design workspaces">
        {WORKSPACES.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              workspace === tab.id ? "ds-studio__tab ds-studio__tab--active" : "ds-studio__tab"
            }
            onClick={() => onWorkspaceChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="ds-studio__workspace">
        {workspace === "publication" ? (
          <PublicationExplorer
            publicationId={publicationId}
            onSelect={onPublicationChange}
            songDna={songDna}
            artDirection={artDirection}
          />
        ) : null}

        {workspace === "derived_visual" ? (
          <DerivedVisualExplorer
            rvtr={rvtr}
            experience={experience}
            songDna={songDna}
            artDirection={artDirection}
            selectedStyleId={derivedStyleId}
            onSelectStyle={onDerivedStyleChange}
            currentScene={currentComposed}
          />
        ) : null}

        {workspace === "visual_library" && visualLibrary ? (
          <VisualLibraryWorkspace library={visualLibrary} />
        ) : null}

        {workspace === "visual_library" && !visualLibrary ? (
          <p className="ds-empty">Visual Library unavailable — collector or render spec missing.</p>
        ) : null}

        {workspace === "scene_importance" ? (
          <SceneImportanceSimulator
            scenes={composedScenes}
            overrides={sceneOverrides}
            simulatedScenes={simulatedScenes}
            onChange={onSceneOverrideChange}
          />
        ) : null}

        {workspace === "story_flow" ? (
          <StoryFlowBoard
            scenes={composedScenes}
            order={sceneOrder}
            onReorder={onSceneOrderChange}
            activeIndex={previewSceneIndex}
            onSelectIndex={onPreviewSceneIndexChange}
          />
        ) : null}
      </div>
    </section>
  );
}
