import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

import { loadGenerationManifest } from "@/lib/ops/content-creator/library";
import { contentCreatorRoot } from "@/lib/ops/content-creator/library/paths";
import {
  PRINT_SHEET_COLS,
  PRINT_SHEET_HEIGHT_IN,
  PRINT_SHEET_ROWS,
  PRINT_SHEET_WIDTH_IN,
} from "@/lib/ops/content-creator/print-sheet";
import { compositeQrOntoBackBuffer } from "@/lib/ops/creative-lab/pass-export-composite";
import {
  PASS_HEIGHT,
  PASS_PRINT_HEIGHT_IN,
  PASS_PRINT_WIDTH_IN,
  PASS_WIDTH,
} from "@/lib/ops/creative-lab/pass-layout";
import { assertWellFormedSvg } from "@/lib/ops/creative-lab/svg-validate";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

import {
  defaultProductionLayoutFromPassLayout,
  normalizeProductionLayout,
  productionLayoutToReserves,
  type ProductionLayout,
  type ProductionLayoutReserves,
} from "./production-layout";
import {
  resolvePrintSheetGrid,
  type PrintSheetGridId,
} from "./print-sheet-grid";
import type { BobosPrintSheetSet } from "./pass-production-spec";

export type { BobosPrintSheetSet } from "./pass-production-spec";

/**
 * BobOS Pass Production Specification — the single shared source of truth for finished
 * pass dimensions, reserved zones, and print layout.
 *
 * The AI image provider only produces portrait canvases at fixed sizes (1024×1536 — a 2:3
 * ratio). That does NOT equal the required finished ratio of 2.25 × 3.5 (≈0.643 vs 0.667).
 * Printing the raw 1024×1536 canvas at a true 2.25" width would yield a 3.375" tall pass,
 * not 3.5" — a real "scaling surprise" the spec explicitly forbids. So every pass is
 * center-cropped, symmetrically, to the exact 2.25:3.5 ratio before it is ever composited,
 * previewed, or printed. Height is the anchor (it's the AI canvas's tallest usable
 * dimension); a thin, even strip is trimmed from each side of the width.
 *
 * Nothing here is duplicated elsewhere — the raw canvas size, QR reserve, and serial
 * reserve are all imported unchanged from `pass-layout.ts` (the same file the Content
 * Creator / vNext export pipeline uses); only the finished-canvas crop and DPI are BobOS's
 * own correction, applied entirely within this module.
 *
 * BobOS Composer scope (restored, post-Composer-1.0): the AI generates the finished
 * collectible design — typography, pass-type hierarchy, event styling, front/back layout —
 * with QR and serial reserves left blank. BobOS composites ONLY those two production
 * elements afterward. No decorative overlays (frames, bands, badges, security marks) are
 * added on top of AI artwork.
 */
const RAW_WIDTH_PX = PASS_WIDTH;
const RAW_HEIGHT_PX = PASS_HEIGHT;

/** True, uniform DPI once cropped to the exact 2.25:3.5 ratio — height-anchored. */
const TRUE_DPI = RAW_HEIGHT_PX / PASS_PRINT_HEIGHT_IN;

const FINISHED_WIDTH_PX = Math.round(PASS_PRINT_WIDTH_IN * TRUE_DPI);
const FINISHED_HEIGHT_PX = RAW_HEIGHT_PX;
const CROP_LEFT_PX = Math.round((RAW_WIDTH_PX - FINISHED_WIDTH_PX) / 2);

/** QR + serial reserves, translated from the raw canvas onto the finished (cropped) canvas. */
const DEFAULT_RESERVES = productionLayoutToReserves(defaultProductionLayoutFromPassLayout());
const QR_RESERVE = DEFAULT_RESERVES.qr;
const SERIAL_RESERVE = DEFAULT_RESERVES.serial;

export function resolvePassProductionReserves(layout?: ProductionLayout | null): ProductionLayoutReserves {
  return productionLayoutToReserves(normalizeProductionLayout(layout ?? defaultProductionLayoutFromPassLayout()));
}

