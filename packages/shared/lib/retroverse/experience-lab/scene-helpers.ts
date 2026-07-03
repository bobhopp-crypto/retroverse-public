import type { RenderSpecScene } from "@/lib/retroverse/renderer/types";
import { identifyStrings, modelListItemId, type IdentifiedText } from "@/lib/ops/studio/model-identity";

export function sceneQuote(scene: RenderSpecScene): string | null {
  if (scene.assets.factTexts.length > 0) return scene.assets.factTexts[0]!;
  if (scene.supportingCopy.trim()) return scene.supportingCopy;
  return null;
}

export function sceneFact(scene: RenderSpecScene): string | null {
  if (scene.assets.factTexts.length > 1) return scene.assets.factTexts[1]!;
  if (scene.assets.factTexts.length === 1 && scene.templateId !== "quote") {
    return scene.assets.factTexts[0]!;
  }
  return scene.supportingCopy.trim() || null;
}

export function scenePrimaryImage(scene: RenderSpecScene): string | null {
  return scene.assets.imageUrls[0] ?? null;
}

export type IdentifiedTimelineEvent = {
  id: string;
  year: number | null;
  label: string;
  sceneNumber: number;
};

export function identifiedFactTexts(scope: string, scene: RenderSpecScene): IdentifiedText[] {
  return identifyStrings(`${scope}-fact`, scene.assets.factTexts);
}

export function identifiedTimelineEvents(
  scope: string,
  scene: RenderSpecScene,
): IdentifiedText[] {
  return scene.assets.timelineEvents
    .filter((event) => event.label)
    .map((event, sequence) => ({
      id: modelListItemId(
        `${scope}-timeline`,
        sequence,
        `${event.year ?? "na"}-${event.label}`,
      ),
      text: event.year != null ? `${event.year} — ${event.label}` : event.label,
    }));
}

export function allTimelineEvents(scenes: RenderSpecScene[]): IdentifiedTimelineEvent[] {
  const events: IdentifiedTimelineEvent[] = [];

  for (const scene of scenes) {
    for (const [sequence, event] of scene.assets.timelineEvents.entries()) {
      if (!event.label) continue;
      events.push({
        id: modelListItemId(
          `elab-timeline-${scene.sceneNumber}`,
          sequence,
          `${event.year ?? "na"}-${event.label}`,
        ),
        year: event.year,
        label: event.label,
        sceneNumber: scene.sceneNumber,
      });
    }
  }

  return events;
}

export function templateLabel(templateId: string): string {
  return templateId.replace(/_/g, " ");
}
