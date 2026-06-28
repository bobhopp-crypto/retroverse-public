"use client";

import type { SceneCompositionResult } from "@/lib/retroverse/scene-composer/types";

type Props = {
  composition: SceneCompositionResult;
};

export function SceneBreakdownPanel({ composition }: Props) {
  const { originalScenes, composedScenes, pacingProfile, stats } = composition;

  return (
    <section className="elab-compose" aria-label="Scene Breakdown">
      <header className="elab-compose__header">
        <h2 className="elab-compose__title">Scene Breakdown</h2>
        <p className="elab-compose__subtitle">
          Pacing: <strong>{pacingProfile.label}</strong> — {pacingProfile.reason}
        </p>
      </header>

      <div className="elab-pipeline">
        <div className="elab-pipeline__step">
          <h3 className="elab-pipeline__label">Original Director scenes ({stats.originalSceneCount})</h3>
          <ol className="elab-compose__list">
            {originalScenes.map((scene) => (
              <li key={scene.sceneNumber} className="elab-compose__item">
                <span className="elab-compose__num">#{scene.sceneNumber}</span>
                <span className="elab-compose__type">{scene.templateId.replace(/_/g, " ")}</span>
                <span className="elab-compose__headline">{scene.headline}</span>
                <span className="elab-compose__meta">
                  {scene.assets.factTexts.filter(Boolean).length} facts · {scene.assets.imageUrls.length} imgs
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="elab-pipeline__arrow" aria-hidden="true">
          ↓
        </div>

        <div className="elab-pipeline__step">
          <h3 className="elab-pipeline__label">Composed scenes ({stats.composedSceneCount})</h3>
          <ol className="elab-compose__list">
            {composedScenes.map((scene) => (
              <li key={scene.sceneNumber} className="elab-compose__item elab-compose__item--composed">
                <span className="elab-compose__num">#{scene.sceneNumber}</span>
                <span className="elab-compose__type elab-compose__type--moment">{scene.momentLabel}</span>
                <span className="elab-compose__headline">{scene.headline}</span>
                <span className="elab-compose__meta">
                  {scene.visualIntensity} intensity · from scene{" "}
                  {scene.sourceSceneNumbers.join(", ")}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="elab-pipeline__arrow" aria-hidden="true">
          ↓
        </div>

        <div className="elab-pipeline__step">
          <h3 className="elab-pipeline__label">Renderer output</h3>
          <dl className="elab-compose__stats">
            <div>
              <dt>Scene count</dt>
              <dd>
                {stats.originalSceneCount} → {stats.composedSceneCount}
              </dd>
            </div>
            <div>
              <dt>Avg words / scene</dt>
              <dd>
                {stats.avgWordsPerSceneOriginal} → {stats.avgWordsPerSceneComposed}
              </dd>
            </div>
            <div>
              <dt>Avg facts / scene</dt>
              <dd>
                {stats.avgFactsPerSceneOriginal} → {stats.avgFactsPerSceneComposed}
              </dd>
            </div>
            <div>
              <dt>Image slots</dt>
              <dd>
                {stats.imageSlotsOriginal} → {stats.imageSlotsComposed}
              </dd>
            </div>
          </dl>
          <p className="elab-compose__hint">Live preview below uses composed scenes.</p>
        </div>
      </div>
    </section>
  );
}
