"use client";

import { useMemo, useState } from "react";

import { ProductionLayoutEditor } from "@/components/bobos/pass-workspace/ProductionLayoutEditor";
import "@/components/bobos/pass-workspace/bobos-pass-workspace.css";
import {
  passTypeLabelFromTemplate,
  toWorkspaceTemplates,
} from "@/lib/ops/event-studio/pass-studio/design-builder-workspace";
import { computeBatchRows, padSerial, serialRangeForRows, totalPassesForRows } from "@/lib/ops/event-studio/pass-studio/serials";
import type { PassTemplate } from "@/lib/ops/event-studio/pass-studio/types";
import type { PassWorkspaceSlug } from "@/lib/bobos/project-zero/pass-workspace-slugs";
import type { ProductionLayout } from "@/lib/bobos/project-zero/production-layout";

import type { DraftRow } from "./QuantitiesStep";

type LayoutsBySlug = Record<PassWorkspaceSlug, ProductionLayout>;

type StartMode = "next" | "custom";

type Props = {
  projectId: string;
  rows: DraftRow[];
  templates: PassTemplate[];
  savedLayouts: LayoutsBySlug;
  draftLayouts: LayoutsBySlug;
  onDraftLayoutChange: (slug: PassWorkspaceSlug, layout: ProductionLayout) => void;
  onLayoutSaved: (slug: PassWorkspaceSlug, layout: ProductionLayout) => void;
  onQuantityChange: (templateId: string, quantity: number) => void;
  nextSerial: number;
  perSheet: number;
  busy: boolean;
  error: string | null;
  layoutDirty: boolean;
  onGenerate: (startAt: number | null) => void;
};

