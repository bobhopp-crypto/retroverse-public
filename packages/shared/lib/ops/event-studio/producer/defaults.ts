import type {
  EventProducerParsedPlan,
  EventProducerRecommendedModules,
} from "./types";

export const EVENT_PRODUCER_DEFAULT_MODEL =
  process.env.EVENT_PRODUCER_MODEL?.trim() || "qwen3:8b";

export const EVENT_PRODUCER_OLLAMA_URL =
  process.env.EVENT_PRODUCER_OLLAMA_URL?.trim() || "http://localhost:11434/api/generate";

export function defaultRecommendedModules(): EventProducerRecommendedModules {
  return {
    identity: true,
    assets: true,
    passes: false,
    giveaway: false,
    landingPage: false,
    poster: false,
    facebookPost: false,
    nowPlaying: false,
    archive: true,
  };
}

export function createEmptyParsedPlan(): EventProducerParsedPlan {
  return {
    eventTitle: "",
    eventType: "",
    seriesName: "",
    venue: "",
    dateSummary: "",
    dates: [],
    startTime: "",
    endTime: "",
    theme: "",
    musicEra: [],
    expectedAttendance: null,
    registration: {
      enabled: false,
      required: false,
      rules: "",
    },
    passes: {
      enabled: false,
      standardPasses: true,
      premiumPasses: false,
      premiumPerSheet: 0,
      paperSize: "",
    },
    giveaway: {
      enabled: false,
      prize: "",
      mustBePresent: null,
      drawDate: "",
      rules: "",
    },
    recommendedModules: defaultRecommendedModules(),
    missingQuestions: [],
    needsReview: [],
  };
}
