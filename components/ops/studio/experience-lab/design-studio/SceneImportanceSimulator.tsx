"use client";

import type { ComposedScene } from "@/lib/retroverse/scene-composer/types";
import type {
  SceneImportanceLevel,
  SceneOverride,
  ScenePresentationMode,
} from "@/lib/retroverse/experience-design/types";
import type { SimulatedScene } from "@/lib/retroverse/experience-design/scene-simulation";

const IMPORTANCE: SceneImportanceLevel[] = ["low", "medium", "high", "hero"];
const PRESENTATIONS: { id: ScenePresentationMode; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "merge", label: "Merge" },
  { id: "split", label: "Split" },
  { id: "fullscreen", label: "Full-screen" },
  { id: "gallery", label: "Gallery" },
  { id: "minimal", label: "Minimal" },
  { id: "quote", label: "Quote" },
];

type Props = {
  scenes: ComposedScene[];
  overrides: Record<number, SceneOverride>;
  simulatedScenes: SimulatedScene[];
  onChange: (sceneNumber: number, patch: Partial<SceneOverride>) => void;
};

export function SceneImportanceSimulator({
  scenes,
  overrides,
  simulatedScenes,
  onChange,
}: Props) {
  return (
    <div className="ds-workspace">
      <p className="ds-workspace__intro">
        Simulate presentation emphasis per composed scene. Runtime preview updates instantly — Director package unchanged.
      </p>
      <p className="ds-workspace__hint">
        Runtime: {scenes.length} composed → <strong>{simulatedScenes.length}</strong> simulated screens
      </p>
      <ul className="ds-scene-list">
        {scenes.map((scene) => {
          const o = overrides[scene.sceneNumber] ?? {
            importance: "medium" as const,
            presentation: "default" as const,
          };
          return (
            <li key={scene.sceneNumber} className="ds-scene-row">
              <div className="ds-scene-row__head">
                <span className="ds-scene-row__num">#{scene.sceneNumber}</span>
                <span className="ds-scene-row__moment">{scene.momentLabel}</span>
                <span className="ds-scene-row__headline">{scene.headline}</span>
              </div>
              <div className="ds-scene-row__controls">
                <label>
                  Importance
                  <select
                    className="ds-select"
                    value={o.importance}
                    onChange={(e) =>
                      onChange(scene.sceneNumber, {
                        importance: e.target.value as SceneImportanceLevel,
                      })
                    }
                  >
                    {IMPORTANCE.map((level) => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Presentation
                  <select
                    className="ds-select"
                    value={o.presentation}
                    onChange={(e) =>
                      onChange(scene.sceneNumber, {
                        presentation: e.target.value as ScenePresentationMode,
                      })
                    }
                  >
                    {PRESENTATIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
