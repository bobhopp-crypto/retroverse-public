"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SortingSongCard } from "@/components/ops/sorting-board/SortingSongCard";
import { normalizeSortingBoardPayload } from "@/lib/ops/sorting-board/normalize";
import type { SortingBoardPayload, SortingSong } from "@/lib/ops/sorting-board/types";

const DRAG_KEY = "application/x-retroverse-sort-key";
const BUCKET_PREVIEW_TITLES = 3;

type BoardData = SortingBoardPayload;

export function SortingBoard(props: { year: number }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<string | null>(null);

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
    } catch {
      setError("Failed to load sorting board");
    } finally {
      setLoading(false);
    }
  }, [props.year]);

  useEffect(() => {
    void load();
  }, [load]);

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
  }

  async function assignSong(workspaceKey: string, bucketId: string | null) {
    setNotice(null);
    try {
      await patch({ op: "assign", workspaceKey, bucketId });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function renameBucket(bucketId: string, name: string) {
    setNotice(null);
    try {
      await patch({ op: "renameBucket", bucketId, name });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
    }
  }

  const songsByBucket = useMemo(() => {
    const map = new Map<string, SortingSong[]>();
    if (!data) return map;
    const buckets = data.buckets ?? [];
    const songs = data.songs ?? [];
    const assignments = data.assignments ?? {};
    for (const bucket of buckets) map.set(bucket.id, []);
    for (const song of songs) {
      const bucketId = assignments[song.workspaceKey];
      if (!bucketId) continue;
      const list = map.get(bucketId);
      if (list) list.push(song);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title));
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

  function dropZoneProps(targetId: string, bucketId: string | null) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(targetId);
      },
      onDragLeave: () => setDragOver((prev) => (prev === targetId ? null : prev)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(null);
        const key = readDragKey(e);
        if (key) void assignSong(key, bucketId);
      },
    };
  }

  function toggleBucketExpanded(bucketId: string) {
    setExpandedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucketId)) next.delete(bucketId);
      else next.add(bucketId);
      return next;
    });
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
        {(data.buckets ?? []).map((bucket) => {
          const assigned = songsByBucket.get(bucket.id) ?? [];
          const expanded = expandedBuckets.has(bucket.id);
          const preview = assigned.slice(0, BUCKET_PREVIEW_TITLES);
          const over = dragOver === bucket.id;

          return (
            <div
              key={bucket.id}
              className={`ops-sort-board__bucket${over ? " ops-sort-board__bucket--over" : ""}`}
              {...dropZoneProps(bucket.id, bucket.id)}
            >
              <div className="ops-sort-board__bucket-head">
                <input
                  className="ops-sort-board__bucket-name"
                  value={bucket.name}
                  aria-label={`Bucket name ${bucket.id}`}
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
                  }}
                  onBlur={(e) => void renameBucket(bucket.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
                <span className="ops-sort-board__bucket-count">({bucket.count})</span>
              </div>

              {assigned.length > 0 && !expanded ? (
                <ul className="ops-sort-board__bucket-titles">
                  {preview.map((song) => (
                    <li key={song.workspaceKey}>{song.title}</li>
                  ))}
                </ul>
              ) : null}

              {assigned.length > BUCKET_PREVIEW_TITLES ? (
                <button
                  type="button"
                  className="ops-sort-board__bucket-more"
                  onClick={() => toggleBucketExpanded(bucket.id)}
                >
                  {expanded ? "Show less" : `Show all ${assigned.length}`}
                </button>
              ) : null}

              {expanded && assigned.length > 0 ? (
                <div className="ops-sort-board__bucket-songs">
                  {assigned.map((song) => (
                    <SortingSongCard
                      key={song.workspaceKey}
                      song={song}
                      compact
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section
        className={`ops-sort-board__unsorted${dragOver === "unsorted" ? " ops-sort-board__unsorted--over" : ""}`}
        aria-label="Unsorted songs"
        {...dropZoneProps("unsorted", null)}
      >
        <h2 className="ops-sort-board__unsorted-title">
          Unsorted <span className="ops-sort-board__unsorted-count">{unsortedSongs.length}</span>
        </h2>
        <div className="ops-sort-board__song-list">
          {unsortedSongs.map((song) => (
            <SortingSongCard key={song.workspaceKey} song={song} onDragStart={onDragStart} />
          ))}
        </div>
      </section>
    </div>
  );
}
