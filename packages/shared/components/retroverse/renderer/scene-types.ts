"use client";

import type { RenderSpecScene, RenderSpecMetadata } from "@/lib/retroverse/renderer/types";

export type SceneTemplateProps = {
  scene: RenderSpecScene;
  metadata: RenderSpecMetadata;
  performanceTitle: string;
};

export function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.max(0, Math.round(sec))}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function sceneLabel(templateId: string): string {
  return templateId.replace(/_/g, " ");
}
