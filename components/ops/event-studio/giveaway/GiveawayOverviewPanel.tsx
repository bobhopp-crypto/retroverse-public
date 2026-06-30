import Link from "next/link";

import type { GiveawayStudioSnapshot } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  snapshot: GiveawayStudioSnapshot;
};

export function GiveawayOverviewPanel({ snapshot }: Props) {
  const giveaway = snapshot.activeGiveaway;
  if (!giveaway) {
    return <p className="es-giveaway-empty">No active giveaway configured.</p>;
  }

  return (
    <div className="es-giveaway-overview">
      <section className="es-giveaway-hero" aria-label="Prize preview">
        <div className="es-giveaway-hero__media">
          {giveaway.prize.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={giveaway.prize.heroImageUrl} alt={giveaway.prize.title} />
          ) : (
            <div className="es-giveaway-hero__placeholder">
              <span>Prize photo</span>
              <p>Add hero artwork in Prize</p>
            </div>
          )}
        </div>
        <div className="es-giveaway-hero__copy">
          <p className="es-giveaway-hero__eyebrow">Tonight&apos;s giveaway</p>
          <h3>{giveaway.prize.title}</h3>
          <p>{giveaway.prize.description}</p>
          {giveaway.prize.retailValue ? (
            <p className="es-giveaway-hero__value">Retail value · {giveaway.prize.retailValue}</p>
          ) : null}
          <div className="ops-event-studio__actions">
            <Link href="/ops/event-studio/giveaway/drawing" className="ops-event-studio__action">
              Draw Winner
            </Link>
            <Link href="/ops/event-studio/giveaway/audience" className="ops-event-studio__action">
              Audience ({snapshot.entryCount})
            </Link>
          </div>
        </div>
      </section>

      <div className="es-giveaway-stats">
        <article className="es-giveaway-stat">
          <span>Entries</span>
          <strong>{snapshot.entryCount}</strong>
        </article>
        <article className="es-giveaway-stat">
          <span>Duplicates</span>
          <strong>{snapshot.duplicateCount}</strong>
        </article>
        <article className="es-giveaway-stat">
          <span>Status</span>
          <strong>{giveaway.status}</strong>
        </article>
        <article className="es-giveaway-stat">
          <span>Registration URL</span>
          <strong className="es-giveaway-stat__mono">{snapshot.registrationUrl}</strong>
        </article>
      </div>

      <section className="ops-event-studio__panel" aria-label="Live flow">
        <h2 className="ops-event-studio__panel-title">Live Flow</h2>
        <ol className="es-giveaway-flow">
          <li>Guest scans QR on pass or signage</li>
          <li>Landing page opens for this event</li>
          <li>Guest registers with configured fields</li>
          <li>Confirmation message confirms entry</li>
          <li>You press Draw Winner during the show</li>
          <li>Winner card appears · Claim · Redraw · Complete</li>
        </ol>
      </section>
    </div>
  );
}
