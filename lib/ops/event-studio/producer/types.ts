export type EventProducerRegistration = {
  enabled: boolean;
  required: boolean;
  rules: string;
};

export type EventProducerPasses = {
  enabled: boolean;
  standardPasses: boolean;
  premiumPasses: boolean;
  premiumPerSheet: number;
  paperSize: string;
};

export type EventProducerGiveaway = {
  enabled: boolean;
  prize: string;
  mustBePresent: boolean | null;
  drawDate: string;
  rules: string;
};

export type EventProducerRecommendedModules = {
  identity: boolean;
  assets: boolean;
  passes: boolean;
  giveaway: boolean;
  landingPage: boolean;
  poster: boolean;
  facebookPost: boolean;
  nowPlaying: boolean;
  archive: boolean;
};

export type EventProducerParsedPlan = {
  eventTitle: string;
  eventType: string;
  seriesName: string;
  venue: string;
  dateSummary: string;
  dates: string[];
  startTime: string;
  endTime: string;
  theme: string;
  musicEra: string[];
  expectedAttendance: number | null;
  registration: EventProducerRegistration;
  passes: EventProducerPasses;
  giveaway: EventProducerGiveaway;
  recommendedModules: EventProducerRecommendedModules;
  missingQuestions: string[];
  needsReview: string[];
};

export type EventProducerDraft = {
  id: string;
  createdAt: string;
  sourceText: string;
  model: string;
  parsedPlan: EventProducerParsedPlan;
  status: "draft";
};

export type EventProducerDraftsFile = {
  version: 1;
  drafts: EventProducerDraft[];
  updatedAt: string;
};
