"use client";

import Link from "next/link";
import { useState } from "react";

import { CREATIVE_DIRECTIONS } from "@/lib/ops/content-creator/creative-direction";
import type {
  GenerationProductionSnapshot,
  GenerationRating,
  GenerationStatus,
  GenerationTemplateMetadata,
} from "@/lib/ops/content-creator/library/types";

export type GenerationCardData = {
  id: string;
  runId: string;
  timestamp: string;
  eraSlug: string;
  eraName: string;
  creativeDirection: string;
  event: string;
  venue: string;
  status: GenerationStatus;
  favorite: boolean;
  rating: GenerationRating | null;
  notes: string;
  tags: string[];
  collections: string[];
  template: GenerationTemplateMetadata;
  hasExport: boolean;
  thumbnailUrl: string;
  parentGenerationId: string | null;
  variationBatchId?: string | null;
  quality: {
    promptCharCount: number;
    variationScore: string;
    clicheRisk: string;
  };
  production: GenerationProductionSnapshot;
};

type Props = {
  item: GenerationCardData;
  onCuratorChange: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onExport: (id: string) => Promise<void>;
  onVariations: (id: string, count: number) => Promise<void>;
  onViewBatch?: (batchId: string) => void;
  selected?: boolean;
  onSelectedChange?: (id: string, selected: boolean) => void;
  density?: "cards" | "compact";
};

const VARIATION_COUNT = 10;
const STATUS_LABELS: Record<GenerationStatus, string> = {
  review: "Review",
  approved: "Approved",
  production_ready: "Production ready",
  archived: "Archived",
};

