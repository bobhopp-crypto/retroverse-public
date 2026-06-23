"use client";

import type { CreativeLabAsset, CreativeLabProjectFile, GeneratedPrompt } from "@/lib/ops/creative-lab/types";
import { PASS_HEIGHT, PASS_WIDTH, resolveQrPlacement } from "@/lib/ops/creative-lab/pass-layout";
import type { PassQrPlacement } from "@/lib/ops/creative-lab/types";
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
  qrPlacement?: PassQrPlacement;
};

function QrPreviewOverlay({ placement }: { placement: PassQrPlacement }) {
  return (
    <span
      className="cl-qr-preview"
      aria-hidden
      style={{
        left: `${(placement.left / PASS_WIDTH) * 100}%`,
        top: `${(placement.top / PASS_HEIGHT) * 100}%`,
        width: `${(placement.size / PASS_WIDTH) * 100}%`,
        height: `${(placement.size / PASS_HEIGHT) * 100}%`,
      }}
    />
  );
}

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
  const { project, target, qrPlacement } = props;

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
  const placement = qrPlacement ?? resolveQrPlacement(project);

  return (
    <aside className="cl-ws__inspector" aria-label="Inspector">
      <h3>Inspector</h3>
      {asset?.id && asset.filePath?.endsWith(".png") ? (
        <span className="cl-ws__inspector-preview">
          <img
            src={assetUrl(project, asset.id)}
            alt=""
            className="cl-ws__inspector-img"
          />
          {side === "back" ? <QrPreviewOverlay placement={placement} /> : null}
        </span>
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
