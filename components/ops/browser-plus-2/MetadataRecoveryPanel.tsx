"use client";

import type { Bp2MetadataImpact, Bp2Row } from "@/lib/ops/browser-plus-2/types";

type MetadataRecoveryPanelProps = {
  row: Bp2Row;
  impact: Bp2MetadataImpact;
};

function confidenceLabel(confidence: Bp2Row["recoveryConfidence"]): string {
  switch (confidence) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "None";
  }
}

export function MetadataRecoveryPanel({ row, impact }: MetadataRecoveryPanelProps) {
  if (!row.missingXmlMetadata) return null;

  const showRecovery = row.hasFilenameRecovery && row.recoveredArtist && row.recoveredTitle;

  return (
    <section className="bp2__panel bp2__panel--recovery">
      <h3>Data Repair · Metadata Recovery</h3>
      <p className="bp2__muted bp2__recovery-note">
        Metadata orphan — XML is missing Artist and/or Title. VirtualDJ shows filename-inferred values;
        Browser Plus reads XML only until repair is approved.
      </p>

      <div className="bp2__recovery-grid">
        <div className="bp2__recovery-col">
          <h4>XML Metadata</h4>
          <ul className="bp2__kv">
            <li><span>Artist</span><strong>{row.hasXmlArtist ? row.artist : "—"}</strong></li>
            <li><span>Title</span><strong>{row.hasXmlTitle ? row.title : "—"}</strong></li>
          </ul>
        </div>

        {showRecovery ? (
          <div className="bp2__recovery-col">
            <h4>Filename Recovery</h4>
            <ul className="bp2__kv">
              <li><span>Artist</span><strong>{row.recoveredArtist}</strong></li>
              <li><span>Title</span><strong>{row.recoveredTitle}</strong></li>
            </ul>
            <p className="bp2__recovery-confidence">
              Recovery Confidence: <strong>{confidenceLabel(row.recoveryConfidence)}</strong>
            </p>
          </div>
        ) : (
          <div className="bp2__recovery-col">
            <h4>Filename Recovery</h4>
            <p className="bp2__muted">No confident recovery available for this filename.</p>
          </div>
        )}
      </div>

      <div className="bp2__recovery-impact">
        <h4>Impact (library-wide)</h4>
        <ul className="bp2__impact-list">
          <li><span>Missing metadata rows</span><strong>{impact.missingMetadata}</strong></li>
          <li><span>Recoverable (high confidence)</span><strong>{impact.recoverableMetadata}</strong></li>
          <li><span>Unidentified among missing</span><strong>{impact.unidentifiedAmongMissing}</strong></li>
          <li><span>With RVTR among missing</span><strong>{impact.withRvtrAmongMissing}</strong></li>
          <li><span>Match blocked now (empty XML artist/title)</span><strong>{impact.matchBlockedNow}</strong></li>
          <li><span>Auto-matchable after recovery</span><strong>{impact.autoMatchableAfterRecovery}{impact.graphAvailable ? "" : " (estimate)"}</strong></li>
          <li><span>Review-matchable after recovery</span><strong>{impact.reviewMatchableAfterRecovery}{impact.graphAvailable ? "" : " (estimate)"}</strong></li>
        </ul>
      </div>

      <div className="bp2__repair-flow">
        <h4>Proposed Repair Workflow</h4>
        <ol className="bp2__repair-steps">
          <li className="bp2__repair-step bp2__repair-step--active">Missing Metadata</li>
          <li className="bp2__repair-step bp2__repair-step--active">Preview Recovery</li>
          <li className="bp2__repair-step">Approve</li>
          <li className="bp2__repair-step">Write XML Artist/Title</li>
          <li className="bp2__repair-step">Re-run Matching</li>
        </ol>
        <p className="bp2__muted">
          Steps 3–5 are not implemented. No automatic writes. No VirtualDJ XML modifications.
        </p>
      </div>
    </section>
  );
}
