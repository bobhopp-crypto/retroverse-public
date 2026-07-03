import { PASS_PRINT_HEIGHT_IN, PASS_PRINT_WIDTH_IN } from "@/lib/ops/creative-lab/pass-layout";

/**
 * Client-safe slice of the BobOS Pass Production Specification — finished pass dimensions
 * only, for UI display and CSS sizing. Values are imported (never redefined) from the same
 * canonical `pass-layout.ts` used by every server-side compositing and print-sheet path.
 */
export const BOBOS_PASS_FINISHED_WIDTH_IN = PASS_PRINT_WIDTH_IN;
export const BOBOS_PASS_FINISHED_HEIGHT_IN = PASS_PRINT_HEIGHT_IN;
export const BOBOS_PASS_ASPECT_RATIO = `${PASS_PRINT_WIDTH_IN} / ${PASS_PRINT_HEIGHT_IN}`;

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
  gridLabel: string;
  perSheet: number;
};
