import type { Rvtr } from "./types";

export type StudioAssetKind = "cover" | "performance-screenshot" | "visual-extract" | "video" | "other";

/** Reference to a Studio-managed asset on disk or CDN. */
export type StudioAssetRef = {
  rvtr: Rvtr;
  kind: StudioAssetKind;
  relativePath?: string;
  url?: string;
  hash?: string;
};

export type StudioAssetManifestEntry = StudioAssetRef & {
  label: string;
  approved: boolean;
};
