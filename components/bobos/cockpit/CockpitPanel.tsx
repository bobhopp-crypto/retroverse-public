"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { cellGridRef, cellLabel } from "@/lib/bobos/cockpit/defaults";
import type { CockpitPanelData } from "@/lib/bobos/cockpit/load-panel-data";
import type { PanelAction, PanelDefinition } from "@/lib/bobos/cockpit/types";
import type { Project } from "@/lib/bobos/project-zero/types";

type Props = {
  cellIndex: number;
  definition: PanelDefinition;
  project: Project | null;
  panelData: CockpitPanelData;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onChangePanel: () => void;
  onRemove: () => void;
};

function formatRecentWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function panelSummary(def: PanelDefinition, project: Project | null, data: CockpitPanelData): string {
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
    case "public-homepage": {
      const { statusLabel, eventTitle } = data.publicHomepage;
      if (!eventTitle) return statusLabel;
      return `${statusLabel} · ${eventTitle}`;
    }
    case "pass-registration": {
      const { totalPasses, registeredCount, recent } = data.passRegistration;
      if (totalPasses === 0) return "No passes generated yet";
      const recentLine =
        recent.length > 0
          ? ` · Latest: #${recent[0]!.serial} (${recent[0]!.name})`
          : "";
      return `${registeredCount} registered of ${totalPasses}${recentLine}`;
    }
    case "giveaway-panel": {
      const { prizeTitle, status, entryCount, winnerName } = data.giveaway;
      if (!prizeTitle) return "No giveaway configured yet";
      const winnerLine = winnerName ? ` · Winner: ${winnerName}` : "";
      return `${prizeTitle} · ${entryCount} entries · ${status ?? "draft"}${winnerLine}`;
    }
    case "live-display": {
      const { nowShowing, modeLabel, eventModeOn } = data.liveDisplay;
      const eventLine = eventModeOn ? "Event mode live" : "Event mode off";
      return `${nowShowing} · ${modeLabel} · ${eventLine}`;
    }
    default:
      return def.summary;
  }
}

function panelActions(def: PanelDefinition, data: CockpitPanelData): PanelAction[] {
  switch (def.id) {
    case "pass-registration": {
      const actions: PanelAction[] = [];
      if (data.passRegistration.testPassHref) {
        actions.push({
          label: "Open Registration Test",
          href: data.passRegistration.testPassHref,
        });
      }
      actions.push({ label: "View Registrations", href: "/bobos/passes" });
      return actions;
    }
    case "live-display":
      return [
        {
          label: "Open Live Display",
          href: data.liveDisplay.publicDisplayHref,
        },
        { label: "Open Live Control", href: "/ops/live-control" },
        { label: "Open VirtualDJ Bridge", href: "/bobos/bridge" },
      ];
    default: {
      const actions: PanelAction[] = [];
      if (def.primaryAction) actions.push(def.primaryAction);
      if (def.secondaryActions) actions.push(...def.secondaryActions);
      return actions;
    }
  }
}

export function CockpitPanel({
  cellIndex,
  definition,
  project,
  panelData,
  menuOpen,
  onToggleMenu,
  onChangePanel,
  onRemove,
}: Props) {
  const [liveSummary, setLiveSummary] = useState(() => panelSummary(definition, project, panelData));
  const actions = useMemo(() => panelActions(definition, panelData), [definition, panelData]);
  const [primaryAction, ...secondaryActions] = actions;

  useEffect(() => {
    setLiveSummary(panelSummary(definition, project, panelData));
    if (definition.id !== "clock") return;
    const timer = setInterval(() => setLiveSummary(panelSummary(definition, project, panelData)), 1000);
    return () => clearInterval(timer);
  }, [definition, project, panelData]);

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

      {liveSummary.includes(" · ") ? (
        /* Instrument readout — split the summary into stacked status lines */
        <ul className="cockpit-panel__metrics">
          {liveSummary.split(" · ").map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="cockpit-panel__data">{liveSummary}</p>
      )}

      {definition.id === "pass-registration" && panelData.passRegistration.recent.length > 0 ? (
        <ul className="cockpit-panel__list" aria-label="Recent pass registrations">
          {panelData.passRegistration.recent.map((entry) => (
            <li key={entry.serial}>
              #{entry.serial} · {entry.name} · {formatRecentWhen(entry.registeredAt)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="cockpit-panel__actions">
        {primaryAction ? (
          <Link href={primaryAction.href} className="cockpit-panel__btn cockpit-panel__btn--primary">
            {primaryAction.label}
          </Link>
        ) : (
          <span className="cockpit-panel__btn cockpit-panel__btn--disabled">No route</span>
        )}
        {secondaryActions.map((action) => (
          <Link key={`${action.href}-${action.label}`} href={action.href} className="cockpit-panel__btn cockpit-panel__btn--secondary">
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}
