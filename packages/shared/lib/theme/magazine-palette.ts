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

/** Sync MD5. Client-safe so home, search, and jukebox can assign colors. */
function md5(value: string): string {
  function add(x: number, y: number): number {
    return (x + y) | 0;
  }
  function rol(n: number, s: number): number {
    return (n << s) | (n >>> (32 - s));
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return add(rol(add(add(a, q), add(x, t)), s), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  const bytes = new TextEncoder().encode(value);
  const blocks = Math.ceil((bytes.length + 9) / 64) * 64;
  const buf = new Uint8Array(blocks);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const view = new DataView(buf.buffer);
  const bits = bytes.length * 8;
  view.setUint32(blocks - 8, bits >>> 0, true);
  view.setUint32(blocks - 4, Math.floor(bits / 0x100000000), true);

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;
  for (let i = 0; i < blocks; i += 64) {
    const w = Array.from({ length: 16 }, (_, j) => view.getUint32(i + j * 4, true));
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;
    a = ff(a, b, c, d, w[0]!, 7, -680876936);
    d = ff(d, a, b, c, w[1]!, 12, -389564586);
    c = ff(c, d, a, b, w[2]!, 17, 606105819);
    b = ff(b, c, d, a, w[3]!, 22, -1044525330);
    a = ff(a, b, c, d, w[4]!, 7, -176418897);
    d = ff(d, a, b, c, w[5]!, 12, 1200080426);
    c = ff(c, d, a, b, w[6]!, 17, -1473231341);
    b = ff(b, c, d, a, w[7]!, 22, -45705983);
    a = ff(a, b, c, d, w[8]!, 7, 1770035416);
    d = ff(d, a, b, c, w[9]!, 12, -1958414417);
    c = ff(c, d, a, b, w[10]!, 17, -42063);
    b = ff(b, c, d, a, w[11]!, 22, -1990404162);
    a = ff(a, b, c, d, w[12]!, 7, 1804603682);
    d = ff(d, a, b, c, w[13]!, 12, -40341101);
    c = ff(c, d, a, b, w[14]!, 17, -1502002290);
    b = ff(b, c, d, a, w[15]!, 22, 1236535329);
    a = gg(a, b, c, d, w[1]!, 5, -165796510);
    d = gg(d, a, b, c, w[6]!, 9, -1069501632);
    c = gg(c, d, a, b, w[11]!, 14, 643717713);
    b = gg(b, c, d, a, w[0]!, 20, -373897302);
    a = gg(a, b, c, d, w[5]!, 5, -701558691);
    d = gg(d, a, b, c, w[10]!, 9, 38016083);
    c = gg(c, d, a, b, w[15]!, 14, -660478335);
    b = gg(b, c, d, a, w[4]!, 20, -405537848);
    a = gg(a, b, c, d, w[9]!, 5, 568446438);
    d = gg(d, a, b, c, w[14]!, 9, -1019803690);
    c = gg(c, d, a, b, w[3]!, 14, -187363961);
    b = gg(b, c, d, a, w[8]!, 20, 1163531501);
    a = gg(a, b, c, d, w[13]!, 5, -1444681467);
    d = gg(d, a, b, c, w[2]!, 9, -51403784);
    c = gg(c, d, a, b, w[7]!, 14, 1735328473);
    b = gg(b, c, d, a, w[12]!, 20, -1926607734);
    a = hh(a, b, c, d, w[5]!, 4, -378558);
    d = hh(d, a, b, c, w[8]!, 11, -2022574463);
    c = hh(c, d, a, b, w[11]!, 16, 1839030562);
    b = hh(b, c, d, a, w[14]!, 23, -35309556);
    a = hh(a, b, c, d, w[1]!, 4, -1530992060);
    d = hh(d, a, b, c, w[4]!, 11, 1272893353);
    c = hh(c, d, a, b, w[7]!, 16, -155497632);
    b = hh(b, c, d, a, w[10]!, 23, -1094730640);
    a = hh(a, b, c, d, w[13]!, 4, 681279174);
    d = hh(d, a, b, c, w[0]!, 11, -358537222);
    c = hh(c, d, a, b, w[3]!, 16, -722521979);
    b = hh(b, c, d, a, w[6]!, 23, 76029189);
    a = hh(a, b, c, d, w[9]!, 4, -640364487);
    d = hh(d, a, b, c, w[12]!, 11, -421815835);
    c = hh(c, d, a, b, w[15]!, 16, 530742520);
    b = hh(b, c, d, a, w[2]!, 23, -995338651);
    a = ii(a, b, c, d, w[0]!, 6, -198630844);
    d = ii(d, a, b, c, w[7]!, 10, 1126891415);
    c = ii(c, d, a, b, w[14]!, 15, -1416354905);
    b = ii(b, c, d, a, w[5]!, 21, -57434055);
    a = ii(a, b, c, d, w[12]!, 6, 1700485571);
    d = ii(d, a, b, c, w[3]!, 10, -1894986606);
    c = ii(c, d, a, b, w[10]!, 15, -1051523);
    b = ii(b, c, d, a, w[1]!, 21, -2054922799);
    a = ii(a, b, c, d, w[8]!, 6, 1873313359);
    d = ii(d, a, b, c, w[15]!, 10, -30611744);
    c = ii(c, d, a, b, w[6]!, 15, -1560198380);
    b = ii(b, c, d, a, w[13]!, 21, 1309151649);
    a = ii(a, b, c, d, w[4]!, 6, -145523070);
    d = ii(d, a, b, c, w[11]!, 10, -1120210379);
    c = ii(c, d, a, b, w[2]!, 15, 718787259);
    b = ii(b, c, d, a, w[9]!, 21, -343485551);
    a = add(a, aa);
    b = add(b, bb);
    c = add(c, cc);
    d = add(d, dd);
  }

  const out = new Uint8Array(16);
  const hex = new DataView(out.buffer);
  hex.setUint32(0, a, true);
  hex.setUint32(4, b, true);
  hex.setUint32(8, c, true);
  hex.setUint32(12, d, true);
  return [...out].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
