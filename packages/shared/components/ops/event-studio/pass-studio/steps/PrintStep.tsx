"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildDesignBuilderPrintSheets,
  getDesignBuilderPrintBatch,
  markDesignBuilderBatchPrinted,
} from "@/app/ops/event-studio/create/pass-generator/actions";
import {
  DESIGN_BUILDER_PRINT_LAYOUT_IDS,
  DESIGN_BUILDER_PRINT_LAYOUTS,
  type BobosPrintSheetSet,
  type DesignBuilderPrintLayoutId,
} from "@/lib/bobos/project-zero/pass-production-spec";
import { padSerial } from "@/lib/ops/event-studio/pass-studio/serials";
import type { PrintBatch, PrintBatchStatus } from "@/lib/ops/event-studio/pass-studio/print-batch-types";
import type { GeneratedPass } from "@/lib/ops/event-studio/pass-studio/types";

const STATUS_LABEL: Record<PrintBatchStatus, string> = {
  draft: "Draft",
  ready_to_print: "Ready to Print",
  printed: "Printed",
  void: "Void",
};

type SerialRange = { first: number; last: number };

function serialRangeLabel(range: SerialRange | undefined): string | null {
  if (!range) return null;
  return `Serials ${padSerial(range.first)}–${padSerial(range.last)}`;
}

/** Appends a build-version query param so a freshly-regenerated sheet at the same file
 *  path (e.g. "sheet-front-01.png") is never served stale from the browser's HTTP cache. */
