/** Pass Studio — simple, production-focused event credential batches. */

export type PassQrSide = "front" | "back";

/** Reusable design only — never event-specific data. */
export type PassTemplate = {
  id: string;
  name: string;
  /** Content Creator generation id this design's artwork comes from — the single source of truth.
   *  Null for hand-built custom designs with a manually pasted artwork URL. */
  generationId: string | null;
  /** Resolved at read time from Content Creator; never the persisted source for library-backed designs. */
  frontArtworkUrl: string | null;
  backArtworkUrl: string | null;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  qrPosition: {
    side: PassQrSide;
    /** Percent of pass width/height, 0-100, anchored top-left of the QR box. */
    xPct: number;
    yPct: number;
    sizePct: number;
  };
  logoUrl: string | null;
  backgroundUrl: string | null;
  style: string;
  createdAt: string;
  updatedAt: string;
};

export type PassTemplatesFile = {
  version: 1;
  templates: PassTemplate[];
};

/** One pass-type row in a batch — quantity, serial range, and which design it uses. */
export type PassBatchRow = {
  id: string;
  passType: string;
  quantity: number;
  firstSerial: number;
  lastSerial: number;
  templateId?: string;
};

export type PassBatch = {
  id: string;
  eventId: string;
  eventName: string;
  venue: string;
  date: string;
  templateId: string;
  rows: PassBatchRow[];
  totalPasses: number;
  serialStart: number;
  serialEnd: number;
  status: "draft" | "generated";
  createdAt: string;
  updatedAt: string;
};

export type PassBatchesFile = {
  version: 1;
  batches: PassBatch[];
};

/** Only "available" and "registered" are wired up in v0.1 — checked_in/archived are future sprints. */
export type PassStatus = "available" | "registered" | "checked_in" | "archived";

export type PassRegistration = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  notes: string;
  giveawayOptIn: boolean;
  registeredAt: string;
};

/** One printable credential — saved to the Pass Library forever. */
export type GeneratedPass = {
  id: string;
  serial: string;
  serialNumber: number;
  passType: string;
  eventId: string;
  eventName: string;
  venue: string;
  date: string;
  batchId: string;
  templateId: string;
  front: {
    artworkUrl: string | null;
  };
  back: {
    artworkUrl: string | null;
  };
  qr: {
    url: string;
    svg: string;
  };
  status: PassStatus;
  registration: PassRegistration | null;
  createdAt: string;
};

export type PassLibraryFile = {
  version: 1;
  passes: GeneratedPass[];
};

export type PassLibraryFilter = {
  eventId?: string;
  templateId?: string;
  passType?: string;
  date?: string;
  status?: PassStatus;
  search?: string;
};
