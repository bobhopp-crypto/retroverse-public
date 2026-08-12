import "server-only";

import QRCode from "qrcode";

const PASS_QR_BASE_URL = "https://retroverse.live/pass";

/** Pattern: retroverse.live/pass/{serial} — every pass gets one automatically. */
export function passQrUrl(serial: string): string {
  return `${PASS_QR_BASE_URL}/${serial}`;
}

/** Vector QR — crisp at any print size, small enough to store in the library forever. */
export async function renderPassQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
