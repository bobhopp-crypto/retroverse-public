import type { Giveaway, GiveawayRegistrationField, GiveawayRegistrationConfig, GiveawayPrize } from "./types";

export const DEFAULT_REGISTRATION_FIELDS: GiveawayRegistrationField[] = [
  { id: "firstName", label: "First Name", enabled: true, required: true },
  { id: "lastName", label: "Last Name", enabled: true, required: false },
  { id: "email", label: "Email", enabled: true, required: false },
  { id: "phone", label: "SMS / Phone", enabled: false, required: false },
  { id: "birthday", label: "Birthday", enabled: false, required: false },
  { id: "favoriteDecade", label: "Favorite Decade", enabled: false, required: false },
  { id: "favoriteArtist", label: "Favorite Artist", enabled: false, required: false },
  { id: "favoriteGenre", label: "Favorite Genre", enabled: false, required: false },
  { id: "newsletterOptIn", label: "Newsletter Opt-in", enabled: false, required: false },
];

export function defaultRegistrationConfig(eventTitle: string): GiveawayRegistrationConfig {
  return {
    headline: `Enter to win at ${eventTitle}`,
    confirmationMessage: `You are entered to win tonight's prize at ${eventTitle}. Good luck!`,
    fields: DEFAULT_REGISTRATION_FIELDS.map((field) => ({ ...field })),
  };
}

export function defaultPrize(eventTitle: string, theme: string): GiveawayPrize {
  const prizeTitle = theme.trim() || eventTitle;
  return {
    title: `${prizeTitle} Collector Display`,
    description: "Signed memorabilia, exclusive collectibles, or venue-ready prizes for tonight's drawing.",
    retailValue: "",
    sponsor: "",
    notes: "",
    promoCopy: `Enter tonight's drawing for the ${prizeTitle} prize — scan your pass and register in seconds.`,
    heroImageUrl: null,
    galleryImageUrls: [],
  };
}

export function createDefaultGiveaway(eventKey: string, eventTitle: string, theme: string): Giveaway {
  const now = new Date().toISOString();
  return {
    id: `gw_${eventKey}_primary`,
    eventKey,
    title: `${theme.trim() || eventTitle} Giveaway`,
    status: "draft",
    prize: defaultPrize(eventTitle, theme),
    registration: defaultRegistrationConfig(eventTitle),
    rules: "Must be present to win. One entry per person. Staff decision is final.",
    scheduledDrawAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
