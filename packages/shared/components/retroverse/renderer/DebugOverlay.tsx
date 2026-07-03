"use client";

import type { PublicExperiencePipeline } from "@/lib/retroverse/renderer/load-public-experience";
import type { ComposedScene } from "@/lib/retroverse/scene-composer/types";

import { formatDuration, sceneLabel } from "./scene-types";

type Props = {
  scene: ComposedScene;
  sceneIndex: number;
  sceneCount: number;
  patronValue: number | null;
  confidence: number;
  pipeline: PublicExperiencePipeline;
  visible: boolean;
  onToggle: () => void;
};

export function DebugOverlay({
  scene,
  sceneIndex,
  sceneCount,
  patronValue,
  confidence,
  pipeline,
  visible,
  onToggle,
}: Props) {
  return (
    <>
      <button
        type="button"
        className="rv-exp-debug-toggle"
        onClick={onToggle}
        aria-pressed={visible}
        aria-label={visible ? "Hide debug overlay" : "Show debug overlay"}
      >
        {visible ? "Debug on" : "Debug"}
      </button>
      {visible ? (
        <aside className="rv-exp-debug" aria-label="Developer debug overlay">
          <dl className="rv-exp-debug__list">
            <div>
              <dt>Scene</dt>
              <dd>
                {sceneIndex + 1} / {sceneCount} (#{scene.sceneNumber})
              </dd>
            </div>
            <div>
              <dt>Moment</dt>
              <dd>{scene.momentLabel}</dd>
            </div>
            <div>
              <dt>Intensity</dt>
              <dd>{scene.visualIntensity}</dd>
            </div>
            <div>
              <dt>Director source</dt>
              <dd>{scene.sourceSceneNumbers.join(", ")}</dd>
            </div>
            <div>
              <dt>Template</dt>
              <dd>{sceneLabel(scene.templateId)}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(scene.durationSec)}</dd>
            </div>
            <div>
              <dt>Compose reason</dt>
              <dd>{scene.composeReason}</dd>
            </div>
            <div>
              <dt>Pipeline</dt>
              <dd>
                {pipeline.originalSceneCount}→{pipeline.composedSceneCount} scenes · composition{" "}
                {pipeline.usedComposition ? "on" : "fallback"} · art direction{" "}
                {pipeline.usedArtDirection ? "on" : "fallback"}
              </dd>
            </div>
            <div>
              <dt>Performance ID</dt>
              <dd>{scene.assets.performanceId ?? "—"}</dd>
            </div>
            <div>
              <dt>Image IDs</dt>
              <dd>{scene.assets.imageAssetIds.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>Fact IDs</dt>
              <dd>{scene.assets.factIds.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>Patron Value</dt>
              <dd>{patronValue ?? "—"}</dd>
            </div>
            <div>
              <dt>Director confidence</dt>
              <dd>{Math.round(confidence)}%</dd>
            </div>
          </dl>
        </aside>
      ) : null}
    </>
  );
}
