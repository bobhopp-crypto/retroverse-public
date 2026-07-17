"use client";

import Link from "next/link";

import type { CockpitCatalogIntegrityData } from "@/lib/bobos/cockpit/load-panel-data";

type Props = {
  data: CockpitCatalogIntegrityData;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function CatalogIntegrityPanel({ data }: Props) {
  return (
    <>
      <div className="cockpit-integrity">
        <div className="cockpit-integrity__status">
          <span>Status</span>
          <strong>{data.status}</strong>
        </div>
        <div className="cockpit-integrity__total">
          <span>Open Issues</span>
          <strong>{formatNumber(data.totalOpenIssues)}</strong>
        </div>
        <dl className="cockpit-integrity__counts">
          <div><dt>Duplicate Artists</dt><dd>{formatNumber(data.duplicateArtists)}</dd></div>
          <div><dt>Duplicate Albums</dt><dd>{formatNumber(data.duplicateAlbums)}</dd></div>
          <div><dt>Duplicate Tracks</dt><dd>{formatNumber(data.duplicateTracks)}</dd></div>
          <div><dt>Alias Conflicts</dt><dd>{formatNumber(data.aliasConflicts)}</dd></div>
          <div><dt>Missing Covers</dt><dd>{formatNumber(data.missingCovers)}</dd></div>
        </dl>
        <p className="cockpit-integrity__thresholds">
          Healthy: 0 · Attention: 1-99 · Critical: 100+
        </p>
      </div>
      <div className="cockpit-panel__actions">
        <Link href="/ops/integrity" className="cockpit-panel__btn cockpit-panel__btn--primary">
          Open Integrity Dashboard
        </Link>
      </div>
    </>
  );
}
