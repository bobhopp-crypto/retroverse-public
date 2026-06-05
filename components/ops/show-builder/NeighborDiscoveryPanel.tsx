"use client";

import { useMemo, useState } from "react";

import { buildYearNeighborhoods } from "@/lib/ops/show-builder/neighborhoods";
import type { SongNeighborBundle } from "@/lib/ops/show-builder/neighborhoods";
import type { VdjPoolSong } from "@/lib/ops/show-builder/types";

type Props = {
  year: number;
  pool: VdjPoolSong[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

const METHODS = ["A", "B", "C"] as const;

export function NeighborDiscoveryPanel({ year, pool, selectedKey, onSelect }: Props) {
  const report = useMemo(() => buildYearNeighborhoods(pool, year), [pool, year]);

  const selected: SongNeighborBundle | null = useMemo(() => {
    if (!selectedKey) return null;
    const song = pool.find((s) => s.key === selectedKey);
    if (!song) return null;
    const id = `${song.artist.toLowerCase()}|${song.title.toLowerCase()}`;
    return (
      report.songs.find(
        (b) => `${b.artist.toLowerCase()}|${b.title.toLowerCase()}` === id,
      ) ?? null
    );
  }, [selectedKey, pool, report]);

  const uniquePool = useMemo(() => {
    const seen = new Set<string>();
    return pool.filter((s) => {
      const id = `${s.artist.toLowerCase()}|${s.title.toLowerCase()}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [pool]);

  return (
    <section className="ops-show__neighbors" aria-label={`${year} neighborhood discovery`}>
      <h2 className="ops-show__panel-title">Neighborhood discovery (dev) — {year}</h2>
      <p className="ops-show__cluster-note">
        Click a song. No clusters, no genres — just nearby songs a DJ might think of next.
      </p>

      <div className="ops-show__neighbor-pool">
        {uniquePool.map((song) => (
          <button
            key={song.key}
            type="button"
            className={`ops-show__neighbor-pick${selectedKey === song.key ? " ops-show__neighbor-pick--active" : ""}`}
            onClick={() => onSelect(song.key)}
          >
            <span className="ops-show__neighbor-pick-title">{song.title}</span>
            <span className="ops-show__neighbor-pick-artist">{song.artist}</span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="ops-show__neighbor-detail">
          <h3 className="ops-show__neighbor-focus">
            {selected.artist} — {selected.title}
          </h3>
          <p className="ops-show__neighbor-meta">
            Stability {selected.stability.toFixed(2)} · Reciprocals {selected.reciprocalCount} ·
            Neighborhood size {Math.max(...METHODS.map((m) => selected.neighborhoodSizes[m]))}
          </p>
          <div className="ops-show__neighbor-methods">
            {METHODS.map((method) => (
              <div key={method} className="ops-show__neighbor-col">
                <h4>Method {method}</h4>
                <ol className="ops-show__neighbor-list">
                  {selected.byMethod[method].map((n) => (
                    <li key={`${method}-${n.key}`}>
                      <button type="button" className="ops-show__neighbor-link" onClick={() => onSelect(n.key)}>
                        {n.title}
                      </button>
                      <span className="ops-show__neighbor-artist">{n.artist}</span>
                      <span className="ops-show__neighbor-score">{n.score.toFixed(2)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="ops-show__empty-hint">Select a song above.</p>
      )}
    </section>
  );
}

/** Hook-friendly wrapper with internal selection state. */
export function NeighborDiscoveryMode(props: { year: number; pool: VdjPoolSong[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  return (
    <NeighborDiscoveryPanel
      year={props.year}
      pool={props.pool}
      selectedKey={selectedKey}
      onSelect={setSelectedKey}
    />
  );
}
