"use client";

import { RvIdLabel } from "@/components/bobos/rv-ids";
import { panelsInGroup, COCKPIT_PANEL_GROUPS as PANEL_LIBRARY_GROUPS } from "@/lib/bobos/cockpit/registry";
import { PANEL_GROUP_LABELS, type PanelTypeId } from "@/lib/bobos/cockpit/types";
import { getPanelRegistryLabel, getRvIdByPanelType } from "@/lib/bobos/rv-ids";
import { RV_CATEGORY_BY_ID, RV_REGISTRY } from "@/lib/bobos/rv-registry";
import { useMemo, useState } from "react";

type Props = {
  cellRef: string;
  onSelect: (panelType: PanelTypeId) => void;
  onClose: () => void;
};

export function PanelLibraryModal({ cellRef, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [workspace, setWorkspace] = useState("all");
  const registered = useMemo(() => RV_REGISTRY.filter((entry) => entry.panelEligible && entry.panelType), []);
  const filtered = registered.filter((entry) => {
    const panel = entry.panelType ? panelsInGroup("attention").concat(panelsInGroup("build"), panelsInGroup("catalog"), panelsInGroup("devices")).find((item) => item.id === entry.panelType) : undefined;
    const haystack = `${entry.id} ${entry.title} ${entry.description}`.toLowerCase();
    return panel && (!query || haystack.includes(query.toLowerCase())) && (category === "all" || entry.category === category) && (status === "all" || entry.status === status) && (workspace === "all" || entry.workspace === workspace);
  });
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
          <div className="cockpit-library-filters">
            <input aria-label="Search panels" placeholder="Search panels…" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{Object.values(RV_CATEGORY_BY_ID).map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</select>
            <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{["Active", "Experimental", "Hidden", "Deprecated", "Retired"].map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Filter by workspace" value={workspace} onChange={(event) => setWorkspace(event.target.value)}><option value="all">All workspaces</option>{[...new Set(registered.map((item) => item.workspace))].map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          {PANEL_LIBRARY_GROUPS.map((group) => (
            <section key={group} className="cockpit-library-group">
              <h3 className="cockpit-library-group__title">{PANEL_GROUP_LABELS[group]}</h3>
              <ul className="cockpit-library-group__list">
                {panelsInGroup(group).filter((panel) => filtered.some((entry) => entry.panelType === panel.id)).map((panel) => (
                  <li key={panel.id}>
                    <button type="button" className="cockpit-library-item" onClick={() => onSelect(panel.id)}>
                      <span className="cockpit-library-item__title">
                        <RvIdLabel
                          rvId={getRvIdByPanelType(panel.id)}
                          label={getPanelRegistryLabel(panel.id, panel.title)}
                        />
                      </span>
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