export function GenerationCard({
  item,
  onCuratorChange,
  onExport,
  onVariations,
  onViewBatch,
  selected = false,
  onSelectedChange,
  density = "cards",
}: Props) {
  const [notesDraft, setNotesDraft] = useState(item.notes);
  const [tagsDraft, setTagsDraft] = useState(item.tags.join(", "));
  const [collectionsDraft, setCollectionsDraft] = useState(item.collections.join(", "));
  const [templateNameDraft, setTemplateNameDraft] = useState(item.template.templateName || item.event);
  const [templateNotesDraft, setTemplateNotesDraft] = useState(item.template.templateNotes);
  const dirLabel =
    CREATIVE_DIRECTIONS[item.creativeDirection as keyof typeof CREATIVE_DIRECTIONS]?.label ??
    item.creativeDirection;

  const openHref = `/ops/content-creator/create?runId=${encodeURIComponent(item.runId)}`;

  return (
    <article className={`cc-library-card cc-library-card--${density} cc-library-card--${item.status}`}>
      <div className="cc-library-card__visual">
        <Link href={openHref} className="cc-library-card__thumb-link" aria-label={`Open ${item.event}`}>
          <img src={item.thumbnailUrl} alt="" className="cc-library-card__thumb" loading="lazy" />
        </Link>
        {onSelectedChange ? (
          <label className="cc-library-card__select" aria-label={`Select ${item.event}`}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelectedChange(item.id, e.target.checked)}
            />
          </label>
        ) : null}
        <button
          type="button"
          className={`cc-library-card__fav${item.favorite ? " is-on" : ""}`}
          aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => void onCuratorChange(item.id, { favorite: !item.favorite })}
        >
          ★
        </button>
        <span className={`cc-library-card__status cc-library-card__status--${item.status}`}>
          {STATUS_LABELS[item.status]}
        </span>
        <div className="cc-library-card__rating" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`cc-library-card__star${(item.rating ?? 0) >= n ? " is-on" : ""}`}
              aria-label={`Rate ${n}`}
              onClick={() => void onCuratorChange(item.id, { rating: item.rating === n ? null : n })}
            >
              ★
            </button>
          ))}
        </div>
        {item.parentGenerationId ? <span className="cc-library-card__badge">Var</span> : null}
        {item.template.isTemplate ? <span className="cc-library-card__badge cc-library-card__badge--template">Template</span> : null}
      </div>

      <div className="cc-library-card__body">
        <h2 className="cc-library-card__title">{item.event}</h2>
        <p className="cc-library-card__meta">
          {item.eraName} · {dirLabel}
        </p>
        <p className="cc-library-card__meta">
          {item.hasExport ? `Exported · QR ${item.production.qrStatus.replace("_", " ")}` : "Not exported"}
          {item.collections.length ? ` · ${item.collections.join(", ")}` : ""}
        </p>
        {item.tags.length ? (
          <div className="cc-library-card__tags">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="cc-library-card__actions">
        <Link href={openHref} className="cc-library-card__action">
          Open
        </Link>
        {item.status !== "approved" && item.status !== "production_ready" ? (
          <button
            type="button"
            className="cc-library-card__action cc-library-card__action--approve"
            onClick={() => void onCuratorChange(item.id, { status: "approved" })}
          >
            Approve
          </button>
        ) : item.hasExport && item.status !== "production_ready" ? (
          <button
            type="button"
            className="cc-library-card__action cc-library-card__action--approve"
            onClick={() => void onCuratorChange(item.id, { status: "production_ready" })}
          >
            Ready
          </button>
        ) : null}
        <Link
          href={`/ops/content-creator/create?duplicate=${encodeURIComponent(item.id)}`}
          className="cc-library-card__action"
        >
          {item.template.isTemplate ? "Use Template" : "Duplicate"}
        </Link>
        <button
          type="button"
          className="cc-library-card__action cc-library-card__action--accent"
          onClick={() => void onVariations(item.id, VARIATION_COUNT)}
        >
          Variations
        </button>
        <button
          type="button"
          className="cc-library-card__action cc-library-card__action--export"
          onClick={() => void onExport(item.id)}
        >
          Export
        </button>
        <button
          type="button"
          className="cc-library-card__action"
          onClick={() => void onCuratorChange(item.id, { status: item.status === "archived" ? "review" : "archived" })}
        >
          {item.status === "archived" ? "Restore" : "Archive"}
        </button>
        {item.variationBatchId && onViewBatch ? (
          <button
            type="button"
            className="cc-library-card__action cc-library-card__action--batch"
            onClick={() => onViewBatch(item.variationBatchId!)}
          >
            Batch
          </button>
        ) : null}
      </div>
      <details className="cc-library-card__details">
        <summary>Metadata</summary>
        <label>
          Notes
          <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={3} />
        </label>
        <label>
          Tags
          <input value={tagsDraft} onChange={(e) => setTagsDraft(e.target.value)} placeholder="tag, tag" />
        </label>
        <label>
          Collections
          <input
            value={collectionsDraft}
            onChange={(e) => setCollectionsDraft(e.target.value)}
            placeholder="event, campaign"
          />
        </label>
        <label className="cc-library-card__checkbox-row">
          <input
            type="checkbox"
            checked={item.template.isTemplate}
            onChange={(e) =>
              void onCuratorChange(item.id, {
                template: {
                  isTemplate: e.target.checked,
                  templateName: templateNameDraft,
                  templateNotes: templateNotesDraft,
                },
              })
            }
          />
          Reuse as template
        </label>
        {item.template.isTemplate ? (
          <>
            <label>
              Template name
              <input value={templateNameDraft} onChange={(e) => setTemplateNameDraft(e.target.value)} />
            </label>
            <label>
              Template notes
              <textarea value={templateNotesDraft} onChange={(e) => setTemplateNotesDraft(e.target.value)} rows={2} />
            </label>
          </>
        ) : null}
        <button
          type="button"
          className="cc-library-card__save"
          onClick={() =>
            void onCuratorChange(item.id, {
              notes: notesDraft,
              tags: tagsDraft.split(",").map((tag) => tag.trim()).filter(Boolean),
              collections: collectionsDraft.split(",").map((collection) => collection.trim()).filter(Boolean),
              template: {
                isTemplate: item.template.isTemplate,
                templateName: templateNameDraft,
                templateNotes: templateNotesDraft,
              },
            })
          }
        >
          Save metadata
        </button>
      </details>
    </article>
  );
}
