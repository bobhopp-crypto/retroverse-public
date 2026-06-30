import Link from "next/link";

type Props = {
  title: string;
  lead: string;
  relatedHref?: string;
  relatedLabel?: string;
};

export function EventStudioComingSoonPanel({ title, lead, relatedHref, relatedLabel }: Props) {
  return (
    <section className="ops-event-studio__coming-soon" aria-label={title}>
      <p className="ops-event-studio__coming-soon-kicker">Coming soon</p>
      <h2>{title}</h2>
      <p>{lead}</p>
      <p className="ops-event-studio__coming-soon-note">
        This generator is part of the Event Studio Create workflow. Identity settings will apply
        automatically when generation ships.
      </p>
      <div className="ops-event-studio__actions">
        <Link href="/ops/event-studio/create" className="ops-event-studio__action">
          Back to Create
        </Link>
        {relatedHref && relatedLabel ? (
          <Link href={relatedHref} className="ops-event-studio__action">
            {relatedLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
