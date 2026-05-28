"use client";

import type { CoverAuditHashRow } from "@/lib/cover-integrity/load-cover-audit-csv";
import {
  humanIssueSummary,
  humanProposedReason,
  humanTrustLabel,
  type CoverTechnicalDetails,
} from "@/lib/cover-integrity/cover-human-labels";

type Props = {
  details: CoverTechnicalDetails;
  hashSiblings?: CoverAuditHashRow[];
};

export function OpsCoverTechnicalDetails({ details, hashSiblings }: Props) {
  return (
    <details className="ops-cover-tech">
      <summary className="ops-cover-tech__summary">Show technical details</summary>
      <dl className="ops-cover-tech__dl">
        {details.batchId ? (
          <>
            <dt>Review set</dt>
            <dd>{details.batchId}</dd>
          </>
        ) : null}
        <dt>Album ID</dt>
        <dd>{details.rval}</dd>
        <dt>Status</dt>
        <dd>
          {humanTrustLabel(details.trustTier)} ({details.trustTier})
        </dd>
        <dt>Why flagged</dt>
        <dd>{humanIssueSummary(details.issueReason)}</dd>
        <dt>Raw flags</dt>
        <dd className="ops-cover-tech__mono">{details.issueReason || "—"}</dd>
        <dt>Same image count</dt>
        <dd>{details.duplicateHashCount}</dd>
        <dt>Image fingerprint (current)</dt>
        <dd className="ops-cover-tech__mono">{details.currentHash ?? "—"}</dd>
        <dt>Image fingerprint (suggested)</dt>
        <dd className="ops-cover-tech__mono">{details.proposedHash ?? "—"}</dd>
        <dt>Suggestion source</dt>
        <dd>{details.proposedSource || "—"}</dd>
        <dt>Suggestion score</dt>
        <dd>{details.proposedConfidence}%</dd>
        <dt>Suggestion note</dt>
        <dd>{humanProposedReason(details.proposedReason)}</dd>
        <dt>Current file</dt>
        <dd className="ops-cover-tech__mono">{details.currentCoverPath ?? "—"}</dd>
        <dt>Suggested path / URL</dt>
        <dd className="ops-cover-tech__mono">{details.proposedCoverUrlOrPath || "—"}</dd>
      </dl>
      {hashSiblings && hashSiblings.length >= 2 ? (
        <div className="ops-cover-tech__siblings">
          <p className="ops-cover-tech__siblings-title">
            Albums sharing the same image ({hashSiblings.length})
          </p>
          <ul>
            {hashSiblings.map((m) => (
              <li key={m.rval}>
                {m.artist} — {m.album}
                {m.releaseYear != null ? ` (${m.releaseYear})` : ""} · {m.rval}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </details>
  );
}
