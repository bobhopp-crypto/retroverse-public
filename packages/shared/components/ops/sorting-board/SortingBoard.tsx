"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SortingSongCard } from "@/components/ops/sorting-board/SortingSongCard";
import { insertIntoBucketOrder, removeFromAllBucketOrders } from "@/lib/ops/sorting-board/order";
import { normalizeSortingBoardPayload } from "@/lib/ops/sorting-board/normalize";
import type { SortingBoardPayload, SortingSong } from "@/lib/ops/sorting-board/types";

const DRAG_KEY = "application/x-retroverse-sort-key";
const RENAME_DEBOUNCE_MS = 500;

type BoardData = SortingBoardPayload;

type DropHint = {
  bucketId: string;
  beforeKey: string | null;
};

function assignmentCounts(
  buckets: BoardData["buckets"],
  assignments: Record<string, string>,
): BoardData["buckets"] {
  const counts = new Map(buckets.map((b) => [b.id, 0]));
  for (const bucketId of Object.values(assignments)) {
    counts.set(bucketId, (counts.get(bucketId) ?? 0) + 1);
  }
  return buckets.map((b) => ({ ...b, count: counts.get(b.id) ?? 0 }));
}

function songsForBucket(
  bucketId: string,
  songs: SortingSong[],
  assignments: Record<string, string>,
  bucketOrder: Record<string, string[]>,
): SortingSong[] {
  const byKey = new Map(songs.map((s) => [s.workspaceKey, s]));
  const ordered: SortingSong[] = [];
  const seen = new Set<string>();

  for (const key of bucketOrder[bucketId] ?? []) {
    if (assignments[key] !== bucketId) continue;
    const song = byKey.get(key);
    if (song) {
      ordered.push(song);
      seen.add(key);
    }
  }

  for (const song of songs) {
    if (assignments[song.workspaceKey] !== bucketId || seen.has(song.workspaceKey)) continue;
    ordered.push(song);
  }

  return ordered;
}

