"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type DragEvent } from "react";

import { PresentationStage } from "@/components/retroverse-live/PresentationStage";
import { currentExperienceStageKey } from "@/lib/bobos/experience-selector/current-experience";
import type { Experience, ExperienceId } from "@/lib/bobos/experience-selector/types";
import { EXPERIENCE_NAMES } from "@/lib/bobos/experience-selector/types";
import type { PlayheadPayload } from "@/lib/bobos/presentation/types";
import { listMixerCollection, listMixerCollectionsAction, listRvbaTemplates } from "@/app/bobos/broadcast/actions";
import { addAssetToDeck, getMixerStateForProgram, getProgramTransportState, removeDeckEntry, reorderProgramEntry, updateProgramEntry, saveProgramPlaylist, loadProgramPlaylist, playDeck, pauseDeck, stopProgramDeck, setDeckPlaybackMode } from "@/app/bobos/broadcast/actions";
import type { MixerCollectionItem } from "@/lib/bobos/mixer/collections";
import type { AssetReference } from "@/lib/bobos/mixer/types";
import type { DeckPlaylistEntry } from "@/lib/bobos/mixer/types";

import "./experience-selector.css";

type SelectorResponse = {
  ok: boolean;
  selectedId?: ExperienceId;
  experience?: Experience;
  experiences?: Experience[];
  currentExperience?: PlayheadPayload;
  error?: string;
};

const POLL_MS = 2000;

/** Visible operator inputs — one output, two possible inputs. */
const INPUT_ORDER: ExperienceId[] = ["program", "virtualdj"];

/** Operator-facing labels — UI only; ids and pipeline unchanged. */
const INPUT_LABELS: Record<ExperienceId, string> = {
  program: "Program",
  virtualdj: "VirtualDJ",
  announcement: "AUX 1",
  giveaway: "AUX 2",
};

function inputStatus(experience: Experience, live: boolean): string {
  if (live) return "Connected to output";
  if (experience.available) return "Available";
  return "Unavailable";
}

function InputSelector({
  experience,
  displayName,
  selected,
  busy,
  currentExperience,
  onSelect,
}: {
  experience: Experience;
  displayName: string;
  selected: boolean;
  busy: boolean;
  currentExperience: PlayheadPayload | null;
  onSelect: (id: ExperienceId) => void;
}) {
  const rvba = selected ? currentExperience?.rvba ?? null : experience.payload.rvba;
  const broadcast = selected
    ? currentExperience?.broadcast ?? null
    : experience.payload.broadcast;
  const stageKey = selected && currentExperience
    ? currentExperienceStageKey(currentExperience)
      : [
        experience.id,
        rvba?.id ?? "off",
        rvba?.link?.id ?? "",
        rvba?.title ?? "",
        rvba?.subtitle ?? "",
      ].join("|");

  return (
    <button
      type="button"
      className="xs-input"
      data-selected={selected ? "yes" : "no"}
      data-available={experience.available ? "yes" : "no"}
      data-live={selected ? "yes" : "no"}
      disabled={!experience.available || busy || selected}
      onClick={() => onSelect(experience.id)}
      aria-pressed={selected}
      aria-label={`${displayName}${
        selected ? ", live on retroverse.live" : experience.available ? "" : ", unavailable"
      }`}
    >
      <span className="xs-input__head">
        <span className="xs-input__name">{displayName}</span>
        {selected ? (
          <span className="xs-input__live">
            <span className="xs-input__live-dot" aria-hidden />
            LIVE
          </span>
        ) : null}
      </span>
      <span className="xs-input__preview">
        {selected ? <span className="xs-input__route">ON AIR → retroverse.live</span> : null}
        <PresentationStage
          key={stageKey}
          rvba={rvba}
          broadcast={broadcast}
          offAirTitle={
            experience.id === "virtualdj"
              ? "No VirtualDJ Source"
              : experience.id === "program"
                ? "Empty Program · Drag assets here"
              : experience.available
                ? "Ready"
                : "Unavailable"
          }
        />
      </span>
      <span className="xs-input__status">{inputStatus(experience, selected)}</span>
    </button>
  );
}

function OutputMonitor({ currentExperience }: { currentExperience: PlayheadPayload | null }) {
  return (
    <section className="xs-output-monitor" aria-label="Output audience monitor">
      <span className="xs-output-monitor__head">
        <span className="xs-output-monitor__name">Output</span>
        <span className="xs-output-monitor__destination">retroverse.live</span>
      </span>
      <span className="xs-output-monitor__preview">
        <PresentationStage
          key={currentExperience ? currentExperienceStageKey(currentExperience) : "output-empty"}
          rvba={currentExperience?.rvba ?? null}
          broadcast={currentExperience?.broadcast ?? null}
          offAirTitle="retroverse.live"
        />
      </span>
      <span className="xs-output-monitor__status">Audience view</span>
    </section>
  );
}

