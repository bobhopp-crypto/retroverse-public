"use client";

import { useEffect, useMemo, useState } from "react";

import { clusterPoolSongsWithMethod } from "@/lib/ops/show-builder/visual-clustering";
import type { CompareClusterResult } from "@/lib/ops/show-builder/visual-clustering";
import type { VdjPoolSong } from "@/lib/ops/show-builder/types";

type Props = {
  year: number;
  pool: VdjPoolSong[];
};

const METHODS = ["A", "B", "C"] as const;

type MethodResult = {
  method: (typeof METHODS)[number];
  result: CompareClusterResult;
};

export function ClusterComparePanel({ year, pool }: Props) {
  const poolKey = useMemo(() => pool.map((s) => s.key).join("|"), [pool]);
  const [results, setResults] = useState<MethodResult[] | null>(null);
  const [computeError, setComputeError] = useState<string | null>(null);

  useEffect(() => {
    console.info("[ShowBuilder] ClusterComparePanel mounted", { year, poolSize: pool.length });
  }, [year, pool.length]);

  useEffect(() => {
    let cancelled = false;
    setResults(null);
    setComputeError(null);

    const run = () => {
      try {
        const next = METHODS.map((method) => ({
          method,
          result: clusterPoolSongsWithMethod(pool, method),
        }));
        if (!cancelled) setResults(next);
      } catch (err) {
        if (!cancelled) {
          setComputeError(err instanceof Error ? err.message : "Cluster compare failed");
        }
      }
    };

    // Defer heavy clustering off the first paint so the shell stays visible.
    const timer = window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pool, poolKey, year]);

  if (computeError) {
    return (
      <section className="ops-show__cluster-compare">
        <p className="ops-empty">Cluster compare error: {computeError}</p>
      </section>
    );
  }

  if (!results) {
    return (
      <section className="ops-show__cluster-compare">
        <p className="ops-empty">Computing Method A / B / C clusters…</p>
      </section>
    );
  }

  return (
    <section className="ops-show__cluster-compare" aria-label={`${year} clustering comparison`}>
      <h2 className="ops-show__panel-title">Cluster compare (dev) — {year}</h2>
      <p className="ops-show__cluster-note">
        Method A = cultural k-means · B = outlier removal · C = farthest-first seeds
      </p>
      <div className="ops-show__cluster-compare-grid">
        {results.map(({ method, result }) => (
          <div key={method} className="ops-show__cluster-compare-col">
            <h3 className="ops-show__cluster-compare-head">
              Method {method}
              {result.scores ? (
                <span className="ops-show__cluster-compare-score">
                  score {result.scores.composite.toFixed(3)} · anchors{" "}
                  {result.scores.anchorHits}/{result.scores.anchorTotal}
                </span>
              ) : null}
            </h3>
            {result.seeds && result.seeds.length > 0 ? (
              <ul className="ops-show__cluster-seeds">
                {result.seeds.map((s) => (
                  <li key={`${s.cluster}-${s.title}`}>
                    {s.cluster}: {s.artist} — {s.title}
                  </li>
                ))}
              </ul>
            ) : null}
            <table className="ops-show__cluster-debug-table">
              <thead>
                <tr>
                  <th>Cluster</th>
                  <th>Artist</th>
                  <th>Title</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(result.debugRows ?? []).map((row) => (
                  <tr key={`${method}-${row.cluster}-${row.artist}-${row.title}`}>
                    <td>{row.cluster}</td>
                    <td>{row.artist}</td>
                    <td>{row.title}</td>
                    <td>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}
