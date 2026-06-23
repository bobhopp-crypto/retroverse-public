import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { slugFromArtistName } from "@/lib/artist/slug";
import { trackPageHref } from "@/lib/search/entity-routes";
import type { SongSheetModel } from "@/lib/ops/intelligence/load-song-sheet";

import { RecordLabelCard } from "@/components/ops/intelligence/artifacts/RecordLabelCard";
import { SongDNACard } from "@/components/ops/intelligence/artifacts/SongDNACard";
import { StoryConstellation } from "@/components/ops/intelligence/artifacts/StoryConstellation";
import { TimelineInfographic } from "@/components/ops/intelligence/artifacts/TimelineInfographic";

import "./song-sheet.css";

type Props = { model: SongSheetModel };

export function SongSheetView({ model }: Props) {
  const artistSlug = slugFromArtistName(model.artist);
  const { artifact } = model;

  return (
    <article className="song-sheet">
      <div className="song-sheet__grain" aria-hidden />

      <header className="song-sheet__hero">
        <div className="song-sheet__cover-wrap">
          <ArtistCover
            src={model.coverUrl}
            alt=""
            className="song-sheet__cover"
            fallbackClassName="song-sheet__cover-fallback"
            fallbackVariant="plate"
            placeholderContext={{
              artist: model.artist,
              album: model.artifact.albumTitle ?? model.title,
              releaseYear: model.year,
            }}
          />
        </div>
        <div className="song-sheet__identity">
          <p className="song-sheet__kicker">Retroverse Song Sheet</p>
          <h1 className="song-sheet__title">{model.title}</h1>
          <p className="song-sheet__artist">
            <Link href={`/artist/${artistSlug}`}>{model.artist}</Link>
          </p>
          <p className="song-sheet__meta">
            {model.year ?? "—"} · {model.rvtr}
          </p>
        </div>
      </header>

      <section className="song-sheet__section" aria-labelledby="song-sheet-label">
        <h2 id="song-sheet-label" className="song-sheet__section-title">
          Record Label
        </h2>
        <RecordLabelCard model={artifact} />
      </section>

      <section className="song-sheet__section" aria-labelledby="song-sheet-timeline">
        <h2 id="song-sheet-timeline" className="song-sheet__section-title">
          Timeline
        </h2>
        <TimelineInfographic model={artifact} />
      </section>

      <section className="song-sheet__section" aria-labelledby="song-sheet-stories">
        <h2 id="song-sheet-stories" className="song-sheet__section-title">
          Story Constellation
        </h2>
        <StoryConstellation model={artifact} />
      </section>

      {model.topFacts.length > 0 && (
        <section className="song-sheet__section" aria-labelledby="song-sheet-facts">
          <h2 id="song-sheet-facts" className="song-sheet__section-title">
            Top Facts
          </h2>
          <ol className="song-sheet__facts">
            {model.topFacts.map((fact) => (
              <li key={fact.text} className="song-sheet__fact">
                <span className="song-sheet__fact-cat">{fact.category}</span>
                <p className="song-sheet__fact-text">{fact.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="song-sheet__section" aria-labelledby="song-sheet-album">
        <h2 id="song-sheet-album" className="song-sheet__section-title">
          Album Context
        </h2>
        <div className="song-sheet__album-card">
          <p className="song-sheet__album-title">{model.artifact.albumTitle ?? "Single release"}</p>
          {model.label && <p className="song-sheet__album-label">{model.label}</p>}
          {model.chartPeak != null && (
            <p className="song-sheet__album-chart">
              Billboard Hot 100 peak #{model.chartPeak}
              {model.chartWeeks != null ? ` · ${model.chartWeeks} weeks` : ""}
            </p>
          )}
        </div>
      </section>

      <section className="song-sheet__section song-sheet__section--dna" aria-labelledby="song-sheet-dna">
        <h2 id="song-sheet-dna" className="song-sheet__section-title">
          Song DNA
        </h2>
        <SongDNACard model={artifact} />
      </section>

      {model.relationships.relatedSongs.length > 0 && (
        <section className="song-sheet__section" aria-labelledby="song-sheet-related-songs">
          <h2 id="song-sheet-related-songs" className="song-sheet__section-title">
            Related Songs
          </h2>
          <ul className="song-sheet__related">
            {model.relationships.relatedSongs.map((song) => (
              <li key={song.rvtr}>
                <Link href={`/rvtr/${song.rvtr}/song-sheet`}>{song.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="song-sheet__section" aria-labelledby="song-sheet-related-artists">
        <h2 id="song-sheet-related-artists" className="song-sheet__section-title">
          Related Artists
        </h2>
        <ul className="song-sheet__related">
          <li>
            <Link href={`/artist/${artistSlug}`}>{model.artist}</Link>
          </li>
        </ul>
      </section>

      <footer className="song-sheet__footer">
        <Link href={trackPageHref(model.rvtr)} className="song-sheet__track-link">
          Full song journey →
        </Link>
      </footer>
    </article>
  );
}