function ProgramQueue({ experience, currentExperience, items: providedItems, onDropAsset, onMoveItem, onDurationChange, onRemoveItem, globalDuration, activeItemId, remainingSeconds }: {
  experience: Experience;
  currentExperience: PlayheadPayload | null;
  items?: NonNullable<Experience["queue"]>["items"];
  onDropAsset?: (event: DragEvent<HTMLDivElement>) => void;
  onMoveItem?: (from: number, to: number) => void;
  onDurationChange?: (id: string, seconds: number) => void;
  onRemoveItem?: (id: string) => void;
  globalDuration?: number | null;
  activeItemId?: string | null;
  remainingSeconds?: number;
}) {
  const queue = experience.queue;
  const items = providedItems ?? queue?.items ?? [];
  if (!items.length) {
    return <span className="xs-workspace__hint">Program queue unavailable</span>;
  }

  return (
    <div className="xs-program-queue" aria-label="Program queue" onDragOver={(event) => event.preventDefault()} onDrop={onDropAsset}>
      {items.map((item, index) => {
        const current = activeItemId != null ? activeItemId === item.id : currentExperience?.item?.link?.id === item.link?.id;
        return (
          <div className="xs-program-queue__item" data-program-index={index} data-current={current ? "yes" : "no"} key={item.id} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-program-index", String(index)); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const raw = event.dataTransfer.getData("application/x-program-index"); if (!raw) return; event.stopPropagation(); const from = Number(raw); if (Number.isInteger(from)) onMoveItem?.(from, index); }}>
            <span className="xs-program-queue__index">{index + 1}</span>
            <span className="xs-program-queue__copy">
              <span className="xs-program-queue__title">{item.title}</span>
              <span className="xs-program-queue__artist">{item.subtitle}</span>
            </span>
            <label className="xs-program-queue__duration" onClick={(event) => event.stopPropagation()}>
              <span>TIME</span>
              <button type="button" aria-label={`Decrease duration for ${item.title}`} onClick={() => onDurationChange?.(item.id, Math.max(0, item.durationSeconds - 5))}>−</button>
              <input aria-label={`Duration for ${item.title}`} type="number" min="0" step="5" value={globalDuration ?? item.durationSeconds} disabled={globalDuration != null} onChange={(event) => onDurationChange?.(item.id, Math.max(0, Number(event.target.value) || 0))} />
              <button type="button" aria-label={`Increase duration for ${item.title}`} onClick={() => onDurationChange?.(item.id, item.durationSeconds + 5)}>＋</button>
              <span>s</span>
              {current && activeItemId != null ? <span className="xs-program-queue__remaining">{remainingSeconds}s left</span> : null}
              <button type="button" className="xs-program-queue__remove" aria-label={`Remove ${item.title}`} onClick={() => onRemoveItem?.(item.id)}>×</button>
            </label>
          </div>
        );
      })}
    </div>
  );
}

function deckEntryToProgramItem(entry: DeckPlaylistEntry): NonNullable<Experience["queue"]>["items"][number] {
  return {
    id: entry.entryId,
    type: entry.kind === "track" ? "song" : "slide",
    title: entry.title,
    subtitle: entry.subtitle,
    body: "",
    enabled: true,
    durationSeconds: entry.durationSeconds ?? 20,
    transition: "cut",
    trigger: "automatic",
    link: entry.kind === "track" ? { kind: "song", id: entry.assetId, label: entry.title } : null,
    countdownTarget: null,
    notes: "",
    mediaUrl: entry.coverUrl,
    mediaWidth: null,
    mediaHeight: null,
  };
}

