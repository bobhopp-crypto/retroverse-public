"use client";

import { effectiveTemplateId } from "@/lib/retroverse/renderer/supported-templates";
import type { RenderSpecScene, RenderSpecMetadata } from "@/lib/retroverse/renderer/types";

import { ClosingScene } from "./templates/ClosingScene";
import { FactStackScene } from "./templates/FactStackScene";
import { GalleryScene } from "./templates/GalleryScene";
import { HeroScene } from "./templates/HeroScene";
import { PerformanceScene } from "./templates/PerformanceScene";
import { QuoteScene } from "./templates/QuoteScene";
import { StoryScene } from "./templates/StoryScene";
import { TimelineScene } from "./templates/TimelineScene";

type Props = {
  scene: RenderSpecScene;
  metadata: RenderSpecMetadata;
  performanceTitle: string;
};

export function SceneRenderer({ scene, metadata, performanceTitle }: Props) {
  const templateId = effectiveTemplateId(scene.templateId);
  const props = { scene, metadata, performanceTitle };

  switch (templateId) {
    case "hero":
      return <HeroScene {...props} />;
    case "timeline":
      return <TimelineScene {...props} />;
    case "gallery":
      return <GalleryScene {...props} />;
    case "performance":
      return <PerformanceScene {...props} />;
    case "quote":
      return <QuoteScene {...props} />;
    case "fact_stack":
      return <FactStackScene {...props} />;
    case "closing":
      return <ClosingScene {...props} />;
    case "story":
    default:
      return <StoryScene {...props} />;
  }
}
