export type JukeboxRequestPolicy = {
  isOpen: boolean;
  requestsPerGuest: number | null;
};

export type JukeboxSession = {
  sessionId: string;
  eventId: string;
  guestNumber: number;
  nickname: string | null;
  label: string;
  startedAt: string;
  endedAt: string | null;
  requestCount: number;
  requestLimit: number | null;
  canRequest: boolean;
};

export type JukeboxCatalogTrack = {
  key: string;
  artist: string;
  title: string;
  year: number | null;
  playCount: number;
  lastPlayed: string | null;
  heroUrl: string;
  alreadyRequested: boolean;
};

export type JukeboxPublicState = {
  ready: boolean;
  isOpen: boolean;
  eventTitle: string | null;
  catalogName: string | null;
  catalogCount: number;
  requestsPerGuest: number | null;
  decades: number[];
};

export type JukeboxCatalogPayload = {
  tracks: JukeboxCatalogTrack[];
  total: number;
};

export type JukeboxRequestReceipt = {
  requestId: number;
  artist: string;
  title: string;
  year: number | null;
  requestedAt: string;
  duplicate: boolean;
};

export type JukeboxBridgeStatus = {
  running: boolean;
  enabled: boolean;
  localEndpoint: boolean;
  endpoint: string | null;
  outputPath: string | null;
  outputUpdatedAt: string | null;
};

export type JukeboxLiveSession = {
  sessionId: string;
  name: string;
  sessionDate: string;
  startedAt: string;
  endedAt: string | null;
  status: "active" | "ended";
};

export type JukeboxOperatorStatus = {
  ready: boolean;
  guestUiOnline: boolean;
  requestApiOnline: boolean;
  eventTitle: string | null;
  isOpen: boolean;
  requestsEnabled: boolean;
  requestsPerGuest: number | null;
  catalogCount: number;
  activeSession: JukeboxLiveSession | null;
  activeGuestCount: number;
  requestCount: number;
  pendingCount: number;
  acceptedCount: number;
  playedCount: number;
  skippedCount: number;
  ipadUrl: string;
  bridge: JukeboxBridgeStatus;
  publicRelay: {
    status: "closed" | "open" | "error";
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastPollAt: string | null;
    lastError: string | null;
    pendingCount: number;
  };
  storage?: {
    authority: "local";
    path: string;
    neonSync: {
      importedFromNeonAt: string | null;
      lastAttemptAt: string | null;
      lastSuccessAt: string | null;
      lastError: string | null;
    };
  };
};
