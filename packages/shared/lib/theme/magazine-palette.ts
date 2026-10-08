import { createHash } from "node:crypto";

/**
 * Retroverse magazine palette.
 *
 * Sixteen flat hues, in hue order. Accent colors are assigned in document
 * order. Each pass prefers the least-used hues, and a hue cannot sit next to
 * the same hue (or, when the palette still has room, next to its neighbors on
 * this wheel). One element gets one flat color; extra slots are only for a
 * second or third flat color on the same element (offset shadow).
 */

export const MAGAZINE_PALETTE = [
  { name: "Red", hex: "#ff2937" },
  { name: "Vermilion", hex: "#ff4d00" },
  { name: "Orange", hex: "#ff8800" },
  { name: "Amber", hex: "#ffbb00" },
  { name: "Yellow", hex: "#ffee00" },
  { name: "Chartreuse", hex: "#b2ff00" },
  { name: "Lime", hex: "#3de600" },
  { name: "Green", hex: "#00cc44" },
  { name: "Teal", hex: "#00c2a2" },
  { name: "Cyan", hex: "#00ddff" },
  { name: "Sky", hex: "#0099ff" },
  { name: "Blue", hex: "#3d7eff" },
  { name: "Indigo", hex: "#7373ff" },
  { name: "Violet", hex: "#9c63ff" },
  { name: "Purple", hex: "#d036ff" },
  { name: "Pink", hex: "#ff00a1" },
] as const;

export const MAGAZINE_HEX = MAGAZINE_PALETTE.map((swatch) => swatch.hex);

/** Dark chapter surfaces. Flat neutrals, no colored glow. */
export const MAGAZINE_CHAPTER_SURFACES = ["#0d0d12", "#100f13", "#0d0f12", "#110f0f"] as const;

const INK = "#07070d";
const PAPER = "#ffffff";

export type FlatTone = {
  /** Fill, border, or text hue. */
  a: string;
  /** Second flat hue, used for an offset shadow. */
  b?: string;
  /** Third flat hue, used for the far offset shadow. */
  c?: string;
  /** Text color on top of `a`. Always the darker or lighter ink that contrasts more. */
  ink: string;
};

function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = channel(Number.parseInt(h.slice(0, 2), 16));
  const g = channel(Number.parseInt(h.slice(2, 4), 16));
  const b = channel(Number.parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const left = luminance(a);
  const right = luminance(b);
  const [hi, lo] = left >= right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

/** Dark or light text on a filled block, whichever contrasts more. */
export function inkOn(fill: string): string {
  return contrastRatio(fill, INK) >= contrastRatio(fill, PAPER) ? INK : PAPER;
}

/** Headline hue for an artist. Stable for the same name. */
export function heroColor(name: string): string {
  const hex = md5(name);
  const index = Number(BigInt(`0x${hex}`) % BigInt(16));
  return MAGAZINE_HEX[index] ?? MAGAZINE_HEX[0];
}

const HUE_INDEX = new Map<string, number>(MAGAZINE_HEX.map((hex, index) => [hex, index]));

function hueDistance(a: string, b: string): number {
  const d = Math.abs((HUE_INDEX.get(a) ?? 0) - (HUE_INDEX.get(b) ?? 0)) % 16;
  return Math.min(d, 16 - d);
}

const RULES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 3, 3],
  [2, 3, 2],
  [2, 2, 1],
  [1, 1, 1],
  [1, 0, 0],
];

/**
 * Walk accent slots in the order the page paints them.
 * `kind` is `tag:class` (first class only). Slot index is part of the kind,
 * matching the magazine template, so a fill and its shadow do not share history.
 */
export function createPaletteAssigner(hero: string) {
  const counts = new Map<string, number>(MAGAZINE_HEX.map((hex) => [hex, hex === hero ? 1 : 0]));
  const recent = [hero];
  const byKind = new Map<string, string[]>();
  let taken = 0;

  function next(kind: string): string {
    taken += 1;
    const order = [...MAGAZINE_HEX].sort((a, b) =>
      md5(`${hero}:${taken}:${a}`).localeCompare(md5(`${hero}:${taken}:${b}`)),
    );
    const kindHistory = byKind.get(kind) ?? [];
    const least = Math.min(...counts.values());
    for (const [gap, win, kindGap] of RULES) {
      const tiers = gap > 1 ? [least, least + 1] : [least, least + 1, 99];
      for (const tier of tiers) {
        for (const color of order) {
          if ((counts.get(color) ?? 0) > tier) continue;
          if (win > 0 && recent.slice(-win).some((previous) => hueDistance(color, previous) < gap)) continue;
          if (recent.at(-1) === color) continue;
          if (kindHistory.slice(-2).some((previous) => hueDistance(color, previous) < kindGap)) continue;
          counts.set(color, (counts.get(color) ?? 0) + 1);
          recent.push(color);
          const nextHistory = byKind.get(kind);
          if (nextHistory) nextHistory.push(color);
          else byKind.set(kind, [color]);
          return color;
        }
      }
    }
    throw new Error(`No magazine color available for ${kind}`);
  }

  return {
    take(kind: string, slots: 1 | 2 | 3): FlatTone {
      const colors = Array.from({ length: slots }, (_, index) => next(`${kind}:${index}`));
      const tone: FlatTone = { a: colors[0]!, ink: inkOn(colors[0]!) };
      if (colors[1]) tone.b = colors[1];
      if (colors[2]) tone.c = colors[2];
      return tone;
    },
    counts(): Record<string, number> {
      return Object.fromEntries(counts);
    },
  };
}
