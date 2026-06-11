"use client";

import Link from "next/link";
import { useState } from "react";

import { GenerationQualityBadges } from "@/components/ops/content-creator/GenerationQualityBadges";
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
};

export function GenerationCard({ item, onCuratorChange, onExport, onVariations }: Props) {
  const [notes, setNotes] = useState(item.notes);
  const [tagsText, setTagsText] = useState(item.tags.join(", "));
  const [expanded, setExpanded] = useState(false);
  const [varCount, setVarCount] = useState(5);

  const dirLabel =
    CREATIVE_DIRECTIONS[item.creativeDirection as keyof typeof CREATIVE_DIRECTIONS]?.label ??
    item.creativeDirection;

  async function saveCurator() {
    await onCuratorChange(item.id, {
      notes,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <article className="cc-generations__card">
      <div className="cc-generations__thumb-wrap">
        <img src={item.thumbnailUrl} alt="" className="cc-generations__thumb" />
        <button
          type="button"
          className={`cc-generations__fav${item.favorite ? " is-on" : ""}`}
          aria-label={item.favorite ? "Remove favorite" : "Favorite"}
          onClick={() => void onCuratorChange(item.id, { favorite: !item.favorite })}
        >
          ★
        </button>
        {item.parentGenerationId ? (
          <span className="cc-generations__variation-pill">Variation</span>
        ) : null}
      </div>

      <div className="cc-generations__meta">
        <h2>{item.event}</h2>
        <p>{item.venue}</p>
        <GenerationQualityBadges
          eraName={item.eraName}
          creativeDirectionLabel={dirLabel}
          timestamp={item.timestamp}
          quality={{
            promptCharCount: item.quality.promptCharCount,
            variationScore: item.quality.variationScore as "low" | "medium" | "high",
            clicheRisk: item.quality.clicheRisk as "low" | "medium" | "high",
          }}
        />
        <div className="cc-generations__rating" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`cc-generations__star${item.rating === n ? " is-on" : ""}`}
              aria-label={`Rate ${n}`}
              onClick={() => void onCuratorChange(item.id, { rating: item.rating === n ? null : n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="cc-generations__curator">
        <button
          type="button"
          className="cc-generations__expand"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide notes & tags" : "Notes & tags"}
        </button>
        {expanded ? (
          <>
            <textarea
              className="cc-generations__notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Curator notes…"
              rows={3}
            />
            <input
              className="cc-generations__tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="tags, comma, separated"
            />
            <button type="button" className="cc-creator__btn cc-creator__btn--secondary" onClick={() => void saveCurator()}>
              Save
            </button>
          </>
        ) : null}
      </div>

      <div className="cc-generations__actions">
        <Link
          href={`/ops/content-creator/create?duplicate=${encodeURIComponent(item.id)}`}
          className="cc-creator__btn cc-creator__btn--secondary"
        >
          Duplicate
        </Link>
        <Link
          href={`/ops/content-creator/create?runId=${encodeURIComponent(item.runId)}`}
          className="cc-creator__btn cc-creator__btn--secondary"
        >
          Open
        </Link>
        <button
          type="button"
          className="cc-creator__btn cc-creator__btn--generate"
          onClick={() => void onVariations(item.id, varCount)}
        >
          Variations ({varCount})
        </button>
        <input
          type="range"
          min={1}
          max={10}
          value={varCount}
          onChange={(e) => setVarCount(Number(e.target.value))}
          className="cc-generations__var-slider"
          aria-label="Variation count"
        />
        <button
          type="button"
          className="cc-creator__btn cc-creator__btn--export"
          onClick={() => void onExport(item.id)}
        >
          {item.hasExport ? "Re-export" : "Export"}
        </button>
      </div>
    </article>
  );
}
