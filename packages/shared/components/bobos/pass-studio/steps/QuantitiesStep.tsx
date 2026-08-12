"use client";

import { useMemo } from "react";

import { computeBatchRows, serialRangeForRows, totalPassesForRows } from "@/lib/bobos/pass-studio/serials";

export type DraftRow = {
  templateId: string;
  passType: string;
  quantity: number;
};

type Props = {
  rows: DraftRow[];
  onQuantityChange: (templateId: string, quantity: number) => void;
  perSheet: number;
  busy: boolean;
  error: string | null;
  onGenerate: () => void;
};

/** Step 3 — how many of each selected design. Quantities only; designs are chosen in Step 2. */
export function QuantitiesStep({ rows, onQuantityChange, perSheet, busy, error, onGenerate }: Props) {
  const draftRows = useMemo(
    () => rows.map((row) => ({ id: row.templateId, passType: row.passType, quantity: row.quantity })),
    [rows],
  );
  const computedRows = useMemo(() => computeBatchRows(draftRows), [draftRows]);
  const totalPasses = useMemo(() => totalPassesForRows(draftRows), [draftRows]);
  const range = useMemo(() => serialRangeForRows(computedRows), [computedRows]);
  const estimatedSheets = totalPasses > 0 ? Math.ceil(totalPasses / perSheet) : 0;

  return (
    <div className="ps-step">
      <p className="ps-step__eyebrow">Step 3 of 5</p>
      <h2 className="ps-step__title">How Many?</h2>

      {rows.length === 0 ? (
        <p className="ps-step__hint">No designs selected — go back to Gallery and choose at least one.</p>
      ) : (
        <div className="ps-qty-layout">
          <div className="ps-qty-rows">
            {rows.map((row, index) => {
              const computed = computedRows[index];
              return (
                <div key={row.templateId} className="ps-qty-row">
                  <span className="ps-qty-row__name">{row.passType}</span>

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
      )}

      {error ? <p className="ps-step__error">{error}</p> : null}

      <button
        type="button"
        className="ps-btn ps-btn--primary ps-btn--hero"
        disabled={busy || totalPasses === 0}
        onClick={onGenerate}
      >
        {busy ? "Generating…" : "Continue"}
      </button>
    </div>
  );
}
