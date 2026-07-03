"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { GenerationCardData } from "@/components/ops/content-creator/GenerationCard";
import { CREATIVE_DIRECTIONS } from "@/lib/ops/content-creator/creative-direction";

type Props = {
  batchId: string;
  items: GenerationCardData[];
  parent: GenerationCardData | null;
  onCuratorChange: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onExport: (id: string) => Promise<void>;
  onVariations: (id: string, count: number) => Promise<void>;
  onClose: () => void;
};

export function VariationBatchView({
  batchId,
  items,
  parent,
  onCuratorChange,
  onExport,
  onVariations,
  onClose,
}: Props) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [varCount] = useState(10);

  const children = useMemo(
    () => items.filter((i) => i.parentGenerationId && (parent ? i.parentGenerationId === parent.id : true)),
    [items, parent],
  );

  const compareItems = children.filter((c) => compareIds.includes(c.id));

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  return (
    <section className="cc-batch" aria-label="Variation batch">
      <header className="cc-batch__head">
        <div>
          <h2>Variation batch</h2>
          <p>{batchId}</p>
        </div>
        <button type="button" className="cc-batch__close" onClick={onClose}>
          Close
        </button>
      </header>

      {parent ? (
        <div className="cc-batch__parent">
          <h3>Parent</h3>
          <div className="cc-batch__parent-card">
            <img src={parent.thumbnailUrl} alt="" />
            <div>
              <strong>{parent.event}</strong>
              <p>
                {parent.eraName} ·{" "}
                {CREATIVE_DIRECTIONS[parent.creativeDirection as keyof typeof CREATIVE_DIRECTIONS]?.label ??
                  parent.creativeDirection}
              </p>
              <div className="cc-batch__parent-actions">
                <Link href={`/ops/content-creator/create?runId=${encodeURIComponent(parent.runId)}`}>Open</Link>
                <button type="button" onClick={() => void onVariations(parent.id, varCount)}>
                  More variations ({varCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="cc-batch__tree">
        <h3>Variations ({children.length})</h3>
        <ul className="cc-batch__list">
          {children.map((child, i) => (
            <li key={child.id} className="cc-batch__item">
              <label className="cc-batch__compare-check">
                <input
                  type="checkbox"
                  checked={compareIds.includes(child.id)}
                  onChange={() => toggleCompare(child.id)}
                />
                Compare
              </label>
              <img src={child.thumbnailUrl} alt="" className="cc-batch__thumb" />
              <div className="cc-batch__item-body">
                <span className="cc-batch__index">Variation {i + 1}</span>
                <strong>{child.event}</strong>
                <div className="cc-batch__item-actions">
                  <button
                    type="button"
                    className={child.favorite ? "is-on" : ""}
                    onClick={() => void onCuratorChange(child.id, { favorite: !child.favorite })}
                    aria-label="Favorite"
                  >
                    ★
                  </button>
                  <Link href={`/ops/content-creator/create?runId=${encodeURIComponent(child.runId)}`}>Open</Link>
                  <button type="button" onClick={() => void onVariations(child.id, varCount)}>
                    Branch
                  </button>
                  <button type="button" onClick={() => void onExport(child.id)}>
                    Export
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {compareItems.length >= 2 ? (
        <div className="cc-batch__compare" aria-label="Compare mode">
          <h3>Compare ({compareItems.length})</h3>
          <div className="cc-batch__compare-grid">
            {compareItems.map((c) => (
              <figure key={c.id}>
                <img src={c.thumbnailUrl} alt="" />
                <figcaption>{c.event}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
