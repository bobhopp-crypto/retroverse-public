/**
 * Standard Broadcast Asset Composer — Theme Pack 1 (phone 9:16).
 *
 * Fixed layout regions; only content changes per song.
 * No AI layout decisions.
 */

export type TemplateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Active selection mode. Only `default` is implemented in v1. */
export type TemplateSelectionMode =
  | "default"
  | "fixed"
  | "artist"
  | "holiday"
  | "event";

export type BroadcastAssetInput = {
  rvtr: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  coverUrl: string | null;
};

export type ComposedBroadcastAsset = {
  templateId: TemplateId;
  templateSlug: string;
  templateName: string;
  selectionMode: TemplateSelectionMode;
  input: BroadcastAssetInput;
};

/** Fixed region geometry for a Theme Pack 1 phone template. */
export type BroadcastTemplateDefinition = {
  id: TemplateId;
  slug: string;
  name: string;
  /** Presentation modifier — drives CSS grid placement only. */
  layoutClass: string;
  description: string;
};
