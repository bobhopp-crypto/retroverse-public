"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CrateSongCard } from "@/components/ops/crate-builder/CrateSongCard";
import {
  insertIntoSetOrder,
  removeFromAllSetOrders,
} from "@/lib/ops/crate-builder/order";
import { SET_COLOR_IDS, SET_COLORS } from "@/lib/ops/crate-builder/set-colors";
import type { CrateBuilderPayload, CrateSet, CrateSong } from "@/lib/ops/crate-builder/types";

const DRAG_KEY = "application/x-retroverse-crate-key";
const RENAME_DEBOUNCE_MS = 500;

type BoardData = CrateBuilderPayload;

type DropHint = {
  setId: string;
  beforeKey: string | null;
};

function setCounts(
  sets: BoardData["sets"],
  assignments: Record<string, string>,
): BoardData["sets"] {
  const counts = new Map(sets.map((s) => [s.id, 0]));
  for (const setId of Object.values(assignments)) {
    counts.set(setId, (counts.get(setId) ?? 0) + 1);
  }
  return sets.map((s) => ({ ...s, count: counts.get(s.id) ?? 0 }));
}

function songsForSet(
  setId: string,
  songs: CrateSong[],
  assignments: Record<string, string>,
  setOrder: Record<string, string[]>,
): CrateSong[] {
  const byKey = new Map(songs.map((s) => [s.key, s]));
  const ordered: CrateSong[] = [];
  const seen = new Set<string>();

  for (const key of setOrder[setId] ?? []) {
    if (assignments[key] !== setId) continue;
    const song = byKey.get(key);
    if (song) {
      ordered.push(song);
      seen.add(key);
    }
  }

  for (const song of songs) {
    if (assignments[song.key] !== setId || seen.has(song.key)) continue;
    ordered.push(song);
  }

  return ordered;
}

function pileLabel(set: CrateSet, index: number): string {
  return set.name.trim() || `Pile ${index + 1}`;
}

