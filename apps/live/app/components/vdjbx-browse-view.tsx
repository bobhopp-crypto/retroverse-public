"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import catalog from "@/lib/vdjbx-browse-catalog.json";

import "./vdjbx-browse-view.css";

type CatalogItem = (typeof catalog.items)[number];
type Collection = (typeof catalog.collections)[number];

const HERO_ROUTE = "/api/experience/visual-asset";

function heroUrl(rvtr: string): string {
  const params = new URLSearchParams({ rvtr, file: "hero-video.jpg" });
  return `${HERO_ROUTE}?${params.toString()}`;
}

function VideoCard({ item }: { item: CatalogItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const requestFromThisVideo = () => {
    window.dispatchEvent(new CustomEvent("retroverse:open-live-request", { detail: { query: item.title } }));
  };

  return (
    <article className="vdjbx-browse-card">
      <div className="vdjbx-browse-card__art" aria-hidden="true">
        {item.heroRvtr && !imageFailed ? (
          <img src={heroUrl(item.heroRvtr)} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span className="vdjbx-browse-card__fallback">♫</span>
        )}
      </div>
      <div className="vdjbx-browse-card__details">
        <h2>{item.title}</h2>
        <p>{item.artist}{item.year ? ` · ${item.year}` : ""}</p>
        <button type="button" onClick={requestFromThisVideo}>
          Request during a live event
        </button>
      </div>
    </article>
  );
}

export function VdjbxBrowseView() {
  const [collectionName, setCollectionName] = useState("All Videos");
  const [query, setQuery] = useState("");
  const itemsByKey = useMemo(() => new Map(catalog.items.map((item) => [item.videoKey, item])), []);
  const selectedCollection = catalog.collections.find((item) => item.displayName === collectionName) as Collection | undefined;
  const collectionItems = useMemo<CatalogItem[]>(() => {
    if (!selectedCollection) return catalog.items as CatalogItem[];
    return selectedCollection.members.flatMap((key) => {
      const item = itemsByKey.get(key);
      return item ? [item] : [];
    });
  }, [itemsByKey, selectedCollection]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleItems = normalizedQuery
    ? collectionItems.filter((item) => `${item.title} ${item.artist}`.toLocaleLowerCase().includes(normalizedQuery))
    : collectionItems;

  return (
    <div className="vdjbx-browse" aria-labelledby="vdjbx-browse-title">
      <header className="vdjbx-browse__header">
        <Link href="/" className="vdjbx-browse__back">← Live</Link>
        <div>
          <p className="vdjbx-browse__eyebrow">RETROVERSE VIDEO COLLECTION</p>
          <h1 id="vdjbx-browse-title">Video Jukebox</h1>
        </div>
        <span className="vdjbx-browse__count">{catalog.items.length} videos</span>
      </header>

      <p className="vdjbx-browse__intro">Browse Bob&apos;s VirtualDJ video collections. Song requests are available during open live events.</p>

      <label className="vdjbx-browse__search-label" htmlFor="vdjbx-browse-search">Search videos</label>
      <input
        id="vdjbx-browse-search"
        className="vdjbx-browse__search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search title or artist"
        autoComplete="off"
      />

      <nav className="vdjbx-browse__collections" aria-label="Video collections">
        <button type="button" aria-pressed={collectionName === "All Videos"} onClick={() => setCollectionName("All Videos")}>All Videos</button>
        {catalog.collections.map((collection) => (
          <button
            type="button"
            key={collection.displayName}
            aria-pressed={collectionName === collection.displayName}
            onClick={() => setCollectionName(collection.displayName)}
          >
            {collection.displayName}
          </button>
        ))}
      </nav>

      <section className="vdjbx-browse__results" aria-live="polite" aria-label={collectionName}>
        <div className="vdjbx-browse__section-heading">
          <h2>{collectionName}</h2>
          <span>{visibleItems.length} videos</span>
        </div>
        {visibleItems.length ? (
          <div className="vdjbx-browse__grid">
            {visibleItems.map((item) => <VideoCard key={item.videoKey} item={item} />)}
          </div>
        ) : (
          <p className="vdjbx-browse__empty">No videos match this search.</p>
        )}
      </section>
    </div>
  );
}
