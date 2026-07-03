import {
  PASS_PRINT_HEIGHT_IN,
  PASS_PRINT_WIDTH_IN,
} from "@/lib/ops/creative-lab/pass-layout";

/** Portrait 11" × 17" cardstock — must match `print-sheet.ts` (not imported here; that module is server-only). */
export const BOBOS_PRINT_SHEET_WIDTH_IN = 11;
export const BOBOS_PRINT_SHEET_HEIGHT_IN = 17;

/** BobOS print sheet grid presets — 11" × 17" portrait. */
export type PrintSheetGridId = "2x2" | "3x3" | "4x4" | "auto";

export type PrintSheetGridSpec = {
  id: PrintSheetGridId;
  label: string;
  cols: number;
  rows: number;
  perSheet: number;
};

const GRID_OPTIONS: PrintSheetGridSpec[] = [
  { id: "2x2", label: "2 × 2", cols: 2, rows: 2, perSheet: 4 },
  { id: "3x3", label: "3 × 3", cols: 3, rows: 3, perSheet: 9 },
  { id: "4x4", label: "4 × 4", cols: 4, rows: 4, perSheet: 16 },
];

export const PRINT_SHEET_GRID_OPTIONS = GRID_OPTIONS;

export function normalizePrintSheetGridId(raw: unknown): PrintSheetGridId {
  if (raw === "2x2" || raw === "3x3" || raw === "4x4" || raw === "auto") return raw;
  return "auto";
}

/** Maximum grid that fits finished 2.25" × 3.5" passes on 11" × 17". */
export function maxGridOnSheet(): { cols: number; rows: number } {
  const cols = Math.floor(BOBOS_PRINT_SHEET_WIDTH_IN / PASS_PRINT_WIDTH_IN);
  const rows = Math.floor(BOBOS_PRINT_SHEET_HEIGHT_IN / PASS_PRINT_HEIGHT_IN);
  return { cols: Math.max(1, cols), rows: Math.max(1, rows) };
}

/** Picks the grid that uses the fewest sheets for a given pass count. */
export function autoBestFitGrid(passCount: number): PrintSheetGridSpec {
  const count = Math.max(1, passCount);
  let best = GRID_OPTIONS[0]!;
  let bestSheets = Infinity;

  for (const option of GRID_OPTIONS) {
    const sheets = Math.ceil(count / option.perSheet);
    if (
      sheets < bestSheets ||
      (sheets === bestSheets && option.perSheet > best.perSheet)
    ) {
      best = option;
      bestSheets = sheets;
    }
  }

  return best;
}

export function resolvePrintSheetGrid(
  gridId: PrintSheetGridId,
  passCount: number,
): PrintSheetGridSpec {
  if (gridId === "auto") return autoBestFitGrid(passCount);
  return GRID_OPTIONS.find((option) => option.id === gridId) ?? autoBestFitGrid(passCount);
}

export function printSheetGridLabel(gridId: PrintSheetGridId, passCount: number): string {
  if (gridId === "auto") {
    const resolved = autoBestFitGrid(passCount);
    return `Auto Best Fit (${resolved.label})`;
  }
  return GRID_OPTIONS.find((option) => option.id === gridId)?.label ?? "Auto Best Fit";
}
