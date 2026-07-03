import type { SetColorId } from "./set-colors";

/** AI similarity hint from Method A clustering. */
export type CrateClusterStyle = {
  clusterId: string;
  bg: string;
  color: string;
};

export type CrateSet = {
  id: string;
  /** User label; empty → "Pile N" */
  name: string;
  colorId: SetColorId;
};

export type CrateBuilderFile = {
  version: 3;
  year: number;
  sets: CrateSet[];
  /** songKey → pile id */
  assignments: Record<string, string>;
  setOrder: Record<string, string[]>;
  /** User-moved songs — AI will not re-deal these */
  manualKeys: string[];
  updatedAt: string;
};

export type CrateSong = {
  key: string;
  year: number;
  artist: string;
  title: string;
  playCount: number;
  cluster: CrateClusterStyle | null;
};

export type CrateDealSummary = {
  pileCounts: Record<string, number>;
  pileLabels: Record<string, string>;
  clusterDistribution: Array<{
    clusterId: string;
    total: number;
    pileCounts: Record<string, number>;
  }>;
};

export type CrateBuilderPayload = {
  ok: true;
  year: number;
  availableYears: number[];
  songCount: number;
  sourceRowCount: number;
  duplicateCount: number;
  clusterCount: number;
  sets: Array<CrateSet & { count: number }>;
  songs: CrateSong[];
  assignments: Record<string, string>;
  setOrder: Record<string, string[]>;
  manualKeys: string[];
  dealSummary: CrateDealSummary;
  myListsPath: string;
};
