export type RequestSourceKind = "folder" | "list" | "playlist";

export type VirtualDjSourceNode = {
  sourceKey: string;
  name: string;
  displayPath: string;
  kind: RequestSourceKind | "group";
  selectable: boolean;
  eligibleTrackCount: number;
  includeDescendants: false;
  children: VirtualDjSourceNode[];
};

export type VirtualDjSourceGroup = {
  id: "folders" | "lists" | "playlists";
  label: string;
  children: VirtualDjSourceNode[];
  note: string;
};

export type VirtualDjSourceDiscovery = {
  scannedAt: string;
  databasePath: string;
  groups: VirtualDjSourceGroup[];
  defaultSourceKey: string | null;
  notices: string[];
};

export type RequestCatalogTrackInput = {
  rvtr: string | null;
  virtualDjTrackIdentity: string;
  artist: string;
  title: string;
  year: number | null;
  localMediaPath: string;
  sourceRelativePath: string | null;
};

export type VirtualDjSourceSelection = {
  sourceKey: string;
  sourceKind: RequestSourceKind;
  sourceLabel: string;
  includeDescendants: false;
  tracks: RequestCatalogTrackInput[];
};

export type GuestCatalogTrack = {
  key: string;
  artist: string;
  title: string;
  year: number | null;
};

export type GuestRequestReceipt = {
  artist: string;
  title: string;
  year: number | null;
  requestedAt: string;
  djResponse: string | null;
};

export type GuestRequestState = {
  enabled: boolean;
  eventTitle: string | null;
  catalogName: string | null;
  availableSongCount: number;
  canRequest: boolean;
  lastRequest: GuestRequestReceipt | null;
};

export type RequestStatus = "new" | "accepted" | "played" | "skipped";

export type OperatorRequest = {
  id: number;
  eventId: string;
  requestedAt: string;
  memberId: number;
  memberFirstName: string;
  passSerial: string;
  artist: string;
  title: string;
  year: number | null;
  guestComment: string | null;
  status: RequestStatus;
  djResponse: string | null;
  priorRequests: Array<{ artist: string; title: string; requestedAt: string }>;
};

export type ActiveRequestEvent = {
  eventId: string;
  title: string;
  sourceId: number | null;
  sourceKind: RequestSourceKind | null;
  sourceLabel: string | null;
  eligibleTrackCount: number;
  activatedAt: string;
};
