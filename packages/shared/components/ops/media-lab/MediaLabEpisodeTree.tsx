"use client";

import { useMemo, useState } from "react";

import {
  episodeListLabel,
  groupEpisodesByYear,
  type EpisodeBrowserRow,
} from "@/lib/ops/media-lab/performance-browser/episode-utils";

type Props = {
  episodes: EpisodeBrowserRow[];
  collectionTitle: string;
  selectedEpisodeId?: string;
  onSelectEpisode: (episodeId: string) => void;
};

export function MediaLabEpisodeTree(props: Props) {
  const groups = useMemo(() => groupEpisodesByYear(props.episodes), [props.episodes]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleYear(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  if (!props.episodes.length) {
    return <p className="ops-dim ml-workspace__empty">No episodes match.</p>;
  }

  return (
    <nav className="ml-episode-tree" aria-label="Episode tree">
      <p className="ml-episode-tree__collection">{props.collectionTitle}</p>
      {groups.map((group) => {
        const isCollapsed = collapsed[group.label] ?? false;
        return (
          <div key={group.label} className="ml-episode-tree__year-group">
            <button
              type="button"
              className="ml-episode-tree__year"
              aria-expanded={!isCollapsed}
              onClick={() => toggleYear(group.label)}
            >
              <span className="ml-episode-tree__year-chevron" aria-hidden>
                {isCollapsed ? "▸" : "▾"}
              </span>
              {group.label}
              <span className="ml-episode-tree__year-count">{group.episodes.length}</span>
            </button>
            {!isCollapsed ? (
              <ul className="ml-episode-tree__episodes">
                {group.episodes.map((ep) => (
                  <li key={ep.episode_id}>
                    <button
                      type="button"
                      className={`ml-episode-tree__episode ${props.selectedEpisodeId === ep.episode_id ? "ml-episode-tree__episode--active" : ""}`}
                      onClick={() => props.onSelectEpisode(ep.episode_id)}
                    >
                      {episodeListLabel(ep)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
