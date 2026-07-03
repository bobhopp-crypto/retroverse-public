/** Client-safe asset types (no Node/fs). */

export type SundayAssetType =
  | "bumper"
  | "commercial"
  | "intro"
  | "outro"
  | "clip"
  | "other";

export type SundayAssetItem = {
  key: string;
  year: number;
  type: SundayAssetType;
  artist: string;
  title: string;
  tags: string[];
  rvtr: string | null;
  path: string | null;
};

export type SundayAssetLibrary = {
  version: 1;
  updatedAt: string;
  items: SundayAssetItem[];
};
