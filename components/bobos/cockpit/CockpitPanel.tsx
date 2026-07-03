"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cellGridRef, cellLabel } from "@/lib/bobos/cockpit/defaults";
import type { PanelDefinition } from "@/lib/bobos/cockpit/types";
import type { Project } from "@/lib/bobos/project-zero/types";

type Props = {
  cellIndex: number;
  definition: PanelDefinition;
  project: Project | null;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onChangePanel: () => void;
  onRemove: () => void;
};

function panelSummary(def: PanelDefinition, project: Project | null): string {
  switch (def.id) {
    case "current-event":
      return project?.sharedContext.title || project?.title || "No active project";
    case "todays-tasks":
      return project ? `${project.workspaces.filter((w) => w.status !== "DONE").length} open workspaces` : "No tasks loaded";
    case "production-queue":
      return project ? `Project: ${project.title}` : "Queue idle";
    case "git-status":
      return "Working tree — local dev";
    case "system-health":
      return "Ops gate active · services OK";
    case "storage":
      return "RETROVERSE_DATA mounted";
    case "database-health":
      return "Graph index reachable";
    case "clock":
      return new Date().toLocaleTimeString();
    default:
      return def.summary;
  }
}

export function CockpitPanel({
  cellIndex,
  definition,
  project,
  menuOpen,
  onToggleMenu,
  onChangePanel,
  onRemove,
}: Props) {
  const [liveSummary, setLiveSummary] = useState(() => panelSummary(definition, project));

  useEffect(() => {
    setLiveSummary(panelSummary(definition, project));
    if (definition.id !== "clock") return;
    const timer = setInterval(() => setLiveSummary(panelSummary(definition, project)), 1000);
    return () => clearInterval(timer);
  }, [definition, project]);

  const statusClass = `cockpit-lamp cockpit-lamp--${definition.defaultStatus === "nominal" ? "green" : definition.defaultStatus === "warning" ? "amber" : definition.defaultStatus === "alert" ? "red" : "dim"}`;

  return (
    <article className="cockpit-cell cockpit-cell--filled">
      <header className="cockpit-panel__head">
        <span className="cockpit-panel__num">{cellLabel(cellIndex)}</span>
        <span className="cockpit-panel__ref">{cellGridRef(cellIndex)}</span>
        <h2 className="cockpit-panel__title">{definition.title}</h2>
        <span className={statusClass} title={definition.defaultStatus} aria-hidden="true" />
        <div className="cockpit-panel__menu-wrap">
          <button
            type="button"
            className="cockpit-panel__menu-btn"
            aria-expanded={menuOpen}
            aria-label={`Panel menu for ${definition.title}`}
            onClick={onToggleMenu}
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="cockpit-panel__menu" role="menu">
              <button type="button" role="menuitem" onClick={onChangePanel}>
                Change Panel
              </button>
              <button type="button" role="menuitem" onClick={onRemove}>
                Remove Panel
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <p className="cockpit-panel__data">{liveSummary}</p>

      <div className="cockpit-panel__actions">
        {definition.primaryAction ? (
          <Link href={definition.primaryAction.href} className="cockpit-panel__btn cockpit-panel__btn--primary">
            {definition.primaryAction.label}
          </Link>
        ) : (
          <span className="cockpit-panel__btn cockpit-panel__btn--disabled">No route</span>
        )}
        {definition.secondaryActions?.map((action) => (
          <Link key={action.href} href={action.href} className="cockpit-panel__btn cockpit-panel__btn--secondary">
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}
