"use client";

import type { ActiveYearBridge } from "@/lib/ops/year-workspace/active-year-bridge";
import {
  formatRotationSignal,
  VDJ_ROTATION_LABEL,
} from "@/lib/ops/year-workspace/vdj-rotation-signal";
import { ClassButtonGroup } from "@/components/ops/year-workspace/ClassButtonGroup";
import { RetroverseTagsBlock } from "@/components/ops/year-workspace/RetroverseTagsBlock";
import type { ReviewClassification } from "@/lib/ops/year-workspace/review-types";
import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import type { YearWorkspaceRow } from "@/lib/ops/year-workspace/types";

function activeYearBadge(year: number): string {
  return `[${year}]`;
}

export function ReviewVideoCard(props: {
  row: YearWorkspaceRow;
  bridge: ActiveYearBridge | null;
  busy: boolean;
  onClassChange: (classification: ReviewClassification) => void;
  onTagToggle: (tagId: RvTagId) => void;
}) {
  const hasBridge = (props.bridge?.bridgeYears.length ?? 0) > 0;
  const tier = props.bridge?.tier ?? "none";
  const borderClass =
    tier === "full"
      ? "ops-ru-card--bridge-gold"
      : tier === "single"
        ? "ops-ru-card--bridge-blue"
        : "";

  return (
    <article
      className={`ops-ru-card${hasBridge ? " ops-ru-card--has-bridge" : ""}${borderClass ? ` ${borderClass}` : ""}`}
    >
      {hasBridge ? (
        <div className="ops-ru-card__bridge-bar" aria-label="Active chart years">
          <span className="ops-ru-card__bridge-label">Active</span>
          <span className="ops-ru-card__bridge-years">
            {props.bridge!.bridgeYears.map((y) => (
              <span key={y} className="ops-ru-card__bridge-year">
                {activeYearBadge(y)}
              </span>
            ))}
          </span>
        </div>
      ) : null}

      <header className="ops-ru-card__head">
        <div className="ops-ru-card__titles">
          <h3 className="ops-ru-card__artist">{props.row.artist}</h3>
          <p className="ops-ru-card__title">{props.row.title}</p>
        </div>
        <div className="ops-ru-card__meta">
          {props.row.playCount != null ? (
            <span className="ops-ru-card__plays" title="VDJ play count">
              {VDJ_ROTATION_LABEL} {formatRotationSignal(props.row.playCount)}
            </span>
          ) : (
            <span className="ops-ru-card__plays ops-ru-card__plays--none">No plays</span>
          )}
        </div>
      </header>

      <div className="ops-ru-card__body">
        <div className="ops-ru-card__section">
          <p className="ops-ru-card__label">Retroverse Tags</p>
          <RetroverseTagsBlock
            tags={props.row.historicalTags}
            disabled={props.busy}
            onToggle={props.onTagToggle}
          />
        </div>

        <div className="ops-ru-card__section">
          <p className="ops-ru-card__label">Classification</p>
          <ClassButtonGroup
            value={props.row.classification}
            disabled={props.busy}
            onChange={props.onClassChange}
          />
        </div>
      </div>
    </article>
  );
}
