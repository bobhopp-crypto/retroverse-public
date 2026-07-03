"use client";

import {
  PRINT_SHEET_GRID_OPTIONS,
  printSheetGridLabel,
  type PrintSheetGridId,
} from "@/lib/bobos/project-zero/print-sheet-grid";
import {
  BOBOS_PASS_FINISHED_HEIGHT_IN,
  BOBOS_PASS_FINISHED_WIDTH_IN,
} from "@/lib/bobos/project-zero/pass-production-spec";

type SheetsStatus = "idle" | "building" | "ready" | "error";

type Props = {
  passCount: number;
  gridId: PrintSheetGridId;
  onGridChange: (gridId: PrintSheetGridId) => void;
  status: SheetsStatus;
  error: string | null;
  sheetCount: number | null;
  onBuild: () => void;
};

export function BuildPrintSheetsPanel({
  passCount,
  gridId,
  onGridChange,
  status,
  error,
  sheetCount,
  onBuild,
}: Props) {
  if (passCount === 0) {
    return (
      <section className="pzw-section pzw-build-sheets ps-step ps-step--center">
        <h2 className="ps-step__title">6 · Print</h2>
        <p className="ps-step__hint">Issue passes first, then arrange them onto print sheets here.</p>
      </section>
    );
  }

  const building = status === "building";
  const ready = status === "ready" && sheetCount != null;

  return (
    <section className="pzw-section pzw-build-sheets" aria-label="Print">
      <h2 className="ps-step__title">6 · Print</h2>
      <p className="pzw-build-sheets__hint">
        Arranges already-issued passes onto sheets — no new numbers are created here.{" "}
        {BOBOS_PASS_FINISHED_WIDTH_IN}&quot; × {BOBOS_PASS_FINISHED_HEIGHT_IN}&quot; passes · 11&quot; × 17&quot; sheet ·{" "}
        {printSheetGridLabel(gridId, passCount)} · cut marks · back mirrored for long-edge duplex
      </p>

      <div className="pzw-build-sheets__controls">
        <label className="pzw-build-sheets__field">
          <span>Sheet layout</span>
          <select
            value={gridId}
            disabled={building}
            onChange={(event) => onGridChange(event.target.value as PrintSheetGridId)}
          >
            {PRINT_SHEET_GRID_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.perSheet} per sheet)
              </option>
            ))}
            <option value="auto">Auto Best Fit</option>
          </select>
        </label>

        <button
          type="button"
          className="ps-btn ps-btn--primary ps-btn--hero"
          disabled={building}
          onClick={onBuild}
          aria-busy={building}
        >
          {building ? "Building Print Sheets…" : ready ? "Rebuild Print Sheets" : "Build Print Sheets"}
        </button>
      </div>

      {status === "error" && error ? (
        <p className="ps-step__error" role="alert">
          {error}
        </p>
      ) : null}

      {building ? (
        <p className="pzw-sheets__building" role="status" aria-live="polite">
          Building print sheets for {passCount} pass{passCount === 1 ? "" : "es"}…
        </p>
      ) : null}

      {ready ? (
        <p className="pzw-build-sheets__ready" role="status">
          ✓ {sheetCount} sheet{sheetCount === 1 ? "" : "s"} built — open Print below to download.
        </p>
      ) : null}
    </section>
  );
}