export function SortingBoard(props: { year: number }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const dropHintRef = useRef<DropHint | null>(null);
  const renameTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastSavedNames = useRef<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/sorting-board?year=${props.year}`);
      const json = (await res.json()) as BoardData & { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Load failed (${res.status})`);
        return;
      }
      const board = normalizeSortingBoardPayload(json, props.year);
      if (!board) {
        setError(json.error ?? "Invalid sorting board response");
        return;
      }
      setData(board);
      for (const b of board.buckets) {
        lastSavedNames.current.set(b.id, b.name);
      }
    } catch {
      setError("Failed to load sorting board");
    } finally {
      setLoading(false);
    }
  }, [props.year]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timers = renameTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/ops/sorting-board", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ year: props.year, ...body }),
    });
    const json = (await res.json()) as BoardData & { error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? "Save failed");
    }
    const board = normalizeSortingBoardPayload(json, props.year);
    if (!board) {
      throw new Error(json.error ?? "Invalid sorting board response");
    }
    setData(board);
    for (const b of board.buckets) {
      lastSavedNames.current.set(b.id, b.name);
    }
  }

  function applyPlacement(
    workspaceKey: string,
    bucketId: string | null,
    insertBefore: string | null,
  ) {
    setData((prev) => {
      if (!prev) return prev;
      const assignments = { ...prev.assignments };
      const bucketOrder = { ...prev.bucketOrder };
      for (const id of Object.keys(bucketOrder)) {
        bucketOrder[id] = [...(bucketOrder[id] ?? [])];
      }

      removeFromAllBucketOrders(bucketOrder, workspaceKey);

      if (bucketId == null) {
        delete assignments[workspaceKey];
      } else {
        assignments[workspaceKey] = bucketId;
        bucketOrder[bucketId] = insertIntoBucketOrder(
          bucketOrder[bucketId] ?? [],
          workspaceKey,
          insertBefore,
        );
      }

      return {
        ...prev,
        assignments,
        bucketOrder,
        buckets: assignmentCounts(prev.buckets, assignments),
      };
    });
  }

  async function assignSong(
    workspaceKey: string,
    bucketId: string | null,
    insertBefore: string | null = null,
  ) {
    if (!data) return;
    const current = data.assignments[workspaceKey] ?? null;
    if (current === bucketId && bucketId == null) return;

    if (current === bucketId && bucketId != null) {
      const prev = data.bucketOrder[bucketId] ?? [];
      const next = insertIntoBucketOrder(
        prev.filter((k) => k !== workspaceKey),
        workspaceKey,
        insertBefore,
      );
      if (prev.join("\0") === next.join("\0")) return;
    }

    setNotice(null);
    applyPlacement(workspaceKey, bucketId, insertBefore);
    try {
      await patch({ op: "assign", workspaceKey, bucketId, insertBefore });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
      void load();
    }
  }

  async function persistBucketName(bucketId: string, name: string, fallbackLabel: string) {
    const trimmed = name.trim() || fallbackLabel;
    if (lastSavedNames.current.get(bucketId) === trimmed) return;

    setNotice(null);
    try {
      await patch({ op: "renameBucket", bucketId, name: trimmed });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
      void load();
    }
  }

  function scheduleBucketRename(bucketId: string, name: string, fallbackLabel: string) {
    const prev = renameTimers.current.get(bucketId);
    if (prev) clearTimeout(prev);
    renameTimers.current.set(
      bucketId,
      setTimeout(() => {
        renameTimers.current.delete(bucketId);
        void persistBucketName(bucketId, name, fallbackLabel);
      }, RENAME_DEBOUNCE_MS),
    );
  }

  function flushBucketRename(bucketId: string, name: string, fallbackLabel: string) {
    const pending = renameTimers.current.get(bucketId);
    if (pending) {
      clearTimeout(pending);
      renameTimers.current.delete(bucketId);
    }
    void persistBucketName(bucketId, name, fallbackLabel);
  }

  const songsByBucket = useMemo(() => {
    const map = new Map<string, SortingSong[]>();
    if (!data) return map;
    for (const bucket of data.buckets ?? []) {
      map.set(
        bucket.id,
        songsForBucket(
          bucket.id,
          data.songs ?? [],
          data.assignments ?? {},
          data.bucketOrder ?? {},
        ),
      );
    }
    return map;
  }, [data]);

  const unsortedSongs = useMemo(() => {
    if (!data) return [];
    const songs = data.songs ?? [];
    const assignments = data.assignments ?? {};
    return songs
      .filter((s) => !assignments[s.workspaceKey])
      .sort((a, b) => {
        const pa = a.playCount ?? 0;
        const pb = b.playCount ?? 0;
        if (pa !== pb) return pb - pa;
        return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
      });
  }, [data]);

  function onDragStart(e: React.DragEvent, workspaceKey: string) {
    e.dataTransfer.setData(DRAG_KEY, workspaceKey);
    e.dataTransfer.effectAllowed = "move";
  }

  function readDragKey(e: React.DragEvent): string | null {
    const key = e.dataTransfer.getData(DRAG_KEY);
    return key.trim() || null;
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

  function handleDrop(
    e: React.DragEvent,
    bucketId: string | null,
    insertBefore: string | null,
  ) {
    e.preventDefault();
    e.stopPropagation();
    clearDropUi();
    const key = readDragKey(e);
    if (key) void assignSong(key, bucketId, insertBefore);
  }

  function bucketDropProps(bucketId: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(bucketId);
        if (dropHintRef.current?.bucketId !== bucketId) {
          setDropHintState({ bucketId, beforeKey: null });
        }
      },
      onDragLeave: (e: React.DragEvent) => {
        if (isLeavingDropZone(e)) {
          setDragOver((prev) => (prev === bucketId ? null : prev));
          if (dropHintRef.current?.bucketId === bucketId) setDropHintState(null);
        }
      },
      onDrop: (e: React.DragEvent) => {
        const hint =
          dropHintRef.current?.bucketId === bucketId ? dropHintRef.current.beforeKey : null;
        handleDrop(e, bucketId, hint);
      },
    };
  }

  if (loading) {
    return <p className="ops-empty">Loading sorting board…</p>;
  }

  if (error || !data) {
    return <p className="ops-empty">{error ?? "Board unavailable"}</p>;
  }

  return (
    <div className="ops-sort-board">
      {notice ? (
        <p className="ops-notice" role="status">
          {notice}
        </p>
      ) : null}

      <section className="ops-sort-board__buckets" aria-label="Sorting buckets">
        {(data.buckets ?? []).map((bucket, index) => {
          const assigned = songsByBucket.get(bucket.id) ?? [];
          const over = dragOver === bucket.id;
          const fallbackLabel = `Pile ${index + 1}`;

          return (
            <div
              key={bucket.id}
              className={`ops-sort-board__bucket${over ? " ops-sort-board__bucket--over" : ""}`}
              {...bucketDropProps(bucket.id)}
            >
              <div className="ops-sort-board__bucket-head">
                <input
                  className="ops-sort-board__bucket-name"
                  value={bucket.name}
                  placeholder={fallbackLabel}
                  aria-label={`Bucket name ${index + 1}`}
                  onChange={(e) => {
                    const name = e.target.value;
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            buckets: prev.buckets.map((b) =>
                              b.id === bucket.id ? { ...b, name } : b,
                            ),
                          }
                        : prev,
                    );
                    scheduleBucketRename(bucket.id, name, fallbackLabel);
                  }}
                  onBlur={(e) => flushBucketRename(bucket.id, e.target.value, fallbackLabel)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  onDragStart={(e) => e.preventDefault()}
                />
                <span className="ops-sort-board__bucket-count" aria-label={`${bucket.count} songs`}>
                  {bucket.count}
                </span>
              </div>

              <div className="ops-sort-board__bucket-songs">
                {assigned.map((song) => {
                  const dropBefore =
                    dropHint?.bucketId === bucket.id &&
                    dropHint.beforeKey === song.workspaceKey;
                  return (
                    <SortingSongCard
                      key={song.workspaceKey}
                      song={song}
                      variant="pile"
                      onDragStart={onDragStart}
                      dropBefore={dropBefore}
                      onDragOverSong={() => {
                        setDragOver(bucket.id);
                        setDropHintState({ bucketId: bucket.id, beforeKey: song.workspaceKey });
                      }}
                      onDropOnSong={(e) => handleDrop(e, bucket.id, song.workspaceKey)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section
        className={`ops-sort-board__unsorted${dragOver === "unsorted" ? " ops-sort-board__unsorted--over" : ""}`}
        aria-label="Unsorted songs"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver("unsorted");
          setDropHintState(null);
        }}
        onDragLeave={(e) => {
          if (isLeavingDropZone(e)) setDragOver((prev) => (prev === "unsorted" ? null : prev));
        }}
        onDrop={(e) => handleDrop(e, null, null)}
      >
        <h2 className="ops-sort-board__unsorted-title">
          Unsorted <span className="ops-sort-board__unsorted-count">{unsortedSongs.length}</span>
        </h2>
        <div className="ops-sort-board__song-list">
          {unsortedSongs.map((song) => (
            <SortingSongCard
              key={song.workspaceKey}
              song={song}
              variant="unsorted"
              onDragStart={onDragStart}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
