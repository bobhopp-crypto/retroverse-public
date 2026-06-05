export type SundayNightsLiveSelection = {
  rvtr: string | null;
  artist: string;
  title: string;
  year: number | null;
  coverUrl?: string | null;
  songKey?: string | null;
};

export type SundayNightsState = {
  version: 2;
  currentTrackId: string | null;
  live: SundayNightsLiveSelection | null;
  updatedAt: string;
};

export type SundayEventMode = {
  enabled: boolean;
  updatedAt: string;
};

export type PassRegistration = {
  passNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  registeredAt: string;
};

export type PassRegistrationsFile = {
  version: 1;
  registrations: PassRegistration[];
};
