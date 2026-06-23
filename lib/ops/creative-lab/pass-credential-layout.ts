import {
  PASS_HEIGHT,
  PASS_WIDTH,
  QR_ZONE,
  STAMP_HEIGHT_PX,
  STAMP_WIDTH_PX,
  STAMP_X0,
  STAMP_Y0,
  URL_ZONE,
} from "./pass-layout";

/** Canonical credential zone IDs — reusable across pass artifacts. */
export type CredentialZoneId =
  | "PASS_TITLE"
  | "EVENT_NAME"
  | "VENUE"
  | "DATE"
  | "FEATURED_YEARS"
  | "QR_AREA"
  | "SERIAL_AREA"
  | "URL_LABEL"
  | "FOOTER";

export type CredentialZoneRole =
  | "passType"
  | "event"
  | "venue"
  | "date"
  | "years"
  | "urlLabel"
  | "serial"
  | "qr"
  | "footer";

export type CredentialZone = {
  id: CredentialZoneId;
  role: CredentialZoneRole;
  side: "front" | "back";
  x: number;
  y: number;
  width: number;
  height: number;
  anchor: "start" | "middle" | "end";
};

export type CredentialLayoutTemplate = {
  id: string;
  label: string;
  width: number;
  height: number;
  zones: CredentialZone[];
};

/** Implied artwork structure — AI paints frames/plaques here; Retroverse renders text. */
export type ArtworkInformationPanel = {
  zoneId: CredentialZoneId;
  label: string;
  y: number;
  height: number;
  x?: number;
  width?: number;
  guidance: string;
};

const FRONT_ZONES: CredentialZone[] = [
  {
    id: "PASS_TITLE",
    role: "passType",
    side: "front",
    x: PASS_WIDTH / 2,
    y: 128,
    width: 720,
    height: 64,
    anchor: "middle",
  },
  {
    id: "EVENT_NAME",
    role: "event",
    side: "front",
    x: PASS_WIDTH / 2,
    y: 228,
    width: 880,
    height: 88,
    anchor: "middle",
  },
  {
    id: "VENUE",
    role: "venue",
    side: "front",
    x: PASS_WIDTH / 2,
    y: 318,
    width: 800,
    height: 48,
    anchor: "middle",
  },
  {
    id: "DATE",
    role: "date",
    side: "front",
    x: PASS_WIDTH / 2,
    y: 372,
    width: 720,
    height: 44,
    anchor: "middle",
  },
  {
    id: "FEATURED_YEARS",
    role: "years",
    side: "front",
    x: PASS_WIDTH / 2,
    y: 432,
    width: 760,
    height: 56,
    anchor: "middle",
  },
  {
    id: "SERIAL_AREA",
    role: "serial",
    side: "front",
    x: STAMP_X0 + STAMP_WIDTH_PX / 2,
    y: STAMP_Y0 + STAMP_HEIGHT_PX / 2,
    width: STAMP_WIDTH_PX,
    height: STAMP_HEIGHT_PX,
    anchor: "middle",
  },
];

const BACK_ZONES: CredentialZone[] = [
  {
    id: "PASS_TITLE",
    role: "passType",
    side: "back",
    x: PASS_WIDTH / 2,
    y: 120,
    width: 640,
    height: 56,
    anchor: "middle",
  },
  {
    id: "EVENT_NAME",
    role: "event",
    side: "back",
    x: PASS_WIDTH / 2,
    y: 200,
    width: 720,
    height: 72,
    anchor: "middle",
  },
  {
    id: "VENUE",
    role: "venue",
    side: "back",
    x: PASS_WIDTH / 2,
    y: 288,
    width: 680,
    height: 44,
    anchor: "middle",
  },
  {
    id: "DATE",
    role: "date",
    side: "back",
    x: PASS_WIDTH / 2,
    y: 340,
    width: 640,
    height: 40,
    anchor: "middle",
  },
  {
    id: "FEATURED_YEARS",
    role: "years",
    side: "back",
    x: PASS_WIDTH / 2,
    y: 396,
    width: 700,
    height: 52,
    anchor: "middle",
  },
  {
    id: "QR_AREA",
    role: "qr",
    side: "back",
    x: QR_ZONE.left + QR_ZONE.size / 2,
    y: QR_ZONE.top + QR_ZONE.size / 2,
    width: QR_ZONE.size,
    height: QR_ZONE.size,
    anchor: "middle",
  },
  {
    id: "URL_LABEL",
    role: "urlLabel",
    side: "back",
    x: URL_ZONE.left + URL_ZONE.width / 2,
    y: URL_ZONE.top + URL_ZONE.height / 2,
    width: URL_ZONE.width,
    height: URL_ZONE.height,
    anchor: "middle",
  },
  {
    id: "SERIAL_AREA",
    role: "serial",
    side: "back",
    x: STAMP_X0 + STAMP_WIDTH_PX / 2,
    y: STAMP_Y0 + STAMP_HEIGHT_PX / 2,
    width: STAMP_WIDTH_PX,
    height: STAMP_HEIGHT_PX,
    anchor: "middle",
  },
];

