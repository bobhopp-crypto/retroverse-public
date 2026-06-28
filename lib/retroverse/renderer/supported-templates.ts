import type { SceneTemplateId } from "@/lib/ops/studio/director/scene-template-library";

/** Templates implemented in Renderer 0.1 */
export const RENDERER_SUPPORTED_TEMPLATES = new Set<SceneTemplateId>([
  "hero",
  "story",
  "timeline",
  "gallery",
  "performance",
  "quote",
  "fact_stack",
  "closing",
]);

export function isRendererSupportedTemplate(templateId: string): templateId is SceneTemplateId {
  return RENDERER_SUPPORTED_TEMPLATES.has(templateId as SceneTemplateId);
}

/** Unsupported templates render with Story layout */
export function effectiveTemplateId(templateId: string): SceneTemplateId {
  if (isRendererSupportedTemplate(templateId)) return templateId;
  return "story";
}
