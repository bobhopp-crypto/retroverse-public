/** Dev-only gallery route instrumentation — no behavior changes. */

const ENABLED =
  process.env.RETROVERSE_GALLERY_INSTRUMENT === "1" ||
  process.env.RETROVERSE_GALLERY_TRACE === "1" ||
  process.env.NODE_ENV === "development";

export function galleryInstrumentEnabled(): boolean {
  return ENABLED;
}

export function galleryTime(label: string): void {
  if (ENABLED) console.time(label);
}

export function galleryTimeEnd(label: string): void {
  if (ENABLED) console.timeEnd(label);
}

export function galleryLog(message: string, detail?: Record<string, unknown>): void {
  if (!ENABLED) return;
  if (detail) console.log(message, detail);
  else console.log(message);
}

export function galleryPayloadBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return -1;
  }
}

export function galleryLogPayload(label: string, value: unknown): void {
  if (!ENABLED) return;
  const bytes = galleryPayloadBytes(value);
  const mb = bytes / (1024 * 1024);
  galleryLog(`[gallery-instrument] payload ${label}`, {
    bytes,
    mb: Number(mb.toFixed(3)),
    over1mb: mb > 1,
  });
  if (mb > 1) {
    console.warn(`[gallery-instrument] WARNING payload >1MB: ${label} (${mb.toFixed(2)} MB)`);
  }
}
