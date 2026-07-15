/** Canonical public experience kinds Channel Zero may resolve in V1. */
export const CHANNEL_EXPERIENCE_TYPES = ["song"] as const;

export type ChannelExperienceType = (typeof CHANNEL_EXPERIENCE_TYPES)[number];

/** Priority tier that won the resolver. */
export const CHANNEL_EXPERIENCE_SOURCES = [
  "takeover",
  "live-signal",
  "scheduled",
  "default-broadcast",
] as const;

export type ChannelExperienceSource = (typeof CHANNEL_EXPERIENCE_SOURCES)[number];

export type ChannelZeroMetadata = {
  href: string;
  programId?: string;
  programItemIndex?: number;
  programItemCount?: number;
  liveBridgeTimestamp?: string | null;
  takeoverActive?: boolean;
  defaultRvtr?: string;
};

/** Single resolved audience experience — Channel Zero output contract. */
export type ChannelZeroExperience = {
  experienceType: ChannelExperienceType;
  experienceId: string;
  source: ChannelExperienceSource;
  reason: string;
  selectedAt: string;
  validUntil: string;
  metadata: ChannelZeroMetadata;
};

export type ChannelZeroResolveInput = {
  state: import("@/lib/sunday-nights/types").SundayNightsState;
  nowMs?: number;
  defaultRvtr?: string;
};
