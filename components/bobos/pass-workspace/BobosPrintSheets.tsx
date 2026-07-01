"use client";

import {
  BOBOS_PASS_FINISHED_HEIGHT_IN,
  BOBOS_PASS_FINISHED_WIDTH_IN,
} from "@/lib/bobos/project-zero/pass-production-spec";
import type { BobosPrintSheetSet } from "@/lib/bobos/project-zero/pass-production";

type Props = {
  passCount: number;
  sheets: BobosPrintSheetSet | null;
  building: boolean;
  onBuild: () => void;
  onDone: () => void;
};

/**
 * Print step shows the literal print-ready sheet images — the same production images from
 * Preview, laid out with cut marks and mirrored for long-edge duplex. No browser print
 * dialog, no CSS scaling: what downloads is exactly what prints at 100%.
 */
export function BobosPrintSheets({ passCount, sheets, building, onBuild, onDone }: Props) {
  if (passCount === 0) {
    return (
      <div className="ps-step ps-step--center">
        <h2 className="ps-step__title">Print</h2>
        <p className="ps-step__hint">Generate a batch to build print sheets here.</p>
      </div>
    );
  }

  return (
    <div className="ps-step ps-print-area">
      <h2 className="ps-step__title">Print</h2>
      <p className="pzw-preview__spec">
        Each pass prints at exactly {BOBOS_PASS_FINISHED_WIDTH_IN}&quot; × {BOBOS_PASS_FINISHED_HEIGHT_IN}&quot; · 11&quot; ×
        17&quot; sheet · 12-up · cut marks · back mirrored for long-edge duplex
      </p>

      {!sheets ? (
        <button type="button" className="ps-btn ps-btn--primary ps-btn--hero" onClick={onBuild} disabled={building}>
          {building ? "Building Print Sheets…" : "Build Print Sheets"}
        </button>
      ) : (
        <div className="pzw-sheets">
          {sheets.frontPngUrls.map((frontUrl, i) => (
            <div key={frontUrl} className="pzw-sheets__pair">
              <div className="pzw-sheets__sheet">
                <p className="pzw-sheets__label">
                  Sheet {i + 1} of {sheets.sheetCount} — Front
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={frontUrl} alt={`Front print sheet ${i + 1}`} className="pzw-sheets__image" />
                <a className="ps-btn ps-btn--hero" href={sheets.frontPdfUrls[i]} download>
                  Download Front PDF
                </a>
              </div>
              <div className="pzw-sheets__sheet">
                <p className="pzw-sheets__label">
                  Sheet {i + 1} of {sheets.sheetCount} — Back
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sheets.backPngUrls[i]} alt={`Back print sheet ${i + 1}`} className="pzw-sheets__image" />
                <a className="ps-btn ps-btn--hero" href={sheets.backPdfUrls[i]} download>
                  Download Back PDF
                </a>
              </div>
            </div>
          ))}

          <button type="button" className="ps-btn ps-btn--quiet" onClick={onBuild} disabled={building}>
            {building ? "Rebuilding…" : "Rebuild Print Sheets"}
          </button>
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
