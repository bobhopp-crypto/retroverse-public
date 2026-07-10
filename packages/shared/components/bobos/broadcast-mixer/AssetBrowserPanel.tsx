"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  getVdjLiveAsset,
  importBroadcastCollectionAction,
  listMixerCollection,
  listMixerCollectionsAction,
  listRvbaTemplates,
  searchMixerAssets,
} from "@/app/bobos/broadcast/actions";
import type { MixerCollectionItem } from "@/lib/bobos/mixer/collections";
import {
  ASSET_KIND_DEFAULT_DURATION,
  ASSET_KIND_LABELS,
  type AssetKind,
  type AssetReference,
  type DeckId,
} from "@/lib/bobos/mixer/types";

import { SequenceEditorPanel } from "./SequenceEditorPanel";

type SearchableAssetKind = Extract<AssetKind, "track" | "album" | "artist" | "year">;
const SEARCHABLE_KINDS: SearchableAssetKind[] = ["track", "album", "artist", "year"];

type FilterId = "all" | AssetKind | "favorites";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "track", label: "Songs RVTR" },
  { id: "album", label: "Albums RVAL" },
  { id: "artist", label: "Artists RVAR" },
  { id: "week", label: "Weeks RVWK" },
  { id: "year", label: "Years RVYR" },
  { id: "event", label: "Events RVEV" },
  { id: "broadcast", label: "Broadcast RVBA" },
  { id: "favorites", label: "★ Favorites" },
];

/** "all" is a sentinel meaning search mode, not a real collection id. */
const SIDEBAR_TOP: { id: string; title: string }[] = [
  { id: "all", title: "All Assets" },
  { id: "recent", title: "Recent" },
  { id: "favorites", title: "Favorites" },
];

type SidebarCollection = { id: string; title: string; imported: boolean };

type Props = {
  activeDeckId: DeckId;
  onSetActiveDeck: (deckId: DeckId) => void;
  onAppendToDeck: (deckId: DeckId, asset: AssetReference) => void;
  onOpenCollectionItem: (deckId: DeckId, item: MixerCollectionItem, sourceCollectionId?: string | null) => void;
};

function isSearchableKind(kind: FilterId): kind is SearchableAssetKind {
  return (SEARCHABLE_KINDS as FilterId[]).includes(kind);
}

function formatDuration(asset: AssetReference): string {
  if (asset.kind === "track" || asset.kind === "vdj-live") return "Full song";
  const seconds = ASSET_KIND_DEFAULT_DURATION[asset.kind];
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function AssetCard({
  asset,
  selected,
  onSelect,
  onOpen,
}: {
  asset: AssetReference;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <li
      className={`bmx-card${selected ? " bmx-card--selected" : ""}`}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/json", JSON.stringify(asset));
      }}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
        else if (event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="bmx-card__art">
        {asset.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ops-tool thumbnail, not the public site
          <img src={asset.coverUrl} alt="" />
        ) : (
          <span className="bmx-card__art-fallback">{ASSET_KIND_LABELS[asset.kind]}</span>
        )}
      </div>
      <span className="bmx-card__id">{asset.assetId}</span>
      <span className="bmx-card__title">{asset.title}</span>
      <span className="bmx-card__subtitle">
        {asset.subtitle || `${ASSET_KIND_LABELS[asset.kind]} · ${formatDuration(asset)}`}
      </span>
    </li>
  );
}