/** Default portrait laminate template — 1024×1536. */
export const CREDENTIAL_LAYOUT_LAMINATE_V1: CredentialLayoutTemplate = {
  id: "laminate-portrait-v1",
  label: "Portrait VIP laminate — zone layout A",
  width: PASS_WIDTH,
  height: PASS_HEIGHT,
  zones: [...FRONT_ZONES, ...BACK_ZONES],
};

export const SERIAL_PANEL = {
  x: STAMP_X0,
  y: STAMP_Y0,
  width: STAMP_WIDTH_PX,
  height: STAMP_HEIGHT_PX,
} as const;

export function credentialZonesForSide(
  template: CredentialLayoutTemplate,
  side: "front" | "back",
): CredentialZone[] {
  return template.zones.filter((z) => z.side === side && z.role !== "qr");
}

export function credentialTextZonesForSide(
  template: CredentialLayoutTemplate,
  side: "front" | "back",
): CredentialZone[] {
  return credentialZonesForSide(template, side).filter((z) => z.role !== "serial");
}

/** Artwork prompt panels — decorative frames, not blank rectangles. */
export const ARTWORK_INFORMATION_PANELS: Record<"front" | "back", ArtworkInformationPanel[]> = {
  front: [
    {
      zoneId: "PASS_TITLE",
      label: "pass-type crest band",
      y: 72,
      height: 88,
      guidance:
        "Ornamental title crest or laminate header frame across the top — foil band, broadcast stripe, or festival marquee frame. Interior: subtle wash or texture only.",
    },
    {
      zoneId: "EVENT_NAME",
      label: "event name plaque",
      y: 160,
      height: 100,
      guidance:
        "Hero event plaque — decorative credential plate with border flourishes. Reserve open center for large display type. No lettering.",
    },
    {
      zoneId: "VENUE",
      label: "venue ribbon",
      y: 268,
      height: 56,
      guidance: "Venue ribbon or sub-headline band — thin ornamental frame, light interior.",
    },
    {
      zoneId: "DATE",
      label: "date band",
      y: 324,
      height: 48,
      guidance: "Date metadata band — secondary credential strip with subtle border.",
    },
    {
      zoneId: "FEATURED_YEARS",
      label: "featured years ribbon",
      y: 380,
      height: 72,
      guidance:
        "Featured years ribbon — accent-colored decorative band (neon, foil, or festival stripe). No numerals.",
    },
    {
      zoneId: "SERIAL_AREA",
      label: "serial stamp panel",
      y: STAMP_Y0,
      height: STAMP_HEIGHT_PX,
      guidance:
        "Bottom-center serial stamp panel — embossed frame, perforated edge, or laminate footer plate. Completely empty inside.",
    },
  ],
  back: [
    {
      zoneId: "PASS_TITLE",
      label: "pass-type header",
      y: 64,
      height: 80,
      guidance: "Matching header frame echoing front pass-type crest.",
    },
    {
      zoneId: "EVENT_NAME",
      label: "event metadata plaque",
      y: 148,
      height: 88,
      guidance: "Event metadata plaque — decorative frame for event title repeat.",
    },
    {
      zoneId: "VENUE",
      label: "venue band",
      y: 248,
      height: 48,
      guidance: "Venue metadata band with light ornamental border.",
    },
    {
      zoneId: "DATE",
      label: "date band",
      y: 300,
      height: 44,
      guidance: "Date metadata band.",
    },
    {
      zoneId: "FEATURED_YEARS",
      label: "years ribbon",
      y: 352,
      height: 56,
      guidance: "Featured years accent ribbon — no numerals.",
    },
    {
      zoneId: "QR_AREA",
      label: "verification reserve",
      x: QR_ZONE.left,
      y: QR_ZONE.top,
      width: QR_ZONE.size,
      height: QR_ZONE.size,
      guidance:
        "Production-safe square reserve for export-owned verification compositing. Equal width and height, sharp corners, no labels, measurements, text, QR graphics, checkerboards, or fake modules. Ornament outside only.",
    },
    {
      zoneId: "URL_LABEL",
      label: "collector spacer band",
      x: URL_ZONE.left,
      y: URL_ZONE.top,
      width: URL_ZONE.width,
      height: URL_ZONE.height,
      guidance: "Quiet spacer band separating the production QR reserve from the serial/stamp area. No text or URL artwork.",
    },
    {
      zoneId: "SERIAL_AREA",
      label: "serial stamp panel",
      y: STAMP_Y0,
      height: STAMP_HEIGHT_PX,
      guidance: "Generous serial/stamp authentication panel — empty interior for hand-stamped numbers, collector codes, and future markings.",
    },
  ],
};

export { PASS_WIDTH, PASS_HEIGHT, QR_ZONE };