function cacheBust(url: string, version: number): string {
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type Props = {
  projectId: string;
  passes: GeneratedPass[];
  printBatch: PrintBatch | null;
  onPrintBatchChange: (batch: PrintBatch) => void;
  onDone: () => void;
};

/** Step 5 — real production print workflow: batch summary, front/back sheets, PDF export, mark printed. */
export function PrintStep({ projectId, passes, printBatch, onPrintBatchChange, onDone }: Props) {
  const batchId = printBatch?.id ?? passes[0]?.batchId ?? null;

  const [layout, setLayout] = useState<DesignBuilderPrintLayoutId>("4up");
  const [sheets, setSheets] = useState<BobosPrintSheetSet | null>(null);
  const [buildVersion, setBuildVersion] = useState(0);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [frontSheetIndex, setFrontSheetIndex] = useState(0);
  const [backSheetIndex, setBackSheetIndex] = useState(0);
  const [marking, setMarking] = useState(false);
  const [printSide, setPrintSide] = useState<"front" | "back" | null>(null);

  // Both fronts and backs are built from this exact pass order, one sheet's worth at a
  // time — so the Nth chunk here is always the Nth front sheet AND the Nth back sheet.
  const batchPasses = useMemo(
    () => (batchId ? passes.filter((pass) => pass.batchId === batchId) : []),
    [passes, batchId],
  );
  const perSheetCount = DESIGN_BUILDER_PRINT_LAYOUTS[layout].perSheet;
  const sheetSerialRanges = useMemo<SerialRange[]>(() => {
    const ranges: SerialRange[] = [];
    for (let i = 0; i < batchPasses.length; i += perSheetCount) {
      const slice = batchPasses.slice(i, i + perSheetCount);
      if (slice.length === 0) continue;
      const numbers = slice.map((pass) => pass.serialNumber);
      ranges.push({ first: Math.min(...numbers), last: Math.max(...numbers) });
    }
    return ranges;
  }, [batchPasses, perSheetCount]);

  // Restore the Print Batch record if we navigated here without an in-memory result
  // (e.g. Print was opened straight from an already-generated library batch).
  useEffect(() => {
    if (printBatch || !batchId) return;
    let cancelled = false;
    getDesignBuilderPrintBatch(batchId).then((found) => {
      if (!cancelled && found) onPrintBatchChange(found);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, printBatch]);

  useEffect(() => {
    if (!batchId || passes.length === 0) return;
    let cancelled = false;
    setBuilding(true);
    setBuildError(null);
    buildDesignBuilderPrintSheets({ projectId, batchId, passes, layout })
      .then((result) => {
        if (cancelled) return;
        // Reset the sheet index and bump the cache-busting version together with the new
        // sheet array so the preview can never show a stale sheet at a reused file path.
        setSheets(result);
        setBuildVersion(Date.now());
        setFrontSheetIndex(0);
        setBackSheetIndex(0);
        onPrintBatchChange(result.batch);
      })
      .catch((err) => {
        if (!cancelled) setBuildError(err instanceof Error ? err.message : "Could not build print sheets.");
      })
      .finally(() => {
        if (!cancelled) setBuilding(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, layout, passes, projectId]);

  useEffect(() => {
    if (printSide === null) return;
    function handleAfterPrint() {
      setPrintSide(null);
    }
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [printSide]);

  function handlePrintSide(side: "front" | "back") {
    setPrintSide(side);
    requestAnimationFrame(() => window.print());
  }

  /** Exports the existing composited production sheet images as-is — one file per sheet,
   *  never a rasterized HTML screenshot. */
  function handleExportImages(side: "front" | "back", format: "png" | "jpeg") {
    if (!sheets) return;
    const urls =
      side === "front" ? (format === "png" ? sheets.frontPngUrls : sheets.frontJpegUrls) : format === "png" ? sheets.backPngUrls : sheets.backJpegUrls;
    const ext = format === "png" ? "png" : "jpg";
    urls.forEach((url, i) => {
      const filename = `${side}-sheet-${String(i + 1).padStart(2, "0")}.${ext}`;
      window.setTimeout(() => triggerDownload(cacheBust(url, buildVersion), filename), i * 250);
    });
  }

  async function handleMarkPrinted() {
    if (!printBatch) return;
    setMarking(true);
    try {
      const updated = await markDesignBuilderBatchPrinted(printBatch.id);
      onPrintBatchChange(updated);
    } finally {
      setMarking(false);
    }
  }

  if (!batchId || passes.length === 0) {
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

      <section className="ps-print__summary" aria-label="Print Summary">
        <div className="ps-print__summary-head">
          <h3>{printBatch?.eventName ?? "Event"}</h3>
          <span className="ps-print__summary-batch">Batch {printBatch?.displayId ?? "—"}</span>
          <span
            className={`ps-print__status-badge ps-print__status-badge--${printBatch?.status ?? "draft"}`}
          >
            {STATUS_LABEL[printBatch?.status ?? "draft"]}
          </span>
        </div>
        <div className="ps-print__summary-grid">
          <div className="ps-print__summary-item">
            <span className="ps-print__summary-label">Total Passes</span>
            <span className="ps-print__summary-value">{printBatch?.totalPasses ?? passes.length}</span>
          </div>
          {printBatch?.passTypeCounts.map((row) => (
            <div key={row.passType} className="ps-print__summary-item">
              <span className="ps-print__summary-label">{row.passType}</span>
              <span className="ps-print__summary-value">{row.quantity}</span>
            </div>
          ))}
          <div className="ps-print__summary-item">
            <span className="ps-print__summary-label">Serials</span>
            <span className="ps-print__summary-value">
              {printBatch ? `${padSerial(printBatch.serialStart)}–${padSerial(printBatch.serialEnd)}` : "—"}
            </span>
          </div>
          <div className="ps-print__summary-item">
            <span className="ps-print__summary-label">Per Sheet</span>
            <span className="ps-print__summary-value">{DESIGN_BUILDER_PRINT_LAYOUTS[layout].perSheet}</span>
          </div>
          <div className="ps-print__summary-item">
            <span className="ps-print__summary-label">Front Sheets</span>
            <span className="ps-print__summary-value">{printBatch?.frontSheetCount ?? "—"}</span>
          </div>
          <div className="ps-print__summary-item">
            <span className="ps-print__summary-label">Back Sheets</span>
            <span className="ps-print__summary-value">{printBatch?.backSheetCount ?? "—"}</span>
          </div>
          <div className="ps-print__summary-item">
            <span className="ps-print__summary-label">Paper</span>
            <span className="ps-print__summary-value">
              {printBatch ? `${printBatch.paperSize.widthIn}×${printBatch.paperSize.heightIn}in` : "11×17in"}
            </span>
          </div>
          <div className="ps-print__summary-item">
            <span className="ps-print__summary-label">Pass Size</span>
            <span className="ps-print__summary-value">
              {printBatch ? `${printBatch.passSize.widthIn}×${printBatch.passSize.heightIn}in` : "2.25×3.5in"}
            </span>
          </div>
        </div>
      </section>

      <div className="ps-print__layout-picker" role="group" aria-label="Passes per sheet">
        <span className="ps-print__layout-label">Layout</span>
        {DESIGN_BUILDER_PRINT_LAYOUT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`ps-print__per-sheet-option${id === layout ? " is-active" : ""}`}
            aria-pressed={id === layout}
            onClick={() => setLayout(id)}
          >
            {DESIGN_BUILDER_PRINT_LAYOUTS[id].label}
          </button>
        ))}
      </div>

      {building ? <p className="ps-step__hint">Building print sheets…</p> : null}
      {buildError ? <p className="ps-step__error">{buildError}</p> : null}

      {sheets ? (
        <>
          <section className="ps-print__sheets-section" aria-label="Front Sheets">
            <div className="ps-print__sheets-head">
              <div className="ps-print__sheet-label">
                <h3>
                  Front Sheet {frontSheetIndex + 1} of {sheets.frontPngUrls.length}
                </h3>
                {serialRangeLabel(sheetSerialRanges[frontSheetIndex]) ? (
                  <span className="ps-print__sheet-label-serials">
                    {serialRangeLabel(sheetSerialRanges[frontSheetIndex])}
                  </span>
                ) : null}
              </div>
              <div className="ps-print__pager">
                <button
                  type="button"
                  disabled={frontSheetIndex === 0}
                  onClick={() => setFrontSheetIndex((i) => i - 1)}
                >
                  ‹ Prev
                </button>
                <button
                  type="button"
                  disabled={frontSheetIndex === sheets.frontPngUrls.length - 1}
                  onClick={() => setFrontSheetIndex((i) => i + 1)}
                >
                  Next ›
                </button>
              </div>
            </div>
            <div className="ps-print__sheet-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cacheBust(sheets.frontPngUrls[frontSheetIndex]!, buildVersion)}
                alt={`Front sheet ${frontSheetIndex + 1}`}
                className="ps-print__sheet-image"
              />
            </div>
            <div className="ps-print__sheets-actions">
              <button
                type="button"
                className="ps-btn ps-btn--primary ps-btn--hero"
                onClick={() => handlePrintSide("front")}
              >
                Print Fronts
              </button>
              {sheets.frontCombinedPdfUrl ? (
                <a
                  className="ps-btn ps-btn--hero"
                  href={cacheBust(sheets.frontCombinedPdfUrl, buildVersion)}
                  download
                >
                  Export Front PDF
                </a>
              ) : null}
              <button type="button" className="ps-btn ps-btn--hero" onClick={() => handleExportImages("front", "png")}>
                Export PNGs
              </button>
              <button type="button" className="ps-btn ps-btn--hero" onClick={() => handleExportImages("front", "jpeg")}>
                Export JPEGs
              </button>
            </div>
          </section>

          <section className="ps-print__sheets-section" aria-label="Back Sheets">
            <div className="ps-print__sheets-head">
              <div className="ps-print__sheet-label">
                <h3>
                  Back Sheet {backSheetIndex + 1} of {sheets.backPngUrls.length}
                </h3>
                {serialRangeLabel(sheetSerialRanges[backSheetIndex]) ? (
                  <span className="ps-print__sheet-label-serials">
                    {serialRangeLabel(sheetSerialRanges[backSheetIndex])}
                  </span>
                ) : null}
              </div>
              <div className="ps-print__pager">
                <button
                  type="button"
                  disabled={backSheetIndex === 0}
                  onClick={() => setBackSheetIndex((i) => i - 1)}
                >
                  ‹ Prev
                </button>
                <button
                  type="button"
                  disabled={backSheetIndex === sheets.backPngUrls.length - 1}
                  onClick={() => setBackSheetIndex((i) => i + 1)}
                >
                  Next ›
                </button>
              </div>
            </div>
            <div className="ps-print__sheet-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cacheBust(sheets.backPngUrls[backSheetIndex]!, buildVersion)}
                alt={`Back sheet ${backSheetIndex + 1}`}
                className="ps-print__sheet-image"
              />
            </div>
            <div className="ps-print__sheets-actions">
              <button
                type="button"
                className="ps-btn ps-btn--primary ps-btn--hero"
                onClick={() => handlePrintSide("back")}
              >
                Print Backs
              </button>
              {sheets.backCombinedPdfUrl ? (
                <a
                  className="ps-btn ps-btn--hero"
                  href={cacheBust(sheets.backCombinedPdfUrl, buildVersion)}
                  download
                >
                  Export Back PDF
                </a>
              ) : null}
              <button type="button" className="ps-btn ps-btn--hero" onClick={() => handleExportImages("back", "png")}>
                Export PNGs
              </button>
              <button type="button" className="ps-btn ps-btn--hero" onClick={() => handleExportImages("back", "jpeg")}>
                Export JPEGs
              </button>
            </div>
          </section>

          <div className="ps-print__print-only" aria-hidden={printSide === null}>
            {printSide === "front"
              ? sheets.frontPngUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={cacheBust(url, buildVersion)}
                    alt={`Front sheet ${i + 1}`}
                    className="ps-print__print-page"
                  />
                ))
              : printSide === "back"
                ? sheets.backPngUrls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={cacheBust(url, buildVersion)}
                      alt={`Back sheet ${i + 1}`}
                      className="ps-print__print-page"
                    />
                  ))
                : null}
          </div>
        </>
      ) : null}

      <div className="ps-print__mark-printed">
        <button
          type="button"
          className="ps-btn ps-btn--hero"
          disabled={!printBatch || printBatch.status === "printed" || marking}
          onClick={() => void handleMarkPrinted()}
        >
          {printBatch?.status === "printed" ? "Batch Printed ✓" : marking ? "Marking…" : "Mark Batch Printed"}
        </button>
      </div>

      <div className="ps-print__actions">
        <button type="button" className="ps-btn ps-btn--hero" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
