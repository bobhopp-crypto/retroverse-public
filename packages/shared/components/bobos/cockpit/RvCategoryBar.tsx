"use client";

import { useState } from "react";
import { cockpitStatus } from "./cockpit-status";
import { cockpitPanelRegistryEntries } from "@/lib/bobos/cockpit/registry";
import { RV_CATEGORIES } from "@/lib/bobos/rv-registry";
import type { CockpitPanelData } from "@/lib/bobos/cockpit/load-panel-data";
import type { CockpitWorkspaceLayout, PanelTypeId } from "@/lib/bobos/cockpit/types";

type Props = { layout: CockpitWorkspaceLayout; panelData: CockpitPanelData; onSelectPanel: (panelType: PanelTypeId) => void };
const entries = cockpitPanelRegistryEntries();

export function RvCategoryBar({ layout, panelData, onSelectPanel }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const visible = new Set(layout.cells.map((cell) => cell.panelType).filter((id): id is PanelTypeId => Boolean(id)));
  const categories = [...RV_CATEGORIES.map((category) => ({ id: category.id, title: category.title })), ...(entries.some((entry) => entry.category === "UNASSIGNED") ? [{ id: "UNASSIGNED", title: "Needs RV Number" }] : [])];
  return <nav className="cockpit-rv-bar" aria-label="RV system categories">
    {categories.map((category) => {
      const open = openCategory === category.id;
      const categoryEntries = entries.filter((entry) => entry.category === category.id).sort((a, b) => Number(visible.has(b.component)) - Number(visible.has(a.component)));
      return <div className="cockpit-rv-bar__group" key={category.id}>
        <button type="button" className={`cockpit-rv-bar__button cockpit-rv-bar__button--${category.id.toLowerCase()}${open ? " cockpit-rv-bar__button--active" : ""}`} aria-expanded={open} onClick={() => setOpenCategory(open ? null : category.id)}>{category.id} <span aria-hidden="true">▼</span></button>
        {open ? <div className="cockpit-rv-picker" role="dialog" aria-label={`${category.id} panel picker`}>
          <div className="cockpit-rv-picker__head"><strong>{category.id} · {category.title}</strong><span>{categoryEntries.length} panels</span></div>
          <div className="cockpit-rv-picker__grid">
            {categoryEntries.map((entry) => {
              const status = cockpitStatus(entry, panelData);
              const alreadyVisible = visible.has(entry.component);
              return <button type="button" className={`cockpit-rv-card cockpit-rv-card--${status.tone}${alreadyVisible ? " cockpit-rv-card--visible" : ""}`} key={entry.id} disabled={alreadyVisible} onClick={() => { setOpenCategory(null); onSelectPanel(entry.component); }}>
                <span className="cockpit-rv-card__id">{entry.rvId ?? "NO RV NUMBER"}</span>
                <strong>{entry.title}</strong>
                <span className="cockpit-rv-card__status"><span className={`cockpit-lamp cockpit-lamp--${status.tone}`} />{status.label}</span>
                <span className="cockpit-rv-card__metric">{entry.id === "catalog-integrity" ? `${panelData.catalogIntegrity.totalOpenIssues.toLocaleString()} ISSUES` : status.label.toUpperCase()}</span>
                {alreadyVisible ? <small>● ON COCKPIT</small> : null}
              </button>;
            })}
          </div>
        </div> : null}
      </div>;
    })}
  </nav>;
}
