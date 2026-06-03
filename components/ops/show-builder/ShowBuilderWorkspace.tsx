"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ShowSongChip } from "@/components/ops/show-builder/ShowSongChip";
import { songsInSet } from "@/lib/ops/show-builder/order";
import { insertIntoOrder, removeFromAllOrders } from "@/lib/ops/show-builder/order";
import { clusterPoolSongs, groupPoolByCluster } from "@/lib/ops/show-builder/visual-clustering";
import type { SongClusterHint } from "@/lib/ops/show-builder/visual-clustering";
import type { ShowBuilderPayload, ShowSet, VdjPoolSong } from "@/lib/ops/show-builder/types";

const SONG_DRAG = "application/x-retroverse-show-song";
const FLOW_DRAG = "application/x-retroverse-show-flow-index";

type DropHint = { setId: string; beforeKey: string | null };

export function ShowBuilderWorkspace() {
  const [data, setData] = useState<ShowBuilderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [dragOverSetId, setDragOverSetId] = useState<string | null>(null);
  const [dragOverPool, setDragOverPool] = useState(false);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const dropHintRef = useRef<DropHint | null>(null);
  const [flowDragOver, setFlowDragOver] = useState<number | null>(null);
  const [exportName, setExportName] = useState("Sunday Night Show");
  const [aiClustering, setAiClustering] = useState(false);

  const catalog = useMemo(() => {
    const map = new Map<string, VdjPoolSong>();
    if (!data) return map;
    for (const list of Object.values(data.pools)) {
      for (const s of list) map.set(s.key, s);
    }
    return map;
  }, [data]);

  const activeYearPool =
    data && activeYear != null ? (data.pools[activeYear] ?? []) : [];

  const activeClusterResult = useMemo(() => {
    if (!aiClustering || activeYear == null || activeYearPool.length === 0) return null;
    return clusterPoolSongs(activeYearPool);
  }, [aiClustering, activeYear, activeYearPool]);

  const clusterBySongKey = useMemo(() => {
    const map = new Map<string, SongClusterHint>();
    if (!aiClustering || !data) return map;
    if (activeClusterResult) {
      for (const [key, hint] of activeClusterResult.bySongKey) map.set(key, hint);
    }
    for (const year of data.selectedYears) {
      if (year === activeYear) continue;
      const result = clusterPoolSongs(data.pools[year] ?? []);
      for (const [key, hint] of result.bySongKey) map.set(key, hint);
    }
    return map;
  }, [aiClustering, data, activeYear, activeClusterResult]);

  const clusterLegend = activeClusterResult?.clusters ?? [];

  const poolSongs =
    data && activeYear != null ? (data.unassigned[activeYear] ?? []) : [];

  const poolGroups = useMemo(() => {
    if (!aiClustering || !activeClusterResult) return null;
    return groupPoolByCluster(poolSongs, activeClusterResult);
  }, [aiClustering, activeClusterResult, poolSongs]);

  function clusterHint(key: string): SongClusterHint | null {
    if (!aiClustering) return null;
    return clusterBySongKey.get(key) ?? null;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/show-builder");
      const json = (await res.json()) as ShowBuilderPayload & { error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `Load failed (${res.status})`);
        setData(null);
        return;
      }
      setData(json);
      setActiveYear((prev) => {
        if (prev != null && json.availableYears.includes(prev)) return prev;
        const fromSelected = json.selectedYears.find((y) => json.availableYears.includes(y));
        if (fromSelected != null) return fromSelected;
        return json.availableYears[0] ?? null;
      });
    } catch {
      setError("Failed to load show builder");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/ops/show-builder", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as ShowBuilderPayload & {
      error?: string;
      exportedPath?: string;
    };
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? "Save failed");
    }
    if (json.exportedPath) setNotice(`Saved to ${json.exportedPath}`);
    setData(json);
    setActiveYear((prev) => {
      if (prev != null && json.availableYears.includes(prev)) return prev;
      const fromSelected = json.selectedYears.find((y) => json.availableYears.includes(y));
      return fromSelected ?? json.availableYears[0] ?? null;
    });
  }

  async function run(op: string, body: Record<string, unknown> = {}) {
    setNotice(null);
    try {
      await patch({ op, ...body });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
      void load();
    }
  }

  function setDropHintState(hint: DropHint | null) {
    dropHintRef.current = hint;
    setDropHint(hint);
  }

  function applyAssign(songKey: string, setId: string | null, insertBefore: string | null) {
    setData((prev) => {
      if (!prev) return prev;
      const assignments = { ...prev.assignments };
      const songOrder = { ...prev.songOrder };
      for (const id of Object.keys(songOrder)) songOrder[id] = [...(songOrder[id] ?? [])];
      removeFromAllOrders(songOrder, songKey);
      if (setId == null) delete assignments[songKey];
      else {
        assignments[songKey] = setId;
        songOrder[setId] = insertIntoOrder(songOrder[setId] ?? [], songKey, insertBefore);
      }
      const counts = new Map(prev.sets.map((s) => [s.id, 0]));
      for (const sid of Object.values(assignments)) counts.set(sid, (counts.get(sid) ?? 0) + 1);
      return {
        ...prev,
        assignments,
        songOrder,
        sets: prev.sets.map((s) => ({ ...s, count: counts.get(s.id) ?? 0 })),
        unassigned: Object.fromEntries(
          prev.selectedYears.map((y) => [
            y,
            (prev.pools[y] ?? []).filter((s) => !assignments[s.key]),
          ]),
        ),
      };
    });
  }

  async function assignSong(songKey: string, setId: string | null, insertBefore: string | null) {
    if (!data) return;
    const current = data.assignments[songKey] ?? null;
    if (current === setId && setId == null) return;
    if (current === setId && setId) {
      const prev = data.songOrder[setId] ?? [];
      const next = insertIntoOrder(
        prev.filter((k) => k !== songKey),
        songKey,
        insertBefore,
      );
      if (prev.join("\0") === next.join("\0")) return;
    }
    applyAssign(songKey, setId, insertBefore);
    await run("assign", { songKey, setId, insertBefore });
  }

  function onSongDragStart(e: React.DragEvent, songKey: string) {
    e.dataTransfer.setData(SONG_DRAG, songKey);
    e.dataTransfer.effectAllowed = "move";
  }

  function readSongKey(e: React.DragEvent): string | null {
    return e.dataTransfer.getData(SONG_DRAG).trim() || null;
  }

  function isLeavingDropZone(e: React.DragEvent) {
    const rel = e.relatedTarget as Node | null;
    return !rel || !e.currentTarget.contains(rel);
  }

  function handleSongDrop(e: React.DragEvent, setId: string | null, insertBefore: string | null) {
    e.preventDefault();
    e.stopPropagation();
    setDropHintState(null);
    setDragOverSetId(null);
    setDragOverPool(false);
    const key = readSongKey(e);
    if (key) void assignSong(key, setId, insertBefore);
  }

  function selectYear(year: number) {
    setActiveYear(year);
    if (!data?.selectedYears.includes(year)) {
      void run("setSelectedYears", {
        selectedYears: [...(data?.selectedYears ?? []), year].sort((a, b) => a - b),
      });
    }
  }

  async function reorderFlow(fromIndex: number, toIndex: number) {
    if (!data || fromIndex === toIndex) return;
    const flow = [...data.flow];
    const [item] = flow.splice(fromIndex, 1);
    flow.splice(toIndex, 0, item);
    setData({ ...data, flow });
    const serialized = flow.map((e) =>
      e.type === "set" ? { type: "set", setId: e.setId } : { type: "transition", id: e.id, note: e.note },
    );
    await run("reorderFlow", { flow: serialized });
  }

  function downloadExport() {
    const name = encodeURIComponent(exportName.trim() || "Show");
    window.open(`/api/ops/show-builder?export=1&name=${name}`, "_blank");
  }

  if (loading && !data) return <p className="ops-empty">Loading show builder…</p>;
  if (error && !data) return <p className="ops-empty">{error}</p>;
  if (!data) return null;

  return (
    <div className="ops-show">
      {notice ? (
        <p className="ops-notice" role="status">
          {notice}
        </p>
      ) : null}

      <header className="ops-show__toolbar">
        <div className="ops-show__toolbar-row">
          <div className="ops-show__year-tabs" role="tablist" aria-label="Active year">
            {data.availableYears.map((y) => (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={activeYear === y}
                className={`ops-show__year-tab${activeYear === y ? " ops-show__year-tab--active" : ""}`}
                onClick={() => selectYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
          <label className="ops-show__cluster-toggle">
            <input
              type="checkbox"
              checked={aiClustering}
              onChange={(e) => setAiClustering(e.target.checked)}
            />
            AI Clustering
          </label>
        </div>
        <p className="ops-show__hint">MyLists · {data.myListsPath}</p>
        {aiClustering ? (
          <p className="ops-show__cluster-note">Card colors group similar songs — drag up into sets.</p>
        ) : null}
        {data.availableYears.length === 0 ? (
          <p className="ops-empty">No YYYY.vdjfolder files found in MyLists.</p>
        ) : null}
      </header>

      {activeYear != null ? (
        <>
          <section className="ops-show__sets" aria-label="Show sets">
            <div className="ops-show__sets-head">
              <h2 className="ops-show__panel-title">Sets</h2>
              <div className="ops-show__sets-actions">
                <button
                  type="button"
                  className="ops-show__blank"
                  onClick={() => void run("createSet", { name: "New set" })}
                >
                  + Add set
                </button>
              </div>
            </div>
            <details className="ops-show__templates-drawer">
              <summary>Template library</summary>
              <div className="ops-show__templates">
                {data.templates.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="ops-show__template"
                    onClick={() => void run("createSet", { name })}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </details>
            <div className="ops-show__sets-row">
              {data.sets.map((set) => (
                <SetPile
                  key={set.id}
                  set={set}
                  songs={songsInSet(set.id, catalog, data.assignments, data.songOrder)}
                  dragOver={dragOverSetId === set.id}
                  dropHint={dropHint}
                  clusterHint={clusterHint}
                  onRename={(name) => void run("renameSet", { setId: set.id, name })}
                  onDelete={() => void run("deleteSet", { setId: set.id })}
                  onToggleCollapse={(collapsed) =>
                    void run("toggleCollapse", { setId: set.id, collapsed })
                  }
                  onAddFlow={() => void run("addFlowSet", { setId: set.id })}
                  onDragStart={onSongDragStart}
                  onAssign={(key, before) => void assignSong(key, set.id, before)}
                  onDropHint={setDropHintState}
                  onDragOver={() => setDragOverSetId(set.id)}
                  onDragLeave={(e) => {
                    if (isLeavingDropZone(e)) {
                      setDragOverSetId((prev) => (prev === set.id ? null : prev));
                      if (dropHintRef.current?.setId === set.id) setDropHintState(null);
                    }
                  }}
                  onDrop={(e) => {
                    const hint =
                      dropHintRef.current?.setId === set.id
                        ? dropHintRef.current.beforeKey
                        : null;
                    handleSongDrop(e, set.id, hint);
                  }}
                />
              ))}
            </div>
          </section>

          <section
            className={`ops-show__pool${dragOverPool ? " ops-show__pool--over" : ""}`}
            aria-label={`${activeYear} song pool`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverPool(true);
              setDropHintState(null);
            }}
            onDragLeave={(e) => {
              if (isLeavingDropZone(e)) setDragOverPool(false);
            }}
            onDrop={(e) => handleSongDrop(e, null, null)}
          >
            <h2 className="ops-show__pool-title">
              {activeYear} Song Pool{" "}
              <span className="ops-show__pool-count">{poolSongs.length}</span>
            </h2>
            {aiClustering && clusterLegend.length > 0 ? (
              <ul className="ops-show__cluster-legend" aria-label={`${activeYear} visual clusters`}>
                {clusterLegend.map((c) => (
                  <li key={c.id}>
                    <span className="ops-show__legend-swatch" style={{ background: c.bg }} />
                    <span style={{ color: c.bg }}>{c.name}</span>
                    <span className="ops-show__legend-dash">—</span>
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {poolGroups ? (
              <div className="ops-show__pool-groups">
                {poolGroups.map(({ cluster, songs }) => (
                  <div key={cluster.id} className="ops-show__pool-group">
                    <h3 className="ops-show__pool-group-label" style={{ color: cluster.bg }}>
                      {cluster.name} · {cluster.label}
                    </h3>
                    <div className="ops-show__pool-grid">
                      {songs.map((song) => (
                        <ShowSongChip
                          key={song.key}
                          song={song}
                          variant="pool"
                          cluster={clusterHint(song.key)}
                          onDragStart={onSongDragStart}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ops-show__pool-grid">
                {poolSongs.map((song) => (
                  <ShowSongChip
                    key={song.key}
                    song={song}
                    variant="pool"
                    cluster={clusterHint(song.key)}
                    onDragStart={onSongDragStart}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="ops-show__panel ops-show__panel--flow">
            <div className="ops-show__panel-head">
              <h2 className="ops-show__panel-title">Show flow</h2>
              <button type="button" onClick={() => void run("addTransition", { note: "BTV transition" })}>
                + Transition
              </button>
            </div>
            <ol className="ops-show__flow">
              {data.flow.map((entry, index) => (
                <li key={entry.type === "set" ? `set-${entry.setId}` : `tr-${entry.id}`}>
                  {entry.type === "set" ? (
                    <div
                      className={`ops-show__flow-card${flowDragOver === index ? " ops-show__flow-card--over" : ""}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(FLOW_DRAG, String(index));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setFlowDragOver(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = Number(e.dataTransfer.getData(FLOW_DRAG));
                        setFlowDragOver(null);
                        if (Number.isFinite(from)) void reorderFlow(from, index);
                      }}
                    >
                      <span className="ops-show__flow-label">{entry.name}</span>
                      <button
                        type="button"
                        className="ops-show__flow-remove"
                        onClick={() => void run("removeFlowSet", { setId: entry.setId })}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="ops-show__transition-card">
                      <input
                        className="ops-show__transition-input"
                        value={entry.note}
                        onChange={(e) =>
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  flow: prev.flow.map((f) =>
                                    f.type === "transition" && f.id === entry.id
                                      ? { ...f, note: e.target.value }
                                      : f,
                                  ),
                                }
                              : prev,
                          )
                        }
                        onBlur={(e) =>
                          void run("updateTransition", {
                            transitionId: entry.id,
                            note: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => void run("removeTransition", { transitionId: entry.id })}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {index < data.flow.length - 1 ? (
                    <span className="ops-show__flow-arrow" aria-hidden>
                      ↓
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <section className="ops-show__panel">
            <h2 className="ops-show__panel-title">Export</h2>
            <div className="ops-show__export">
              <input
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                aria-label="Playlist name"
              />
              <button type="button" onClick={downloadExport}>
                Download .vdjplaylist
              </button>
              <button type="button" onClick={() => void run("exportSave", { exportName })}>
                Save to MyLists
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function SetPile(props: {
  set: ShowSet;
  songs: VdjPoolSong[];
  dragOver: boolean;
  dropHint: DropHint | null;
  clusterHint: (key: string) => SongClusterHint | null;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleCollapse: (collapsed: boolean) => void;
  onAddFlow: () => void;
  onDragStart: (e: React.DragEvent, key: string) => void;
  onAssign: (key: string, before: string | null) => void;
  onDropHint: (hint: DropHint | null) => void;
  onDragOver: () => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [name, setName] = useState(props.set.name);
  useEffect(() => setName(props.set.name), [props.set.name]);
  const collapsed = props.set.collapsed;

  return (
    <div
      className={`ops-show__set${props.dragOver ? " ops-show__set--over" : ""}${collapsed ? " ops-show__set--collapsed" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        props.onDragOver();
        if (props.dropHint?.setId !== props.set.id) {
          props.onDropHint({ setId: props.set.id, beforeKey: null });
        }
      }}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
    >
      <div className="ops-show__set-head">
        <input
          className="ops-show__set-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => props.onRename(name)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          onDragStart={(e) => e.preventDefault()}
        />
        <span className="ops-show__set-count" aria-label={`${props.set.count} songs`}>
          ({props.set.count})
        </span>
        <button type="button" className="ops-show__set-action" onClick={props.onAddFlow}>
          Flow
        </button>
        <button type="button" className="ops-show__set-action" onClick={props.onDelete}>
          Delete
        </button>
        <button
          type="button"
          className="ops-show__set-action"
          onClick={() => props.onToggleCollapse(!collapsed)}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {!collapsed ? (
        <div className="ops-show__set-songs">
          {props.songs.map((song) => (
            <ShowSongChip
              key={song.key}
              song={song}
              variant="set"
              cluster={props.clusterHint(song.key)}
              dropBefore={
                props.dropHint?.setId === props.set.id &&
                props.dropHint.beforeKey === song.key
              }
              onDragStart={props.onDragStart}
              onDragOverSong={() =>
                props.onDropHint({ setId: props.set.id, beforeKey: song.key })
              }
              onDropOnSong={(e) => {
                e.stopPropagation();
                const key = e.dataTransfer.getData(SONG_DRAG).trim();
                if (key) props.onAssign(key, song.key);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