export function CrateBuilder(props: { initialYear: number }) {
  const [year, setYear] = useState(props.initialYear);
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const dropHintRef = useRef<DropHint | null>(null);
  const renameTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const load = useCallback(async (targetYear: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/crate-builder?year=${targetYear}`);
      const json = (await res.json()) as BoardData & { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Load failed (${res.status})`);
        return;
      }
      if (!json.ok) {
        setError(json.error ?? "Invalid response");
        return;
      }
      setData(json);
    } catch {
      setError("Failed to load crate builder");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year);
  }, [load, year]);

  useEffect(() => {
    const timers = renameTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/ops/crate-builder", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ year, ...body }),
    });
    const json = (await res.json()) as BoardData & { error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? "Save failed");
    }
    if (!json.ok) {
      throw new Error(json.error ?? "Invalid response");
    }
    setData(json);
  }

  async function assignSong(song: CrateSong, setId: string, insertBefore: string | null) {
    if (data?.assignments[song.key] === setId && insertBefore == null) return;

    setNotice(null);
    setData((prev) => {
      if (!prev) return prev;
      const assignments = { ...prev.assignments };
      const setOrder = { ...prev.setOrder };
      removeFromAllSetOrders(setOrder, song.key);
      assignments[song.key] = setId;
      setOrder[setId] = insertIntoSetOrder(setOrder[setId] ?? [], song.key, insertBefore);
      const manualKeys = prev.manualKeys.includes(song.key)
        ? prev.manualKeys
        : [...prev.manualKeys, song.key];
      return {
        ...prev,
        assignments,
        setOrder,
        manualKeys,
        sets: setCounts(prev.sets, assignments),
        dealSummary: {
          ...prev.dealSummary,
          pileCounts: Object.fromEntries(
            prev.sets.map((s) => [
              s.id,
              Object.values(assignments).filter((id) => id === s.id).length,
            ]),
          ),
        },
      };
    });

    try {
      await patch({
        op: "assign",
        songKey: song.key,
        artist: song.artist,
        title: song.title,
        setId,
        insertBefore,
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
      void load(year);
    }
  }

  function scheduleSetRename(setId: string, name: string) {
    const timers = renameTimers.current;
    const existing = timers.get(setId);
    if (existing) clearTimeout(existing);
    timers.set(
      setId,
      setTimeout(() => {
        timers.delete(setId);
        void patch({ op: "renameSet", setId, name }).catch((err) => {
          setNotice(err instanceof Error ? err.message : "Rename failed");
        });
      }, RENAME_DEBOUNCE_MS),
    );
  }

  function flushSetRename(setId: string, name: string) {
    const timers = renameTimers.current;
    const existing = timers.get(setId);
    if (existing) {
      clearTimeout(existing);
      timers.delete(setId);
    }
    void patch({ op: "renameSet", setId, name }).catch((err) => {
      setNotice(err instanceof Error ? err.message : "Rename failed");
    });
  }

  const songsBySet = useMemo(() => {
    const map = new Map<string, CrateSong[]>();
    if (!data) return map;
    for (const set of data.sets) {
      map.set(set.id, songsForSet(set.id, data.songs, data.assignments, data.setOrder));
    }
    return map;
  }, [data]);

  function onDragStart(e: React.DragEvent, songKey: string) {
    e.dataTransfer.setData(DRAG_KEY, songKey);
    e.dataTransfer.effectAllowed = "move";
  }

  function readDragKey(e: React.DragEvent): string | null {
    return e.dataTransfer.getData(DRAG_KEY).trim() || null;
  }

  function songByKey(key: string): CrateSong | undefined {
    return data?.songs.find((s) => s.key === key);
  }

  function isLeavingDropZone(e: React.DragEvent) {
    const rel = e.relatedTarget as Node | null;
    return !rel || !e.currentTarget.contains(rel);
  }

  function setDropHintState(hint: DropHint | null) {
    dropHintRef.current = hint;
    setDropHint(hint);
  }

  function clearDropUi() {
    setDragOver(null);
    setDropHintState(null);
  }

  function handleDrop(e: React.DragEvent, setId: string, insertBefore: string | null) {
    e.preventDefault();
    e.stopPropagation();
    clearDropUi();
    const key = readDragKey(e);
    const song = key ? songByKey(key) : undefined;
    if (song) void assignSong(song, setId, insertBefore);
  }

  function setDropProps(setId: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(setId);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (isLeavingDropZone(e)) {
          setDragOver((prev) => (prev === setId ? null : prev));
          if (dropHintRef.current?.setId === setId) setDropHintState(null);
        }
      },
      onDrop: (e: React.DragEvent) => {
        const hint =
          dropHintRef.current?.setId === setId ? dropHintRef.current.beforeKey : null;
        handleDrop(e, setId, hint);
      },
    };
  }

  if (loading && !data) {
    return <p className="ops-empty">Dealing cards…</p>;
  }

  if (error || !data) {
    return <p className="ops-empty">{error ?? "Crate builder unavailable"}</p>;
  }

  const years = data.availableYears.length > 0 ? data.availableYears : [1967, 1978, 1992];
  const manualCount = data.manualKeys.length;

  return (
    <div className="ops-crate ops-crate--deal">
      {notice ? (
        <p className="ops-notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="ops-crate__toolbar">
        <div className="ops-crate__years" role="tablist" aria-label="Year pool">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              role="tab"
              aria-selected={y === year}
              className={`ops-crate__year${y === year ? " ops-crate__year--active" : ""}`}
              onClick={() => setYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
        <p className="ops-crate__stats">
          {data.songCount} songs · {data.clusterCount} AI groups · {manualCount} manual moves
          {data.duplicateCount > 0 ? (
            <> · {data.duplicateCount} dupes hidden</>
          ) : null}
        </p>
      </div>

      <p className="ops-crate__deal-note">
        Experiment B — AI deals all songs into 10 piles on load. Drag to fix mistakes. Moved cards
        stay manual.
      </p>

      <div className="ops-crate__piles-grid">
        {data.sets.map((set, index) => {
          const assigned = songsBySet.get(set.id) ?? [];
          const over = dragOver === set.id;
          const color = SET_COLORS[set.colorId];
          const label = pileLabel(set, index);

          return (
            <div
              key={set.id}
              className={`ops-crate__pile${over ? " ops-crate__pile--over" : ""}`}
              style={{ borderTopColor: color.border }}
              {...setDropProps(set.id)}
            >
              <div className="ops-crate__pile-head">
                <input
                  className="ops-crate__pile-name"
                  value={set.name}
                  placeholder={label}
                  aria-label={`Pile name ${label}`}
                  onChange={(e) => {
                    const name = e.target.value;
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            sets: prev.sets.map((s) =>
                              s.id === set.id ? { ...s, name } : s,
                            ),
                          }
                        : prev,
                    );
                    scheduleSetRename(set.id, name);
                  }}
                  onBlur={(e) => flushSetRename(set.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  onDragStart={(e) => e.preventDefault()}
                />
                <span className="ops-crate__pile-count">{set.count}</span>
              </div>

              <div className="ops-crate__pile-colors" role="group" aria-label={`Color for ${label}`}>
                {SET_COLOR_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`ops-crate__color-swatch${set.colorId === id ? " ops-crate__color-swatch--on" : ""}`}
                    style={{ background: SET_COLORS[id].bg, borderColor: SET_COLORS[id].border }}
                    title={SET_COLORS[id].label}
                    aria-label={SET_COLORS[id].label}
                    aria-pressed={set.colorId === id}
                    onClick={() => {
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              sets: prev.sets.map((s) =>
                                s.id === set.id ? { ...s, colorId: id } : s,
                              ),
                            }
                          : prev,
                      );
                      void patch({ op: "setColor", setId: set.id, colorId: id }).catch((err) => {
                        setNotice(err instanceof Error ? err.message : "Color save failed");
                      });
                    }}
                  />
                ))}
              </div>

              <div className="ops-crate__pile-body">
                {assigned.map((song) => {
                  const dropBefore =
                    dropHint?.setId === set.id && dropHint.beforeKey === song.key;
                  return (
                    <CrateSongCard
                      key={song.key}
                      songKey={song.key}
                      artist={song.artist}
                      title={song.title}
                      pileColor={color}
                      onDragStart={onDragStart}
                      dropBefore={dropBefore}
                      onDragOverSong={() => {
                        setDragOver(set.id);
                        setDropHintState({ setId: set.id, beforeKey: song.key });
                      }}
                      onDropOnSong={(e) => handleDrop(e, set.id, song.key)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <section className="ops-crate__report" aria-label="Deal report">
        <h2 className="ops-crate__report-title">Deal report</h2>

        <div className="ops-crate__report-block">
          <h3>Songs per pile</h3>
          <ul className="ops-crate__report-list">
            {data.sets.map((set, index) => (
              <li key={set.id}>
                {pileLabel(set, index)}: <strong>{data.dealSummary.pileCounts[set.id] ?? 0}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="ops-crate__report-block">
          <h3>Cluster distribution</h3>
          <ul className="ops-crate__report-clusters">
            {data.dealSummary.clusterDistribution.slice(0, 12).map((row) => (
              <li key={row.clusterId}>
                <span className="ops-crate__report-cluster-id">{row.clusterId}</span>
                <span className="ops-crate__report-cluster-total">{row.total} songs</span>
                <span className="ops-crate__report-cluster-piles">
                  {data.sets
                    .map((set, index) => {
                      const count = row.pileCounts[set.id] ?? 0;
                      if (count === 0) return null;
                      return `${pileLabel(set, index)}:${count}`;
                    })
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export function CrateBuilderShell(props: { initialYear: number }) {
  return <CrateBuilder initialYear={props.initialYear} />;
}
