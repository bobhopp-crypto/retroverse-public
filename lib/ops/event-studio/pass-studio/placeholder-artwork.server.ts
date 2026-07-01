import "server-only";

/**
 * Deterministic default pass artwork — printable Retroverse event credentials.
 * No external calls, no AI. Same inputs + seed always render the same SVG;
 * bumping `seed` (New Version) changes decorative variation only.
 */

export type PlaceholderArtworkInput = {
  passType: string;
  passTypeSlug?: "general" | "vip" | "backstage";
  eventTitle: string;
  venue: string;
  date: string;
  seriesText?: string;
  primary: string;
  accent: string;
  secondary?: string;
  seed: number;
  side: "front" | "back";
};

type VariantPalette = {
  paper: string;
  ink: string;
  primary: string;
  accent: string;
  secondary: string;
  band: string;
  bandInk: string;
};

const WIDTH = 750;
const HEIGHT = 1200;

/** Matches default template qrPosition — keep QR pad clear on the back. */
const QR_X = Math.round(WIDTH * 0.68);
const QR_Y = Math.round(HEIGHT * 0.68);
const QR_SIZE = Math.round(WIDTH * 0.24);

const VARIANT_PALETTES: Record<"general" | "vip" | "backstage", VariantPalette> = {
  general: {
    paper: "#f4edd8",
    ink: "#0d1b2a",
    primary: "#0d1b2a",
    accent: "#1b998b",
    secondary: "#ffffff",
    band: "#0d1b2a",
    bandInk: "#f4edd8",
  },
  vip: {
    paper: "#1a0a0a",
    ink: "#fff8e7",
    primary: "#6b1010",
    accent: "#d4af37",
    secondary: "#ffffff",
    band: "#d4af37",
    bandInk: "#1a0a0a",
  },
  backstage: {
    paper: "#121218",
    ink: "#f0ecff",
    primary: "#121218",
    accent: "#9d4edd",
    secondary: "#ffffff",
    band: "#9d4edd",
    bandInk: "#121218",
  },
};

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (ch) => {
    switch (ch) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      default:
        return "&apos;";
    }
  });
}

function resolveSlug(input: PlaceholderArtworkInput): "general" | "vip" | "backstage" {
  if (input.passTypeSlug) return input.passTypeSlug;
  const lower = input.passType.toLowerCase();
  if (lower.includes("backstage")) return "backstage";
  if (lower.includes("vip")) return "vip";
  return "general";
}

function resolvePalette(input: PlaceholderArtworkInput): VariantPalette {
  const slug = resolveSlug(input);
  const base = VARIANT_PALETTES[slug];
  return {
    ...base,
    primary: input.primary?.trim() ? input.primary : base.primary,
    accent: input.accent?.trim() ? input.accent : base.accent,
    secondary: input.secondary?.trim() ? input.secondary : base.secondary,
  };
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > maxChars ? truncate(word, maxChars) : word;
    if (lines.length >= maxLines - 1) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    const last = lines[maxLines - 1]!;
    lines[maxLines - 1] = truncate(last, maxChars);
  }

  return lines.slice(0, maxLines);
}

function svgTextBlock(
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  attrs: string,
): string {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${startY + i * lineHeight}" ${attrs}>${escapeXml(line)}</text>`,
    )
    .join("\n");
}

function frameBorder(palette: VariantPalette): string {
  return `
<rect x="18" y="18" width="${WIDTH - 36}" height="${HEIGHT - 36}" fill="none" stroke="${palette.accent}" stroke-width="6" />
<rect x="32" y="32" width="${WIDTH - 64}" height="${HEIGHT - 64}" fill="none" stroke="${palette.ink}" stroke-width="2" opacity="0.85" />`;
}

