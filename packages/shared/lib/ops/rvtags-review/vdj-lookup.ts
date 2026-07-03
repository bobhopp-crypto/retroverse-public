export type VdjTrackMeta = {
  user2: string;
  /** Manually adjusted rotation signal from VDJ Infos PlayCount — not a factual play total. */
  playCount: number | null;
};

export { loadVdjMetaForPaths, normVdjPath, vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";
