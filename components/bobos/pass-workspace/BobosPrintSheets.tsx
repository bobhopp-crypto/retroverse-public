"use client";

import { useEffect, useRef } from "react";

import {
  BOBOS_PASS_FINISHED_HEIGHT_IN,
  BOBOS_PASS_FINISHED_WIDTH_IN,
} from "@/lib/bobos/project-zero/pass-production-spec";
import type { BobosPrintSheetSet } from "@/lib/bobos/project-zero/pass-production";

type SheetsStatus = "idle" | "building" | "ready" | "error";

type Props = {
  passCount: number;
  sheets: BobosPrintSheetSet | null;
  status: SheetsStatus;
  error: string | null;
  onBuild: () => void;
  onDone: () => void;
};

const BUILD_LABEL: Record<SheetsStatus, string> = {
  idle: "Build Print Sheets",
  building: "Building Print Sheets…",
  ready: "Rebuild Print Sheets",
  error: "Try Again",
};

/**
 * Print step shows the literal print-ready sheet images — the same production images from
 * Preview, laid out with cut marks and mirrored for long-edge duplex. No browser print
 * dialog, no CSS scaling: what downloads is exactly what prints at 100%. Every state is
 * explicit — building, ready with a count, or a visible error — so the user never has to
 * wonder whether anything happened.
 */
export function BobosPrintSheets({ passCount, sheets, status, error, onBuild, onDone }: Props) {
  const prevStatus = useRef<SheetsStatus>(status);

  useEffect(() => {
    if (prevStatus.current === "building" && status === "ready" && sheets) {
      requestAnimationFrame(() => {
        document.getElementById("pzw-open-sheets")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    prevStatus.current = status;
  }, [status, sheets]);

  if (passCount === 0) {
    return (
      <div className="ps-step ps-step--center">
        <h2 className="ps-step__title">Print</h2>
        <p className="ps-step__hint">Generate a batch to build print sheets here.</p>
      </div>
    );
  }

  const building = status === "building";

  return (
    <div className="ps-step ps-print-area">
      <h2 className="ps-step__title">Print</h2>
      <p className="pzw-preview__spec">
        Each pass prints at exactly {BOBOS_PASS_FINISHED_WIDTH_IN}&quot; × {BOBOS_PASS_FINISHED_HEIGHT_IN}&quot; · 11&quot; ×
        17&quot; sheet · 12-up · cut marks · back mirrored for long-edge duplex
      </p>

      {status === "error" && error ? (
        <p className="ps-step__error" role="alert">
          ⚠ {error}
        </p>
      ) : null}

      {building ? (
        <p className="pzw-sheets__building" role="status" aria-live="polite">
          Building Print Sheets… Processing {passCount} pass{passCount === 1 ? "" : "es"}.
        </p>
      ) : null}

      {!sheets ? (
        <button
          type="button"
          className="ps-btn ps-btn--primary ps-btn--hero"
          onClick={onBuild}
          disabled={building}
          aria-busy={building}
        >
          {building ? "Building Print Sheets…" : BUILD_LABEL[status]}
        </button>
      ) : (
        <div className="pzw-sheets">
          <p className="pzw-sheets__ready" role="status">
            ✓ Print sheets ready — {sheets.sheetCount} sheet{sheets.sheetCount === 1 ? "" : "s"} created.
          </p>

          <div className="pzw-sheets__toolbar">
            <a className="ps-btn ps-btn--primary ps-btn--hero" href="#pzw-open-sheets">
              Open Print Sheets
            </a>
            <button type="button" className="ps-btn ps-btn--quiet" onClick={onBuild} disabled={building} aria-busy={building}>
              {BUILD_LABEL[status]}
            </button>
          </div>

          <div id="pzw-open-sheets" className="pzw-sheets__grid">
            {sheets.frontPngUrls.map((frontUrl, i) => (
              <div key={frontUrl} className="pzw-sheets__pair">
                <div className="pzw-sheets__sheet">
                  <p className="pzw-sheets__label">
                    Sheet {i + 1} of {sheets.sheetCount} — Front
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={frontUrl} alt={`Front print sheet ${i + 1}`} className="pzw-sheets__image" />
                  <div className="pzw-sheets__pdf-actions">
                    <a
                      className="ps-btn ps-btn--hero"
                      href={sheets.frontPdfUrls[i]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open PDF
                    </a>
                    <a className="ps-btn ps-btn--hero" href={sheets.frontPdfUrls[i]} download>
                      Download PDF
                    </a>
                  </div>
                </div>
                <div className="pzw-sheets__sheet">
                  <p className="pzw-sheets__label">
                    Sheet {i + 1} of {sheets.sheetCount} — Back
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sheets.backPngUrls[i]} alt={`Back print sheet ${i + 1}`} className="pzw-sheets__image" />
                  <div className="pzw-sheets__pdf-actions">
                    <a
                      className="ps-btn ps-btn--hero"
                      href={sheets.backPdfUrls[i]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open PDF
                    </a>
                    <a className="ps-btn ps-btn--hero" href={sheets.backPdfUrls[i]} download>
                      Download PDF
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ps-print__actions">
        <button type="button" className="ps-btn ps-btn--hero" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
