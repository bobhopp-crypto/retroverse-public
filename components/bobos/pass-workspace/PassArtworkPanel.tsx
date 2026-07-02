"use client";

import { useMemo } from "react";

import type { PassWorkspaceTemplate } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import type { PassArtworkAdjustments } from "@/lib/bobos/project-zero/pass-artwork-adjustments";
import type { PassWorkspaceSlug, PassWorkspaceVersion } from "@/lib/bobos/project-zero/pass-workspace-store";
import { computeBatchRows, serialRangeForRows, totalPassesForRows } from "@/lib/ops/event-studio/pass-studio/serials";

import { PassArtworkCard } from "./PassArtworkCard";

function passTypeLabel(template: PassWorkspaceTemplate): string {
  return template.name.replace(/\s+Pass$/i, "").trim() || template.name;
}

type Props = {
  projectId: string;
  context: { title: string; venue: string; date: string; theme: string };
  templates: PassWorkspaceTemplate[];
  quantities: Record<string, number>;
  onQuantityChange: (templateId: string, quantity: number) => void;
  onVersionCreated: (slug: PassWorkspaceSlug, version: PassWorkspaceVersion) => void;
  onAdjustmentsChange: (slug: PassWorkspaceSlug, adjustments: PassArtworkAdjustments) => void;
  generating: boolean;
  generateError: string | null;
  onGenerate: () => void;
};

/** Artwork — every pass type starts empty. Generate creates Version 1; Regenerate creates
 *  the next version. Nothing here is ever pre-populated from another project. */
export function PassArtworkPanel({
  projectId,
  context,
  templates,
  quantities,
  onQuantityChange,
  onVersionCreated,
  onAdjustmentsChange,
  generating,
  generateError,
  onGenerate,
}: Props) {
  const totals = useMemo(() => {
    const rows = templates.map((t) => ({
      id: t.id,
      passType: passTypeLabel(t),
      quantity: quantities[t.id] ?? 0,
      templateId: t.id,
    }));
    const computed = computeBatchRows(rows);
    return {
      totalPasses: totalPassesForRows(rows),
      range: serialRangeForRows(computed),
    };
  }, [templates, quantities]);

  return (
    <section className="pzw-section" aria-label="Artwork">
      <h2 className="ps-step__title">Artwork</h2>

      <div className="ps-card-grid">
        {templates.map((template) => (
          <PassArtworkCard
            key={template.id}
            projectId={projectId}
            context={context}
            template={template}
            quantity={quantities[template.id] ?? 0}
            onQuantityChange={(quantity) => onQuantityChange(template.id, quantity)}
            onVersionCreated={onVersionCreated}
            onAdjustmentsChange={onAdjustmentsChange}
          />
        ))}
      </div>

      <div className="pzw-totals">
        <div className="pzw-totals__item">
          <span className="pzw-totals__label">Total Passes</span>
          <span className="pzw-totals__value">{totals.totalPasses}</span>
        </div>
        <div className="pzw-totals__item">
          <span className="pzw-totals__label">Serial Range</span>
          <span className="pzw-totals__value">
            {totals.totalPasses > 0
              ? `${String(totals.range.start).padStart(4, "0")}–${String(totals.range.end).padStart(4, "0")}`
              : "—"}
          </span>
        </div>
      </div>

      {generateError ? <p className="ps-step__error">{generateError}</p> : null}

      <button
        type="button"
        className="ps-btn ps-btn--primary ps-btn--hero"
        disabled={generating || totals.totalPasses === 0}
        onClick={onGenerate}
      >
        {generating ? "Generating…" : "Generate Batch"}
      </button>
    </section>
  );
}
