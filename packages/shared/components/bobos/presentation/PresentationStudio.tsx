"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createPresentationAction,
  movePlayheadAction,
  publishPresentationAction,
  saveDraftAction,
} from "@/app/bobos/presentation/actions";
import { BobosPageHeader } from "@/components/bobos/BobosPageHeader";
import { PresentationStage } from "@/components/retroverse-live/PresentationStage";
import { resolvePlayhead, enabledItems, stepIndex } from "@/lib/bobos/presentation/resolve-playhead";
import {
  newPresentationItem,
  type Playhead,
  type PlayheadCommand,
  type PlayheadPayload,
  type Presentation,
  type PresentationItem,
  type PresentationItemType,
} from "@/lib/bobos/presentation/types";

import { PropertiesPanel } from "./PropertiesPanel";
import { QueuePanel } from "./QueuePanel";
import "./presentation-studio.css";

type Props = {
  initialPresentations: Presentation[];
  initialOnAirId: string | null;
  initialPlayhead: PlayheadPayload;
};

type SaveState = "saved" | "dirty" | "saving";

function draftSignature(presentation: Presentation): string {
  return JSON.stringify({
    title: presentation.title,
    description: presentation.description,
    queue: presentation.queue,
  });
}

function freshLocalPlayhead(presentation: Presentation | null): Playhead {
  const now = new Date().toISOString();
  const first = presentation ? enabledItems(presentation.queue)[0] ?? null : null;
  return {
    presentationId: presentation?.id ?? null,
    anchorItemId: first?.id ?? null,
    anchorStartedAt: now,
    mode: "paused",
    movedBy: "manual",
    updatedAt: now,
  };
}

/** Mirror of the server-side transport for the draft-preview playhead. */
function applyLocalCommand(
  playhead: Playhead,
  command: PlayheadCommand,
  presentation: Presentation,
): Playhead {
  const items = enabledItems(presentation.queue);
  const resolved = resolvePlayhead(presentation.queue, playhead);
  const now = new Date().toISOString();

  let anchorItemId = resolved.item?.id ?? null;
  let mode = playhead.mode;

  switch (command.op) {
    case "play":
      mode = "playing";
      break;
    case "pause":
      mode = "paused";
      break;
    case "next":
    case "previous": {
      const target = stepIndex(
        items.length,
        resolved.index,
        command.op === "next" ? 1 : -1,
        presentation.queue.loop,
      );
      if (target !== null) anchorItemId = items[target].id;
      break;
    }
    case "jump": {
      if (items.some((item) => item.id === command.itemId)) {
        anchorItemId = command.itemId;
      }
      break;
    }
  }

  return {
    ...playhead,
    presentationId: presentation.id,
    anchorItemId,
    anchorStartedAt: now,
    mode,
    updatedAt: now,
  };
}