function seedDecorations(seed: number, slug: string, palette: VariantPalette): string {
  const mode = seed % 6;
  const hash = hashString(`${slug}:${seed}`);
  const accent = palette.accent;
  const ink = palette.ink;

  switch (mode) {
    case 0:
      return Array.from({ length: 5 }, (_, i) => {
        const y = 140 + i * 48;
        return `<rect x="40" y="${y}" width="${WIDTH - 80}" height="8" fill="${accent}" opacity="0.22" />`;
      }).join("\n");
    case 1:
      return `<polygon points="0,0 ${WIDTH},0 ${WIDTH - 120},120 0,120" fill="${accent}" opacity="0.18" />
<polygon points="0,${HEIGHT} 120,${HEIGHT} 0,${HEIGHT - 120}" fill="${accent}" opacity="0.18" />`;
    case 2:
      return `<circle cx="${WIDTH / 2}" cy="420" r="210" fill="none" stroke="${accent}" stroke-width="3" opacity="0.35" />
<circle cx="${WIDTH / 2}" cy="420" r="170" fill="none" stroke="${accent}" stroke-width="2" opacity="0.2" />`;
    case 3:
      return `<rect x="0" y="0" width="28" height="${HEIGHT}" fill="${accent}" opacity="0.55" />
<rect x="${WIDTH - 28}" y="0" width="28" height="${HEIGHT}" fill="${accent}" opacity="0.55" />`;
    case 4:
      return Array.from({ length: 4 }, (_, i) => {
        const cx = i % 2 === 0 ? 70 : WIDTH - 70;
        const cy = i < 2 ? 90 : HEIGHT - 170;
        return `<polygon points="${cx},${cy - 22} ${cx + 20},${cy} ${cx},${cy + 22} ${cx - 20},${cy}" fill="${accent}" opacity="0.45" />`;
      }).join("\n");
    default: {
      const offset = hash % 80;
      return Array.from({ length: 3 }, (_, i) => {
        const y = 200 + i * 180 + offset;
        return `<rect x="-60" y="${y}" width="${WIDTH + 120}" height="18" fill="${ink}" opacity="0.06" transform="rotate(-12 ${WIDTH / 2} ${HEIGHT / 2})" />`;
      }).join("\n");
    }
  }
}

function passTypeDisplay(passType: string): string {
  const label = passType.replace(/\s+Pass$/i, "").trim() || passType;
  return label.toUpperCase();
}

function headerStripe(palette: VariantPalette): string {
  return `<rect x="32" y="32" width="${WIDTH - 64}" height="88" fill="${palette.accent}" opacity="0.92" />`;
}

/** Band height/position as fractions of HEIGHT — mirrored exactly by the CSS overlay. */
export const SERIAL_BAND_TOP_PCT = ((HEIGHT - 96 - 32) / HEIGHT) * 100;
export const SERIAL_BAND_HEIGHT_PCT = (96 / HEIGHT) * 100;
/** Back-only URL line position, above the serial band — mirrored by CSS overlay. */
export const PASS_URL_TOP_PCT = ((HEIGHT - 32 - 96 - 52) / HEIGHT) * 100;

/**
 * Solid stripe with a left-aligned label baked into the artwork. The actual
 * serial number is drawn separately by the HTML overlay (PassFace) on the
 * right side of the same stripe — templates are shared across every pass of
 * a type, so the per-pass serial can never be baked into the artwork itself.
 */
function serialBand(palette: VariantPalette, label: string): string {
  const bandH = 96;
  const y = HEIGHT - bandH - 32;
  return `
<rect x="32" y="${y}" width="${WIDTH - 64}" height="${bandH}" fill="${palette.band}" />
<text x="64" y="${y + bandH / 2 + 8}" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="6" fill="${palette.bandInk}" opacity="0.75">${escapeXml(label)}</text>`;
}

function renderFront(input: PlaceholderArtworkInput, palette: VariantPalette, slug: string): string {
  const passLabel = passTypeDisplay(input.passType);
  const eventLines = wrapLines(truncate(input.eventTitle, 80), 22, 2);
  const venue = truncate(input.venue || "Venue TBD", 42);
  const date = truncate(input.date || "Date TBD", 42);
  const series = truncate(input.seriesText?.trim() || "Sunday Nights · Retroverse Live", 48);

  const eventY = slug === "vip" ? 560 : 540;
  const typeY = slug === "backstage" ? 360 : 340;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.paper}" />
