import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  composeHistoricalRvbrPrompt,
  type HistoricalComposedRvbrPrompt,
} from "@/lib/creative/historical-rvbr-prompt-engine";
import type { HistoricalArtifactArchetypeId } from "@/lib/creative/historical-artifact-archetypes";
import type { CreativeDirectionId } from "@/lib/ops/content-creator/creative-direction";
import type { CollectiblePassFields } from "@/lib/ops/content-creator/collectible-pass-prompt";
import { generateArtwork, resolveArtworkProvider } from "@/lib/ops/creative-lab/artwork";
import type { ArtworkPromptContext } from "@/lib/ops/creative-lab/artwork/types";
import type { ArtifactTypeId } from "@/lib/ops/creative-lab/artifact-types";
import type { ControlledPassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";
import { loadCanonRvbrProfiles } from "@/lib/retroverse/rvbr/canon-profiles";
import {
  retroverseStyleById,
  type RetroverseStyleDefinition,
  type RetroverseStyleId,
} from "@/lib/retroverse/style-catalog";

import { credentialsArtworkFileUrl, credentialsArtworkRunDir } from "./paths";

export type CredentialsCredentialType = "event" | "vip" | "backstage";

export type CredentialsArtworkInput = {
  eventName: string;
  venue: string;
  date: string;
  optionalText: string;
  eventType: string;
  venueType: string;
  retroverseStyle: RetroverseStyleId;
  credentialType: CredentialsCredentialType;
  familySeed: number;
};

export type CredentialsArtworkManifest = {
  runId: string;
  credentialType: CredentialsCredentialType;
  familySeed: number;
  compositionSeed: number;
  profileSlug: string;
  retroverseStyle: RetroverseStyleId;
  archetypeId: HistoricalArtifactArchetypeId;
  creativeDirection: CreativeDirectionId;
  provider: string;
  frontFilename: "front.png";
  backFilename: "back.png";
  promptInspector: {
    front: HistoricalComposedRvbrPrompt;
    back: HistoricalComposedRvbrPrompt;
  };
  createdAt: string;
};

export type CredentialsArtworkResult = {
  runId: string;
  frontUrl: string;
  backUrl: string;
  generatedAt: string;
};

const TYPE_SEED_OFFSET: Record<CredentialsCredentialType, number> = {
  event: 101,
  vip: 307,
  backstage: 701,
};

const TYPE_LABEL: Record<CredentialsCredentialType, ControlledPassTypeLabel> = {
  event: "EVENT PASS",
  vip: "VIP PASS",
  backstage: "BACKSTAGE PASS",
};

const ARTIFACT_TYPE: Record<CredentialsCredentialType, ArtifactTypeId> = {
  event: "festival-pass",
  vip: "vip-pass",
  backstage: "backstage-credential",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  "dj-night": "DJ Night",
  bingo: "Bingo",
  karaoke: "Karaoke",
  trivia: "Trivia",
  "live-music": "Live Music",
  dance: "Dance",
  "holiday-event": "Holiday Event",
  fundraiser: "Fundraiser",
  "private-party": "Private Party",
  "community-event": "Community Event",
  other: "Other",
};

const VENUE_TYPE_GUIDANCE: Record<string, string> = {
  "community-hall":
    "A community club or hall: warm communal character, modest traditional materials, neighborly energy; never depict the building or invent a club logo.",
  "civic-hall":
    "A veterans or civic hall: slightly formal, ceremonial, understated Americana; no flags, military insignia, seals, or organization logos unless supplied as event text.",
  pub:
    "A neighborhood pub, bar, or restaurant: warmer, more casual and lively, with amber social energy; no literal bar facade, beer logo, or pub sign.",
  theater:
    "A theater or music venue: performance-night polish, ticket-window history, focused stage energy; never depict the venue exterior.",
  ballroom:
    "A ballroom or banquet hall: celebratory, rhythmic, dressed-up social energy with refined event-night detail.",
  hotel:
    "A hotel or convention venue: polished hospitality and occasion, but never corporate conference-badge design.",
  outdoor:
    "An outdoor venue: open-air scale and festival movement, without literal landscapes or a generic crowd scene.",
  school:
    "A school or campus venue: inclusive community spirit and youthful energy; no school crest, mascot, or building.",
  religious:
    "A church or religious venue: respectful community warmth and restrained ceremonial character; no invented sacred symbols or architecture.",
  sports:
    "A sports venue: bold event-night momentum and crowd energy expressed through marks and rhythm, not a literal stadium.",
  museum:
    "A museum or gallery: cultured, curated, exhibition-like confidence while remaining a lively collectible.",
  private:
    "A private home or property: personal, intimate, invitation-like warmth; no literal house illustration.",
  other:
    "Let the exact venue name provide subtle social context only; never invent or illustrate the venue.",
};

const EVENT_ARCHETYPES: Record<string, readonly HistoricalArtifactArchetypeId[]> = {
  "dj-night": ["concert-credential", "festival-ticket", "collector-pass"],
  bingo: ["collector-pass", "fan-club-card", "festival-ticket"],
  karaoke: ["concert-credential", "festival-ticket", "collector-pass"],
  trivia: ["collector-pass", "fan-club-card", "festival-ticket"],
  "live-music": ["concert-credential", "festival-ticket", "collector-pass"],
  dance: ["festival-ticket", "concert-credential", "album-release-invite"],
  "holiday-event": ["album-release-invite", "collector-pass", "festival-ticket"],
  fundraiser: ["album-release-invite", "collector-pass", "festival-ticket"],
  "private-party": ["album-release-invite", "collector-pass", "fan-club-card"],
  "community-event": ["festival-ticket", "fan-club-card", "collector-pass"],
  other: ["collector-pass", "festival-ticket", "concert-credential"],
};

const VIP_ARCHETYPES = [
  "collector-pass",
  "album-release-invite",
  "fan-club-card",
  "festival-ticket",
  "tour-laminate",
] as const satisfies readonly HistoricalArtifactArchetypeId[];

const BACKSTAGE_ARCHETYPES = [
  "backstage-pass",
  "tour-laminate",
  "concert-credential",
] as const satisfies readonly HistoricalArtifactArchetypeId[];

function pick<T>(values: readonly T[], seed: number): T {
  return values[Math.abs(seed) % values.length]!;
}

function resolveArchetype(input: CredentialsArtworkInput, seed: number): HistoricalArtifactArchetypeId {
  if (input.credentialType === "vip") return pick(VIP_ARCHETYPES, seed + 19);
  if (input.credentialType === "backstage") return pick(BACKSTAGE_ARCHETYPES, seed + 43);
  return pick(EVENT_ARCHETYPES[input.eventType] ?? EVENT_ARCHETYPES.other, seed + 7);
}

function eventDirection(eventType: string, seed: number): CreativeDirectionId {
  const choices: Record<string, readonly CreativeDirectionId[]> = {
    "dj-night": ["record-sleeve", "concert-poster", "festival-pass"],
    bingo: ["collector-card", "festival-pass", "magazine-cover"],
    karaoke: ["concert-poster", "festival-pass", "collector-card"],
    trivia: ["magazine-cover", "collector-card", "festival-pass"],
    "live-music": ["concert-poster", "tour-program", "festival-pass"],
    dance: ["concert-poster", "record-sleeve", "festival-pass"],
    "holiday-event": ["collector-card", "magazine-cover", "tour-program"],
    fundraiser: ["tour-program", "collector-card", "festival-pass"],
    "private-party": ["collector-card", "record-sleeve", "festival-pass"],
    "community-event": ["festival-pass", "collector-card", "magazine-cover"],
    other: ["collector-card", "concert-poster", "festival-pass"],
  };
  return pick(choices[eventType] ?? choices.other, seed);
}

function resolveDirection(input: CredentialsArtworkInput, seed: number): CreativeDirectionId {
  if (input.credentialType === "backstage") return "backstage-credential";
  if (input.credentialType === "vip") {
    return pick(["collector-card", "festival-pass", "tour-program"] as const, seed + 11);
  }
  return eventDirection(input.eventType, seed);
}

function displayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value.trim();
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function profileForStyle(style: RetroverseStyleDefinition): RvbrProfile {
  const profile = loadCanonRvbrProfiles().find(
    (candidate) =>
      candidate.eraStartYear === style.startYear && candidate.eraEndYear === style.endYear,
  );
  if (!profile) throw new Error(`No RVBR profile is available for ${style.id}.`);
  return profile;
}

function paletteDirection(style: RetroverseStyleDefinition): string {
  const palette = [
    ...style.identity.primaryPalette,
    ...style.identity.secondaryPalette,
    ...style.identity.accentColors,
  ];
  return [
    `Official palette identity: ${style.paletteName}.`,
    `Palette anchors: ${[...new Set(palette)].join(", ")}.`,
    `Tonal balance: ${style.identity.tonalBalance}; contrast: ${style.identity.contrastBehavior}.`,
    `This palette controls primary, secondary, accent, tonal, and contrast behavior. It does not dictate event subject matter.`,
  ].join(" ");
}

function creativeNotes(input: CredentialsArtworkInput, style: RetroverseStyleDefinition): string {
  return [`Event context: ${EVENT_TYPE_LABELS[input.eventType] ?? "Other event"}.`, VENUE_TYPE_GUIDANCE[input.venueType] ?? VENUE_TYPE_GUIDANCE.other, paletteDirection(style), `Campaign family: use the same event world across Event, VIP, and Backstage passes while giving this ${TYPE_LABEL[input.credentialType]} a distinct hierarchy.`, `Typography whitelist: render only the supplied event name, venue, date, optional line, pass type, and the word Retroverse. Do not add any other words, abbreviations, numbers, logos, mastheads, sponsors, or organizations.`, `Target dense, energetic, full-bleed illustrated collectible artwork with layered lettering, badges, stamps, tickets, seals, and event-appropriate motifs.`].join("\n");
}

const CREDENTIAL_FORBIDDEN_PROMPT_LINES = /radio|\b(?:am|fm|mtv|tv)\b|television|music[- ]video|video[- ]age|frequency|\b\d{2,3}\.\d\b|call[- ](?:letter|sign)|\bstation\b|on[- ]air|transmitter|\bdial\b|record-label|\bbroadcast\b|\bnetwork\b|\bchannel\b/i;

/** Final Credentials-only guard: remove unrelated media-brand cues injected by shared historical layers. */
export function sanitizeCredentialsPrompt(prompt: string): string {
  const sanitized = prompt
    .split("\n")
    .filter((line) => !CREDENTIAL_FORBIDDEN_PROMPT_LINES.test(line))
    .join("\n")
    .replace(/RVBR/gi, "Retroverse");
  if (CREDENTIAL_FORBIDDEN_PROMPT_LINES.test(sanitized)) throw new Error("Credentials prompt contains forbidden media-brand direction.");
  return `${sanitized}\n\nFINAL TEXT RULE: Use only the exact supplied event text, pass type, venue, date, optional line, and Retroverse. Add no other names, numbers, abbreviations, logos, sponsors, or organizations.`;
}

function promptContext(
  prompt: string,
  input: CredentialsArtworkInput,
  profile: RvbrProfile,
): ArtworkPromptContext {
  return {
    prompt,
    artifactTypeId: ARTIFACT_TYPE[input.credentialType],
    event: input.eventName,
    venue: input.venue,
    date: displayDate(input.date),
    secondaryLine: input.optionalText,
    module: "pass-lab",
    artDirectionTitle: `Retroverse Credentials · ${profile.eraStartYear}-${profile.eraEndYear}`,
    treatmentLabel: `credentials-${input.credentialType}`,
  };
}

export async function generateCredentialsArtworkPair(
  input: CredentialsArtworkInput,
): Promise<CredentialsArtworkResult> {
  const style = retroverseStyleById(input.retroverseStyle);
  const profile = profileForStyle(style);
  const compositionSeed = Math.abs(Math.floor(input.familySeed)) + TYPE_SEED_OFFSET[input.credentialType];
  const archetypeId = resolveArchetype(input, compositionSeed);
  const creativeDirection = resolveDirection(input, compositionSeed);
  const fields: CollectiblePassFields = {
    event: input.eventName.trim(),
    venue: input.venue.trim(),
    date: displayDate(input.date),
    secondaryLine: input.optionalText.trim(),
    passTypeLabel: TYPE_LABEL[input.credentialType],
    creativeNotes: creativeNotes(input, style),
  };
  const settings = {
    creativeDirection,
    avoidEraTropes: true,
    maximizeVariation: true,
    // The historical engine owns the restored archetype independently.
    artifactArchetype: "retroverse-collectible-credential" as const,
  };

  const frontPrompt = composeHistoricalRvbrPrompt({
    side: "front",
    profile,
    fields,
    settings,
    archetypeId,
    compositionSeed,
  });
  const frontFinalPrompt = sanitizeCredentialsPrompt(frontPrompt.finalPrompt);
  const frontResult = await generateArtwork(promptContext(frontFinalPrompt, input, profile), {
    count: 1,
    quality: "medium",
    size: "1024x1536",
  });
  const frontImage = frontResult.images[0];
  if (!frontImage) throw new Error("Front generation did not return artwork.");

  const backPrompt = composeHistoricalRvbrPrompt({
    side: "back",
    profile,
    fields,
    settings,
    archetypeId,
    compositionSeed,
    frontSummary: `${TYPE_LABEL[input.credentialType]} front for ${input.eventName}; preserve its official ${style.paletteName} palette, print stock, border language, lettering character, and campaign identity without repeating its hero composition.`,
  });
  const backFinalPrompt = sanitizeCredentialsPrompt(backPrompt.finalPrompt);
  const backResult = await generateArtwork(promptContext(backFinalPrompt, input, profile), {
    count: 1,
    quality: "medium",
    size: "1024x1536",
    referenceImage: frontImage.buffer,
  });
  const backImage = backResult.images[0];
  if (!backImage) throw new Error("Back generation did not return artwork.");

  const runId = `credential-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const runDir = credentialsArtworkRunDir(runId);
  await mkdir(runDir, { recursive: true });
  await Promise.all([
    writeFile(join(runDir, "front.png"), frontImage.buffer),
    writeFile(join(runDir, "back.png"), backImage.buffer),
  ]);

  const createdAt = new Date().toISOString();
  const manifest: CredentialsArtworkManifest = {
    runId,
    credentialType: input.credentialType,
    familySeed: input.familySeed,
    compositionSeed,
    profileSlug: profile.slug,
    retroverseStyle: style.id,
    archetypeId,
    creativeDirection,
    provider: resolveArtworkProvider(),
    frontFilename: "front.png",
    backFilename: "back.png",
    promptInspector: {
      front: { ...frontPrompt, finalPrompt: frontFinalPrompt },
      back: { ...backPrompt, finalPrompt: backFinalPrompt },
    },
    createdAt,
  };
  await writeFile(join(runDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    runId,
    frontUrl: credentialsArtworkFileUrl(runId, "front.png"),
    backUrl: credentialsArtworkFileUrl(runId, "back.png"),
    generatedAt: createdAt,
  };
}