/** Step 3 — production layout editing + quantities + batch generation. */
export function EditStep({
  projectId,
  rows,
  templates,
  savedLayouts,
  draftLayouts,
  onDraftLayoutChange,
  onLayoutSaved,
  onQuantityChange,
  nextSerial,
  perSheet,
  busy,
  error,
  layoutDirty,
  onGenerate,
}: Props) {
  const workspaceTemplates = useMemo(
    () => toWorkspaceTemplates(templates.filter((t) => rows.some((row) => row.templateId === t.id))),
    [templates, rows],
  );

  const slugByTemplateId = useMemo(() => {
    const map = new Map<string, PassWorkspaceSlug>();
    for (const template of workspaceTemplates) {
      map.set(template.id, template.slug);
    }
    return map;
  }, [workspaceTemplates]);

  const initialSlug = workspaceTemplates[0]?.slug ?? "general";
  const [activeSlug, setActiveSlug] = useState<PassWorkspaceSlug>(initialSlug);

  const [startMode, setStartMode] = useState<StartMode>("next");
  const [customStart, setCustomStart] = useState(nextSerial);

  const draftRows = useMemo(
    () => rows.map((row) => ({ id: row.templateId, passType: row.passType, quantity: row.quantity })),
    [rows],
  );
  const startAt = startMode === "custom" ? Math.max(1, customStart) : nextSerial;
  const computedRows = useMemo(() => computeBatchRows(draftRows, startAt), [draftRows, startAt]);
  const totalPasses = useMemo(() => totalPassesForRows(draftRows), [draftRows]);
  const range = useMemo(() => serialRangeForRows(computedRows), [computedRows]);
  const estimatedSheets = totalPasses > 0 ? Math.ceil(totalPasses / perSheet) : 0;

  const missingArtwork = workspaceTemplates.filter(
    (t) => (rows.find((r) => r.templateId === t.id)?.quantity ?? 0) > 0 && !t.generationId,
  );

  const canGenerate =
    totalPasses > 0 && missingArtwork.length === 0 && !busy && !layoutDirty;

  return (
    <div className="ps-step">
      <p className="ps-step__eyebrow">Step 3 of 5</p>
      <h2 className="ps-step__title">Edit</h2>
      <p className="ps-step__hint">
        Position QR codes and serial numbers, then set quantities and generate the batch.
      </p>

      {rows.length === 0 ? (
        <p className="ps-step__hint">No designs selected — go back to Designs and choose at least one.</p>
      ) : (
        <>
          <div className="pzw-section">
            <ProductionLayoutEditor
              projectId={projectId}
              templates={workspaceTemplates}
              activeSlug={activeSlug}
              onActiveSlugChange={setActiveSlug}
              savedLayouts={savedLayouts}
              draftLayouts={draftLayouts}
              onDraftChange={onDraftLayoutChange}
              onSaved={onLayoutSaved}
            />
          </div>

          <div className="ps-qty-layout ps-edit__quantities">
            <h3 className="ps-edit__section-title">Quantities</h3>
            <div className="ps-qty-rows">
              {rows.map((row, index) => {
                const computed = computedRows[index];
                const slug = slugByTemplateId.get(row.templateId);
                const isActive = slug === activeSlug;
                return (
                  <div key={row.templateId} className={`ps-qty-row${isActive ? " is-active" : ""}`}>
                    <button
                      type="button"
                      className="ps-qty-row__name ps-qty-row__name-btn"
                      onClick={() => slug && setActiveSlug(slug)}
                    >
                      {row.passType}
                    </button>

                    <div className="ps-qty-row__stepper">
                      <button
                        type="button"
                        aria-label={`Decrease ${row.passType} quantity`}
                        onClick={() => onQuantityChange(row.templateId, row.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="ps-qty-row__value">{row.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${row.passType} quantity`}
                        onClick={() => onQuantityChange(row.templateId, row.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    <span className="ps-qty-row__serials">
                      {computed && computed.quantity > 0
                        ? `${String(computed.firstSerial).padStart(4, "0")}–${String(computed.lastSerial).padStart(4, "0")}`
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            <fieldset className="pzw-issue__start ps-edit__serial-start">
              <legend>Starting Serial</legend>
              <label className="pzw-issue__radio">
                <input
                  type="radio"
                  name="ps-edit-start-mode"
                  checked={startMode === "next"}
                  onChange={() => setStartMode("next")}
                />
                <span>
                  Continue from Next Available <em>({padSerial(nextSerial)})</em>
                </span>
              </label>
              <label className="pzw-issue__radio">
                <input
                  type="radio"
                  name="ps-edit-start-mode"
                  checked={startMode === "custom"}
                  onChange={() => setStartMode("custom")}
                />
                <span>Custom Starting Serial</span>
              </label>
              {startMode === "custom" ? (
                <input
                  className="pzw-issue__custom-start"
                  type="number"
                  min={1}
                  value={customStart}
                  aria-label="Custom starting serial"
                  onChange={(e) => setCustomStart(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                />
              ) : null}
            </fieldset>

            <div className="ps-qty-totals">
              <div className="ps-qty-totals__item">
                <span className="ps-qty-totals__label">Total Passes</span>
                <span className="ps-qty-totals__value">{totalPasses}</span>
              </div>
              <div className="ps-qty-totals__item">
                <span className="ps-qty-totals__label">Serial Range</span>
                <span className="ps-qty-totals__value">
                  {totalPasses > 0
                    ? `${String(range.start).padStart(4, "0")}–${String(range.end).padStart(4, "0")}`
                    : "—"}
                </span>
              </div>
              <div className="ps-qty-totals__item">
                <span className="ps-qty-totals__label">Estimated Sheets</span>
                <span className="ps-qty-totals__value">{estimatedSheets > 0 ? estimatedSheets : "—"}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {layoutDirty ? (
        <p className="pzw-batch__warn">Save the production layout above before generating passes.</p>
      ) : null}

      {missingArtwork.length > 0 ? (
        <p className="ps-step__error">
          Sync artwork in Designs for:{" "}
          {missingArtwork.map((t) => passTypeLabelFromTemplate(t)).join(", ")}
        </p>
      ) : null}

      {error ? <p className="ps-step__error">{error}</p> : null}

      <button
        type="button"
        className="ps-btn ps-btn--primary ps-btn--hero"
        disabled={!canGenerate}
        onClick={() => onGenerate(startMode === "custom" ? Math.max(1, customStart) : null)}
      >
        {busy ? "Generating…" : "Continue to Preview"}
      </button>
    </div>
  );
}
