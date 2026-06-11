import sharp from "sharp";

import type { PassNumberingSettings } from "@/lib/ops/content-creator/pass-numbering";
import {
  PASS_HEIGHT,
  PASS_PRINT_HEIGHT_IN,
  PASS_PRINT_WIDTH_IN,
  PASS_WIDTH,
  PX_PER_IN,
} from "@/lib/ops/creative-lab/pass-layout";
import { assertWellFormedSvg } from "@/lib/ops/creative-lab/svg-validate";

/** Landscape 11" × 14" cardstock — 14" wide × 11" tall at print. */
export const PRINT_SHEET_WIDTH_IN = 14;
export const PRINT_SHEET_HEIGHT_IN = 11;
export const PRINT_SHEET_COLS = 4;
export const PRINT_SHEET_ROWS = 3;
export const PASSES_PER_SHEET = PRINT_SHEET_COLS * PRINT_SHEET_ROWS;

const SHEET_WIDTH_PX = Math.round(PRINT_SHEET_WIDTH_IN * PX_PER_IN);
const SHEET_HEIGHT_PX = Math.round(PRINT_SHEET_HEIGHT_IN * PX_PER_IN);
const GRID_WIDTH_PX = PRINT_SHEET_COLS * PASS_WIDTH;
const GRID_HEIGHT_PX = PRINT_SHEET_ROWS * PASS_HEIGHT;
const GRID_OFFSET_X = Math.round((SHEET_WIDTH_PX - GRID_WIDTH_PX) / 2);
const GRID_OFFSET_Y = Math.round((SHEET_HEIGHT_PX - GRID_HEIGHT_PX) / 2);

export type PrintSheetLayout = {
  sheetWidthPx: number;
  sheetHeightPx: number;
  gridOffsetX: number;
  gridOffsetY: number;
  cellWidthPx: number;
  cellHeightPx: number;
  cols: number;
  rows: number;
};

export function printSheetLayout(): PrintSheetLayout {
  return {
    sheetWidthPx: SHEET_WIDTH_PX,
    sheetHeightPx: SHEET_HEIGHT_PX,
    gridOffsetX: GRID_OFFSET_X,
    gridOffsetY: GRID_OFFSET_Y,
    cellWidthPx: PASS_WIDTH,
    cellHeightPx: PASS_HEIGHT,
    cols: PRINT_SHEET_COLS,
    rows: PRINT_SHEET_ROWS,
  };
}

function cropMarksSvg(layout: PrintSheetLayout): string {
  const { gridOffsetX: gx, gridOffsetY: gy, cellWidthPx: cw, cellHeightPx: ch, cols, rows } = layout;
  const gw = cols * cw;
  const gh = rows * ch;
  const mark = 10;
  const stroke = "#bbbbbb";
  const lines: string[] = [];

  const corners = [
    [gx, gy],
    [gx + gw, gy],
    [gx, gy + gh],
    [gx + gw, gy + gh],
  ];
  for (const [x, y] of corners) {
    lines.push(`<line x1="${x - mark}" y1="${y}" x2="${x + mark}" y2="${y}" stroke="${stroke}" stroke-width="1"/>`);
    lines.push(`<line x1="${x}" y1="${y - mark}" x2="${x}" y2="${y + mark}" stroke="${stroke}" stroke-width="1"/>`);
  }

  for (let c = 0; c <= cols; c++) {
    const x = gx + c * cw;
    lines.push(`<line x1="${x}" y1="${gy - mark}" x2="${x}" y2="${gy}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
    lines.push(`<line x1="${x}" y1="${gy + gh}" x2="${x}" y2="${gy + gh + mark}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
  }
  for (let r = 0; r <= rows; r++) {
    const y = gy + r * ch;
    lines.push(`<line x1="${gx - mark}" y1="${y}" x2="${gx}" y2="${y}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
    lines.push(`<line x1="${gx + gw}" y1="${y}" x2="${gx + gw + mark}" y2="${y}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
  }

  const svg = [
    `<svg width="${layout.sheetWidthPx}" height="${layout.sheetHeightPx}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="100%" height="100%" fill="#f8f8f8"/>`,
    `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="#ffffff" stroke="#dddddd" stroke-width="1"/>`,
    ...lines,
    `</svg>`,
  ].join("");
  assertWellFormedSvg(svg, "print-sheet-crop-marks");
  return svg;
}

/** 12-up sheet — passes at native 1024×1536, no scaling. Empty cells stay white. */
export async function buildPrintSheetPng(passImages: Buffer[]): Promise<Buffer> {
  const layout = printSheetLayout();
  const slots = PASSES_PER_SHEET;
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];

  for (let i = 0; i < slots; i++) {
    const img = passImages[i];
    if (!img) continue;
    const col = i % PRINT_SHEET_COLS;
    const row = Math.floor(i / PRINT_SHEET_COLS);
    composites.push({
      input: img,
      left: layout.gridOffsetX + col * layout.cellWidthPx,
      top: layout.gridOffsetY + row * layout.cellHeightPx,
    });
  }

  const base = await sharp(Buffer.from(cropMarksSvg(layout))).png().toBuffer();
  return sharp(base).composite(composites).png().toBuffer();
}

export function printInstructionsText(args: {
  event: string;
  quantity: number;
  sheetCount: number;
  numbering?: PassNumberingSettings;
}): string {
  const numbering = args.numbering;
  const numberingLines = numbering?.printSerialNumbers
    ? [
        "NUMBERING",
        "- Machine-printed serial on each pass (unique per position on sheet)",
        `- Format: ${numbering.numberFormat}${numbering.numberFormat === "custom" ? ` (${numbering.customFormat})` : ""}`,
        "",
      ]
    : [
        "NUMBERING",
        "- Hand-number after print — reserved write-in zone on each pass back",
        numbering?.collectorEdition
          ? "- Collector Edition: stamp or marker in Pass No. __________ area"
          : "- Write in serial at No. ______ line",
        "- All passes on print sheet are identical (number after cut)",
        "",
      ];

  return [
    "RETROVERSE CONTENT CREATOR — PRINT INSTRUCTIONS",
    "================================================",
    "",
    `Event: ${args.event}`,
    `Quantity: ${args.quantity} passes (${args.sheetCount} sheet${args.sheetCount === 1 ? "" : "s"} × 12-up)`,
    "",
    ...numberingLines,
    "PAPER",
    "- 11\" × 14\" cardstock",
    "",
    "PRINTER SETTINGS",
    "- Orientation: Landscape",
    "- Scale: 100%",
    "- Do NOT fit to page",
    "- Do NOT shrink to printable area",
    "",
    "PRINT ORDER",
    "1. Print front sheet(s) first (print-front-12up)",
    "2. Run a duplex alignment test on scrap if needed",
    "3. Flip according to your printer (long-edge vs short-edge)",
    "4. Print back sheet(s) (print-back-12up) — layout matches front for alignment",
    "5. Cut using light crop marks around the pass grid",
    "",
    "FINAL PASS SIZE",
    `- ${PASS_PRINT_WIDTH_IN}" wide × ${PASS_PRINT_HEIGHT_IN}" tall (portrait each pass)`,
    `- Grid on sheet: ${PRINT_SHEET_COLS} columns × ${PRINT_SHEET_ROWS} rows`,
    `- Sheet size: ${PRINT_SHEET_WIDTH_IN}" × ${PRINT_SHEET_HEIGHT_IN}" landscape`,
    "",
    "QR",
    "- QR is production data composited at export — not in preview artwork",
    "- Scan test: use Print Scan Test on exported final-back.png before production run",
    "",
  ].join("\n");
}
