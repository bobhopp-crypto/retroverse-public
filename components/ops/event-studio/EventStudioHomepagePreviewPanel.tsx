import Link from "next/link";

import { EventHomepageEditorial } from "@/components/home/EventHomepageEditorial";
import { EventHomepageFeaturedYears } from "@/components/home/EventHomepageFeaturedYears";
import { EventHomepageGiveaway } from "@/components/home/EventHomepageGiveaway";
import { EventHomepageHero } from "@/components/home/EventHomepageHero";
import type { EventStudioHomepagePreview } from "@/lib/ops/event-studio/producer/homepage-preview";

type Props = {
  preview: EventStudioHomepagePreview;
};

export function EventStudioHomepagePreviewPanel({ preview }: Props) {
  return (
    <div className="es-homepage-preview">
      <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label="Homepage controls">
        <h2 className="ops-event-studio__panel-title">Sunday Homepage Preview</h2>
        <p className="ops-event-studio__hint">
          Built from the active Producer plan — no editor fields. Open the public page when you are ready to
          share it.
        </p>
        <div className="ops-event-studio__actions">
          <Link href={preview.publicUrl} className="ops-event-studio__action" target="_blank" rel="noreferrer">
            Open Public Homepage
          </Link>
          <Link href="/ops/event-studio/producer" className="ops-event-studio__action">
            Back to Producer
          </Link>
        </div>
      </section>

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
  );
}
