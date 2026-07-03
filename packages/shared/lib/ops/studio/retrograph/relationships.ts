/**
 * Retrograph relationship edges — connected graph foundation for experiences.
 */

import type { Retrograph, RetrographRelationshipEdge } from "./types";

function edge(
  id: string,
  kind: string,
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
  confidence: number,
  source: string,
  label: string | null = null,
): RetrographRelationshipEdge {
  return {
    id,
    kind,
    from: { entityType: fromType, entityId: fromId },
    to: { entityType: toType, entityId: toId },
    confidence,
    source,
    label,
  };
}

/** Derive relationship edges from a built Retrograph snapshot. */
export function buildRetrographRelationships(graph: Retrograph): RetrographRelationshipEdge[] {
  const rvtr = graph.entity.rvtr;
  const edges: RetrographRelationshipEdge[] = [];

  edges.push(
    edge(
      `rel-${rvtr}-artist`,
      "song_artist",
      "song",
      rvtr,
      "artist",
      graph.artist.name,
      1,
      "Retrograph",
      graph.artist.name,
    ),
  );

  if (graph.album.title) {
    const albumId = graph.album.recordings[0]?.id ?? graph.album.title;
    edges.push(
      edge(
        `rel-${rvtr}-album`,
        "song_album",
        "song",
        rvtr,
        "album",
        albumId,
        0.95,
        "Retrograph",
        graph.album.title,
      ),
    );
  }

  if (graph.charts.peakHot100 != null) {
    edges.push(
      edge(
        `rel-${rvtr}-chart`,
        "song_chart_history",
        "song",
        rvtr,
        "chart",
        "hot100",
        0.95,
        "Retrograph",
        `Hot 100 #${graph.charts.peakHot100}`,
      ),
    );
  }

  for (const event of graph.timeline) {
    edges.push(
      edge(
        `rel-${rvtr}-tl-${event.id}`,
        "song_timeline_event",
        "song",
        rvtr,
        "timeline_event",
        event.id,
        event.confidence,
        event.source,
        event.label,
      ),
    );
  }

  for (const perf of graph.performances) {
    edges.push(
      edge(
        `rel-${rvtr}-perf-${perf.id}`,
        "song_performance",
        "song",
        rvtr,
        "performance",
        perf.id,
        0.85,
        "Retrograph",
        perf.title,
      ),
    );

    if (perf.sourcePath) {
      edges.push(
        edge(
          `rel-${perf.id}-video`,
          "performance_video_file",
          "performance",
          perf.id,
          "media",
          perf.sourcePath,
          0.9,
          "VirtualDJ",
          perf.title,
        ),
      );
    }
  }

  for (const related of graph.artist.relatedArtists) {
    if (related === graph.artist.name) continue;
    edges.push(
      edge(
        `rel-${rvtr}-artist-${related}`,
        "artist_related",
        "artist",
        graph.artist.name,
        "artist",
        related,
        0.7,
        "Retrograph",
        related,
      ),
    );
  }

  for (const relatedSong of graph.relatedSongs) {
    edges.push(
      edge(
        `rel-${rvtr}-song-${relatedSong}`,
        "song_related_song",
        "song",
        rvtr,
        "song",
        relatedSong,
        0.7,
        "Retrograph",
        null,
      ),
    );
  }

  for (const image of graph.media.images) {
    if (image.performanceId) {
      edges.push(
        edge(
          `rel-${image.assetId}-frame`,
          "performance_media",
          "performance",
          image.performanceId,
          "media",
          image.assetId,
          0.85,
          "Collector",
          image.label,
        ),
      );
    }
  }

  return edges;
}
