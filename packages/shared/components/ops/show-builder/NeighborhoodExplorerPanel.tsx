"use client";

import type { SongNeighborBundle } from "@/lib/ops/show-builder/neighborhoods";
import type { SongClusterHint } from "@/lib/ops/show-builder/visual-clustering";
import type { ShowSet, VdjPoolSong } from "@/lib/ops/show-builder/types";

type Props = {
  year: number;
  song: VdjPoolSong;
  bundle: SongNeighborBundle;
  sets: ShowSet[];
  debugMode: boolean;
  showScores: boolean;
  aiClustering: boolean;
  clusterHint: (key: string) => SongClusterHint | null;
  onSelectNeighbor: (key: string) => void;
  onAddToSet: (songKey: string, setId: string) => void;
  onClose: () => void;
};

const METHODS = ["A", "B", "C"] as const;

function NeighborRow(props: {
  index: number;
  neighborKey: string;
  title: string;
  artist: string;
  score?: number;
  showScore: boolean;
  aiClustering: boolean;
  clusterHint: (key: string) => SongClusterHint | null;
  onSelect: (key: string) => void;
}) {
  const cluster = props.aiClustering ? props.clusterHint(props.neighborKey) : null;

  return (
    <li className="ops-show__explorer-neighbor">
      <button
        type="button"
        className="ops-show__explorer-neighbor-btn"
        onClick={() => props.onSelect(props.neighborKey)}
      >
        <span className="ops-show__explorer-neighbor-num">{props.index}.</span>
        {cluster ? (
          <span
            className="ops-show__explorer-cluster-dot"
            style={{ background: cluster.bg }}
            title={cluster.label}
            aria-hidden
          />
        ) : null}
        <span className="ops-show__explorer-neighbor-text">
          <span className="ops-show__explorer-neighbor-title">{props.title}</span>
          <span className="ops-show__explorer-neighbor-artist">{props.artist}</span>
        </span>
        {props.showScore && props.score != null ? (
          <span className="ops-show__explorer-neighbor-score">{props.score.toFixed(2)}</span>
        ) : null}
      </button>
    </li>
  );
}

export function NeighborhoodExplorerPanel(props: Props) {
  const selectedCluster = props.aiClustering ? props.clusterHint(props.song.key) : null;

  return (
    <section className="ops-show__explorer" aria-label={`${props.year} neighborhood explorer`}>
      <div className="ops-show__explorer-head">
        <h2 className="ops-show__panel-title">Neighborhood</h2>
        <button type="button" className="ops-show__explorer-close" onClick={props.onClose}>
          Close
        </button>
      </div>

      <div className="ops-show__explorer-selected">
        <p className="ops-show__explorer-kicker">Selected song</p>
        <p className="ops-show__explorer-title">
          {selectedCluster ? (
            <span
              className="ops-show__explorer-cluster-dot ops-show__explorer-cluster-dot--lg"
              style={{ background: selectedCluster.bg }}
              title={selectedCluster.label}
              aria-hidden
            />
          ) : null}
          {props.song.title}
        </p>
        <p className="ops-show__explorer-artist">{props.song.artist}</p>
        <p className="ops-show__explorer-plays">Plays: {props.song.playCount}</p>
      </div>

      {props.debugMode ? (
        <div className="ops-show__explorer-debug-grid">
          {METHODS.map((method) => (
            <div key={method} className="ops-show__explorer-debug-col">
              <h3 className="ops-show__explorer-debug-head">Method {method}</h3>
              <ol className="ops-show__explorer-list">
                {props.bundle.byMethod[method].map((n, idx) => (
                  <NeighborRow
                    key={`${method}-${n.key}`}
                    index={idx + 1}
                    neighborKey={n.key}
                    title={n.title}
                    artist={n.artist}
                    score={n.score}
                    showScore={props.showScores}
                    aiClustering={props.aiClustering}
                    clusterHint={props.clusterHint}
                    onSelect={props.onSelectNeighbor}
                  />
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : (
        <>
          <h3 className="ops-show__explorer-nearby-head">Nearby songs</h3>
          <ol className="ops-show__explorer-list">
            {props.bundle.byMethod.A.map((n, idx) => (
              <NeighborRow
                key={n.key}
                index={idx + 1}
                neighborKey={n.key}
                title={n.title}
                artist={n.artist}
                score={n.score}
                showScore={props.showScores}
                aiClustering={props.aiClustering}
                clusterHint={props.clusterHint}
                onSelect={props.onSelectNeighbor}
              />
            ))}
          </ol>
        </>
      )}

      {props.sets.length > 0 ? (
        <div className="ops-show__explorer-add">
          <p className="ops-show__explorer-add-label">Add selected song to set</p>
          <div className="ops-show__explorer-add-row">
            {props.sets.map((set, index) => (
              <button
                key={set.id}
                type="button"
                className="ops-show__explorer-add-btn"
                onClick={() => props.onAddToSet(props.song.key, set.id)}
              >
                + Add to Set {index + 1}
                {set.name.trim() ? ` · ${set.name}` : ""}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
