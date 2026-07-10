/** Client-side render pipeline tracing for retroverse.live playhead → stage routing. */

export type PresentationRenderStep =
  | "BroadcastViewer"
  | "normalizePlayheadPayload"
  | "PresentationStage"
  | "resolveBroadcastAsset";

export type PresentationRenderTrace = {
  step: PresentationRenderStep;
  experience: string;
  itemType: string | null;
  rvbaType: string | null;
  broadcastSourceId: string | null;
  component: string;
  detail?: string;
};

const LOG_PREFIX = "[retroverse-live/render]";

export function tracePresentationRender(trace: PresentationRenderTrace): void {
  if (typeof console === "undefined" || typeof console.info !== "function") return;
  console.info(LOG_PREFIX, {
    step: trace.step,
    experience: trace.experience,
    itemType: trace.itemType,
    rvbaType: trace.rvbaType,
    broadcastSourceId: trace.broadcastSourceId,
    component: trace.component,
    ...(trace.detail ? { detail: trace.detail } : {}),
  });
}
