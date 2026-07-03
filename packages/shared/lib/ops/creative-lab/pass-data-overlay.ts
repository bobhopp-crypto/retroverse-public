import sharp from "sharp";

import {
  CREDENTIAL_LAYOUT_LAMINATE_V1,
  credentialTextZonesForSide,
  PASS_HEIGHT,
  PASS_WIDTH,
  SERIAL_PANEL,
  type CredentialZone,
} from "./pass-credential-layout";
import {
  credentialTypographyForWorld,
  type CredentialTypographyProfile,
  type ZoneTypography,
} from "./pass-credential-typography";
import { assertWellFormedSvg } from "./svg-validate";
import { normalizePassTypeLabel } from "./pass-text-governance";
import type { VisualWorldId } from "./visual-worlds";

export type PassDataOverlayFields = {
  event: string;
  venue: string;
  date: string;
  secondaryLine: string;
  passTypeLabel?: string;
  qrUrl?: string;
};

const SVG_FILTER_DEFS = [
  `<defs>`,
  `<filter id="credential-text-shadow" x="-20%" y="-20%" width="140%" height="140%">`,
  `<feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.9"/>`,
  `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.25"/>`,
  `</filter>`,
  `<filter id="credential-accent-shadow" x="-20%" y="-20%" width="140%" height="140%">`,
  `<feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#ffffff" flood-opacity="0.85"/>`,
  `<feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.3"/>`,
  `</filter>`,
  `</defs>`,
].join("");

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function displayUrl(qrUrl?: string): string | null {
  if (!qrUrl?.trim()) return null;
  try {
    return new URL(qrUrl.trim()).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function valueForZone(zone: CredentialZone, fields: PassDataOverlayFields): string | null {
  const passType = normalizePassTypeLabel(fields.passTypeLabel);
  switch (zone.role) {
    case "passType":
      return passType;
    case "event":
      return fields.event.trim() || null;
    case "venue":
      return fields.venue.trim() || null;
    case "date":
      return fields.date.trim() || null;
    case "years":
      return fields.secondaryLine.trim() || null;
    case "urlLabel":
      return displayUrl(fields.qrUrl);
    default:
      return null;
  }
}

function formatDisplayText(text: string, typo: ZoneTypography): string {
  return typo.uppercase ? text.toUpperCase() : text;
}

function renderCredentialText(zone: CredentialZone, text: string, typo: ZoneTypography): string {
  const display = formatDisplayText(text, typo);
  const filter = zone.id === "FEATURED_YEARS" ? "credential-accent-shadow" : "credential-text-shadow";
  const lengthAttr =
    typo.maxTextLength && display.length > 12
      ? ` textLength="${typo.maxTextLength}" lengthAdjust="spacingAndGlyphs"`
      : "";

  return [
    `<text x="${zone.x}" y="${zone.y}"`,
    `font-family='${typo.fontFamily}' font-size="${typo.fontSize}" font-weight="${typo.fontWeight}"`,
    `letter-spacing="${typo.letterSpacing}" text-anchor="${zone.anchor}"`,
    `fill="${typo.color}" stroke="${typo.strokeColor}" stroke-width="${typo.strokeWidth}"`,
    `paint-order="stroke fill" filter="url(#${filter})"${lengthAttr}>`,
    escapeXml(display),
    `</text>`,
  ].join(" ");
}

function serialAreaSvg(profile: CredentialTypographyProfile): string {
  const { serialStroke, highlight } = profile;
  const serialTypo = profile.zones.SERIAL_AREA;
  const cx = SERIAL_PANEL.x + SERIAL_PANEL.width / 2;
  const cy = SERIAL_PANEL.y + SERIAL_PANEL.height / 2 + 7;
  return [
    `<rect x="${SERIAL_PANEL.x}" y="${SERIAL_PANEL.y}" width="${SERIAL_PANEL.width}" height="${SERIAL_PANEL.height}" fill="none" stroke="${serialStroke}" stroke-width="2" stroke-dasharray="8 6" rx="4" opacity="0.55"/>`,
    `<text x="${cx}" y="${cy}" fill="${serialStroke}" font-family='${serialTypo.fontFamily}' font-size="${serialTypo.fontSize}" font-weight="${serialTypo.fontWeight}" letter-spacing="${serialTypo.letterSpacing}" text-anchor="middle" opacity="0.35">SERIAL</text>`,
    `<rect x="${SERIAL_PANEL.x + 6}" y="${SERIAL_PANEL.y + 6}" width="${SERIAL_PANEL.width - 12}" height="${SERIAL_PANEL.height - 12}" fill="${highlight}" opacity="0.06" rx="2"/>`,
  ].join("");
}

/** Build transparent SVG data layer — text in zones, no opaque panels. */
export function buildPassDataLayerSvg(
  side: "front" | "back",
  fields: PassDataOverlayFields,
  worldId: VisualWorldId | string,
): string {
  const profile = credentialTypographyForWorld(worldId);
  const zones = credentialTextZonesForSide(CREDENTIAL_LAYOUT_LAMINATE_V1, side);
  const parts: string[] = [
    `<svg width="${PASS_WIDTH}" height="${PASS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`,
    SVG_FILTER_DEFS,
  ];

  for (const zone of zones) {
    const text = valueForZone(zone, fields);
    if (!text) continue;
    const typo = profile.zones[zone.id];
    parts.push(renderCredentialText(zone, text, typo));
  }

  parts.push(serialAreaSvg(profile));
  parts.push("</svg>");
  const svg = parts.join("");
  assertWellFormedSvg(svg, `pass-data-layer-${side}`);
  return svg;
}

/** Composite Retroverse credential typography onto artwork PNG. QR is export-only — never here. */
export async function compositePassDataOverlay(args: {
  artworkPng: Buffer;
  side: "front" | "back";
  fields: PassDataOverlayFields;
  visualWorldId: VisualWorldId | string;
}): Promise<Buffer> {
  const svg = buildPassDataLayerSvg(args.side, args.fields, args.visualWorldId);
  return sharp(args.artworkPng)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