function ImportCollectionForm({ onImported }: { onImported: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!title.trim()) {
      setError("Enter a collection title.");
      return;
    }
    if (!file) {
      setError("Choose a .zip file.");
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("file", file);
      const result = await importBroadcastCollectionAction(formData);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
      onImported(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="bmx-sidebar-item" onClick={() => setOpen(true)}>
        + Import Collection
      </button>
    );
  }

  return (
    <form className="bmx-import" onSubmit={handleSubmit}>
      <input
        type="text"
        className="bmx-import__input"
        placeholder="Collection title (e.g. Live Aid 1985)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={busy}
      />
      <div className="bmx-import__row">
        <input ref={fileRef} type="file" accept=".zip" disabled={busy} />
        <button type="submit" className="bmx-btn bmx-btn--primary bmx-btn--small" disabled={busy}>
          {busy ? "Importing…" : "Import"}
        </button>
        <button
          type="button"
          className="bmx-btn bmx-btn--small"
          onClick={() => setOpen(false)}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
      <p className="bmx-seq-editor__hint">
        ZIP of PNG/JPG slides (e.g. a Gamma export). PDF/PowerPoint import coming soon.
      </p>
      {error ? <span className="bmx-import__error">{error}</span> : null}
    </form>
  );
}

export function AssetBrowserPanel({
  activeDeckId,
  onSetActiveDeck,
  onAppendToDeck,
  onOpenCollectionItem,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [sidebarItem, setSidebarItem] = useState<string>("all");
  const [sidebarCollections, setSidebarCollections] = useState<SidebarCollection[]>([]);
  const [results, setResults] = useState<AssetReference[]>([]);
  const [collectionItems, setCollectionItems] = useState<MixerCollectionItem[]>([]);
  const [rvbaTemplates, setRvbaTemplates] = useState<AssetReference[]>([]);
  const [vdjLive, setVdjLive] = useState<AssetReference | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showSequenceEditor, setShowSequenceEditor] = useState(false);

  const collectionId = sidebarItem === "all" ? null : sidebarItem;
  const collectionMode = collectionId !== null;
  const selectedCollection = sidebarCollections.find((c) => c.id === sidebarItem) ?? null;
  const isImportedSelected = selectedCollection?.imported === true;

  function refreshCollections() {
    return listMixerCollectionsAction()
      .then(setSidebarCollections)
      .catch(() => setSidebarCollections([]));
  }

  useEffect(() => {
    refreshCollections();
    listRvbaTemplates()
      .then(setRvbaTemplates)
      .catch(() => setRvbaTemplates([]));
  }, []);

  useEffect(() => {
    setShowSequenceEditor(false);
  }, [sidebarItem]);

  useEffect(() => {
    if (!collectionMode) {
      setCollectionItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listMixerCollection(collectionId)
      .then((items) => {
        if (!cancelled) setCollectionItems(items);
      })
      .catch(() => {
        if (!cancelled) setCollectionItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionId, collectionMode]);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      getVdjLiveAsset()
        .then((asset) => {
          if (!cancelled) setVdjLive(asset);
        })
        .catch(() => undefined);
    }
    poll();
    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (collectionMode) return;
    const kinds: SearchableAssetKind[] =
      filter === "all" ? SEARCHABLE_KINDS : isSearchableKind(filter) ? [filter] : [];
    if (!trimmedQuery || kinds.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(() => {
      searchMixerAssets(trimmedQuery, kinds)
        .then((assets) => {
          if (!cancelled) setResults(assets);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [trimmedQuery, filter, collectionMode]);

  const isFavoritesFilter = filter === "favorites";
  const queryLower = trimmedQuery.toLowerCase();

  const matchingTemplates =
    !collectionMode && (filter === "all" || filter === "broadcast")
      ? rvbaTemplates.filter((template) => !trimmedQuery || template.title.toLowerCase().includes(queryLower))
      : [];

  const showVdjCard =
    !collectionMode &&
    (filter === "all" || filter === "track") &&
    vdjLive !== null &&
    (!trimmedQuery ||
      vdjLive.title.toLowerCase().includes(queryLower) ||
      vdjLive.subtitle.toLowerCase().includes(queryLower));

  const searchCards: AssetReference[] = [...(showVdjCard && vdjLive ? [vdjLive] : []), ...results, ...matchingTemplates];
  const cards: AssetReference[] = collectionMode ? collectionItems : searchCards;
  const showCards = !isFavoritesFilter && !loading && cards.length > 0;
  const selectedTitle = selectedCollection?.title ?? SIDEBAR_TOP.find((s) => s.id === sidebarItem)?.title ?? sidebarItem;

  return (
    <section className="bmx-browser" aria-label="Asset Browser">
      <header className="bmx-browser__head">
        <div className="bmx-browser__head-row">
          <h2 className="bmx-browser__title">Asset Browser</h2>
          <div className="bmx-browser__active-deck" role="group" aria-label="Active deck for double-click and drag">
            <span className="bmx-browser__active-deck-label">Add to</span>
            <button
              type="button"
              className={`bmx-chip bmx-chip--tiny${activeDeckId === "left" ? " bmx-chip--active" : ""}`}
              onClick={() => onSetActiveDeck("left")}
            >
              Left Deck
            </button>
            <button
              type="button"
              className={`bmx-chip bmx-chip--tiny${activeDeckId === "right" ? " bmx-chip--active" : ""}`}
              onClick={() => onSetActiveDeck("right")}
            >
              Right Deck
            </button>
          </div>
        </div>
        <div className="bmx-browser__search-wrap">
          <span className="bmx-browser__search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            className="bmx-browser__search"
            placeholder="Search assets by title, artist, or RV ID…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search assets"
          />
        </div>
      </header>

      <div className="bmx-browser__filters" role="group" aria-label="Asset type filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bmx-chip${filter === item.id ? " bmx-chip--active" : ""}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="bmx-browser__body">
        <nav className="bmx-browser__sidebar" aria-label="Asset collections">
          <span className="bmx-sidebar__eyebrow">Collections</span>
          <div className="bmx-sidebar-group">
            {SIDEBAR_TOP.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`bmx-sidebar-item${sidebarItem === item.id ? " bmx-sidebar-item--active" : ""}`}
                onClick={() => setSidebarItem(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>
          <div className="bmx-sidebar-group">
            <span className="bmx-sidebar-group__label">My Collections</span>
            {sidebarCollections.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`bmx-sidebar-item${sidebarItem === item.id ? " bmx-sidebar-item--active" : ""}`}
                onClick={() => setSidebarItem(item.id)}
              >
                {item.title}
              </button>
            ))}
            <ImportCollectionForm
              onImported={(id) => {
                refreshCollections().then(() => setSidebarItem(id));
              }}
            />
          </div>
        </nav>

        <div className="bmx-browser__grid-wrap">
          {isImportedSelected ? (
            <div className="bmx-browser__collection-tools">
              <button
                type="button"
                className="bmx-btn bmx-btn--small"
                onClick={() => setShowSequenceEditor((v) => !v)}
              >
                {showSequenceEditor ? "Hide Sequence Editor" : "Edit Sequences"}
              </button>
            </div>
          ) : null}

          {showSequenceEditor && isImportedSelected && collectionId ? (
            <SequenceEditorPanel
              collectionId={collectionId}
              onClose={() => setShowSequenceEditor(false)}
            />
          ) : null}

          {isFavoritesFilter || (collectionMode && sidebarItem === "favorites") ? (
            <p className="bmx-browser__empty">No favorites yet.</p>
          ) : loading ? (
            <p className="bmx-browser__empty">Loading…</p>
          ) : cards.length === 0 ? (
            <p className="bmx-browser__empty">
              {collectionMode
                ? `No items in “${selectedTitle}” yet.`
                : trimmedQuery
                  ? "No matching assets."
                  : "Type to search the Retroverse library."}
            </p>
          ) : null}

          {showCards ? (
            <ul className="bmx-browser__grid" role="listbox" aria-label="Search results">
              {cards.map((asset, index) => (
                <AssetCard
                  key={`${asset.assetId}-${index}`}
                  asset={asset}
                  selected={selectedAssetId === asset.assetId}
                  onSelect={() => setSelectedAssetId(asset.assetId)}
                  onOpen={() => {
                    if (collectionMode) {
                      onOpenCollectionItem(activeDeckId, asset as MixerCollectionItem, collectionId);
                      return;
                    }
                    onAppendToDeck(activeDeckId, asset);
                  }}
                />
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
