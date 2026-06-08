"use client";

import Link from "next/link";

import type { ReviewDiscoveryBundle, ReviewDiscoveryHit } from "@/lib/ops/year-workspace/review-discovery";
import { REVIEW_PILOT_ACTIVE_YEARS } from "@/lib/ops/year-workspace/review-pilot";
import type { YearWorkspaceRow } from "@/lib/ops/year-workspace/types";

function DiscoveryList(props: {
  title: string;
  hits: ReviewDiscoveryHit[];
  empty: string;
}) {
  if (props.hits.length === 0) {
    return (
      <div className="ops-ru-disc__section">
        <h4 className="ops-ru-disc__heading">{props.title}</h4>
        <p className="ops-dim ops-ru-disc__empty">{props.empty}</p>
      </div>
    );
  }

  return (
    <div className="ops-ru-disc__section">
      <h4 className="ops-ru-disc__heading">
        {props.title} <span className="ops-ru-disc__count">{props.hits.length}</span>
      </h4>
      <ul className="ops-ru-disc__list">
        {props.hits.map((hit, i) => (
          <li key={`${hit.kind}-${i}-${hit.title}-${hit.year}`} className="ops-ru-disc__item">
            <span className="ops-strong">
              {hit.artist} — {hit.title}
            </span>
            {hit.year != null ? (
              <span className="ops-ru-disc__meta">
                {hit.peak != null ? `#${hit.peak}` : ""}
                {hit.year ? ` · ${hit.year}` : ""}
              </span>
            ) : null}
            {hit.rvtr ? (
              <Link className="ops-link ops-ru-disc__rvtr" href={`/track/${hit.rvtr}`}>
                {hit.rvtr}
              </Link>
            ) : null}
            {hit.detail ? <span className="ops-dim ops-ru-disc__detail">{hit.detail}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewUniverseDiscoveryPanel(props: {
  focusRow: YearWorkspaceRow | null;
  discovery: ReviewDiscoveryBundle | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  if (!props.focusRow) return null;

  return (
    <aside className="ops-ru-disc" aria-label="Cross-year discovery">
      <header className="ops-ru-disc__head">
        <div>
          <p className="ops-ru-disc__kicker">Cross-year discovery</p>
          <h3 className="ops-ru-disc__title">
            {props.focusRow.artist} — {props.focusRow.title}
          </h3>
          <p className="ops-dim ops-ru-disc__sub">
            Peak #{props.focusRow.peak ?? "?"} · searches full Retroverse + VDJ catalogs
          </p>
        </div>
        <button type="button" className="ops-btn" onClick={props.onClose}>
          Close
        </button>
      </header>

      <p className="ops-ru-disc__active">
        Active pilot years: {REVIEW_PILOT_ACTIVE_YEARS.join(" · ")}
      </p>

      {props.loading ? (
        <p className="ops-empty">Searching catalogs…</p>
      ) : props.error ? (
        <p className="ops-empty">{props.error}</p>
      ) : props.discovery ? (
        <>
          <DiscoveryList
            title="Same artist · active years"
            hits={props.discovery.sameArtistActiveYears}
            empty="No other chart rows for this artist in 1967 / 1978 / 1992."
          />
          <DiscoveryList
            title="Same song · other years"
            hits={props.discovery.sameSongOtherYears}
            empty="No matching title on Hot 100 in other years."
          />
          <DiscoveryList
            title="Related chart appearances"
            hits={props.discovery.relatedAppearances}
            empty="No chart history for this RVTR / graph track."
          />
          <DiscoveryList
            title="Retroverse catalog"
            hits={props.discovery.retroverseCatalog}
            empty="No canonical track matches."
          />
          <DiscoveryList
            title="VDJ catalog"
            hits={props.discovery.vdjCatalog}
            empty="No VDJ video library matches."
          />
        </>
      ) : null}
    </aside>
  );
}
