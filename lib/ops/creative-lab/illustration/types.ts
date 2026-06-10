import type { ArtDirectionId } from "../art-directions";

export type IllustrationLayer =
  | "background"
  | "frame"
  | "decoration"
  | "centerpiece"
  | "accent"
  | "numbering";

export type IllustrationAsset = {
  id: string;
  name: string;
  category: ArtDirectionId;
  layer: IllustrationLayer;
  tags: string[];
  viewBox: string;
  /** SVG inner markup — use {{c1}}..{{c5}} for palette slots */
  content: string;
};

export type PaletteSlots = {
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  c5: string;
};

export type PlacedAsset = {
  asset: IllustrationAsset;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  flipX?: boolean;
};

export type BoardComposition = {
  artDirectionId: ArtDirectionId;
  width: number;
  height: number;
  background: IllustrationAsset[];
  frame: PlacedAsset[];
  decorations: PlacedAsset[];
  centerpiece: PlacedAsset[];
  accents: PlacedAsset[];
  numbering: PlacedAsset[];
  /** Optional gradient defs keyed by id */
  defs?: string;
};
