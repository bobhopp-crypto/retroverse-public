"use client";

type HarvestExportConflict = {
  exportedPath: string;
  title: string;
  type: string;
};

type HarvestExportConflictModalProps = {
  conflicts: HarvestExportConflict[];
  busy?: boolean;
  onSkip: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onCancel: () => void;
};

export function HarvestExportConflictModal(props: HarvestExportConflictModalProps) {
  return (
    <div className="ops-ml-harvest-modal" role="dialog" aria-modal="true" aria-labelledby="harvest-conflict-title">
      <div className="ops-ml-harvest-modal__backdrop" onClick={() => props.onCancel()} />
      <div className="ops-ml-harvest-modal__card">
        <h3 id="harvest-conflict-title" className="ops-ml-harvest-modal__title">
          Existing clips found
        </h3>
        <p className="ops-ml-harvest-modal__lead">
          {props.conflicts.length} file{props.conflicts.length === 1 ? "" : "s"} already exist in the
          harvest library.
        </p>
        <ul className="ops-ml-harvest-modal__list">
          {props.conflicts.slice(0, 8).map((c) => (
            <li key={c.exportedPath}>
              <strong>{c.type}</strong> · {c.exportedPath.split("/").pop()}
            </li>
          ))}
          {props.conflicts.length > 8 ? (
            <li className="ops-ml-harvest-modal__more">+ {props.conflicts.length - 8} more</li>
          ) : null}
        </ul>
        <div className="ops-ml-harvest-modal__actions">
          <button
            type="button"
            className="ops-btn"
            disabled={props.busy}
            onClick={() => props.onSkip()}
          >
            Skip
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={props.busy}
            onClick={() => props.onReplace()}
          >
            Replace
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--ok"
            disabled={props.busy}
            onClick={() => props.onReplaceAll()}
          >
            Replace All
          </button>
        </div>
      </div>
    </div>
  );
}
