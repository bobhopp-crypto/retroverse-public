import type { CredentialZoneId } from "./pass-credential-layout";
import { visualWorldById, type VisualWorld, type VisualWorldId } from "./visual-worlds";

export type ZoneTypography = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  uppercase: boolean;
  maxTextLength?: number;
};

export type CredentialTypographyProfile = {
  worldId: VisualWorldId;
  ink: string;
  accent: string;
  highlight: string;
  serialStroke: string;
  zones: Record<CredentialZoneId, ZoneTypography>;
};

type WorldTypographyPreset = {
  fontFamily: string;
  ink: string;
  accent: string;
  highlight: string;
  serialStroke: string;
  passTitle: Partial<ZoneTypography>;
  eventName: Partial<ZoneTypography>;
  venue: Partial<ZoneTypography>;
  date: Partial<ZoneTypography>;
  years: Partial<ZoneTypography>;
  urlLabel: Partial<ZoneTypography>;
};

const SANS_SECURITY = "Arial Black, Impact, Helvetica Neue, Arial, sans-serif";
const BROADCAST_SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const POSTER_SERIF = "Palatino, Palatino Linotype, Georgia, Times New Roman, serif";
const BROADCAST_SERIF = "Georgia, Times New Roman, Times, serif";
const POSTER_IMPACT = "Impact, Arial Black, Haettenschweiler, sans-serif";

const WORLD_PRESETS: Record<VisualWorldId, WorldTypographyPreset> = {
  "music-television-credential": {
    fontFamily: SANS_SECURITY,
    ink: "#0d0d0d",
    accent: "#ff2d6a",
    highlight: "#f5f0e8",
    serialStroke: "#2d2d2d",
    passTitle: { fontSize: 42, fontWeight: 900, letterSpacing: 6, uppercase: true },
    eventName: { fontSize: 64, fontWeight: 900, letterSpacing: 1, uppercase: true, maxTextLength: 820 },
    venue: { fontSize: 36, fontWeight: 700, letterSpacing: 2, uppercase: true },
    date: { fontSize: 32, fontWeight: 600, letterSpacing: 1.5, uppercase: false },
    years: { fontSize: 46, fontWeight: 800, letterSpacing: 4, uppercase: false },
    urlLabel: { fontSize: 20, fontWeight: 700, letterSpacing: 1, uppercase: true },
  },
  "psychedelic-festival": {
    fontFamily: POSTER_SERIF,
    ink: "#2d1b4e",
    accent: "#e85d2a",
    highlight: "#f5e6c8",
    serialStroke: "#8b4513",
    passTitle: { fontSize: 40, fontWeight: 800, letterSpacing: 4, uppercase: true },
    eventName: { fontSize: 62, fontWeight: 900, letterSpacing: 0, uppercase: false, maxTextLength: 840 },
    venue: { fontSize: 34, fontWeight: 700, letterSpacing: 0.5, uppercase: false },
    date: { fontSize: 30, fontWeight: 600, letterSpacing: 0, uppercase: false },
    years: { fontSize: 44, fontWeight: 800, letterSpacing: 3, uppercase: false },
    urlLabel: { fontSize: 18, fontWeight: 600, letterSpacing: 0.5, uppercase: false },
  },
  "vintage-television": {
    fontFamily: BROADCAST_SERIF,
    ink: "#1a2744",
    accent: "#c9a227",
    highlight: "#e8e4d8",
    serialStroke: "#8b6914",
    passTitle: { fontSize: 38, fontWeight: 800, letterSpacing: 5, uppercase: true },
    eventName: { fontSize: 56, fontWeight: 900, letterSpacing: 0.5, uppercase: false, maxTextLength: 800 },
    venue: { fontSize: 32, fontWeight: 700, letterSpacing: 1, uppercase: false },
    date: { fontSize: 28, fontWeight: 600, letterSpacing: 0.5, uppercase: false },
    years: { fontSize: 40, fontWeight: 800, letterSpacing: 2, uppercase: false },
    urlLabel: { fontSize: 18, fontWeight: 600, letterSpacing: 0.5, uppercase: false },
  },
  "collector-memorabilia": {
    fontFamily: BROADCAST_SERIF,
    ink: "#2d2d2d",
    accent: "#b8860b",
    highlight: "#f5e6c8",
    serialStroke: "#8b6914",
    passTitle: { fontSize: 36, fontWeight: 800, letterSpacing: 4, uppercase: true },
    eventName: { fontSize: 54, fontWeight: 900, letterSpacing: 0, uppercase: false, maxTextLength: 780 },
    venue: { fontSize: 30, fontWeight: 700, letterSpacing: 0.5, uppercase: false },
    date: { fontSize: 26, fontWeight: 600, letterSpacing: 0, uppercase: false },
    years: { fontSize: 38, fontWeight: 800, letterSpacing: 2, uppercase: false },
    urlLabel: { fontSize: 17, fontWeight: 600, letterSpacing: 0, uppercase: false },
  },
  "rock-poster": {
    fontFamily: POSTER_IMPACT,
    ink: "#1a1a1a",
    accent: "#c41e3a",
    highlight: "#f0ead6",
    serialStroke: "#1a1a1a",
    passTitle: { fontSize: 40, fontWeight: 900, letterSpacing: 3, uppercase: true },
    eventName: { fontSize: 68, fontWeight: 900, letterSpacing: 0, uppercase: true, maxTextLength: 860 },
    venue: { fontSize: 34, fontWeight: 800, letterSpacing: 1, uppercase: true },
    date: { fontSize: 30, fontWeight: 700, letterSpacing: 0.5, uppercase: true },
    years: { fontSize: 44, fontWeight: 900, letterSpacing: 2, uppercase: true },
    urlLabel: { fontSize: 18, fontWeight: 700, letterSpacing: 0.5, uppercase: true },
  },
  "concert-backstage-laminate": {
    fontFamily: BROADCAST_SANS,
    ink: "#1a1a1a",
    accent: "#c41e3a",
    highlight: "#f5f0e8",
    serialStroke: "#2d4a6e",
    passTitle: { fontSize: 40, fontWeight: 900, letterSpacing: 5, uppercase: true },
    eventName: { fontSize: 60, fontWeight: 900, letterSpacing: 1, uppercase: true, maxTextLength: 820 },
    venue: { fontSize: 34, fontWeight: 700, letterSpacing: 1.5, uppercase: true },
    date: { fontSize: 30, fontWeight: 600, letterSpacing: 1, uppercase: false },
    years: { fontSize: 42, fontWeight: 800, letterSpacing: 3, uppercase: false },
    urlLabel: { fontSize: 19, fontWeight: 700, letterSpacing: 1, uppercase: true },
  },
};

