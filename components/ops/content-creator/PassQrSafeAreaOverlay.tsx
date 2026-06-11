"use client";

import {
  PASS_HEIGHT,
  PASS_WIDTH,
  QR_PRINT_SIZE_IN,
  QR_ZONE,
  qrCardWidthPercent,
} from "@/lib/ops/creative-lab/pass-layout";

type Props = {
  /** Show printed dimension label inside the guide. */
  showLabel?: boolean;
};

/** Editor overlay — maps compositing coordinates onto the scaled back preview. */
export function PassQrSafeAreaOverlay({ showLabel = true }: Props) {
  const leftPct = (QR_ZONE.left / PASS_WIDTH) * 100;
  const topPct = (QR_ZONE.top / PASS_HEIGHT) * 100;
  const widthPct = (QR_ZONE.size / PASS_WIDTH) * 100;
  const heightPct = (QR_ZONE.size / PASS_HEIGHT) * 100;

  return (
    <div
      className="cc-creator__qr-safe-area"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
      }}
      aria-hidden
    >
      {showLabel ? (
        <span className="cc-creator__qr-safe-area-label">
          QR Safe Area · {QR_PRINT_SIZE_IN.toFixed(2)}" × {QR_PRINT_SIZE_IN.toFixed(2)}" (
          {qrCardWidthPercent()}% width)
        </span>
      ) : null}
    </div>
  );
}
