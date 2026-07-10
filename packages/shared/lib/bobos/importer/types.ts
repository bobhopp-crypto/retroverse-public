/**
 * Broadcast Collection Importer — generic types.
 *
 * A "Broadcast Collection" is an ordered playlist of RVBA assets. The
 * importer's only job is: read images from some source, turn each into an
 * RVBA slide asset, and propose a first-pass grouping of those assets into
 * Sequences. Nothing downstream (Mixer, Deck, Presentation Engine) is
 * allowed to know which source produced a given RVBA asset — only its
 * canonical RVBA type and fields matter at runtime.
 */

export const IMPORT_SOURCE_KINDS = ["zip", "folder", "pdf", "pptx"] as const;
export type ImportSourceKind = (typeof IMPORT_SOURCE_KINDS)[number];

/** One raw image pulled out of a source, before it becomes an RVBA asset. */
export type RawImportImage = {
  /** Original filename (or a synthetic one for sources without filenames). */
  filename: string;
  buffer: Buffer;
};

/** A source knows how to turn some input into a flat list of raw images.
 * Adding a new source (PDF, PPTX, ...) never touches the pipeline, storage,
 * or runtime — only this interface. */
export type ImportSource = {
  kind: ImportSourceKind;
  listImages(input: ImportInput): Promise<RawImportImage[]>;
};

export type ImportInput = {
  /** Absolute path to a .zip file, a folder, a .pdf, or a .pptx — meaning
   * depends on the source `kind`. */
  path?: string;
  /** In-memory buffer alternative to `path` (e.g. an uploaded file). */
  buffer?: Buffer;
};

/** One imported image, now a first-class RVBA broadcast asset. */
export type RvbaSlideAsset = {
  /** Canonical RVBA id, e.g. RVBA-LIVEAID1985-021. */
  rvbaId: string;
  collectionId: string;
  /** 1-based position within the collection's ordered slide list. */
  sequenceIndex: number;
  /** Original source filename, kept for traceability. */
  filename: string;
  title: string;
  width: number | null;
  height: number | null;
  /** sha256 of the master image bytes — also used to name stored files. */
  hash: string;
  /** Path segments (not URLs) relative to the collection folder. */
  masterFile: string;
  thumbFile: string;
};

/** A named, contiguous run of slides the operator plays as one unit. */
export type BroadcastSequence = {
  id: string;
  title: string;
  /** 1-based, inclusive slide positions into the collection's slide list. */
  startSlide: number;
  endSlide: number;
  slideCount: number;
  /** Seconds each slide in this sequence stays on screen by default. */
  defaultDuration: number;
  loop: boolean;
  autoReturn: boolean;
  tags: string[];
  /** True until an operator explicitly edits/saves this sequence. */
  autoDetected: boolean;
};

export type BroadcastCollectionManifest = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceKind: ImportSourceKind;
  slides: RvbaSlideAsset[];
  sequences: BroadcastSequence[];
};

/** Row in the top-level collections index. */
export type BroadcastCollectionSummary = {
  id: string;
  title: string;
  slideCount: number;
  sequenceCount: number;
  createdAt: string;
  updatedAt: string;
  sourceKind: ImportSourceKind;
};

export type ImportBroadcastCollectionOptions = {
  sourceKind: ImportSourceKind;
  input: ImportInput;
  collectionTitle: string;
  /** Reuse an existing collection id to re-import/refresh it; otherwise a
   * new id is derived from the title. */
  collectionId?: string;
  /** Default seconds per slide when auto-detected sequences don't specify one. */
  defaultDurationSeconds?: number;
};
