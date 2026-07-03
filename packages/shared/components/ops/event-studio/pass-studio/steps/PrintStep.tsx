"use client";

import { useMemo } from "react";

import { PassFace } from "../PassFace";

import type { GeneratedPass, PassTemplate } from "@/lib/ops/event-studio/pass-studio/types";

type PerSheet = 2 | 4 | 8;

const SHEET_GRID: Record<PerSheet, { cols: number; rows: number }> = {
  2: { cols: 1, rows: 2 },
  4: { cols: 2, rows: 2 },
  8: { cols: 2, rows: 4 },
};

type Props = {
  passes: GeneratedPass[];
  templates: PassTemplate[];
  perSheet: PerSheet;
  onPerSheetChange: (perSheet: PerSheet) => void;
  onDone: () => void;
};

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

/** Step 5 — show the actual paper. Print / Export PDF / Done. */
export function PrintStep({ passes, templates, perSheet, onPerSheetChange, onDone }: Props) {
  const grid = SHEET_GRID[perSheet];
  const pages = useMemo(() => chunk(passes, perSheet), [passes, perSheet]);

  if (passes.length === 0) {
    return (
      <div className="ps-step ps-step--center">
        <p className="ps-step__eyebrow">Step 5 of 5</p>
        <h2 className="ps-step__title">Print</h2>
        <p className="ps-step__hint">Generate a batch to build print sheets here.</p>
      </div>
    );
  }

  return (
    <div className="ps-step ps-print-area">
      <p className="ps-step__eyebrow">Step 5 of 5</p>
      <h2 className="ps-step__title">Print</h2>

      <div className="ps-print__settings">
        <p className="ps-print__paper-note">11&quot; × 17&quot; sheet · zero spacing</p>
        <div className="ps-print__per-sheet">
          <span>Per sheet</span>
          <div className="ps-print__per-sheet-options">
            {([2, 4, 8] as PerSheet[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`ps-print__per-sheet-option${option === perSheet ? " is-active" : ""}`}
                aria-pressed={option === perSheet}
                onClick={() => onPerSheetChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ps-print__area">
        {pages.map((page, pageIndex) => (
          <div key={pageIndex} className="ps-print__sheet-wrap">
            <div
              className="ps-print__sheet"
              style={{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)`, gridTemplateRows: `repeat(${grid.rows}, 1fr)` }}
            >
              {page.map((pass) => (
                <div key={pass.id} className="ps-print__cell">
                  <PassFace pass={pass} template={templates.find((t) => t.id === pass.templateId)} side="front" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="ps-print__actions">
        <button type="button" className="ps-btn ps-btn--primary ps-btn--hero" onClick={() => window.print()}>
          Print
        </button>
        <button type="button" className="ps-btn ps-btn--primary ps-btn--hero" onClick={() => window.print()}>
          Export PDF
        </button>
        <button type="button" className="ps-btn ps-btn--hero" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