export function ExperienceSelector() {
  const [selectedId, setSelectedId] = useState<ExperienceId>("program");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [currentExperience, setCurrentExperience] = useState<PlayheadPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [browserItems, setBrowserItems] = useState<(AssetReference | MixerCollectionItem)[]>([]);
  const [browserFilter, setBrowserFilter] = useState("all");
  const [programItems, setProgramItems] = useState<NonNullable<Experience["queue"]>["items"]>([]);
  const [globalDuration, setGlobalDuration] = useState<number | null>(null);
  const [playlistName, setPlaylistName] = useState("Program");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [loopProgram, setLoopProgram] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function pollProgram() {
      try {
        const state = await getProgramTransportState();
        if (cancelled) return;
        setProgramItems(state.mixer.left.playlist.map(deckEntryToProgramItem));
        setActiveItemId(state.activeItemId);
        setRemainingSeconds(state.remainingSeconds);
        setLoopProgram(state.mixer.left.playbackMode === "loop");
      } catch { /* next poll recovers */ }
    }
    void pollProgram();
    const timer = window.setInterval(pollProgram, 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const applySnapshot = useCallback((body: SelectorResponse) => {
    if (!body.ok || !body.experiences || !body.selectedId || !body.currentExperience) return;
    setSelectedId(body.selectedId);
    setExperiences(body.experiences);
    setCurrentExperience(body.currentExperience);
    const program = body.experiences.find((experience) => experience.id === "program");
    if (program?.queue?.items.length) setProgramItems((previous) => previous.length ? previous : program.queue!.items);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function pollSelector() {
      try {
        const res = await fetch("/api/bobos/experience-selector", { cache: "no-store" });
        const body = (await res.json()) as SelectorResponse;
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setError(body.error || `Selector failed (${res.status})`);
          return;
        }
        setError(null);
        applySnapshot(body);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void pollSelector();
    const selectorTimer = window.setInterval(pollSelector, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(selectorTimer);
    };
  }, [applySnapshot]);

  useEffect(() => {
    void getMixerStateForProgram().then((mixer) => {
      if (mixer.left.playlist.length) setProgramItems(mixer.left.playlist.map(deckEntryToProgramItem));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadBrowser() {
      try {
        const [collections, templates] = await Promise.all([listMixerCollectionsAction(), listRvbaTemplates()]);
        const imported = collections.filter((collection) => !["recent", "favorites"].includes(collection.id));
        const groups = await Promise.all(imported.map((collection) => listMixerCollection(collection.id)));
        if (!cancelled) setBrowserItems([...templates, ...groups.flat()].slice(0, 48));
      } catch {
        if (!cancelled) setBrowserItems([]);
      }
    }
    void loadBrowser();
    return () => { cancelled = true; };
  }, []);

  async function select(id: ExperienceId) {
    if (busy || id === selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bobos/experience-selector", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = (await res.json()) as SelectorResponse;
      if (!res.ok || !body.ok) {
        setError(body.error || `Could not select ${id}`);
        return;
      }
      applySnapshot(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function addAssetToProgram(asset: AssetReference | MixerCollectionItem, atIndex?: number) {
    const mixer = await addAssetToDeck("left", {
      assetId: asset.assetId,
      kind: asset.kind as AssetReference["kind"],
      title: asset.title,
      subtitle: asset.subtitle || asset.kind,
      coverUrl: asset.coverUrl ?? null,
    }, atIndex);
    setProgramItems(mixer.left.playlist.map(deckEntryToProgramItem));
  }

  function handleTimelineDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const assetId = event.dataTransfer.getData("application/x-mixer-asset");
    const asset = browserItems.find((candidate) => candidate.assetId === assetId);
    if (asset) {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-program-index]");
      const index = target ? Number(target.dataset.programIndex) : undefined;
      void addAssetToProgram(asset, Number.isInteger(index) ? index : undefined);
    }
  }

  function moveProgramItem(from: number, to: number) {
    if (from === to) return;
    const item = programItems[from];
    if (item) void reorderProgramEntry(item.id, to).then((mixer) => setProgramItems(mixer.left.playlist.map(deckEntryToProgramItem)));
  }

  function removeProgramItem(id: string) {
    void removeDeckEntry("left", id).then((mixer) => setProgramItems(mixer.left.playlist.map(deckEntryToProgramItem)));
  }

  const byId = new Map(experiences.map((e) => [e.id, e]));
  const assetOccurrences = new Map<string, number>();
  const visibleBrowserItems = browserItems.map((asset) => {
    const identity = `${asset.kind}:${asset.assetId}:${"collectionId" in asset ? asset.collectionId ?? "catalog" : "catalog"}:${"loadKey" in asset ? asset.loadKey ?? asset.assetId : asset.assetId}`;
    const occurrence = assetOccurrences.get(identity) ?? 0;
    assetOccurrences.set(identity, occurrence + 1);
    return { asset, instanceKey: `${identity}:${occurrence}` };
  }).filter(({ asset }) => browserFilter === "all" || (browserFilter === "track" && asset.kind === "track") || (browserFilter === "broadcast" && asset.kind === "broadcast"));

  function experienceFor(id: ExperienceId): Experience {
    return (
      byId.get(id) ?? {
        id,
        name: EXPERIENCE_NAMES[id],
        available: false,
        payload: { rvba: null, broadcast: null },
      }
    );
  }

  return (
    <div className="xs-root">
      <header className="xs-chrome">
        <div className="xs-chrome__brand">
          <p className="xs-chrome__kicker">RV 01-03 · BobOS</p>
          <h1 className="xs-chrome__title">Broadcast Mixer</h1>
        </div>
        <Link href="/bobos" className="xs-chrome__back">
          ← Cockpit
        </Link>
      </header>

      <div className="xs-desk">
        <div className="xs-routing">
          {error ? <p className="xs-output__error">{error}</p> : null}

          <section className="xs-inputs" aria-label="Input selectors">
            {INPUT_ORDER.slice(0, 1).map((id) => <InputSelector key={id} experience={experienceFor(id)} displayName={INPUT_LABELS[id]} selected={selectedId === id} busy={busy} currentExperience={currentExperience} onSelect={select} />)}
            <OutputMonitor currentExperience={currentExperience} />
            {INPUT_ORDER.slice(1).map((id) => <InputSelector key={id} experience={experienceFor(id)} displayName={INPUT_LABELS[id]} selected={selectedId === id} busy={busy} currentExperience={currentExperience} onSelect={select} />)}
          </section>
        </div>

        <section className="xs-workspace" aria-label="Program timeline">
          <div className="xs-workspace__panel xs-workspace__timeline" data-input="program">
            <div className="xs-workspace__timeline-head">
              <span className="xs-workspace__title">Program Timeline</span>
              <div className="xs-transport" aria-label="Program transport">
                <button type="button" onClick={() => void playDeck("left")}>▶ Play</button>
                <button type="button" onClick={() => void pauseDeck("left")}>❚❚ Pause</button>
                <button type="button" onClick={() => void stopProgramDeck()}>■ Stop</button>
                <button type="button" data-active={loopProgram ? "yes" : "no"} onClick={() => void setDeckPlaybackMode("left", loopProgram ? "auto" : "loop")}>⟲ Loop</button>
              </div>
              <span className="xs-workspace__slot-label">One editable playlist · drag, drop, reorder</span>
              <label className="xs-playlist-name">PLAYLIST <input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} /></label>
              <button type="button" className="xs-playlist-button" onClick={() => void saveProgramPlaylist(playlistName)}>SAVE</button>
              <button type="button" className="xs-playlist-button" onClick={() => void loadProgramPlaylist(playlistName).then((mixer) => setProgramItems(mixer.left.playlist.map(deckEntryToProgramItem)))}>LOAD</button>
            </div>
            <ProgramQueue
              experience={experienceFor("program")}
              currentExperience={currentExperience}
              items={programItems}
              onDropAsset={handleTimelineDrop}
              onMoveItem={moveProgramItem}
              onRemoveItem={removeProgramItem}
              onDurationChange={(id, seconds) => void updateProgramEntry(id, { durationSeconds: seconds }).then((mixer) => setProgramItems(mixer.left.playlist.map(deckEntryToProgramItem)))}
              activeItemId={activeItemId}
              remainingSeconds={remainingSeconds ?? undefined}
              globalDuration={globalDuration}
            />
          </div>
        </section>

        <section className="xs-browser" aria-label="Asset Browser">
          <div className="xs-browser__side">
            <span className="xs-browser__heading">Asset Browser</span>
            {["all", "track", "broadcast", "image", "video", "playlist"].map((filter) => (
              <button key={filter} type="button" data-active={browserFilter === filter ? "yes" : "no"} onClick={() => setBrowserFilter(filter)}>
                {filter === "all" ? "All Assets" : filter === "track" ? "Songs" : filter === "broadcast" ? "Experiences" : filter === "playlist" ? "Playlists" : `${filter[0].toUpperCase()}${filter.slice(1)}s`}
              </button>
            ))}
          </div>
          <div className="xs-browser__main">
            <div className="xs-browser__toolbar">
              <span className="xs-browser__title">Assets</span>
              <button type="button" className="xs-browser__import" disabled>＋ Import Playlist</button>
            </div>
            <div className="xs-browser__grid">
              {visibleBrowserItems.map(({ asset, instanceKey }) => (
                <article className="xs-browser__card" key={instanceKey} draggable onClick={() => addAssetToProgram(asset)} onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-mixer-asset", asset.assetId); event.dataTransfer.setData("text/plain", asset.assetId); }} title="Click to add to Program, or drag to the timeline">
                  <div className="xs-browser__thumb" style={asset.coverUrl ? { backgroundImage: `url(${asset.coverUrl})` } : undefined} />
                  <div className="xs-browser__copy"><strong>{asset.title}</strong><span>{asset.subtitle || asset.kind}</span></div>
                </article>
              ))}
              {!browserItems.length ? <span className="xs-browser__empty">Asset browser ready</span> : null}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
