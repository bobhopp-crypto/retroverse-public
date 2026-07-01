import { PASS_PRINT_HEIGHT_IN, PASS_PRINT_WIDTH_IN } from "@/lib/ops/creative-lab/pass-layout";

/**
 * Client-safe slice of the BobOS Pass Production Specification — finished pass dimensions
 * only, for UI display and CSS sizing. Values are imported (never redefined) from the same
 * canonical `pass-layout.ts` used by every server-side compositing and print-sheet path.
 */
export const BOBOS_PASS_FINISHED_WIDTH_IN = PASS_PRINT_WIDTH_IN;
export const BOBOS_PASS_FINISHED_HEIGHT_IN = PASS_PRINT_HEIGHT_IN;
export const BOBOS_PASS_ASPECT_RATIO = `${PASS_PRINT_WIDTH_IN} / ${PASS_PRINT_HEIGHT_IN}`;
