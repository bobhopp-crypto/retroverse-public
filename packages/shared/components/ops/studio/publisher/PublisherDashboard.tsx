"use client";

import Link from "next/link";

import type { PublisherCard, PublisherDashboardMetrics } from "@/lib/ops/studio/publisher/types";

type Props = {
  metrics: PublisherDashboardMetrics;
  columns: Record<
    "ready" | "extended" | "showcase" | "needs_coaching" | "blocked",
    PublisherCard[]
  >;
};

const COLUMN_META: Array<{
  key: keyof Props["columns"];
  label: string;
  hint: string;
}> = [
  { key: "ready", label: "Ready", hint: "Standard release — awaiting or approved" },
  { key: "extended", label: "Extended", hint: "Additional scenes — badge eligible" },
  { key: "showcase", label: "Showcase", hint: "Exceptional — promotion eligible" },
  { key: "needs_coaching", label: "Needs Coaching", hint: "Return to Editor or Director" },
  { key: "blocked", label: "Blocked", hint: "Cannot publish until fixed" },
];

function classBadge(className: string): string {
  return `rs-publisher-card__class rs-publisher-card__class--${className}`;
}

function PackageCard({ card }: { card: PublisherCard }) {
  return (
    <Link href={`/ops/studio/publisher/${card.rvtr}`} className="rs-publisher-card">
      <div className="rs-publisher-card__cover">
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.coverUrl} alt="" />
        ) : (
          <span className="rs-publisher-card__cover-fallback">{card.title.slice(0, 1)}</span>
        )}
      </div>
      <div className="rs-publisher-card__body">
        <p className="rs-publisher-card__artist">{card.artist}</p>
        <h3 className="rs-publisher-card__title">{card.title}</h3>
        <p className={classBadge(card.publicationClass)}>{card.publicationClass.replace("_", " ")}</p>
        <p className="rs-publisher-card__score">{card.qualityScore}% quality</p>
        <p className="rs-publisher-card__why">{card.why}</p>
        {card.approved ? (
          <p className="rs-publisher-card__live">Live for patrons</p>
        ) : card.awaitingReview ? (
          <p className="rs-publisher-card__await">Awaiting review</p>
        ) : null}
      </div>
    </Link>
  );
}

export function PublisherDashboard({ metrics, columns }: Props) {
  return (
    <div className="rs-publisher">
      <header className="rs-publisher__head">
        <h1 className="rs-publisher__title">Publisher</h1>
        <p className="rs-publisher__lead">
          Editorial quality laboratory — evaluate, classify, release, and learn what makes experiences unforgettable.
        </p>
        <p className="rs-publisher__subnav">
          <Link href="/ops/studio/publisher/lab">Quality Lab</Link>
          {" · "}
          <Link href="/ops/studio/publisher/museum">Museum Wall</Link>
        </p>
      </header>

      <section className="rs-publisher__metrics" aria-label="Publisher metrics">
        <article className="rs-publisher-metric">
          <p className="rs-publisher-metric__value">{metrics.ready}</p>
          <p className="rs-publisher-metric__label">Ready</p>
        </article>
        <article className="rs-publisher-metric">
          <p className="rs-publisher-metric__value">{metrics.extended}</p>
          <p className="rs-publisher-metric__label">Extended</p>
        </article>
        <article className="rs-publisher-metric">
          <p className="rs-publisher-metric__value">{metrics.showcase}</p>
          <p className="rs-publisher-metric__label">Showcase</p>
        </article>
        <article className="rs-publisher-metric">
          <p className="rs-publisher-metric__value">{metrics.needsCoaching}</p>
          <p className="rs-publisher-metric__label">Needs Coaching</p>
        </article>
        <article className="rs-publisher-metric">
          <p className="rs-publisher-metric__value">{metrics.blocked}</p>
          <p className="rs-publisher-metric__label">Blocked</p>
        </article>
        <article className="rs-publisher-metric rs-publisher-metric--wide">
          <p className="rs-publisher-metric__value">{metrics.averageQualityScore}%</p>
          <p className="rs-publisher-metric__label">Avg quality score</p>
        </article>
        <article className="rs-publisher-metric">
          <p className="rs-publisher-metric__value">
            {metrics.averagePublishTimeHours != null ? `${metrics.averagePublishTimeHours}h` : "—"}
          </p>
          <p className="rs-publisher-metric__label">Avg publish time</p>
        </article>
        <article className="rs-publisher-metric">
          <p className="rs-publisher-metric__value">{metrics.approvalRate}%</p>
          <p className="rs-publisher-metric__label">Approval rate</p>
        </article>
      </section>

      {metrics.topRejectionReasons.length > 0 ? (
        <section className="rs-publisher__reasons">
          <h2 className="rs-publisher__section-title">Most common rejection reasons</h2>
          <ul className="rs-publisher__reason-list">
            {metrics.topRejectionReasons.map((item) => (
              <li key={item.id}>
                <span>{item.reason}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="rs-publisher__board">
        {COLUMN_META.map((col) => (
          <section key={col.key} className="rs-publisher-column">
            <header className="rs-publisher-column__head">
              <h2 className="rs-publisher-column__title">{col.label}</h2>
              <p className="rs-publisher-column__count">{columns[col.key].length}</p>
              <p className="rs-publisher-column__hint">{col.hint}</p>
            </header>
            <div className="rs-publisher-column__cards">
              {columns[col.key].length === 0 ? (
                <p className="rs-publisher-column__empty">No packages</p>
              ) : (
                columns[col.key].map((card) => <PackageCard key={card.rvtr} card={card} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
