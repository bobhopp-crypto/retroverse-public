export type PublicJukeboxRelayStatus = {
  isOpen: boolean;
  sessionToken: string | null;
};

export type PublicJukeboxRelayTrack = {
  key: string;
  artist: string;
  title: string;
  year: number | null;
  rvtr: string | null;
  heroUrl: string | null;
};

export type PublicJukeboxRelayCatalog = {
  sessionToken: string;
  requestLimit: number | null;
  tracks: PublicJukeboxRelayTrack[];
  total: number;
};

export type PublicJukeboxRelayRequest = {
  publicRequestId: string;
  sessionToken: string;
  guestId: string;
  nickname: string | null;
  trackKey: string;
  artist: string;
  title: string;
  year: number | null;
  requestedAt: string;
};

export type PublicJukeboxRelayReceipt = {
  publicRequestId: string;
  artist: string;
  title: string;
  year: number | null;
  requestedAt: string;
  duplicate: boolean;
};

export type PublicJukeboxRelayControl = {
  sessionToken: string;
  isOpen: boolean;
  requestLimit: number | null;
  catalog?: PublicJukeboxRelayTrack[];
};

export type PublicJukeboxRelayAck = {
  publicRequestId: string;
  result: "delivered" | "rejected";
  localRequestId?: number | null;
  detail?: string | null;
};
