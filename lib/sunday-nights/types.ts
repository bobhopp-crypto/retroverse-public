export type SundayNightsState = {
  version: 1;
  currentTrackId: string | null;
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
