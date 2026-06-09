"use client";

import type { MediaLabLibrarySection } from "@/lib/ops/media-lab/workspace/urls";

const SECTIONS: { id: MediaLabLibrarySection; label: string }[] = [
  { id: "imported", label: "Imported Videos" },
  { id: "episodes", label: "Episodes" },
  { id: "performances", label: "Performances" },
  { id: "exported", label: "Exported Clips" },
  { id: "harvest", label: "Harvest Queue" },
  { id: "recent", label: "Recent" },
];

const COLLECTIONS = [
  { id: "all", label: "All Collections", enabled: true },
  { id: "midnight_special", label: "Midnight Special", enabled: true },
  { id: "top_of_the_pops", label: "Top of the Pops", enabled: false },
  { id: "live_aid", label: "Live Aid", enabled: false },
  { id: "woodstock", label: "Woodstock", enabled: false },
];

type Props = {
  library: MediaLabLibrarySection;
  collection: string;
  onLibraryChange: (section: MediaLabLibrarySection) => void;
  onCollectionChange: (collection: string) => void;
  children: React.ReactNode;
};

export function MediaLabLibrarySidebar({
  library,
  collection,
  onLibraryChange,
  onCollectionChange,
  children,
}: Props) {
  return (
    <aside className="ml-workspace__sidebar">
      <div className="ml-workspace__sidebar-header">
        <h2 className="ml-workspace__sidebar-title">Library</h2>
      </div>

      <nav className="ml-workspace__sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ml-workspace__section-btn ${library === s.id ? "ml-workspace__section-btn--active" : ""}`}
            onClick={() => onLibraryChange(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="ml-workspace__collections">
        <p className="ml-workspace__collections-label">Collections</p>
        {COLLECTIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`ml-workspace__collection-btn ${collection === c.id ? "ml-workspace__collection-btn--active" : ""}`}
            disabled={!c.enabled}
            onClick={() => c.enabled && onCollectionChange(c.id)}
          >
            {c.label}
            {!c.enabled ? <span className="ops-dim"> (soon)</span> : null}
          </button>
        ))}
      </div>

      <div className="ml-workspace__browse">{children}</div>
    </aside>
  );
}
