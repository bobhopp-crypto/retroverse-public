/** Pass numbering — printed serials or collector hand-number write-in. */

export type PassNumberFormatId = "no_3" | "no_4" | "fraction" | "of_total" | "custom";

export type PassNumberingSettings = {
  printSerialNumbers: boolean;
  collectorEdition: boolean;
  numberFormat: PassNumberFormatId;
  customFormat: string;
};

export type SerialStampOverlay = {
  mode: "printed" | "write_in";
  text: string;
};

export const DEFAULT_PASS_NUMBERING: PassNumberingSettings = {
  printSerialNumbers: false,
  collectorEdition: true,
  numberFormat: "no_3",
  customFormat: "VIP-{NNN}",
};

export const PRINT_QUANTITY_PRESETS = [12, 24, 36] as const;

export const PASS_NUMBER_FORMAT_OPTIONS: { id: PassNumberFormatId; label: string }[] = [
  { id: "no_3", label: "No. 001" },
  { id: "no_4", label: "No. 0001" },
  { id: "fraction", label: "001 / 012" },
  { id: "of_total", label: "001 of 012" },
  { id: "custom", label: "Custom format" },
];

export function normalizePrintQuantity(value: unknown, fallback = 12): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.max(1, Math.floor(n)), 999);
}

export function sheetCountForQuantity(quantity: number): number {
  return Math.ceil(quantity / 12);
}

function padIndex(index: number, width: number): string {
  return String(index).padStart(width, "0");
}

function padTotal(total: number, width: number): string {
  return String(total).padStart(width, "0");
}

/** Apply custom template — {NNN} pad width = count of N; {TOTAL} unpadded total. */
export function applyCustomNumberFormat(template: string, index: number, total: number): string {
  let out = template;
  const nMatch = out.match(/\{(N+)\}/);
  if (nMatch) {
    const width = nMatch[1]!.length;
    out = out.replace(nMatch[0], padIndex(index, width));
  }
  out = out.replace(/\{TOTAL\}/g, String(total));
  out = out.replace(/\{TTT+\}/g, (m) => padTotal(total, m.length - 2));
  return out;
}

export function formatPassSerial(
  index: number,
  total: number,
  settings: Pick<PassNumberingSettings, "numberFormat" | "customFormat">,
): string {
  const width = Math.max(3, String(total).length);
  const n3 = padIndex(index, 3);
  const n4 = padIndex(index, 4);
  const t = padTotal(total, width);

  switch (settings.numberFormat) {
    case "no_3":
      return `No. ${n3}`;
    case "no_4":
      return `No. ${n4}`;
    case "fraction":
      return `${padIndex(index, width)} / ${t}`;
    case "of_total":
      return `${padIndex(index, width)} of ${t}`;
    case "custom":
      return applyCustomNumberFormat(settings.customFormat.trim() || "VIP-{NNN}", index, total);
    default:
      return `No. ${n3}`;
  }
}

export function writeInStampLabel(settings: PassNumberingSettings): string {
  if (settings.collectorEdition) return "Pass No. __________";
  return "No. ______";
}

export function resolveSerialStampOverlay(
  settings: PassNumberingSettings,
  index: number,
  total: number,
): SerialStampOverlay {
  if (settings.printSerialNumbers) {
    return {
      mode: "printed",
      text: formatPassSerial(index, total, settings),
    };
  }
  return {
    mode: "write_in",
    text: writeInStampLabel(settings),
  };
}

export function serialNumberPreview(
  settings: PassNumberingSettings,
  quantity: number,
): { first: string; last: string } | null {
  if (!settings.printSerialNumbers || quantity < 1) return null;
  return {
    first: formatPassSerial(1, quantity, settings),
    last: formatPassSerial(quantity, quantity, settings),
  };
}

export function parsePassNumberingSettings(body: Record<string, unknown>): PassNumberingSettings {
  const numberFormat = body.numberFormat;
  const validFormats: PassNumberFormatId[] = ["no_3", "no_4", "fraction", "of_total", "custom"];

  return {
    printSerialNumbers: body.printSerialNumbers === true,
    collectorEdition: body.collectorEdition !== false,
    numberFormat:
      typeof numberFormat === "string" && validFormats.includes(numberFormat as PassNumberFormatId)
        ? (numberFormat as PassNumberFormatId)
        : DEFAULT_PASS_NUMBERING.numberFormat,
    customFormat:
      typeof body.customFormat === "string" && body.customFormat.trim()
        ? body.customFormat.trim()
        : DEFAULT_PASS_NUMBERING.customFormat,
  };
}

/** @deprecated Use formatPassSerial with PassNumberingSettings */
export function formatPassSerialLegacy(index: number, total: number, format: "fraction" | "number" = "fraction"): string {
  return formatPassSerial(index, total, {
    numberFormat: format === "number" ? "no_3" : "fraction",
    customFormat: "VIP-{NNN}",
  });
}
