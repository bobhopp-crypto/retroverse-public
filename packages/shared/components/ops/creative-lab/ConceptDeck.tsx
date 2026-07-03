"use client";

import { useMemo } from "react";

import { backCompositionForKey } from "@/lib/ops/creative-lab/pass-back-prompt";
import { compositionForKey } from "@/lib/ops/creative-lab/concept-compositions";
import type { CreativeLabProjectFile, GeneratedPrompt } from "@/lib/ops/creative-lab/types";
import { visualWorldById } from "@/lib/ops/creative-lab/visual-worlds";

type Props = {
  prompts: GeneratedPrompt[];
  project: CreativeLabProjectFile;
  busy?: boolean;
  onSelectFront: (promptId: string) => void;
  onLockFront: () => void;
  onGenerateBacks: () => void;
  onSelectBack: (promptId: string) => void;
  onExportPackage: () => void;
};

function assetUrl(project: CreativeLabProjectFile, assetId: string): string {
  const slug = project.folderSlug || project.id;
  return `/api/ops/creative-lab/projects/${encodeURIComponent(slug)}/assets/${encodeURIComponent(assetId)}`;
}

function assetForPrompt(project: CreativeLabProjectFile, prompt: GeneratedPrompt) {
  if (prompt.assetId) {
    const linked = project.assets.find((a) => a.id === prompt.assetId);
    if (linked?.filePath?.endsWith(".png")) return linked;
  }
  return project.assets.find((a) => a.promptId === prompt.id && a.filePath?.endsWith(".png"));
}

function missingImageLabel(
  project: CreativeLabProjectFile,
  prompt: GeneratedPrompt,
  busy?: boolean,
): string {
  if (busy) return "Generating…";
  const linked = project.assets.find((a) => a.id === prompt.assetId || a.promptId === prompt.id);
  if (linked?.filePath?.includes("placeholder")) return "No image — placeholder asset only";
  return "No image — generation did not produce a PNG";
}

