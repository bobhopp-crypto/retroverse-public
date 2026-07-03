"use client";

import { panelsInGroup, PANEL_LIBRARY_GROUPS } from "@/lib/bobos/cockpit/panel-library";
import { PANEL_GROUP_LABELS, type PanelTypeId } from "@/lib/bobos/cockpit/types";

type Props = {
  cellRef: string;
  onSelect: (panelType: PanelTypeId) => void;
  onClose: () => void;
};

export function PanelLibraryModal({ cellRef, onSelect, onClose }: Props) {
  return (
    <div className="cockpit-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cockpit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cockpit-library-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cockpit-modal__head">
          <div>
            <p className="cockpit-modal__kicker">Panel Library</p>
            <h2 id="cockpit-library-title" className="cockpit-modal__title">
              Assign to cell {cellRef}
            </h2>
          </div>
          <button type="button" className="cockpit-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="cockpit-modal__body">
          {PANEL_LIBRARY_GROUPS.map((group) => (
            <section key={group} className="cockpit-library-group">
              <h3 className="cockpit-library-group__title">{PANEL_GROUP_LABELS[group]}</h3>
              <ul className="cockpit-library-group__list">
                {panelsInGroup(group).map((panel) => (
                  <li key={panel.id}>
                    <button type="button" className="cockpit-library-item" onClick={() => onSelect(panel.id)}>
                      <span className="cockpit-library-item__title">{panel.title}</span>
                      <span className="cockpit-library-item__summary">{panel.summary}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