export const PASS_PRODUCTION_SPEC = {
  finishedWidthIn: PASS_PRINT_WIDTH_IN,
  finishedHeightIn: PASS_PRINT_HEIGHT_IN,
  /** Full-bleed artwork to the trim edge — no additional print bleed margin is added. */
  bleedIn: 0,
  dpi: Math.round(TRUE_DPI),
  widthPx: FINISHED_WIDTH_PX,
  heightPx: FINISHED_HEIGHT_PX,
  qrReserve: { ...QR_RESERVE },
  serialReserve: { ...SERIAL_RESERVE },
  printSheet: {
    widthIn: PRINT_SHEET_WIDTH_IN,
    heightIn: PRINT_SHEET_HEIGHT_IN,
    cols: PRINT_SHEET_COLS,
    rows: PRINT_SHEET_ROWS,
    perSheet: PRINT_SHEET_COLS * PRINT_SHEET_ROWS,
  },
} as const;

/** Crops a raw AI-generated PNG (1024×1536) to the exact 2.25:3.5 finished canvas. */
async function cropToFinishedCanvas(png: Buffer): Promise<Buffer> {
  return sharp(png)
    .extract({ left: CROP_LEFT_PX, top: 0, width: FINISHED_WIDTH_PX, height: FINISHED_HEIGHT_PX })
    .png()
    .toBuffer();
}

/** Dark stamped ink — readable over AI back artwork. */
const STAMP_INK = "#231815";

/** Plain serial number only — positioned by production layout reserves. */
function renderSerialStampSvg(
  serial: string,
  reserves: ProductionLayoutReserves,
): {
  svg: string;
  compositeLeft: number;
  compositeTop: number;
} {
  const rotation = reserves.serialStyle.rotation;
  const opacity = reserves.serialStyle.inkOpacity;
  const fontSize = reserves.serialStyle.fontSize;

  const boxW = reserves.serial.width;
  const boxH = reserves.serial.height;
  const cx = boxW / 2;
  const cy = boxH / 2;

  const svg = `
<svg width="${boxW}" height="${boxH}" viewBox="0 0 ${boxW} ${boxH}" xmlns="http://www.w3.org/2000/svg">
  <g transform="rotate(${rotation.toFixed(2)} ${cx} ${cy})" opacity="${opacity.toFixed(2)}">
    <text x="${cx}" y="${cy}" dominant-baseline="middle" text-anchor="middle" font-family="'Courier New', monospace" font-size="${fontSize}" font-weight="800" letter-spacing="2" fill="${STAMP_INK}">${serial}</text>
  </g>
</svg>`.trim();

  assertWellFormedSvg(svg, "bobos-serial-stamp");

  return {
    svg,
    compositeLeft: reserves.serial.left,
    compositeTop: reserves.serial.top,
  };
}

/**
 * Crops a raw AI-generated front PNG to the finished 2.25:3.5 canvas. The front is never
 * touched beyond this crop — no QR, no serial, no decorative overlay — it stays 100%
 * AI-designed collectible artwork, full bleed to the trim edge.
 */
export async function finishBobosPassFront(rawFrontPng: Buffer): Promise<Buffer> {
  return cropToFinishedCanvas(rawFrontPng);
}

/**
 * Crops a raw AI-generated back PNG to the finished canvas, then applies the ONLY two
 * production-critical elements BobOS composites: QR + realistic stamped serial. Reuses the
 * existing QR compositor (`compositeQrOntoBackBuffer`) unmodified — same reserved zone,
 * same size, same automatic quiet-zone tuning as the rest of the pipeline — just translated
 * onto the finished canvas. Everything else on the back (event styling, typography, layout)
 * comes from the AI-designed artwork itself.
 */
