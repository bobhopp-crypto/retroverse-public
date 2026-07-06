import { PASS_PRINT_HEIGHT_IN, PASS_PRINT_WIDTH_IN } from "@/lib/ops/creative-lab/pass-layout";
import { BOBOS_PRINT_SHEET_HEIGHT_IN, BOBOS_PRINT_SHEET_WIDTH_IN } from "./print-sheet-grid";

/**
 * Client-safe slice of the BobOS Pass Production Specification — finished pass dimensions
 * only, for UI display and CSS sizing. Values are imported (never redefined) from the same
 * canonical `pass-layout.ts` used by every server-side compositing and print-sheet path.
 */
export const BOBOS_PASS_FINISHED_WIDTH_IN = PASS_PRINT_WIDTH_IN;
export const BOBOS_PASS_FINISHED_HEIGHT_IN = PASS_PRINT_HEIGHT_IN;
export const BOBOS_PASS_ASPECT_RATIO = `${PASS_PRINT_WIDTH_IN} / ${PASS_PRINT_HEIGHT_IN}`;

/** Design Builder Print step — fixed layouts for 2.25" × 3.5" passes on an 11" × 17" sheet. */
export type DesignBuilderPrintLayoutId = "2up" | "4up" | "8up" | "16up";

export type DesignBuilderPrintLayoutSpec = {
  id: DesignBuilderPrintLayoutId;
  label: string;
  cols: number;
  rows: number;
  perSheet: number;
};

export const DESIGN_BUILDER_PRINT_LAYOUTS: Record<DesignBuilderPrintLayoutId, DesignBuilderPrintLayoutSpec> = {
  "2up": { id: "2up", label: "2-up", cols: 1, rows: 2, perSheet: 2 },
  "4up": { id: "4up", label: "4-up", cols: 2, rows: 2, perSheet: 4 },
  "8up": { id: "8up", label: "8-up", cols: 2, rows: 4, perSheet: 8 },
  "16up": { id: "16up", label: "16-up", cols: 4, rows: 4, perSheet: 16 },
};

export const DESIGN_BUILDER_PRINT_LAYOUT_IDS: DesignBuilderPrintLayoutId[] = ["2up", "4up", "8up", "16up"];

export { BOBOS_PRINT_SHEET_WIDTH_IN, BOBOS_PRINT_SHEET_HEIGHT_IN };

/** Client-safe print sheet result shape — server builds these in `pass-production.ts`. */
export type BobosPrintSheetSet = {
  sheetCount: number;
  frontPngUrls: string[];
  backPngUrls: string[];
  frontPdfUrls: string[];
  backPdfUrls: string[];
  /** High-resolution JPEG of the same finished sheet image used for the PDF — for Epson mobile printing. */
  frontJpegUrls: string[];
  backJpegUrls: string[];
  /** Single multi-page PDF combining every front (or back) sheet — what "Export PDF" downloads. */
  frontCombinedPdfUrl: string | null;
  backCombinedPdfUrl: string | null;
  gridLabel: string;
  perSheet: number;
};