export function PresentationStudio({
  initialPresentations,
  initialOnAirId,
  initialPlayhead,
}: Props) {
  const [presentations, setPresentations] = useState<Presentation[]>(initialPresentations);
  const [activeId, setActiveId] = useState<string | null>(
    initialOnAirId ?? initialPresentations[0]?.id ?? null,
  );
  const [onAirId, setOnAirId] = useState<string | null>(initialOnAirId);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [publishing, setPublishing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const active = presentations.find((p) => p.id === activeId) ?? null;
  const isOnAir = Boolean(active && active.id === onAirId && active.published);

  /* ── Playhead: server truth when on air, local simulation for drafts ── */

  const [serverPlayhead, setServerPlayhead] = useState<PlayheadPayload>(initialPlayhead);
  const [localPlayhead, setLocalPlayhead] = useState<Playhead>(() => freshLocalPlayhead(active));

  // 1s tick so elapsed time and local auto-advance re-resolve while playing.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // On-air presentations follow the real Playhead, same as the public player.
  useEffect(() => {
    if (!isOnAir) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/retroverse-live/playhead", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as PlayheadPayload;
        if (!cancelled) setServerPlayhead(next);
      } catch {
        // transient — next poll recovers
      }
    }
    const id = window.setInterval(poll, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isOnAir]);

  const resolved = useMemo(() => {
    if (isOnAir) {
      return {
        item: serverPlayhead.item,
        index: serverPlayhead.itemIndex,
        count: serverPlayhead.itemCount,
        mode: serverPlayhead.mode,
        elapsedSeconds: serverPlayhead.elapsedSeconds,
      };
    }
    if (!active) {
      return { item: null, index: -1, count: 0, mode: "paused" as const, elapsedSeconds: 0 };
    }
    const local = resolvePlayhead(active.queue, localPlayhead);
    return {
      item: local.item,
      index: local.index,
      count: local.enabledCount,
      mode: localPlayhead.mode,
      elapsedSeconds: local.elapsedSeconds,
    };
    // The tick state above re-runs this memo every second while mounted.
  }, [isOnAir, serverPlayhead, active, localPlayhead]);

  const transport = useCallback(
    async (command: PlayheadCommand) => {
      if (isOnAir) {
        const payload = await movePlayheadAction(command);
        setServerPlayhead(payload);
        return;
      }
      if (!active) return;
      setLocalPlayhead((prev) => applyLocalCommand(prev, command, active));
    },
    [isOnAir, active],
  );

  /* ── Draft editing + autosave ── */

  const savedSignatures = useRef<Map<string, string>>(
    new Map(initialPresentations.map((p) => [p.id, draftSignature(p)])),
  );

  useEffect(() => {
    if (!active) return;
    const signature = draftSignature(active);
    if (savedSignatures.current.get(active.id) === signature) return;

    setSaveState("dirty");
    const presentationId = active.id;
    const patch = { title: active.title, description: active.description, queue: active.queue };
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        await saveDraftAction(presentationId, patch);
        savedSignatures.current.set(presentationId, signature);
        setSaveState("saved");
      } catch {
        setSaveState("dirty");
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [active]);

  const updateActive = useCallback(
    (mutate: (presentation: Presentation) => Presentation) => {
      setPresentations((prev) =>
        prev.map((presentation) =>
          presentation.id === activeId ? mutate(presentation) : presentation,
        ),
      );
    },
    [activeId],
  );

  const updateQueueItems = useCallback(
    (mutate: (items: PresentationItem[]) => PresentationItem[]) => {
      updateActive((presentation) => ({
        ...presentation,
        queue: { ...presentation.queue, items: mutate(presentation.queue.items) },
      }));
    },
    [updateActive],
  );

  /* ── Queue operations ── */

  const addItem = useCallback(
    (type: PresentationItemType) => {
      const item = newPresentationItem(type);
      updateQueueItems((items) => [...items, item]);
      setSelectedItemId(item.id);
    },
    [updateQueueItems],
  );

  const duplicateItem = useCallback(
    (id: string) => {
      updateQueueItems((items) => {
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) return items;
        const copy: PresentationItem = {
          ...structuredClone(items[index]),
          id: crypto.randomUUID(),
          title: `${items[index].title} Copy`,
        };
        const next = [...items];
        next.splice(index + 1, 0, copy);
        setSelectedItemId(copy.id);
        return next;
      });
    },
    [updateQueueItems],
  );

  const deleteItem = useCallback(
    (id: string) => {
      updateQueueItems((items) => items.filter((item) => item.id !== id));
      setSelectedItemId((current) => (current === id ? null : current));
    },
    [updateQueueItems],
  );

  const toggleItem = useCallback(
    (id: string) => {
      updateQueueItems((items) =>
        items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
      );
    },
    [updateQueueItems],
  );

  const reorderItems = useCallback(
    (from: number, to: number) => {
      updateQueueItems((items) => {
        if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
          return items;
        }
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [updateQueueItems],
  );

  const patchItem = useCallback(
    (id: string, patch: Partial<PresentationItem>) => {
      updateQueueItems((items) =>
        items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [updateQueueItems],
  );

  /* ── Presentation lifecycle ── */

  const createNew = useCallback(async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const presentation = await createPresentationAction(title);
      savedSignatures.current.set(presentation.id, draftSignature(presentation));
      setPresentations((prev) => [presentation, ...prev]);
      setActiveId(presentation.id);
      setSelectedItemId(null);
      setLocalPlayhead(freshLocalPlayhead(presentation));
      setNewTitle("");
    } finally {
      setCreating(false);
    }
  }, [newTitle, creating]);

  const publish = useCallback(async () => {
    if (!active || publishing) return;
    setPublishing(true);
    try {
      const patch = { title: active.title, description: active.description, queue: active.queue };
      await saveDraftAction(active.id, patch);
      savedSignatures.current.set(active.id, draftSignature(active));
      setSaveState("saved");

      const published = await publishPresentationAction(active.id);
      if (published) {
        setPresentations((prev) => prev.map((p) => (p.id === published.id ? published : p)));
        setOnAirId(published.id);
        const res = await fetch("/api/retroverse-live/playhead", { cache: "no-store" });
        if (res.ok) setServerPlayhead((await res.json()) as PlayheadPayload);
      }
    } finally {
      setPublishing(false);
    }
  }, [active, publishing]);

  const switchPresentation = useCallback(
    (id: string) => {
      setActiveId(id);
      setSelectedItemId(null);
      const next = presentations.find((p) => p.id === id) ?? null;
      setLocalPlayhead(freshLocalPlayhead(next));
    },
    [presentations],
  );

  /* ── Render ── */

  const selectedItem = active?.queue.items.find((item) => item.id === selectedItemId) ?? null;
  const draftBadge =
    saveState === "saved" ? "Draft Saved" : saveState === "saving" ? "Saving…" : "Unsaved Edits";

  return (
    <main className="bobos-page pst-page">
      <BobosPageHeader
        page="Presentation Studio"
        subtitle="Build the show Retroverse Live plays. The queue owns one Playhead — the audience sees whatever it points at."
        breadcrumb={{ label: "BobOS Cockpit", href: "/bobos" }}
        eventName={active ? active.title : undefined}
        status={isOnAir ? "On Air" : active?.published ? "Published" : active ? "Draft" : undefined}
        statusTone={isOnAir ? "live" : active?.published ? "done" : "planning"}
        actions={
          <span className="pst-switcher">
            {presentations.length > 0 ? (
              <select
                className="pst-switcher__select"
                value={activeId ?? ""}
                onChange={(event) => switchPresentation(event.target.value)}
                aria-label="Presentation"
              >
                {presentations.map((presentation) => (
                  <option key={presentation.id} value={presentation.id}>
                    {presentation.title}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              className="pst-switcher__input"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createNew();
              }}
              placeholder="New presentation title…"
            />
            <button
              type="button"
              className="pst-button"
              onClick={() => void createNew()}
              disabled={!newTitle.trim() || creating}
            >
              {creating ? "Creating…" : "New Presentation"}
            </button>
          </span>
        }
      />

      {!active ? (
        <section className="pst-empty">
          <h2 className="pst-empty__title">No presentations yet</h2>
          <p className="pst-empty__copy">
            Name your first presentation above and press New Presentation. Then add items to the
            queue — slides, artists, songs, countdowns — and publish it to Retroverse Live.
          </p>
        </section>
      ) : (
        <>
          <div className="pst-columns">
            <QueuePanel
              items={active.queue.items}
              selectedId={selectedItemId}
              currentItemId={resolved.item?.id ?? null}
              onSelect={setSelectedItemId}
              onToggle={toggleItem}
              onDuplicate={duplicateItem}
              onDelete={deleteItem}
              onReorder={reorderItems}
              onAdd={addItem}
              onJump={(id) => void transport({ op: "jump", itemId: id })}
            />

            <section className="pst-preview" aria-label="Live preview">
              <div className="pst-preview__stage">
                <PresentationStage item={resolved.item} />
              </div>
              <div className="pst-transport">
                <button
                  type="button"
                  className="pst-transport__button"
                  onClick={() => void transport({ op: "previous" })}
                  aria-label="Previous item"
                >
                  ⏮ Prev
                </button>
                <button
                  type="button"
                  className="pst-transport__button pst-transport__button--primary"
                  onClick={() =>
                    void transport({ op: resolved.mode === "playing" ? "pause" : "play" })
                  }
                >
                  {resolved.mode === "playing" ? "⏸ Pause" : "▶ Play"}
                </button>
                <button
                  type="button"
                  className="pst-transport__button"
                  onClick={() => void transport({ op: "next" })}
                  aria-label="Next item"
                >
                  Next ⏭
                </button>
                <p className="pst-transport__status">
                  {resolved.count === 0
                    ? "Queue is empty"
                    : `Item ${resolved.index + 1} of ${resolved.count} · ${
                        resolved.mode === "playing"
                          ? `Playing · ${resolved.elapsedSeconds}s`
                          : "Paused"
                      }`}
                  {isOnAir ? " · ON AIR" : " · Draft preview"}
                </p>
              </div>
            </section>

            <PropertiesPanel
              item={selectedItem}
              onPatch={(patch) => {
                if (selectedItem) patchItem(selectedItem.id, patch);
              }}
              presentation={active}
              onMetaPatch={(patch) =>
                updateActive((presentation) => ({
                  ...presentation,
                  title: patch.title ?? presentation.title,
                  description: patch.description ?? presentation.description,
                  queue: {
                    ...presentation.queue,
                    loop: patch.loop ?? presentation.queue.loop,
                  },
                }))
              }
            />
          </div>

          <footer className="pst-publish-bar">
            <div className="pst-publish-bar__status">
              <span
                className={`bobos-badge ${saveState === "saved" ? "bobos-badge--neutral" : "bobos-badge--planning"}`}
              >
                {draftBadge}
              </span>
              {active.published ? (
                <span className={`bobos-badge ${isOnAir ? "bobos-badge--live" : "bobos-badge--neutral"}`}>
                  {isOnAir ? "On Air" : "Published"} ·{" "}
                  {new Date(active.published.publishedAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                <span className="bobos-badge bobos-badge--neutral">Never Published</span>
              )}
            </div>
            <div className="pst-publish-bar__actions">
              <a
                className="pst-button"
                href="/retroverse-live"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Retroverse Live ↗
              </a>
              <button
                type="button"
                className="pst-button pst-button--primary"
                onClick={() => void publish()}
                disabled={publishing}
              >
                {publishing ? "Publishing…" : "Publish to Retroverse Live"}
              </button>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
