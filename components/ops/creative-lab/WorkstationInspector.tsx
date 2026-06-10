"use client";

import type { CreativeLabAsset, CreativeLabProjectFile, GeneratedPrompt } from "@/lib/ops/creative-lab/types";
import {
  assetForPrompt,
  assetUrl,
  deriveWorkstationStatus,
} from "@/lib/ops/creative-lab/workstation-state";
import { visualWorldById } from "@/lib/ops/creative-lab/visual-worlds";

type InspectorTarget =
  | { kind: "prompt"; prompt: GeneratedPrompt; side: "front" | "back" }
  | { kind: "asset"; asset: CreativeLabAsset; side: "front" | "back" }
  | null;

type Props = {
  project: CreativeLabProjectFile | null;
  target: InspectorTarget;
};

function draftOrApproved(
  project: CreativeLabProjectFile,
  asset: CreativeLabAsset | undefined,
  side: "front" | "back",
): string {
  if (side === "front" && project.frontLocked && project.lockedFrontAssetId === asset?.id) {
    return "Approved";
  }
  if (asset?.status === "approved" || asset?.status === "final") return "Approved";
  if (side === "front" && project.selectedConceptPromptId) return "Draft";
  if (side === "back" && project.selectedBackPromptId) return "Draft";
  return "Generated";
}

export function WorkstationInspector(props: Props) {
  const { project, target } = props;

  if (!project || !target) {
    return (
      <aside className="cl-ws__inspector cl-ws__inspector--empty" aria-label="Inspector">
        <h3>Inspector</h3>
        <p className="ops-dim">Select a front or back thumbnail to inspect.</p>
      </aside>
    );
  }

  const prompt = target.kind === "prompt" ? target.prompt : undefined;
  const asset =
    target.kind === "asset"
      ? target.asset
      : prompt
        ? assetForPrompt(project, prompt)
        : undefined;
  const side = target.side;
  const status = deriveWorkstationStatus(project);
  const world = visualWorldById(project.selectedArtDirectionId);

  return (
    <aside className="cl-ws__inspector" aria-label="Inspector">
      <h3>Inspector</h3>
      {asset?.id && asset.filePath?.endsWith(".png") ? (
        <img
          src={assetUrl(project, asset.id)}
          alt=""
          className="cl-ws__inspector-img"
        />
      ) : (
        <div className="cl-ws__inspector-placeholder">No preview</div>
      )}
      <dl className="cl-ws__inspector-dl">
        <dt>Project</dt>
        <dd>{project.name}</dd>
        <dt>Asset type</dt>
        <dd>{asset?.type ?? (side === "back" ? "pass-back" : "pass-front")}</dd>
        <dt>Side</dt>
        <dd>{side === "back" ? "Back" : "Front"}</dd>
        <dt>Status</dt>
        <dd>{draftOrApproved(project, asset, side)}</dd>
        <dt>Concept</dt>
        <dd>{prompt?.variationKey ?? asset?.concept ?? "—"}</dd>
        <dt>Visual world</dt>
        <dd>{world.title}</dd>
        <dt>Generated</dt>
        <dd>{asset?.createdAt ? new Date(asset.createdAt).toLocaleString() : "—"}</dd>
        <dt>Export readiness</dt>
        <dd>{status.exportStatus}</dd>
      </dl>
    </aside>
  );
}
