import Link from "next/link";

import { EventHomepageEditorial } from "@/components/home/EventHomepageEditorial";
import { EventHomepageFeaturedYears } from "@/components/home/EventHomepageFeaturedYears";
import { EventHomepageGiveaway } from "@/components/home/EventHomepageGiveaway";
import { EventHomepageHero } from "@/components/home/EventHomepageHero";
import type { EventStudioHomepagePreview } from "@/lib/ops/event-studio/producer/homepage-preview";

type Props = {
  preview: EventStudioHomepagePreview;
};

/**
 * Homepage control room — production status on the left, the live public
 * homepage preview occupying most of the width on the right.
 */
export function EventStudioHomepagePreviewPanel({ preview }: Props) {
  const nowPlayingLine = preview.nowPlaying
    ? `${preview.nowPlaying.title} — ${preview.nowPlaying.artist}`
    : "Off air";

  return (
    <div className="es-homepage-preview">
      <aside className="es-homepage-preview__controls" aria-label="Homepage production status">
        <section className="es-homepage-status-card">
          <p className="es-homepage-status-card__label">Producer Plan</p>
          <p className="es-homepage-status-card__value">{preview.eventTitle}</p>
          <p className="es-homepage-status-card__detail">
            {preview.eventDate}
            {preview.eventVenue ? ` · ${preview.eventVenue}` : null}
          </p>
        </section>

        <section className="es-homepage-status-card">
          <p className="es-homepage-status-card__label">Registration</p>
          <p className="es-homepage-status-card__value">{preview.registerCtaLabel}</p>
          <p className="es-homepage-status-card__detail es-homepage-status-card__detail--mono">
            {preview.giveaway.registrationUrl}
          </p>
        </section>

        <section className="es-homepage-status-card">
          <p className="es-homepage-status-card__label">Giveaway</p>
          <p className="es-homepage-status-card__value">
            {preview.giveaway.prizeTitle || "No prize configured"}
          </p>
          {preview.giveaway.prizeDescription ? (
            <p className="es-homepage-status-card__detail">{preview.giveaway.prizeDescription}</p>
          ) : null}
        </section>

        <section className="es-homepage-status-card">
          <p className="es-homepage-status-card__label">Now Playing</p>
          <p className="es-homepage-status-card__value">{nowPlayingLine}</p>
          {!preview.nowPlaying ? (
            <p className="es-homepage-status-card__detail">{preview.nowPlayingPlaceholder}</p>
          ) : null}
        </section>

        <section className="es-homepage-status-card es-homepage-status-card--publish">
          <p className="es-homepage-status-card__label">Publishing</p>
          <p className="es-homepage-status-card__detail">
            Built from the active Producer plan — no editor fields. Open the public page when you are
            ready to share it.
          </p>
          <div className="es-homepage-preview__actions">
            <Link
              href={preview.publicUrl}
              className="ops-event-studio__action"
              target="_blank"
              rel="noreferrer"
            >
              Open Public Homepage
            </Link>
            <Link href="/ops/event-studio/producer" className="ops-event-studio__action">
              Back to Producer
            </Link>
          </div>
        </section>
      </aside>

      <div className="es-homepage-preview__stage">
        <p className="es-homepage-preview__stage-label">Live Homepage Preview</p>
        <div className="es-homepage-preview__frame">
          <main className="home-page event-home rv2-live">
            <div className="rv2-live__grid-glow" aria-hidden />
            <div className="home-page__inner">
              <EventHomepageHero
                title={preview.eventTitle}
                date={preview.eventDate}
                venue={preview.eventVenue}
                heroImageUrl={preview.heroImageUrl}
                registerHref={preview.registerCtaHref}
                registerLabel={preview.registerCtaLabel}
                initialNowPlaying={preview.nowPlaying}
              />

              <EventHomepageGiveaway giveaway={preview.giveaway} />

              <EventHomepageEditorial editorial={preview.editorialPlaceholder} />

              <section className="es-homepage-preview__placeholder" aria-label="Now Playing placeholder">
                <p className="es-homepage-preview__placeholder-kicker">Now Playing</p>
                <p>{preview.nowPlayingPlaceholder}</p>
              </section>

              <EventHomepageFeaturedYears years={preview.featuredYears} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