export async function finishBobosPassBack(args: {
  rawBackPng: Buffer;
  qrUrl: string;
  serial: string;
  layout?: ProductionLayout | null;
}): Promise<Buffer> {
  const layout = normalizeProductionLayout(args.layout ?? defaultProductionLayoutFromPassLayout());
  const reserves = productionLayoutToReserves(layout);
  const cropped = await cropToFinishedCanvas(args.rawBackPng);

  // Full QR reserve zone — opaque cover replaces any baked placeholder QR in source artwork.
  const qrZoneSize = Math.round(layout.qr.size * FINISHED_WIDTH_PX);
  const qrCenterX = layout.qr.x * FINISHED_WIDTH_PX;
  const qrCenterY = layout.qr.y * FINISHED_HEIGHT_PX;
  const qrZoneLeft = Math.round(
    Math.min(Math.max(qrCenterX - qrZoneSize / 2, 0), FINISHED_WIDTH_PX - qrZoneSize),
  );
  const qrZoneTop = Math.round(
    Math.min(Math.max(qrCenterY - qrZoneSize / 2, 0), FINISHED_HEIGHT_PX - qrZoneSize),
  );

  let base = cropped;
  const coverOpacity = Math.max(reserves.qrWhiteBackgroundOpacity, 1);
  const whiteSvg = [
    `<svg width="${qrZoneSize}" height="${qrZoneSize}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="100%" height="100%" fill="#ffffff" opacity="${coverOpacity.toFixed(3)}"/>`,
    `</svg>`,
  ].join("");
  const whiteRect = await sharp(Buffer.from(whiteSvg)).png().toBuffer();
  base = await sharp(cropped)
    .composite([{ input: whiteRect, left: qrZoneLeft, top: qrZoneTop }])
    .png()
    .toBuffer();

  const { buffer: withQr } = await compositeQrOntoBackBuffer({
    backSrc: base,
    qrUrl: args.qrUrl,
    qrPlacement: reserves.qr,
  });
  const stamp = renderSerialStampSvg(args.serial, reserves);
  const stampPng = await sharp(Buffer.from(stamp.svg)).png().toBuffer();
  return sharp(withQr)
    .composite([{ input: stampPng, left: stamp.compositeLeft, top: stamp.compositeTop }])
    .png()
    .toBuffer();
}

/** Reads a raw AI-generated front or back PNG straight from the Content Creator library on disk. */
export async function readGenerationSidePng(generationId: string, side: "front" | "back"): Promise<Buffer> {
  const manifest = await loadGenerationManifest(generationId);
  if (!manifest) throw new Error(`Generation not found: ${generationId}`);
  const relPath = side === "front" ? manifest.frontImagePath : manifest.backImagePath;
  if (!relPath) throw new Error(`No ${side} image recorded for generation ${generationId}`);
  return readFile(join(contentCreatorRoot(), relPath));
}

function bobosPassWorkspaceRendersRoot(): string {
  return join(retroverseDataRoot(), "ops", "bobos", "project-zero", "pass-workspace", "renders");
}

export const BOBOS_RENDER_FILE_PREFIX = "/api/bobos/pass-workspace/files/";

