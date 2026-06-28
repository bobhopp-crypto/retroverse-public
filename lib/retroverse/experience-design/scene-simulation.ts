import type { ComposedScene } from "@/lib/retroverse/scene-composer/types";
import { identifyStrings, type IdentifiedText } from "@/lib/ops/studio/model-identity";

import type { SceneOverride, ScenePresentationMode } from "./types";

export type SimulatedScene = ComposedScene & {
  simulationId: string;
  simulated: boolean;
  presentation: ScenePresentationMode;
  displayImportance: SceneOverride["importance"];
  previewImages: IdentifiedText[];
};

function cloneScene(scene: ComposedScene, patch: Partial<SimulatedScene>): SimulatedScene {
  const simulationId = patch.simulationId ?? `sim-${scene.sceneNumber}`;
  const merged: SimulatedScene = {
    ...scene,
    simulationId,
    simulated: patch.simulated ?? false,
    presentation: patch.presentation ?? "default",
    displayImportance: patch.displayImportance ?? (scene.importance as SimulatedScene["displayImportance"]),
    previewImages: [],
    ...patch,
  };
  return {
    ...merged,
    previewImages: identifyStrings(`${simulationId}-img`, merged.assets.imageUrls),
  };
}

function mergeScenes(a: ComposedScene, b: ComposedScene, id: string): SimulatedScene {
  return cloneScene(a, {
    simulationId: id,
    simulated: true,
    presentation: "merge",
    headline: a.headline,
    supportingCopy: [a.supportingCopy, b.supportingCopy].filter(Boolean).join(" "),
    assets: {
      ...a.assets,
      imageUrls: [...a.assets.imageUrls, ...b.assets.imageUrls].slice(0, 3),
      factTexts: [...a.assets.factTexts, ...b.assets.factTexts],
    },
  });
}

function splitScene(scene: ComposedScene, id: string): SimulatedScene[] {
  const facts = scene.assets.factTexts.filter(Boolean);
  if (facts.length <= 1) {
    return [
      cloneScene(scene, {
        simulationId: id,
        simulated: true,
        presentation: "split",
      }),
    ];
  }
  return facts.map((fact, i) =>
    cloneScene(scene, {
      simulationId: `${id}-${i}`,
      simulated: true,
      presentation: "split",
      headline: i === 0 ? scene.headline : "Did You Know?",
      supportingCopy: "",
      assets: {
        ...scene.assets,
        factTexts: [fact],
        imageUrls: i === 0 ? scene.assets.imageUrls.slice(0, 1) : [],
      },
    }),
  );
}

export function simulateScenes(
  scenes: ComposedScene[],
  order: number[],
  overrides: Record<number, SceneOverride>,
): SimulatedScene[] {
  const ordered = order
    .map((idx) => scenes[idx])
    .filter((s): s is ComposedScene => Boolean(s));

  const output: SimulatedScene[] = [];
  let i = 0;

  while (i < ordered.length) {
    const scene = ordered[i]!;
    const override = overrides[scene.sceneNumber] ?? {
      importance: scene.importance as SceneOverride["importance"],
      presentation: "default" as const,
    };

    if (override.presentation === "merge" && i + 1 < ordered.length) {
      const next = ordered[i + 1]!;
      output.push(mergeScenes(scene, next, `merge-${scene.sceneNumber}-${next.sceneNumber}`));
      i += 2;
      continue;
    }

    if (override.presentation === "split") {
      output.push(...splitScene(scene, `split-${scene.sceneNumber}`));
      i += 1;
      continue;
    }

    output.push(
      cloneScene(scene, {
        simulationId: `scene-${scene.sceneNumber}`,
        simulated: override.presentation !== "default",
        presentation: override.presentation,
        displayImportance: override.importance,
        importance: override.importance === "hero" ? "high" : override.importance,
      }),
    );
    i += 1;
  }

  return output;
}

export function defaultSceneOrder(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

export function defaultSceneOverrides(scenes: ComposedScene[]): Record<number, SceneOverride> {
  const overrides: Record<number, SceneOverride> = {};
  for (const scene of scenes) {
    overrides[scene.sceneNumber] = {
      importance: scene.importance as SceneOverride["importance"],
      presentation: "default",
    };
  }
  return overrides;
}