function zoneTypo(
  preset: WorldTypographyPreset,
  partial: Partial<ZoneTypography>,
  colorOverride?: string,
): ZoneTypography {
  return {
    fontFamily: partial.fontFamily ?? preset.fontFamily,
    fontSize: partial.fontSize ?? 32,
    fontWeight: partial.fontWeight ?? 700,
    letterSpacing: partial.letterSpacing ?? 0,
    color: colorOverride ?? partial.color ?? preset.ink,
    strokeColor: preset.highlight,
    strokeWidth: 2.5,
    uppercase: partial.uppercase ?? false,
    maxTextLength: partial.maxTextLength,
  };
}

function buildZoneMap(preset: WorldTypographyPreset): Record<CredentialZoneId, ZoneTypography> {
  return {
    PASS_TITLE: zoneTypo(preset, preset.passTitle),
    EVENT_NAME: zoneTypo(preset, preset.eventName),
    VENUE: zoneTypo(preset, preset.venue),
    DATE: zoneTypo(preset, preset.date),
    FEATURED_YEARS: zoneTypo(preset, preset.years, preset.accent),
    QR_AREA: zoneTypo(preset, { fontSize: 1, fontWeight: 400, uppercase: false }),
    SERIAL_AREA: zoneTypo(preset, { fontSize: 20, fontWeight: 600, uppercase: true, letterSpacing: 3 }),
    URL_LABEL: zoneTypo(preset, preset.urlLabel, preset.ink),
    FOOTER: zoneTypo(preset, { fontSize: 18, fontWeight: 600, uppercase: false }),
  };
}

/** RVBR visual world drives credential typography — designed type, not pasted labels. */
export function credentialTypographyForWorld(worldId: VisualWorldId | string): CredentialTypographyProfile {
  const world = visualWorldById(worldId);
  const preset = WORLD_PRESETS[world.id];
  return {
    worldId: world.id,
    ink: preset.ink,
    accent: preset.accent,
    highlight: preset.highlight,
    serialStroke: preset.serialStroke,
    zones: buildZoneMap(preset),
  };
}

/** Human-readable typography summary for reports and prompts. */
export function typographySummaryForWorld(world: VisualWorld): string {
  const profile = credentialTypographyForWorld(world.id);
  return [
    `Typography family: ${profile.zones.EVENT_NAME.fontFamily}`,
    `Mood: ${world.typographyStyle}`,
    `Ink ${profile.ink}, accent ${profile.accent}, highlight stroke ${profile.highlight}`,
    `Pass title: ${profile.zones.PASS_TITLE.fontSize}px / weight ${profile.zones.PASS_TITLE.fontWeight}`,
    `Event name: ${profile.zones.EVENT_NAME.fontSize}px hero`,
    `Years ribbon: accent color ${profile.accent}`,
  ].join(" · ");
}
