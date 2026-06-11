"use client";

import Link from "next/link";

import { CREATIVE_DIRECTIONS } from "@/lib/ops/content-creator/creative-direction";
import type { GenerationRating } from "@/lib/ops/content-creator/library/types";

export type GenerationCardData = {
  id: string;
  runId: string;
  timestamp: string;
  eraSlug: string;
  eraName: string;
  creativeDirection: string;
  event: string;
  venue: string;
  favorite: boolean;
  rating: GenerationRating | null;
  notes: string;
  tags: string[];
  hasExport: boolean;
  thumbnailUrl: string;
  parentGenerationId: string | null;
  variationBatchId?: string | null;
  quality: {
    promptCharCount: number;
    variationScore: string;
    clicheRisk: string;
  };
};

type Props = {
  item: GenerationCardData;
  onCuratorChange: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onExport: (id: string) => Promise<void>;
  onVariations: (id: string, count: number) => Promise<void>;
  onViewBatch?: (batchId: string) => void;
};

const VARIATION_COUNT = 10;

export function GenerationCard({ item, onCuratorChange, onExport, onVariations, onViewBatch }: Props) {
  const dirLabel =
    CREATIVE_DIRECTIONS[item.creativeDirection as keyof typeof CREATIVE_DIRECTIONS]?.label ??
    item.creativeDirection;

  const openHref = `/ops/content-creator/create?runId=${encodeURIComponent(item.runId)}`;

  return (
    <article className="cc-library-card">
      <div className="cc-library-card__visual">
        <Link href={openHref} className="cc-library-card__thumb-link" aria-label={`Open ${item.event}`}>
          <img src={item.thumbnailUrl} alt="" className="cc-library-card__thumb" loading="lazy" />
        </Link>
        <button
          type="button"
          className={`cc-library-card__fav${item.favorite ? " is-on" : ""}`}
          aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => void onCuratorChange(item.id, { favorite: !item.favorite })}
        >
          ★
        </button>
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
      </div>

      <div className="cc-library-card__body">
        <h2 className="cc-library-card__title">{item.event}</h2>
        <p className="cc-library-card__meta">
          {item.eraName} · {dirLabel}
        </p>
      </div>

      <div className="cc-library-card__actions">
        <Link href={openHref} className="cc-library-card__action">
          Open
        </Link>
        <Link
          href={`/ops/content-creator/create?duplicate=${encodeURIComponent(item.id)}`}
          className="cc-library-card__action"
        >
          Duplicate
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
    </article>
  );
}
