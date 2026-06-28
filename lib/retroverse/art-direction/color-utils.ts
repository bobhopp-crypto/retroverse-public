export function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

export function mix(a: string, b: string, weight: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const w = Math.min(1, Math.max(0, weight));
  const r = Math.round(ca.r * (1 - w) + cb.r * w);
  const g = Math.round(ca.g * (1 - w) + cb.g * w);
  const bl = Math.round(ca.b * (1 - w) + cb.b * w);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

export function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export function fallbackPalette(rvtr: string) {
  const hue = hashHue(rvtr);
  const primary = hslToHex(hue, 28, 42);
  const secondary = hslToHex(hue, 18, 28);
  const accent = hslToHex((hue + 40) % 360, 55, 52);
  return { primary, secondary, accent };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

const HUE_NAMES: Array<[number, string]> = [
  [15, "Crimson"],
  [45, "Amber"],
  [65, "Gold"],
  [85, "Olive"],
  [150, "Forest"],
  [195, "Teal"],
  [220, "Midnight Blue"],
  [260, "Indigo"],
  [290, "Plum"],
  [330, "Rose"],
  [360, "Crimson"],
];

export function describeColor(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  if (hsl.s < 8) {
    if (hsl.l < 18) return "Charcoal";
    if (hsl.l < 35) return "Slate";
    if (hsl.l > 82) return "Ivory";
    if (hsl.l > 65) return "Warm Paper";
    return "Stone Gray";
  }
  const hueName =
    HUE_NAMES.find(([bound]) => hsl.h < bound)?.[1] ??
    HUE_NAMES[HUE_NAMES.length - 1]![1];
  if (hsl.l < 22) return `Deep ${hueName}`;
  if (hsl.l < 38) return hueName;
  if (hsl.l < 55) return `Muted ${hueName}`;
  if (hsl.l < 72) return `Soft ${hueName}`;
  return `Pale ${hueName}`;
}