${seedDecorations(input.seed, slug, palette)}
${frameBorder(palette)}
${headerStripe(palette)}
<text x="${WIDTH / 2}" y="92" text-anchor="middle" font-family="Impact, 'Arial Black', Arial, sans-serif" font-size="44" font-weight="900" letter-spacing="8" fill="${palette.bandInk}">RETROVERSE</text>
<text x="${WIDTH / 2}" y="118" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="5" fill="${palette.bandInk}" opacity="0.9">EVENT CREDENTIAL</text>
<text x="${WIDTH / 2}" y="${typeY}" text-anchor="middle" font-family="Impact, 'Arial Black', Arial, sans-serif" font-size="${slug === "general" ? 96 : 88}" font-weight="900" letter-spacing="4" fill="${palette.ink}">${escapeXml(passLabel)}</text>
<rect x="120" y="${typeY + 24}" width="${WIDTH - 240}" height="6" fill="${palette.accent}" />
${svgTextBlock(eventLines, WIDTH / 2, eventY, 46, `text-anchor="middle" font-family="Impact, 'Arial Black', Arial, sans-serif" font-size="38" font-weight="800" fill="${palette.ink}"`)}
<text x="${WIDTH / 2}" y="${eventY + eventLines.length * 46 + 36}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="${palette.ink}">${escapeXml(venue)}</text>
<text x="${WIDTH / 2}" y="${eventY + eventLines.length * 46 + 76}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="${palette.ink}">${escapeXml(date)}</text>
<text x="${WIDTH / 2}" y="${eventY + eventLines.length * 46 + 124}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600" letter-spacing="2" fill="${palette.accent}">${escapeXml(series)}</text>
${serialBand(palette, "SERIAL NO.")}
</svg>`;
}

function renderBack(input: PlaceholderArtworkInput, palette: VariantPalette, slug: string): string {
  const eventLine = truncate(input.eventTitle, 52);
  const venueDate = truncate(`${input.venue || "Venue TBD"} · ${input.date || "Date TBD"}`, 56);
  const passLabel = passTypeDisplay(input.passType);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.paper}" />
${seedDecorations(input.seed, slug, palette)}
${frameBorder(palette)}
<text x="${WIDTH / 2}" y="78" text-anchor="middle" font-family="Impact, 'Arial Black', Arial, sans-serif" font-size="34" font-weight="800" fill="${palette.ink}">${escapeXml(eventLine)}</text>
<text x="${WIDTH / 2}" y="118" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600" fill="${palette.ink}" opacity="0.85">${escapeXml(venueDate)}</text>
<rect x="48" y="150" width="340" height="4" fill="${palette.accent}" />
<text x="56" y="200" font-family="Impact, 'Arial Black', Arial, sans-serif" font-size="28" font-weight="800" fill="${palette.ink}">${escapeXml(passLabel)} PASS</text>
<text x="56" y="248" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${palette.ink}">REGISTER THIS PASS</text>
<text x="56" y="292" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="${palette.ink}">Scan the QR code to claim</text>
<text x="56" y="328" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="${palette.ink}">your credential and enter</text>
<text x="56" y="364" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="${palette.ink}">the giveaway.</text>
<text x="56" y="420" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1" fill="${palette.accent}">NON-TRANSFERABLE · VALID ONCE</text>
<text x="${QR_X + QR_SIZE / 2}" y="${QR_Y - 18}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" letter-spacing="3" fill="${palette.ink}">SCAN TO REGISTER</text>
<rect x="${QR_X - 8}" y="${QR_Y - 8}" width="${QR_SIZE + 16}" height="${QR_SIZE + 16}" rx="8" fill="${palette.ink}" opacity="0.12" />
<rect x="${QR_X}" y="${QR_Y}" width="${QR_SIZE}" height="${QR_SIZE}" rx="4" fill="#ffffff" stroke="${palette.ink}" stroke-width="3" />
${serialBand(palette, "SERIAL NO.")}
</svg>`;
}

export function renderPlaceholderArtworkDataUri(input: PlaceholderArtworkInput): string {
  const slug = resolveSlug(input);
  const palette = resolvePalette(input);
  const svg =
    input.side === "front"
      ? renderFront(input, palette, slug)
      : renderBack(input, palette, slug);

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export function passTypeSlugFromLabel(label: string): "general" | "vip" | "backstage" {
  return resolveSlug({ passType: label, eventTitle: "", venue: "", date: "", primary: "", accent: "", seed: 0, side: "front" });
}

export function artworkInputFromBinder(
  spec: { slug: "general" | "vip" | "backstage"; name: string },
  binder: {
    snapshot: { eventName: string; venue: string; date: string; theme: string };
    identity: { colorSwatches: string[] };
  },
  seed: number,
  side: "front" | "back",
): PlaceholderArtworkInput {
  const palette = VARIANT_PALETTES[spec.slug];
  const swatches = binder.identity.colorSwatches.filter(Boolean);

  return {
    passType: spec.name,
    passTypeSlug: spec.slug,
    eventTitle: binder.snapshot.eventName,
    venue: binder.snapshot.venue,
    date: binder.snapshot.date,
    seriesText: binder.snapshot.theme,
    primary: swatches[0] || palette.primary,
    accent: swatches[1] || swatches[0] || palette.accent,
    secondary: palette.secondary,
    seed,
    side,
  };
}