export function bobosRenderFileUrl(relPath: string): string {
  return `${BOBOS_RENDER_FILE_PREFIX}${relPath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Inverse of `bobosRenderFileUrl` — null if the URL isn't a served render file. */
export function relPathFromBobosRenderUrl(url: string): string | null {
  if (!url.startsWith(BOBOS_RENDER_FILE_PREFIX)) return null;
  return decodeURIComponent(url.slice(BOBOS_RENDER_FILE_PREFIX.length));
}

export function bobosRenderAbsolutePath(relPath: string): string {
  return join(bobosPassWorkspaceRendersRoot(), relPath);
}

async function saveBobosRender(relPath: string, buffer: Buffer): Promise<string> {
  const fullPath = bobosRenderAbsolutePath(relPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return bobosRenderFileUrl(relPath);
}

export async function saveBobosPassFront(args: {
  projectId: string;
  batchId: string;
  templateId: string;
  buffer: Buffer;
}): Promise<string> {
  return saveBobosRender(`${args.projectId}/${args.batchId}/front-${args.templateId}.png`, args.buffer);
}

export async function saveBobosPassBack(args: {
  projectId: string;
  batchId: string;
  serial: string;
  buffer: Buffer;
}): Promise<string> {
  return saveBobosRender(`${args.projectId}/${args.batchId}/back-${args.serial}.png`, args.buffer);
}

const PT_PER_IN = 72;
const SHEET_PAGE_WIDTH_PT = PRINT_SHEET_WIDTH_IN * PT_PER_IN;
const SHEET_PAGE_HEIGHT_PT = PRINT_SHEET_HEIGHT_IN * PT_PER_IN;

/** Sheet canvas kept at the same true DPI as the finished pass, so cells need no rescale. */
const SHEET_WIDTH_PX = Math.round(PRINT_SHEET_WIDTH_IN * TRUE_DPI);
const SHEET_HEIGHT_PX = Math.round(PRINT_SHEET_HEIGHT_IN * TRUE_DPI);

type SheetGridMetrics = {
  cols: number;
  rows: number;
  perSheet: number;
  gridOffsetX: number;
  gridOffsetY: number;
};

function sheetGridMetrics(cols: number, rows: number): SheetGridMetrics {
  const gridWidthPx = cols * FINISHED_WIDTH_PX;
  const gridHeightPx = rows * FINISHED_HEIGHT_PX;
  return {
    cols,
    rows,
    perSheet: cols * rows,
    gridOffsetX: Math.round((SHEET_WIDTH_PX - gridWidthPx) / 2),
    gridOffsetY: Math.round((SHEET_HEIGHT_PX - gridHeightPx) / 2),
  };
}

function cutMarksSvg(grid: SheetGridMetrics): string {
  const gx = grid.gridOffsetX;
  const gy = grid.gridOffsetY;
  const gw = grid.cols * FINISHED_WIDTH_PX;
  const gh = grid.rows * FINISHED_HEIGHT_PX;
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
  for (let c = 0; c <= grid.cols; c += 1) {
    const x = gx + c * FINISHED_WIDTH_PX;
    lines.push(`<line x1="${x}" y1="${gy - mark}" x2="${x}" y2="${gy}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
    lines.push(`<line x1="${x}" y1="${gy + gh}" x2="${x}" y2="${gy + gh + mark}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
  }
  for (let r = 0; r <= grid.rows; r += 1) {
    const y = gy + r * FINISHED_HEIGHT_PX;
    lines.push(`<line x1="${gx - mark}" y1="${y}" x2="${gx}" y2="${y}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
    lines.push(`<line x1="${gx + gw}" y1="${y}" x2="${gx + gw + mark}" y2="${y}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>`);
  }

  const svg = [
    `<svg width="${SHEET_WIDTH_PX}" height="${SHEET_HEIGHT_PX}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="100%" height="100%" fill="#f8f8f8"/>`,
    `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="#ffffff" stroke="#dddddd" stroke-width="1"/>`,
    ...lines,
    `</svg>`,
  ].join("");
  assertWellFormedSvg(svg, "bobos-print-sheet-cut-marks");
  return svg;
}

/** Sheet at the true finished-pass DPI — cells are exact, no scaling. */
async function buildSheetPng(
  passImages: Buffer[],
  grid: SheetGridMetrics,
  options?: { mirrorForDuplexLongEdge?: boolean },
): Promise<Buffer> {
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  for (let i = 0; i < grid.perSheet; i += 1) {
    const img = passImages[i];
    if (!img) continue;
    const baseCol = i % grid.cols;
    const col = options?.mirrorForDuplexLongEdge ? grid.cols - 1 - baseCol : baseCol;
    const row = Math.floor(i / grid.cols);
    composites.push({
      input: img,
      left: grid.gridOffsetX + col * FINISHED_WIDTH_PX,
      top: grid.gridOffsetY + row * FINISHED_HEIGHT_PX,
    });
  }
  const base = await sharp(Buffer.from(cutMarksSvg(grid))).png().toBuffer();
  return sharp(base).composite(composites).png().toBuffer();
}

/** Embeds a sheet PNG as a full-page portrait PDF, stretched to exactly 11" × 17" at 100%. */
async function sheetPngToPdf(pngBuffer: Buffer): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([SHEET_PAGE_WIDTH_PT, SHEET_PAGE_HEIGHT_PT]);
  const image = await pdf.embedPng(pngBuffer);
  page.drawImage(image, { x: 0, y: 0, width: SHEET_PAGE_WIDTH_PT, height: SHEET_PAGE_HEIGHT_PT });
  return Buffer.from(await pdf.save());
}

/** Same finished sheet pixels as the PDF — high-quality JPEG for Epson mobile / phone printing. */
async function sheetPngToJpeg(pngBuffer: Buffer): Promise<Buffer> {
  return sharp(pngBuffer).jpeg({ quality: 95 }).toBuffer();
}

/** Merges individually-saved single-sheet PDF buffers into one multi-page PDF — what "Export PDF" downloads. */
async function mergeSheetPdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();
  for (const buffer of pdfBuffers) {
    const doc = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return Buffer.from(await merged.save());
}

