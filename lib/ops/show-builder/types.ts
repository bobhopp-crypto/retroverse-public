export type VdjPoolSong = {
  key: string;
  year: number;
  path: string;
  artist: string;
  title: string;
  remix: string | null;
  size: number | null;
  songlength: number | null;
  bpm: string | null;
  musicalKey: string | null;
  sourceIdx: number | null;
  /** VDJ rotation signal from database.xml — display only. */
  playCount: number;
};

export type ShowSet = {
  id: string;
  name: string;
  collapsed: boolean;
  count: number;
};

export type FlowSetEntry = {
  type: "set";
  setId: string;
  name: string;
};

export type FlowTransitionEntry = {
  type: "transition";
  id: string;
  note: string;
};

export type FlowEntry = FlowSetEntry | FlowTransitionEntry;

export type ShowBuilderProjectFile = {
  version: 2;
  selectedYears: number[];
  sets: Array<{ id: string; name: string; collapsed?: boolean }>;
  assignments: Record<string, string>;
  songOrder: Record<string, string[]>;
  flow: Array<
    | { type: "set"; setId: string }
    | { type: "transition"; id: string; note: string }
  >;
  updatedAt: string;
};

export type ShowBuilderPayload = {
  ok: true;
  availableYears: number[];
  selectedYears: number[];
  templates: string[];
  sets: ShowSet[];
  pools: Record<number, VdjPoolSong[]>;
  unassigned: Record<number, VdjPoolSong[]>;
  assignments: Record<string, string>;
  songOrder: Record<string, string[]>;
  flow: FlowEntry[];
  myListsPath: string;
};
