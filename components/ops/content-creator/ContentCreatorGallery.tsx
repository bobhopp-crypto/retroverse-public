"use client";

import { useMemo } from "react";

import { backCompositionForKey } from "@/lib/ops/creative-lab/pass-back-prompt";
import { compositionForKey } from "@/lib/ops/creative-lab/concept-compositions";
import type { CreativeLabProjectFile, GeneratedPrompt } from "@/lib/ops/creative-lab/types";
import {
  assetForPrompt,
  assetUrl,
  backPrompts,
  frontPrompts,
} from "@/lib/ops/creative-lab/workstation-state";

type GalleryItem = {
  prompt: GeneratedPrompt;
  side: "front" | "back";
  label: string;
};

type Props = {
  project: CreativeLabProjectFile | null;
  busy?: boolean;
  onSelectFront: (promptId: string) => void;
  onSelectBack: (promptId: string) => void;
};

function GalleryTile(props: {
  project: CreativeLabProjectFile;
  item: GalleryItem;
  selected: boolean;
  approved: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  const { project, item, selected, approved, busy, onClick } = props;
  const asset = assetForPrompt(project, item.prompt);
  const key = item.prompt.variationKey ?? "?";

  return (
    <button
      type="button"
      className={`cc-tile${selected ? " cc-tile--selected" : ""}${approved ? " cc-tile--approved" : ""}${asset?.textAudit?.status === "fail" ? " cc-tile--violation" : ""}${selected && !approved ? " cc-tile--pick" : ""}`}
      disabled={busy || !asset}
      onClick={onClick}
    >
      <div className="cc-tile__frame">
        {asset?.filePath?.endsWith(".png") && asset.id ? (
          <img src={assetUrl(project, asset.id)} alt="" className="cc-tile__img" />
        ) : (
          <span className="cc-tile__placeholder">{busy ? "…" : "—"}</span>
        )}
        {asset?.textAudit?.status === "fail" ? (
          <span className="cc-tile__stamp cc-tile__stamp--violation">⚠ Text violation</span>
        ) : null}
        {approved ? <span className="cc-tile__stamp cc-tile__stamp--approved">✓ Approved</span> : null}
        {!approved && selected && asset?.textAudit?.status !== "fail" ? (
          <span className="cc-tile__stamp cc-tile__stamp--pick">★ Selected</span>
        ) : null}
      </div>
      <span className="cc-tile__caption">
        <strong>{item.side === "back" ? "Back" : "Front"} {key}</strong>
        <span>{item.label}</span>
      </span>
    </button>
  );
}

export function ContentCreatorGallery({ project, busy, onSelectFront, onSelectBack }: Props) {
  const fronts = useMemo(() => (project ? frontPrompts(project) : []), [project]);
  const backs = useMemo(() => (project ? backPrompts(project) : []), [project]);

  if (!project || (!fronts.length && !backs.length)) return null;

  const frontLocked = project.frontLocked === true;
  const selectedFrontId = project.selectedConceptPromptId ?? null;
  const selectedBackId = project.selectedBackPromptId ?? null;

  const items: GalleryItem[] = [
    ...fronts.map((prompt) => ({
      prompt,
      side: "front" as const,
      label: compositionForKey(prompt.variationKey ?? "A", project.selectedArtDirectionId ?? undefined).label,
    })),
    ...backs.map((prompt) => ({
      prompt,
      side: "back" as const,
      label: backCompositionForKey(prompt.variationKey ?? "A").label,
    })),
  ];

  const heroItem =
    items.find((i) => i.prompt.id === selectedBackId) ??
    items.find((i) => i.prompt.id === selectedFrontId) ??
    items[0];

  const heroAsset = heroItem ? assetForPrompt(project, heroItem.prompt) : undefined;

  const heroSelected =
    heroItem &&
    (heroItem.side === "front"
      ? selectedFrontId === heroItem.prompt.id
      : selectedBackId === heroItem.prompt.id);

  const heroApproved =
    heroItem &&
    (heroItem.side === "front"
      ? frontLocked && project.lockedFrontPromptId === heroItem.prompt.id
      : (() => {
          const asset = assetForPrompt(project, heroItem.prompt);
          return asset?.status === "approved" || asset?.status === "final";
        })());

  const heroClass = [
    "cc-gallery__hero",
    heroApproved ? "cc-gallery__hero--approved" : "",
    heroSelected && !heroApproved ? "cc-gallery__hero--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="cc-gallery">
      <div className={heroClass} aria-label="Selected preview">
        {heroAsset?.filePath?.endsWith(".png") && heroAsset.id ? (
          <img
            src={assetUrl(project, heroAsset.id)}
            alt=""
            className="cc-gallery__hero-img"
          />
        ) : (
          <div className="cc-gallery__hero-empty">Select a candidate</div>
        )}
        {heroItem ? (
          <>
            {heroApproved ? (
              <span className="cc-gallery__hero-badge cc-gallery__hero-badge--approved">✓ Approved</span>
            ) : heroSelected ? (
              <span className="cc-gallery__hero-badge cc-gallery__hero-badge--selected">★ Selected</span>
            ) : null}
            <p className="cc-gallery__hero-caption">
              {heroItem.side === "back" ? "Back" : "Front"} {heroItem.prompt.variationKey} · {heroItem.label}
            </p>
          </>
        ) : null}
      </div>

      <div className="cc-gallery__grid">
        {fronts.length ? <h3 className="cc-gallery__section">Front options</h3> : null}
        <div className="cc-gallery__row" role="list" aria-label="Front candidates">
        {items.filter((i) => i.side === "front").map((item) => {
          const isSelected = selectedFrontId === item.prompt.id;
          const isApproved = frontLocked && project.lockedFrontPromptId === item.prompt.id;
          return (
            <GalleryTile
              key={item.prompt.id}
              project={project}
              item={item}
              selected={isSelected}
              approved={isApproved}
              busy={busy}
              onClick={() => {
                if (!frontLocked) onSelectFront(item.prompt.id);
              }}
            />
          );
        })}
        </div>
        {backs.length ? <h3 className="cc-gallery__section">Back options</h3> : null}
        <div className="cc-gallery__row" role="list" aria-label="Back candidates">
        {items.filter((i) => i.side === "back").map((item) => {
          const isSelected = selectedBackId === item.prompt.id;
          const isApproved = (() => {
            const asset = assetForPrompt(project, item.prompt);
            return asset?.status === "approved" || asset?.status === "final";
          })();
          return (
            <GalleryTile
              key={item.prompt.id}
              project={project}
              item={item}
              selected={isSelected}
              approved={isApproved}
              busy={busy}
              onClick={() => onSelectBack(item.prompt.id)}
            />
          );
        })}
        </div>
      </div>
    </div>
  );
}
