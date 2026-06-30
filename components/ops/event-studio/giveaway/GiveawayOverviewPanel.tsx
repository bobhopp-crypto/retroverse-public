import Link from "next/link";

import type { GiveawayStudioSnapshot } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  snapshot: GiveawayStudioSnapshot;
};

function formatDrawDate(value: string | null | undefined): string {
  if (!value?.trim()) return "Not scheduled";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value.trim();
  return new Date(parsed).toLocaleString();
}

export function GiveawayOverviewPanel({ snapshot }: Props) {
  const giveaway = snapshot.activeGiveaway;
  if (!giveaway) {
    return <p className="es-giveaway-empty">No active giveaway configured.</p>;
  }

  const registrationUrl = snapshot.registrationUrl;

  return (
    <div className="es-giveaway-overview">
      <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label="Giveaway essentials">
        <h2 className="ops-event-studio__panel-title">Tonight&apos;s Giveaway</h2>
        <dl className="ops-event-studio__facts">
          <div>
            <dt>Prize</dt>
            <dd>{giveaway.prize.title.trim() || "Prize title pending"}</dd>
          </div>
          <div>
            <dt>Draw Date</dt>
            <dd>{formatDrawDate(giveaway.scheduledDrawAt)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{giveaway.status}</dd>
          </div>
          <div>
            <dt>Entries</dt>
            <dd>{snapshot.entryCount}</dd>
          </div>
          <div className="ops-event-studio__facts-wide">
            <dt>Registration URL</dt>
            <dd className="es-giveaway-registration-url">{registrationUrl}</dd>
          </div>
        </dl>
        <div className="ops-event-studio__actions">
          <Link href={registrationUrl} className="ops-event-studio__action" target="_blank" rel="noreferrer">
            Test Registration
          </Link>
          <Link href="/ops/event-studio/giveaway/drawing" className="ops-event-studio__action">
            Draw Winner
          </Link>
          <Link href="/ops/event-studio/giveaway/audience" className="ops-event-studio__action">
            Audience ({snapshot.entryCount})
          </Link>
        </div>
      </section>

      <section className="es-giveaway-hero" aria-label="Prize preview">
        <div className="es-giveaway-hero__media">
          {giveaway.prize.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={giveaway.prize.heroImageUrl} alt={giveaway.prize.title} />
          ) : (
            <div className="es-giveaway-hero__placeholder">
              <span>Prize photo placeholder</span>
              <p>Photo upload optional for Sunday</p>
            </div>
          )}
        </div>
        <div className="es-giveaway-hero__copy">
          <p className="es-giveaway-hero__eyebrow">Prize preview</p>
          <h3>{giveaway.prize.title}</h3>
          <p>{giveaway.prize.description || "Prize description from Producer plan."}</p>
          {giveaway.prize.retailValue ? (
            <p className="es-giveaway-hero__value">Retail value · {giveaway.prize.retailValue}</p>
          ) : null}
        </div>
      </section>

      <section className="ops-event-studio__panel" aria-label="Live flow">
        <h2 className="ops-event-studio__panel-title">Live Flow</h2>
        <ol className="es-giveaway-flow">
          <li>Guest scans QR on pass or signage</li>
          <li>Registration page opens for this event</li>
          <li>Guest registers with configured fields</li>
          <li>Confirmation message confirms entry</li>
          <li>You press Draw Winner during the show</li>
          <li>Winner card appears · Claim · Redraw · Complete</li>
        </ol>
      </section>
    </div>
  );
}
