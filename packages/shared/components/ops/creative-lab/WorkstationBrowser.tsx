"use client";

import { useMemo } from "react";

import { backCompositionForKey } from "@/lib/ops/creative-lab/pass-back-prompt";
import { compositionForKey } from "@/lib/ops/creative-lab/concept-compositions";
import { PASS_HEIGHT, PASS_WIDTH, resolveQrPlacement } from "@/lib/ops/creative-lab/pass-layout";
import type { CreativeLabProjectFile, GeneratedPrompt, PassQrPlacement } from "@/lib/ops/creative-lab/types";
import {
  assetForPrompt,
  assetUrl,
  backPrompts,
  frontPrompts,
} from "@/lib/ops/creative-lab/workstation-state";

export type BrowserSelection =
  | { kind: "prompt"; prompt: GeneratedPrompt; side: "front" | "back" }
  | null;

type Props = {
  project: CreativeLabProjectFile;
  busy?: boolean;
  selection: BrowserSelection;
  qrPlacement?: PassQrPlacement;
  onSelect: (sel: BrowserSelection) => void;
  onSelectFront: (promptId: string) => void;
  onSelectBack: (promptId: string) => void;
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

function Thumb(props: {
  project: CreativeLabProjectFile;
  prompt: GeneratedPrompt;
  side: "front" | "back";
  label: string;
  busy?: boolean;
  isSelected: boolean;
  isApproved: boolean;
  isActiveInspect: boolean;
  qrPlacement?: PassQrPlacement;
  onClick: () => void;
}) {
  const { project, prompt, side, label, busy, isSelected, isApproved, isActiveInspect, qrPlacement, onClick } =
    props;
  const asset = assetForPrompt(project, prompt);
  const key = prompt.variationKey ?? "?";
  const placement = qrPlacement ?? resolveQrPlacement(project);

  return (
    <button
      type="button"
      className={`cl-ws__thumb${isSelected ? " cl-ws__thumb--selected" : ""}${isApproved ? " cl-ws__thumb--approved" : ""}${isActiveInspect ? " cl-ws__thumb--inspect" : ""}`}
      disabled={busy || !asset}
      onClick={onClick}
      title={label}
    >
      <span className="cl-ws__thumb-key">{side === "back" ? "Back" : "Front"} {key}</span>
      {isApproved ? <span className="cl-ws__thumb-badge">Approved</span> : null}
      {isSelected && !isApproved ? <span className="cl-ws__thumb-badge cl-ws__thumb-badge--draft">Draft</span> : null}
      {asset?.filePath?.endsWith(".png") && asset.id ? (
        <span className="cl-ws__thumb-preview">
          <img src={assetUrl(project, asset.id)} alt="" className="cl-ws__thumb-img" />
          {side === "back" ? <QrPreviewOverlay placement={placement} /> : null}
        </span>
      ) : (
        <span className="cl-ws__thumb-loading">{busy ? "…" : "—"}</span>
      )}
      <span className="cl-ws__thumb-label">{label}</span>
    </button>
  );
}

export function WorkstationBrowser(props: Props) {
  const { project, busy, selection, qrPlacement, onSelect, onSelectFront, onSelectBack } = props;

  const fronts = useMemo(() => frontPrompts(project), [project]);
  const backs = useMemo(() => backPrompts(project), [project]);
  const selectedFrontId = project.selectedConceptPromptId ?? null;
  const selectedBackId = project.selectedBackPromptId ?? null;
  const frontLocked = project.frontLocked === true;

  if (!fronts.length) {
    return (
      <section className="cl-ws__browser cl-ws__browser--empty" aria-label="Asset browser">
        <p className="ops-dim">Generate front concepts to populate the browser.</p>
      </section>
    );
  }

  return (
    <section className="cl-ws__browser" aria-label="Asset browser">
      <div className="cl-ws__browser-row">
        <h3 className="cl-ws__browser-heading">Front candidates</h3>
        <div className="cl-ws__thumb-strip">
          {fronts.map((p) => {
            const key = p.variationKey ?? "A";
            const label = compositionForKey(key, project.selectedArtDirectionId ?? undefined).label;
            const isSelected = selectedFrontId === p.id;
            const isApproved = frontLocked && project.lockedFrontPromptId === p.id;
            const isActiveInspect =
              selection?.kind === "prompt" && selection.prompt.id === p.id && selection.side === "front";
            return (
              <Thumb
                key={p.id}
                project={project}
                prompt={p}
                side="front"
                label={label}
                busy={busy}
                isSelected={isSelected}
                isApproved={isApproved}
                isActiveInspect={isActiveInspect}
                qrPlacement={qrPlacement}
                onClick={() => {
                  onSelect({ kind: "prompt", prompt: p, side: "front" });
                  if (!frontLocked) onSelectFront(p.id);
                }}
              />
            );
          })}
        </div>
      </div>

      {frontLocked && project.lockedFrontAssetId ? (
        <div className="cl-ws__browser-row cl-ws__browser-row--approved">
          <h3 className="cl-ws__browser-heading">Approved front</h3>
          <p className="cl-ws__browser-hint ops-dim">
            Concept {project.selectedConceptKey ?? "—"} — backs match this laminate.
          </p>
        </div>
      ) : null}

      {backs.length ? (
        <div className="cl-ws__browser-row">
          <h3 className="cl-ws__browser-heading">Back candidates</h3>
          <div className="cl-ws__thumb-strip">
            {backs.map((p) => {
              const key = p.variationKey ?? "A";
              const label = backCompositionForKey(key).label;
              const isSelected = selectedBackId === p.id;
              const asset = assetForPrompt(project, p);
              const isApproved =
                asset?.status === "approved" || asset?.status === "final";
              const isActiveInspect =
                selection?.kind === "prompt" && selection.prompt.id === p.id && selection.side === "back";
              return (
                <Thumb
                  key={p.id}
                  project={project}
                  prompt={p}
                  side="back"
                  label={label}
                  busy={busy}
                  isSelected={isSelected}
                  isApproved={isApproved}
                  isActiveInspect={isActiveInspect}
                  qrPlacement={qrPlacement}
                  onClick={() => {
                    onSelect({ kind: "prompt", prompt: p, side: "back" });
                    onSelectBack(p.id);
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : frontLocked ? (
        <div className="cl-ws__browser-row">
          <h3 className="cl-ws__browser-heading">Back candidates</h3>
          <p className="ops-dim">Generate matching backs to see reverse-side options here.</p>
        </div>
      ) : null}

      {selectedBackId && backs.length ? (
        <div className="cl-ws__browser-row cl-ws__browser-row--approved">
          <h3 className="cl-ws__browser-heading">Selected back</h3>
          <p className="cl-ws__browser-hint ops-dim">
            Back {project.selectedBackKey ?? "—"} paired with approved front {project.selectedConceptKey ?? "—"}.
          </p>
        </div>
      ) : null}
    </section>
  );
}
