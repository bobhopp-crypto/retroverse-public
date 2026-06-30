import { createEmptyParsedPlan, defaultRecommendedModules } from "./defaults";
import type {
  EventProducerParsedPlan,
  EventProducerRecommendedModules,
} from "./types";

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function boolOrNull(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function normalizeModules(raw: unknown): EventProducerRecommendedModules {
  const defaults = defaultRecommendedModules();
  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Partial<EventProducerRecommendedModules>;
  return {
    identity: bool(obj.identity, defaults.identity),
    assets: bool(obj.assets, defaults.assets),
    passes: bool(obj.passes, defaults.passes),
    giveaway: bool(obj.giveaway, defaults.giveaway),
    landingPage: bool(obj.landingPage, defaults.landingPage),
    poster: bool(obj.poster, defaults.poster),
    facebookPost: bool(obj.facebookPost, defaults.facebookPost),
    nowPlaying: bool(obj.nowPlaying, defaults.nowPlaying),
    archive: bool(obj.archive, defaults.archive),
  };
}

export function normalizeParsedPlan(raw: unknown): EventProducerParsedPlan {
  const empty = createEmptyParsedPlan();
  if (!raw || typeof raw !== "object") return empty;

  const obj = raw as Partial<EventProducerParsedPlan>;
  const registration =
    obj.registration && typeof obj.registration === "object"
      ? (obj.registration as EventProducerParsedPlan["registration"])
      : empty.registration;
  const passes =
    obj.passes && typeof obj.passes === "object"
      ? (obj.passes as EventProducerParsedPlan["passes"])
      : empty.passes;
  const giveaway =
    obj.giveaway && typeof obj.giveaway === "object"
      ? (obj.giveaway as EventProducerParsedPlan["giveaway"])
      : empty.giveaway;

  return {
    eventTitle: str(obj.eventTitle),
    eventType: str(obj.eventType),
    seriesName: str(obj.seriesName),
    venue: str(obj.venue),
    dateSummary: str(obj.dateSummary),
    dates: strArray(obj.dates),
    startTime: str(obj.startTime),
    endTime: str(obj.endTime),
    theme: str(obj.theme),
    musicEra: strArray(obj.musicEra),
    expectedAttendance: numOrNull(obj.expectedAttendance),
    registration: {
      enabled: bool(registration.enabled),
      required: bool(registration.required),
      rules: str(registration.rules),
    },
    passes: {
      enabled: bool(passes.enabled),
      standardPasses: bool(passes.standardPasses, true),
      premiumPasses: bool(passes.premiumPasses),
      premiumPerSheet:
        typeof passes.premiumPerSheet === "number" && Number.isFinite(passes.premiumPerSheet)
          ? passes.premiumPerSheet
          : 0,
      paperSize: str(passes.paperSize),
    },
    giveaway: {
      enabled: bool(giveaway.enabled),
      prize: str(giveaway.prize),
      mustBePresent: boolOrNull(giveaway.mustBePresent),
      drawDate: str(giveaway.drawDate),
      rules: str(giveaway.rules),
    },
    recommendedModules: normalizeModules(obj.recommendedModules),
    missingQuestions: strArray(obj.missingQuestions),
    needsReview: strArray(obj.needsReview),
  };
}
