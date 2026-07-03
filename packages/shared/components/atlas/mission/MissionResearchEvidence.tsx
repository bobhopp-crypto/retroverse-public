"use client";

import {
  tierLabel,
  type MissionConfidenceTier,
} from "@/lib/atlas/mission-confidence";
import type { MissionEvidenceSignal } from "@/lib/atlas/mission-types";

export function MissionConfidenceBadge({
  tier,
  confidencePct,
}: {
  tier: MissionConfidenceTier;
  confidencePct?: number;
}) {
  return (
    <span className={`atlas-confidence-badge atlas-confidence-badge--${tier}`}>
      {tierLabel(tier)}
      {confidencePct != null ? ` · ${confidencePct}%` : ""}
    </span>
  );
}

export function MissionResearchEvidence({
  title = "Why Retroverse thinks this",
  signals,
  tier,
  confidencePct,
}: {
  title?: string;
  signals: MissionEvidenceSignal[];
  tier?: MissionConfidenceTier;
  confidencePct?: number;
}) {
  if (signals.length === 0) return null;

  return (
    <div className="atlas-research-evidence">
      <div className="atlas-research-evidence__head">
        <h4 className="atlas-research-evidence__title">{title}</h4>
        {tier ? <MissionConfidenceBadge tier={tier} confidencePct={confidencePct} /> : null}
      </div>
      <ul className="atlas-research-evidence__list">
        {signals.map((signal) => (
          <li key={signal.id} className="atlas-research-evidence__item">
            <span className="atlas-research-evidence__label">{signal.label}</span>
            <span className="atlas-research-evidence__detail">{signal.detail}</span>
            <span className="atlas-research-evidence__source">{signal.source}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