function PassCardGrid(props: {
  concepts: GeneratedPrompt[];
  project: CreativeLabProjectFile;
  busy?: boolean;
  selectedId: string | null;
  side: "front" | "back";
  worldTitle: string;
  onSelect: (promptId: string) => void;
}) {
  const { concepts, project, busy, selectedId, side, worldTitle, onSelect } = props;

  return (
    <div className="cl-pass-deck__grid">
      {concepts.map((p) => {
        const key = p.variationKey ?? "A";
        const label =
          side === "back"
            ? backCompositionForKey(key).label
            : compositionForKey(key, project.selectedArtDirectionId ?? undefined).label;
        const asset = assetForPrompt(project, p);
        const isWinner = selectedId === p.id;
        return (
          <article
            key={p.id}
            className={`cl-pass-card${isWinner ? " cl-pass-card--selected" : ""}`}
          >
            <div className="cl-pass-card__frame">
              {asset?.filePath?.endsWith(".png") && asset.id ? (
                <img
                  src={assetUrl(project, asset.id)}
                  alt={`${side === "back" ? "Back" : "Front"} ${key} — ${label}`}
                  className="cl-pass-card__img"
                />
              ) : (
                <div className="cl-pass-card__loading">{missingImageLabel(project, p, busy)}</div>
              )}
              <span className="cl-pass-card__key">{side === "back" ? "Back" : "Concept"} {key}</span>
            </div>
            <div className="cl-pass-card__body">
              <h3>{label}</h3>
              <p className="ops-dim">{p.conceptSummary}</p>
              <button
                type="button"
                className={`cl-pass-card__select${isWinner ? " cl-pass-card__select--on" : ""}`}
                disabled={busy || !asset || (side === "front" && project.frontLocked === true)}
                onClick={() => onSelect(p.id)}
              >
                {isWinner
                  ? side === "back"
                    ? "✓ BACK SELECTED"
                    : "✓ FRONT SELECTED"
                  : side === "back"
                    ? "USE THIS BACK"
                    : "USE THIS FRONT"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ConceptDeck(props: Props) {
  const {
    prompts,
    project,
    busy,
    onSelectFront,
    onLockFront,
    onGenerateBacks,
    onSelectBack,
    onExportPackage,
  } = props;

  const frontSetId =
    project.frontVariationSetId ??
    prompts.find((p) => (p.passSide ?? "front") !== "back")?.variationSetId;
  const frontConcepts = useMemo(() => {
    if (!frontSetId) return prompts.filter((p) => (p.passSide ?? "front") !== "back").slice(0, 4);
    return prompts.filter(
      (p) => (p.passSide ?? "front") !== "back" && p.variationSetId === frontSetId,
    );
  }, [prompts, frontSetId]);

  const backConcepts = useMemo(() => {
    if (!project.backVariationSetId) return [];
    return prompts.filter(
      (p) => p.passSide === "back" && p.variationSetId === project.backVariationSetId,
    );
  }, [prompts, project.backVariationSetId]);

  const selectedFrontId = project.selectedConceptPromptId ?? null;
  const selectedBackId = project.selectedBackPromptId ?? null;
  const world = visualWorldById(project.selectedArtDirectionId);
  const frontLocked = project.frontLocked === true;
  const lockedFrontAsset = project.lockedFrontAssetId
    ? project.assets.find((a) => a.id === project.lockedFrontAssetId)
    : undefined;

  if (!frontConcepts.length) return null;

  return (
    <section className="cl-concept-deck cl-pass-deck" aria-label="Pass front/back workflow">
      {!frontLocked ? (
        <>
          <header className="cl-concept-deck__head">
            <h2>Step 4 — Front concepts A–D</h2>
            <p className="ops-dim">
              Four illustrated fronts in <strong>{world.title}</strong> — select one, then lock it.
            </p>
          </header>
          <PassCardGrid
            concepts={frontConcepts}
            project={project}
            busy={busy}
            selectedId={selectedFrontId}
            side="front"
            worldTitle={world.title}
            onSelect={onSelectFront}
          />
          {selectedFrontId ? (
            <section className="cl-refine-cta">
              <h3 className="cl-refine-cta__title">LOCK FRONT</h3>
              <p className="cl-refine-cta__desc">
                Approve your selected front — back generation unlocks after lock.
              </p>
              <button
                type="button"
                className="cl-refine-cta__btn"
                disabled={busy}
                onClick={onLockFront}
              >
                LOCK FRONT & CONTINUE
              </button>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <header className="cl-concept-deck__head">
            <h2>Locked front</h2>
            <p className="ops-dim">
              Approved front in <strong>{world.title}</strong> — generate matching backs.
            </p>
          </header>
          {lockedFrontAsset?.id ? (
            <div className="cl-pass-deck__locked-front">
              <img
                src={assetUrl(project, lockedFrontAsset.id)}
                alt="Locked front pass"
                className="cl-pass-card__img cl-pass-card__img--locked"
              />
            </div>
          ) : null}

          {!backConcepts.length ? (
            <section className="cl-refine-cta">
              <h3 className="cl-refine-cta__title">GENERATE MATCHING BACKS</h3>
              <p className="cl-refine-cta__desc">
                Four reverse-side layouts using your locked front, palette, typography, and event
                metadata.
              </p>
              <button
                type="button"
                className="cl-refine-cta__btn"
                disabled={busy}
                onClick={onGenerateBacks}
              >
                GENERATE 4 MATCHING BACKS
              </button>
            </section>
          ) : (
            <>
              <header className="cl-concept-deck__head">
                <h2>Step 5 — Back concepts A–D</h2>
                <p className="cl-concept-deck__inherit ops-dim">
                  Reverse side of your locked front — same visual world, palette, and laminate
                  language
                </p>
              </header>
              <PassCardGrid
                concepts={backConcepts}
                project={project}
                busy={busy}
                selectedId={selectedBackId}
                side="back"
                worldTitle={world.title}
                onSelect={onSelectBack}
              />
              {selectedBackId ? (
                <section className="cl-refine-cta">
                  <h3 className="cl-refine-cta__title">EXPORT PACKAGE</h3>
                  <p className="cl-refine-cta__desc">
                    Front + back approved and zipped with project metadata.
                  </p>
                  <button
                    type="button"
                    className="cl-refine-cta__btn cl-refine-cta__btn--export"
                    disabled={busy}
                    onClick={onExportPackage}
                  >
                    EXPORT PASS PACKAGE
                  </button>
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  );
}
