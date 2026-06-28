"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import type { GalleryPageData } from "@/lib/retroverse/gallery/gallery-types";
import { useGalleryClientInstrument } from "@/lib/retroverse/gallery/use-gallery-client-instrument";

import "./experience-gallery.css";

type Props = {
  data: GalleryPageData;
};

function stars(n: number): string {
  const full = Math.min(5, Math.max(0, Math.round(n)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ExperienceGallery({ data }: Props) {
  const renderCount = useGalleryClientInstrument("ExperienceGallery");

  if (process.env.NODE_ENV === "development") {
    console.log("[gallery-instrument] ExperienceGallery body", {
      renderCount,
      rvtr: data.currentRvtr,
      navigationTotal: data.navigation.total,
    });
  }

  const router = useRouter();
  if (process.env.NODE_ENV === "development") {
    console.log("[gallery-instrument] useSearchParams() call start");
  }
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV === "development") {
    console.log("[gallery-instrument] useSearchParams() call end", {
      experience: searchParams.get("experience"),
    });
  }
  const [rvtrJump, setRvtrJump] = useState(data.currentRvtr);

  const selectedId =
    searchParams.get("experience") ??
    data.signatureExperiences.find((e) => e.status === "ready")?.id ??
    "chart_journey";

  const selectedDef =
    data.signatureExperiences.find((e) => e.id === selectedId) ??
    data.supportingExperiences.find((e) => e.id === selectedId) ??
    null;

  const selectedReadiness = data.song.experiences.find((e) => e.id === selectedId) ?? null;

  const availableCount = data.song.experiences.filter((e) => e.launchHref).length;
  const completionPct = Math.round(
    data.song.experiences.reduce((sum, e) => sum + e.completionPct, 0) /
      Math.max(1, data.song.experiences.length),
  );

  const galleryHref = useCallback(
    (rvtr: string, experience?: string) => {
      const params = new URLSearchParams();
      params.set("rvtr", rvtr);
      if (experience) params.set("experience", experience);
      return `/retroverse/experiences?${params.toString()}`;
    },
    [],
  );

  const selectExperience = useCallback(
    (id: string) => {
      router.push(galleryHref(data.currentRvtr, id), { scroll: false });
    },
    [router, galleryHref, data.currentRvtr],
  );

  const navigateSong = useCallback(
    (rvtr: string | null) => {
      if (!rvtr) return;
      router.push(galleryHref(rvtr, selectedId));
    },
    [router, galleryHref, selectedId],
  );

  const liveFollowing = useMemo(
    () => Boolean(data.liveRvtr && data.liveRvtr === data.currentRvtr),
    [data.liveRvtr, data.currentRvtr],
  );

  return (
    <div className="rv-gallery">
      <header className="rv-gallery__hero">
        <div className="rv-gallery__hero-copy">
          <p className="rv-gallery__eyebrow">Retroverse</p>
          <h1 className="rv-gallery__title">Experience Gallery</h1>
          <p className="rv-gallery__subtitle">
            The museum for every song story Retroverse has built.
          </p>
        </div>
        {liveFollowing ? (
          <p className="rv-gallery__live-badge">Following VirtualDJ · now playing</p>
        ) : null}
      </header>

      <section className="rv-gallery__current" aria-label="Current song">
        <div className="rv-gallery__artwork">
          {data.song.coverUrl ? (
            <Image
              src={data.song.coverUrl}
              alt=""
              width={320}
              height={320}
              className="rv-gallery__cover"
              unoptimized
              onLoad={() => console.log("[gallery-instrument] Image loaded: current-song-cover")}
              onError={() => console.log("[gallery-instrument] Image error: current-song-cover")}
            />
          ) : (
            <div className="rv-gallery__cover rv-gallery__cover--empty" aria-hidden />
          )}
        </div>
        <div className="rv-gallery__song-meta">
          <p className="rv-gallery__meta-label">Current Song</p>
          <h2 className="rv-gallery__song-title">{data.song.title}</h2>
          <p className="rv-gallery__song-artist">{data.song.artist}</p>
          <dl className="rv-gallery__facts">
            <div>
              <dt>Year</dt>
              <dd>{data.song.year ?? "—"}</dd>
            </div>
            <div>
              <dt>Album</dt>
              <dd>{data.song.album ?? "—"}</dd>
            </div>
            <div>
              <dt>RVTR</dt>
              <dd>{data.song.rvtr}</dd>
            </div>
            {data.song.peakHot100 ? (
              <div>
                <dt>Peak Hot 100</dt>
                <dd>#{data.song.peakHot100}</dd>
              </div>
            ) : null}
          </dl>
          <div className="rv-gallery__completion">
            <p className="rv-gallery__meta-label">Available Experiences</p>
            <p className="rv-gallery__completion-stat">
              {availableCount} ready · {completionPct}% library depth
            </p>
          </div>
        </div>
      </section>

      <nav className="rv-gallery__song-nav" aria-label="Song navigation">
        <Link
          href={data.navigation.previousRvtr ? galleryHref(data.navigation.previousRvtr, selectedId) : "#"}
          className={`rv-gallery__nav-btn${data.navigation.previousRvtr ? "" : " rv-gallery__nav-btn--disabled"}`}
          aria-disabled={!data.navigation.previousRvtr}
        >
          ← Previous Song
        </Link>
        <Link href="/search" className="rv-gallery__nav-btn rv-gallery__nav-btn--accent">
          Search
        </Link>
        <Link
          href={
            data.navigation.randomRvtr
              ? galleryHref(data.navigation.randomRvtr, selectedId)
              : "#"
          }
          className="rv-gallery__nav-btn"
        >
          Random Song
        </Link>
        <Link
          href={data.navigation.nextRvtr ? galleryHref(data.navigation.nextRvtr, selectedId) : "#"}
          className={`rv-gallery__nav-btn${data.navigation.nextRvtr ? "" : " rv-gallery__nav-btn--disabled"}`}
          aria-disabled={!data.navigation.nextRvtr}
        >
          Next Song →
        </Link>
        <p className="rv-gallery__nav-index">
          Song {data.navigation.index + 1} of {data.navigation.total}
        </p>
      </nav>

      <section className="rv-gallery__quick-jump" aria-label="Quick jump">
        <p className="rv-gallery__section-label">Quick Jump</p>
        <div className="rv-gallery__jump-row">
          <form
            className="rv-gallery__jump-rvtr"
            onSubmit={(e) => {
              e.preventDefault();
              const rvtr = rvtrJump.trim().toUpperCase();
              if (/^RVTR\d{6}$/.test(rvtr)) navigateSong(rvtr);
            }}
          >
            <label htmlFor="rv-gallery-rvtr">RVTR</label>
            <input
              id="rv-gallery-rvtr"
              value={rvtrJump}
              onChange={(e) => setRvtrJump(e.target.value.toUpperCase())}
              placeholder="RVTR001341"
            />
            <button type="submit">Go</button>
          </form>
          <Link href={`/search?q=${encodeURIComponent(data.song.artist)}`} className="rv-gallery__jump-link">
            Artist
          </Link>
          <Link href={`/search?q=${encodeURIComponent(data.song.title)}`} className="rv-gallery__jump-link">
            Title
          </Link>
          {data.song.year ? (
            <Link href={`/rv/${data.song.year}`} className="rv-gallery__jump-link">
              Year {data.song.year}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rv-gallery__browse" aria-label="Browse modes">
        <p className="rv-gallery__section-label">Browse</p>
        <div className="rv-gallery__browse-pills">
          {data.browseModes.map((mode) => (
            <Link key={mode.id} href={mode.href} className="rv-gallery__browse-pill">
              {mode.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rv-gallery__signature" aria-label="Signature experiences">
        <h2 className="rv-gallery__section-title">Signature Experiences</h2>
        <div className="rv-gallery__card-grid">
          {data.signatureExperiences.map((exp) => {
            const readiness = data.song.experiences.find((r) => r.id === exp.id);
            const isSelected = exp.id === selectedId;
            const status =
              readiness?.launchHref
                ? "Ready"
                : exp.status === "coming_soon"
                  ? "Coming Soon"
                  : exp.status === "planned"
                    ? "Planned"
                    : readiness?.statusLabel ?? "In Progress";

            return (
              <button
                key={exp.id}
                type="button"
                className={`rv-gallery__card${isSelected ? " rv-gallery__card--selected" : ""}`}
                onClick={() => selectExperience(exp.id)}
              >
                <p className="rv-gallery__card-stars" aria-label={`${exp.stars} of 5 stars`}>
                  {stars(exp.stars)}
                </p>
                <h3 className="rv-gallery__card-title">{exp.title}</h3>
                <p className="rv-gallery__card-tagline">&ldquo;{exp.tagline}&rdquo;</p>
                <p className="rv-gallery__card-status">{status}</p>
                {readiness?.launchHref ? (
                  <span className="rv-gallery__card-launch">Launch →</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {selectedDef && selectedReadiness ? (
        <section className="rv-gallery__preview" aria-label="Experience preview">
          <div className="rv-gallery__preview-art">
            {data.song.coverUrl ? (
              <Image
                src={data.song.coverUrl}
                alt=""
                width={480}
                height={480}
                className="rv-gallery__preview-cover"
                unoptimized
                onLoad={() => console.log("[gallery-instrument] Image loaded: preview-cover")}
                onError={() => console.log("[gallery-instrument] Image error: preview-cover")}
              />
            ) : (
              <div className="rv-gallery__preview-cover rv-gallery__cover--empty" />
            )}
          </div>
          <div className="rv-gallery__preview-body">
            <p className="rv-gallery__section-label">Experience Preview</p>
            <h2 className="rv-gallery__preview-title">{selectedDef.title}</h2>
            <p className="rv-gallery__preview-question">{selectedDef.question}</p>
            <dl className="rv-gallery__preview-stats">
              <div>
                <dt>Duration</dt>
                <dd>{selectedDef.estimatedMinutes ? `~${selectedDef.estimatedMinutes} min` : "—"}</dd>
              </div>
              <div>
                <dt>Scenes</dt>
                <dd>{selectedReadiness.sceneCount ?? "—"}</dd>
              </div>
              <div>
                <dt>Readiness</dt>
                <dd>{selectedReadiness.statusLabel}</dd>
              </div>
              <div>
                <dt>Creative Review</dt>
                <dd>
                  {selectedReadiness.creativeReviewScore != null
                    ? `${selectedReadiness.creativeReviewScore}/100`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Production</dt>
                <dd>
                  {selectedReadiness.productionScore != null
                    ? `${selectedReadiness.productionScore}/100`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(selectedReadiness.lastUpdated)}</dd>
              </div>
            </dl>
            {selectedReadiness.launchHref ? (
              <Link href={selectedReadiness.launchHref} className="rv-gallery__launch-btn">
                Launch Experience
              </Link>
            ) : (
              <p className="rv-gallery__launch-blocked">
                This experience is not ready for patrons yet.
              </p>
            )}
          </div>
        </section>
      ) : null}

      <section className="rv-gallery__supporting" aria-label="Supporting experiences">
        <h2 className="rv-gallery__section-title">Supporting Experiences</h2>
        <div className="rv-gallery__support-grid">
          {data.supportingExperiences.map((exp) => {
            const href = exp.launchHref;
            return (
              <article key={exp.id} className="rv-gallery__support-card">
                <h3>{exp.title}</h3>
                <p>{exp.tagline}</p>
                {href ? (
                  <Link href={href} className="rv-gallery__support-link">
                    Open →
                  </Link>
                ) : (
                  <span className="rv-gallery__support-soon">{exp.status === "ready" ? "Soon" : "Planned"}</span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rv-gallery__progress" aria-label="Library progress">
        <h2 className="rv-gallery__section-title">Library Growth</h2>
        <p className="rv-gallery__progress-lede">
          The living roadmap of Retroverse — every song that gains a story.
        </p>
        <ul className="rv-gallery__progress-list">
          {data.libraryProgress.map((row) => (
            <li key={row.experienceId} className="rv-gallery__progress-row">
              <span className="rv-gallery__progress-name">{row.title}</span>
              <span className="rv-gallery__progress-count">
                {row.completeCount.toLocaleString()} songs complete
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