/**
 * Builds production-ready print sheets (front + back, PNG + PDF, cut marks, duplex mirror)
 * from a project's own finished pass images — the exact same images shown in Preview.
 * Every cell is the true 2.25" × 3.5" finished canvas; the sheet itself is a true 11" × 17"
 * at the same DPI, so printing at 100% produces exact, unscaled passes.
 *
 * `grid` (explicit cols × rows) takes precedence over `gridId` when both are supplied —
 * Design Builder's 2/4/8/16-up layouts always pass `grid` directly.
 */
export async function buildBobosPrintSheets(args: {
  projectId: string;
  batchId: string;
  passes: { frontPng: Buffer; backPng: Buffer }[];
  gridId?: PrintSheetGridId;
  grid?: { cols: number; rows: number };
}): Promise<BobosPrintSheetSet> {
  const resolved = args.grid
    ? { cols: args.grid.cols, rows: args.grid.rows, perSheet: args.grid.cols * args.grid.rows, label: `${args.grid.cols} × ${args.grid.rows}` }
    : resolvePrintSheetGrid(args.gridId ?? "auto", args.passes.length);
  const grid = sheetGridMetrics(resolved.cols, resolved.rows);
  const sheetCount = Math.max(1, Math.ceil(args.passes.length / grid.perSheet));
  const frontPngUrls: string[] = [];
  const backPngUrls: string[] = [];
  const frontPdfUrls: string[] = [];
  const backPdfUrls: string[] = [];
  const frontJpegUrls: string[] = [];
  const backJpegUrls: string[] = [];
  const frontPdfBuffers: Buffer[] = [];
  const backPdfBuffers: Buffer[] = [];

  for (let s = 0; s < sheetCount; s += 1) {
    const start = s * grid.perSheet;
    const slice = args.passes.slice(start, start + grid.perSheet);
    if (slice.length === 0) continue;

    const frontSheet = await buildSheetPng(slice.map((p) => p.frontPng), grid);
    const backSheet = await buildSheetPng(slice.map((p) => p.backPng), grid, {
      mirrorForDuplexLongEdge: true,
    });

    const suffix = sheetCount === 1 ? "" : `-${String(s + 1).padStart(2, "0")}`;
    const frontPngRel = `${args.projectId}/${args.batchId}/sheet-front${suffix}.png`;
    const backPngRel = `${args.projectId}/${args.batchId}/sheet-back${suffix}.png`;

    const frontPdf = await sheetPngToPdf(frontSheet);
    const backPdf = await sheetPngToPdf(backSheet);
    frontPdfBuffers.push(frontPdf);
    backPdfBuffers.push(backPdf);

    frontPngUrls.push(await saveBobosRender(frontPngRel, frontSheet));
    backPngUrls.push(await saveBobosRender(backPngRel, backSheet));
    frontPdfUrls.push(await saveBobosRender(frontPngRel.replace(/\.png$/, ".pdf"), frontPdf));
    backPdfUrls.push(await saveBobosRender(backPngRel.replace(/\.png$/, ".pdf"), backPdf));
    frontJpegUrls.push(await saveBobosRender(frontPngRel.replace(/\.png$/, ".jpg"), await sheetPngToJpeg(frontSheet)));
    backJpegUrls.push(await saveBobosRender(backPngRel.replace(/\.png$/, ".jpg"), await sheetPngToJpeg(backSheet)));
  }

  const frontCombinedPdfUrl =
    frontPdfBuffers.length > 0
      ? await saveBobosRender(`${args.projectId}/${args.batchId}/sheet-front-all.pdf`, await mergeSheetPdfs(frontPdfBuffers))
      : null;
  const backCombinedPdfUrl =
    backPdfBuffers.length > 0
      ? await saveBobosRender(`${args.projectId}/${args.batchId}/sheet-back-all.pdf`, await mergeSheetPdfs(backPdfBuffers))
      : null;

  return {
    sheetCount,
    frontPngUrls,
    backPngUrls,
    frontPdfUrls,
    backPdfUrls,
    frontJpegUrls,
    backJpegUrls,
    frontCombinedPdfUrl,
    backCombinedPdfUrl,
    gridLabel: resolved.label,
    perSheet: resolved.perSheet,
  };
}
