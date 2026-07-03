"use client";

import type { SourceDiscoveryDrawerPayload } from "@/lib/ops/year-workspace/source-discovery/types";
import type { SourceCandidate } from "@/lib/ops/year-workspace/source-discovery/types";

function SourceGroup(props: {
  label: string;
  candidates: SourceCandidate[];
  busySourceId: string | null;
  onSelect: (sourceId: string) => void;
  onReject: (sourceId: string) => void;
}) {
  if (props.candidates.length === 0) {
    return (
      <div className="ops-yw-drawer__group">
        <h4 className="ops-yw-drawer__group-title">{props.label}</h4>
        <p className="ops-dim ops-yw-drawer__empty">No candidates.</p>
      </div>
    );
  }

  return (
    <div className="ops-yw-drawer__group">
      <h4 className="ops-yw-drawer__group-title">{props.label}</h4>
      <ul className="ops-yw-drawer__list">
        {props.candidates.map((c) => (
          <li
            key={c.id}
            className={`ops-yw-drawer__item${
              c.status === "selected"
                ? " ops-yw-drawer__item--selected"
                : c.status === "rejected"
                  ? " ops-yw-drawer__item--rejected"
                  : ""
            }`}
          >
            <div className="ops-yw-drawer__item-main">
              <span className="ops-yw-drawer__item-title">{c.title}</span>
              <a
                className="ops-yw-drawer__link ops-mono"
                href={c.url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => e.stopPropagation()}
              >
                Open search
              </a>
              <span className="ops-dim ops-yw-drawer__query">{c.query}</span>
            </div>
            {c.status === "pending" || c.status === "reviewed" ? (
              <span className="ops-yw-actions">
                <button
                  type="button"
                  className="ops-yw-action ops-yw-action--on"
                  disabled={props.busySourceId === c.id}
                  onClick={() => props.onSelect(c.id)}
                >
                  Select
                </button>
                <button
                  type="button"
                  className="ops-yw-action"
                  disabled={props.busySourceId === c.id}
                  onClick={() => props.onReject(c.id)}
                >
                  Reject
                </button>
              </span>
            ) : (
              <span className="ops-dim ops-yw-drawer__status">{c.status}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function YearWorkspaceSourceDrawer(props: {
  open: boolean;
  busySourceId: string | null;
  drawer: SourceDiscoveryDrawerPayload | null;
  onClose: () => void;
  onSelect: (sourceId: string) => void;
  onReject: (sourceId: string) => void;
}) {
  if (!props.open || !props.drawer) return null;

  const { drawer } = props;

  return (
    <div
      className="ops-yw-drawer-backdrop"
      role="presentation"
      onClick={props.onClose}
    >
      <aside
        className="ops-yw-drawer"
        role="dialog"
        aria-labelledby="ops-yw-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ops-yw-drawer__head">
          <div>
            <p className="ops-yw-drawer__kicker">Source discovery</p>
            <h3 id="ops-yw-drawer-title" className="ops-yw-drawer__title">
              {drawer.recommendationTitle}
            </h3>
          </div>
          <button
            type="button"
            className="ops-modal__close"
            aria-label="Close"
            onClick={props.onClose}
          >
            ×
          </button>
        </header>
        <p className="ops-dim ops-yw-drawer__hint">
          Local search candidates — open links to review, then Select to add to Acquisition
          Queue.
        </p>
        <SourceGroup
          label="YouTube"
          candidates={drawer.youtube}
          busySourceId={props.busySourceId}
          onSelect={props.onSelect}
          onReject={props.onReject}
        />
        <SourceGroup
          label="Internet Archive"
          candidates={drawer.internetArchive}
          busySourceId={props.busySourceId}
          onSelect={props.onSelect}
          onReject={props.onReject}
        />
      </aside>
    </div>
  );
}
