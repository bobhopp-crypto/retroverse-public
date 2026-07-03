export type GiveawayStudioSection =
  | "overview"
  | "prize"
  | "registration"
  | "audience"
  | "drawing"
  | "history"
  | "settings";

export type GiveawayRegistrationFieldId =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "birthday"
  | "favoriteDecade"
  | "favoriteArtist"
  | "favoriteGenre"
  | "newsletterOptIn";

export type GiveawayRegistrationField = {
  id: GiveawayRegistrationFieldId;
  label: string;
  enabled: boolean;
  required: boolean;
};

export type GiveawayPrize = {
  title: string;
  description: string;
  retailValue: string;
  sponsor: string;
  notes: string;
  promoCopy: string;
  heroImageUrl: string | null;
  galleryImageUrls: string[];
};

export type GiveawayRegistrationConfig = {
  headline: string;
  confirmationMessage: string;
  fields: GiveawayRegistrationField[];
};

export type GiveawayStatus = "draft" | "live" | "drawing" | "completed" | "archived";

export type GiveawayDrawStatus =
  | "pending"
  | "claimed"
  | "redrawn"
  | "not_present"
  | "completed"
  | "disqualified";

export type GiveawayDrawRecord = {
  id: string;
  giveawayId: string;
  entryId: string;
  drawnAt: string;
  status: GiveawayDrawStatus;
  notes: string;
};

export type Giveaway = {
  id: string;
  eventKey: string;
  title: string;
  status: GiveawayStatus;
  prize: GiveawayPrize;
  registration: GiveawayRegistrationConfig;
  rules: string;
  scheduledDrawAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GiveawayEntry = {
  id: string;
  giveawayId: string;
  eventKey: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  favoriteDecade: string | null;
  favoriteArtist: string | null;
  favoriteGenre: string | null;
  newsletterOptIn: boolean;
  source: "qr" | "manual" | "pass";
  duplicateOf: string | null;
  createdAt: string;
};

export type GiveawayStudioState = {
  version: 1;
  eventKey: string;
  activeGiveawayId: string | null;
  giveaways: Giveaway[];
  draws: GiveawayDrawRecord[];
  updatedAt: string;
};

export type GiveawayStudioSnapshot = {
  state: GiveawayStudioState;
  activeGiveaway: Giveaway | null;
  entries: GiveawayEntry[];
  entryCount: number;
  recentEntries: GiveawayEntry[];
  duplicateCount: number;
  currentDraw: GiveawayDrawRecord | null;
  currentWinner: GiveawayEntry | null;
  registrationUrl: string;
};

export type GiveawaySavePrizePayload = {
  giveawayId: string;
  prize: GiveawayPrize;
};

export type GiveawaySaveRegistrationPayload = {
  giveawayId: string;
  registration: GiveawayRegistrationConfig;
};

export type GiveawaySaveSettingsPayload = {
  giveawayId: string;
  title: string;
  status: GiveawayStatus;
  rules: string;
  scheduledDrawAt: string | null;
};

export type GiveawayManualEntryPayload = {
  giveawayId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthday?: string;
  favoriteDecade?: string;
  favoriteArtist?: string;
  favoriteGenre?: string;
  newsletterOptIn?: boolean;
};

export type GiveawayDrawPayload = {
  giveawayId: string;
};

export type GiveawayDrawUpdatePayload = {
  drawId: string;
  status: GiveawayDrawStatus;
  notes?: string;
};
