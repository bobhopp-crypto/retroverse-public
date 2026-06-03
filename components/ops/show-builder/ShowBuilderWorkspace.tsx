"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ShowSongChip } from "@/components/ops/show-builder/ShowSongChip";
import { songsInSet } from "@/lib/ops/show-builder/order";
import { insertIntoOrder, removeFromAllOrders } from "@/lib/ops/show-builder/order";
import { clusterPoolSongs } from "@/lib/ops/show-builder/visual-clustering";
import type { SongClusterHint } from "@/lib/ops/show-builder/visual-clustering";
import type {
  FlowEntry,
  ShowBuilderPayload,
  ShowSet,
  VdjPoolSong,
} from "@/lib/ops/show-builder/types";

const SONG_DRAG = "application/x-retroverse-show-song";
const FLOW_DRAG = "application/x-retroverse-show-flow-index";

type DropHint = { setId: string; beforeKey: string | null };

export function ShowBuilderWorkspace() {
  const [data, setData] = useState<ShowBuilderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const dropHintRef = useRef<DropHint | null>(null);
  const [flowDragOver, setFlowDragOver] = useState<number | null>(null);
  const [exportName, setExportName] = useState("Sunday Night Show");
  const [aiClustering, setAiClustering] = useState(false);

  const { clusterBySongKey, clusterLegendByYear } = useMemo(() => {
    const clusterBySongKey = new Map<string, SongClusterHint>();
    const clusterLegendByYear = new Map<
      number,
      ReturnType<typeof clusterPoolSongs>["clusters"]
    >();
    if (!aiClustering || !data) return { clusterBySongKey, clusterLegendByYear };
    for (const year of data.selectedYears) {
      const result = clusterPoolSongs(data.pools[year] ?? []);
      clusterLegendByYear.set(year, result.clusters);
      for (const [key, hint] of result.bySongKey) clusterBySongKey.set(key, hint);
    }
    return { clusterBySongKey, clusterLegendByYear };
  }, [aiClustering, data]);

  function clusterHint(key: string): SongClusterHint | null {
    if (!aiClustering) return null;
    return clusterBySongKey.get(key) ?? null;
  }

  const catalog = useMemo(() => {
    const map = new Map<string, VdjPoolSong>();
    if (!data) return map;
    for (const list of Object.values(data.pools)) {
      for (const s of list) map.set(s.key, s);
    }
    return map;
  }, [data]);

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
      setSelectedSetId((prev) =>
        prev && json.sets.some((s) => s.id === prev) ? prev : (json.sets[0]?.id ?? null),
      );
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
    setSelectedSetId((prev) =>
      prev && json.sets.some((s) => s.id === prev) ? prev : (json.sets[0]?.id ?? null),
    );
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

  function handleSongDrop(e: React.DragEvent, setId: string | null, insertBefore: string | null) {
    e.preventDefault();
    e.stopPropagation();
    setDropHintState(null);
    const key = readSongKey(e);
    if (key) void assignSong(key, setId, insertBefore);
  }

  function toggleYear(year: number) {
    if (!data) return;
    const selected = new Set(data.selectedYears);
    if (selected.has(year)) selected.delete(year);
    else selected.add(year);
    void run("setSelectedYears", { selectedYears: [...selected].sort((a, b) => a - b) });
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

  const selectedSet = data?.sets.find((s) => s.id === selectedSetId) ?? null;
  const selectedSongs =
    data && selectedSetId
      ? songsInSet(selectedSetId, catalog, data.assignments, data.songOrder)
      : [];

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

      <section className="ops-show__panel ops-show__panel--years">
        <h2 className="ops-show__panel-title">Year folders</h2>
        <p className="ops-show__hint">From {data.myListsPath}</p>
        <div className="ops-show__year-checks">
          {data.availableYears.map((y) => (
            <label key={y} className="ops-show__year-check">
              <input
                type="checkbox"
                checked={data.selectedYears.includes(y)}
                onChange={() => toggleYear(y)}
              />
              {y}
            </label>
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
        {aiClustering ? (
          <p className="ops-show__cluster-note">
            Colored dots are visual hints only — not tags, not sets, not saved.
          </p>
        ) : null}
        {data.availableYears.length === 0 ? (
          <p className="ops-empty">No YYYY.vdjfolder files found in MyLists.</p>
        ) : null}
      </section>

      {data.selectedYears.length > 0 ? (
        <>
          <section className="ops-show__pools">
            {data.selectedYears.map((y) => (
              <div
                key={y}
                className="ops-show__pool-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleSongDrop(e, null, null)}
              >
                <h3 className="ops-show__pool-title">
                  {y} Songs <span>({(data.unassigned[y] ?? []).length})</span>
                </h3>
                {aiClustering ? (
                  <ul className="ops-show__cluster-legend" aria-label={`${y} visual clusters`}>
                    {(clusterLegendByYear.get(y) ?? []).map((c) => (
                      <li key={c.id} style={{ color: c.color }}>
                        {c.glyph} {c.label} <span>({c.count})</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="ops-show__chips">
                  {(data.unassigned[y] ?? []).map((song) => (
                    <ShowSongChip
                      key={song.key}
                      song={song}
                      cluster={clusterHint(song.key)}
                      onDragStart={onSongDragStart}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <div className="ops-show__work">
            <section className="ops-show__panel">
              <div className="ops-show__panel-head">
                <h2 className="ops-show__panel-title">Sets</h2>
                <button type="button" className="ops-show__blank" onClick={() => void run("createSet", { name: "New set" })}>
                  + Add set
                </button>
              </div>
              <details className="ops-show__templates-drawer" open>
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
              <div className="ops-show__sets-grid">
                {data.sets.map((set) => (
                  <SetColumn
                    key={set.id}
                    set={set}
                    songs={songsInSet(set.id, catalog, data.assignments, data.songOrder)}
                    active={selectedSetId === set.id}
                    dropHint={dropHint}
                    onSelect={() => setSelectedSetId(set.id)}
                    onRename={(name) => void run("renameSet", { setId: set.id, name })}
                    onDelete={() => void run("deleteSet", { setId: set.id })}
                    onToggleCollapse={(collapsed) =>
                      void run("toggleCollapse", { setId: set.id, collapsed })
                    }
                    onAddFlow={() => void run("addFlowSet", { setId: set.id })}
                    onDragStart={onSongDragStart}
                    onAssign={(key, before) => void assignSong(key, set.id, before)}
                    onDropHint={setDropHintState}
                    onDropToPool={(e) => handleSongDrop(e, null, null)}
                    onDropAppend={(e) => {
                      const hint =
                        dropHintRef.current?.setId === set.id
                          ? dropHintRef.current.beforeKey
                          : null;
                      handleSongDrop(e, set.id, hint);
                    }}
                    clusterHint={clusterHint}
                  />
                ))}
              </div>
            </section>

            {selectedSet ? (
              <section className="ops-show__panel">
                <h2 className="ops-show__panel-title">Editing · {selectedSet.name}</h2>
                <div
                  className="ops-show__set-songs"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (selectedSetId) setDropHintState({ setId: selectedSetId, beforeKey: null });
                  }}
                  onDrop={(e) => {
                    const hint =
                      dropHintRef.current?.setId === selectedSetId
                        ? dropHintRef.current.beforeKey
                        : null;
                    handleSongDrop(e, selectedSetId, hint);
                  }}
                >
                  {selectedSongs.map((song) => (
                    <ShowSongChip
                      key={song.key}
                      song={song}
                      compact
                      cluster={clusterHint(song.key)}
                      dropBefore={
                        dropHint?.setId === selectedSetId && dropHint.beforeKey === song.key
                      }
                      onDragStart={onSongDragStart}
                      onDragOverSong={() =>
                        setDropHintState({ setId: selectedSetId!, beforeKey: song.key })
                      }
                      onDropOnSong={(e) => handleSongDrop(e, selectedSetId, song.key)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

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
                <button
                  type="button"
                  onClick={() => void run("exportSave", { exportName })}
                >
                  Save to MyLists
                </button>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SetColumn(props: {
  set: ShowSet;
  songs: VdjPoolSong[];
  active: boolean;
  dropHint: DropHint | null;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleCollapse: (collapsed: boolean) => void;
  onAddFlow: () => void;
  onDragStart: (e: React.DragEvent, key: string) => void;
  onAssign: (key: string, before: string | null) => void;
  onDropHint: (hint: DropHint | null) => void;
  onDropToPool: (e: React.DragEvent) => void;
  onDropAppend: (e: React.DragEvent) => void;
  clusterHint: (key: string) => SongClusterHint | null;
}) {
  const [name, setName] = useState(props.set.name);
  useEffect(() => setName(props.set.name), [props.set.name]);

  return (
    <div
      className={`ops-show__set-col${props.active ? " ops-show__set-col--active" : ""}`}
      onClick={props.onSelect}
      onDragOver={(e) => e.preventDefault()}
      onDrop={props.onDropAppend}
    >
      <div className="ops-show__set-col-head" onClick={(e) => e.stopPropagation()}>
        <input
          className="ops-show__set-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => props.onRename(name)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <span className="ops-show__set-count">{props.set.count}</span>
        <button type="button" onClick={() => props.onToggleCollapse(!props.set.collapsed)}>
          {props.set.collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      <div className="ops-show__set-col-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={props.onAddFlow}>
          + Flow
        </button>
        <button type="button" onClick={props.onDelete}>
          Delete
        </button>
      </div>
      {!props.set.collapsed ? (
        <div className="ops-show__set-col-songs">
          {props.songs.map((song) => (
            <ShowSongChip
              key={song.key}
              song={song}
              compact
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
