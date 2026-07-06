"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { MobileSongExperience as MobileSongExperienceData } from "@/lib/song-mobile/types";

import { ArtCover } from "./ArtCover";
import "./song-mobile.css";

const CARD_COUNT = 7;

type Props = {
  data: MobileSongExperienceData;
};

/**
 * Mobile Experience Renderer v1 — one swipeable, full-screen card per beat.
 * Portrait iPhone only. Native horizontal scroll-snap: no swipe library,
 * no JS gesture tracking — fast and reliable on real devices.
 */
export function MobileSongExperience({ data }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const index = Math.round(el.scrollLeft / el.clientWidth);
        setActiveIndex(Math.max(0, Math.min(CARD_COUNT - 1, index)));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  const goTo = useCallback((index: number) => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, []);

  return (
    <div className="song-mx">
      <header className="song-mx__topbar">
        <Link href="/" className="song-mx__back" aria-label="Back to Retroverse Live">
          Retroverse
        </Link>
        <div className="song-mx__dots" role="tablist" aria-label="Song experience sections">
          {Array.from({ length: CARD_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Go to card ${i + 1}`}
              className={`song-mx__dot${i === activeIndex ? " song-mx__dot--active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </header>

      <div className="song-mx__viewport" ref={viewportRef}>
        {/* 1. Hero */}
        <section className="song-mx__slide song-mx__slide--hero">
          <img
            className="song-mx__hero-image"
            src={data.hero.imageUrl}
            alt={data.hero.imageAlt}
          />
          <div className="song-mx__hero-wash" />
          <div className="song-mx__hero-scrim" />
          <div className="song-mx__hero-content">
            <span className="song-mx__now-playing">
              <span className="song-mx__now-playing-dot" />
              Now Playing
            </span>
            <p className="song-mx__hero-artist">{data.artist}</p>
            <h1 className="song-mx__hero-title">{data.title}</h1>
            <p className="song-mx__hero-year">{data.year}</p>
          </div>
          <p className="song-mx__swipe-hint">{"Swipe to explore \u2192"}</p>
        </section>

        {/* 2. Song Story */}
        <section className="song-mx__slide song-mx__slide--card">
          <p className="song-mx__kicker">Song Story</p>
          <h2 className="song-mx__heading">{data.title}</h2>
          <p className="song-mx__paragraph">{data.story.paragraph}</p>
        </section>

        {/* 3. Live Aid */}
        <section className="song-mx__slide song-mx__slide--photo">
          <img
            className="song-mx__photo-image"
            src={data.liveAid.imageUrl}
            alt={data.liveAid.imageAlt}
          />
          <div className="song-mx__photo-wash" />
          <div className="song-mx__photo-scrim" />
          <div className="song-mx__photo-content">
            <p className="song-mx__kicker song-mx__kicker--light">{"Live Aid \u00b7 1985"}</p>
            <h2 className="song-mx__heading song-mx__heading--light">{data.liveAid.headline}</h2>
            <p className="song-mx__paragraph song-mx__paragraph--light">
              {data.liveAid.paragraph}
            </p>
          </div>
        </section>

        {/* 4. Charts */}
        <section className="song-mx__slide song-mx__slide--card">
          <p className="song-mx__kicker">Charts</p>
          <h2 className="song-mx__heading">By The Numbers</h2>
          <dl className="song-mx__stats">
            <div className="song-mx__stat">
              <dt>Peak Position</dt>
              <dd>{data.charts.peakPosition}</dd>
            </div>
            <div className="song-mx__stat">
              <dt>Countries</dt>
              <dd>{data.charts.countries}</dd>
            </div>
            <div className="song-mx__stat">
              <dt>Release</dt>
              <dd>{data.charts.release}</dd>
            </div>
            <div className="song-mx__stat">
              <dt>Album</dt>
              <dd>{data.charts.album}</dd>
            </div>
          </dl>
        </section>

        {/* 5. Did You Know */}
        <section className="song-mx__slide song-mx__slide--card">
          <p className="song-mx__kicker">Did You Know</p>
          <h2 className="song-mx__heading">Facts</h2>
          <ul className="song-mx__facts">
            {data.didYouKnow.map((fact, i) => (
              <li key={i} className="song-mx__fact">
                <span className="song-mx__fact-mark" aria-hidden="true">
                  {"\u2605"}
                </span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Related Songs */}
        <section className="song-mx__slide song-mx__slide--card song-mx__slide--related">
          <p className="song-mx__kicker">Related Songs</p>
          <h2 className="song-mx__heading">More Queen</h2>
          <div className="song-mx__related-list">
            {data.relatedSongs.map((song) => (
              <Link
                key={song.rvtr}
                href={song.href}
                className="song-mx__related-item"
              >
                <ArtCover
                  className="song-mx__related-cover"
                  src={song.coverUrl}
                  alt={`${song.title} cover art`}
                  label={song.title}
                />
                <span className="song-mx__related-meta">
                  <span className="song-mx__related-title">{song.title}</span>
                  <span className="song-mx__related-artist">{song.artist}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 7. Explore Queen */}
        <section className="song-mx__slide song-mx__slide--card song-mx__slide--explore">
          <p className="song-mx__kicker">Explore</p>
          <h2 className="song-mx__heading">
            <Link href={data.artistHref} className="song-mx__explore-artist-link">
              {data.artist}
            </Link>
          </h2>

          <div className="song-mx__explore-scroll">
            <p className="song-mx__explore-label">Albums</p>
            <div className="song-mx__albums-row">
              {data.explore.albums.map((album) => (
                <div key={album.title} className="song-mx__album">
                  <ArtCover
                    className="song-mx__album-cover"
                    src={album.coverUrl}
                    alt={`${album.title} cover art`}
                    label={album.title}
                  />
                  <span className="song-mx__album-title">{album.title}</span>
                  <span className="song-mx__album-year">{album.year}</span>
                </div>
              ))}
            </div>

            <p className="song-mx__explore-label">Band Members</p>
            <ul className="song-mx__band-list">
              {data.explore.bandMembers.map((member) => (
                <li key={member.name} className="song-mx__band-member">
                  <span className="song-mx__band-name">{member.name}</span>
                  <span className="song-mx__band-role">{member.role}</span>
                </li>
              ))}
            </ul>

            <p className="song-mx__explore-label">Timeline</p>
            <ol className="song-mx__timeline">
              {data.explore.timeline.map((event) => (
                <li key={event.year} className="song-mx__timeline-item">
                  <span className="song-mx__timeline-year">{event.year}</span>
                  <span className="song-mx__timeline-label">{event.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
