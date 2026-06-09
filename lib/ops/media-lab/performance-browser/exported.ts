import { loadExportManifest } from "@/lib/ops/media-collections/midnight-special/export-manifest";
import { buildMediaLabPerformanceHref } from "@/lib/ops/media-lab/workspace/urls";

export type ExportedClipRow = {
  performance_id: string;
  episode_id: string;
  artist: string;
  title: string;
  collection_id: string;
  collection_title: string;
  year: string;
  grouping: string;
  output_path: string;
  exported_at?: string;
  bytes?: number;
  source_performance_href: string;
};

export async function listExportedClipRows(): Promise<ExportedClipRow[]> {
  const manifest = await loadExportManifest();
  if (!manifest) return [];

  return manifest.entries
    .filter((e) => e.export_status === "completed" && e.output_path)
    .map((e) => ({
      performance_id: e.performance_id,
      episode_id: e.episode_id,
      artist: e.artist,
      title: e.song,
      collection_id: manifest.collection_id,
      collection_title: "Midnight Special",
      year: e.year,
      grouping: e.grouping,
      output_path: e.output_path,
      exported_at: e.exported_at,
      bytes: e.bytes,
      source_performance_href: buildMediaLabPerformanceHref({
        episodeId: e.episode_id,
        performanceId: e.performance_id,
        collection: manifest.collection_id,
        library: "exported",
      }),
    }))
    .sort((a, b) => (b.exported_at ?? "").localeCompare(a.exported_at ?? ""));
}
