"use client";

import { useEffect, useMemo, useState } from "react";

import { getPanelDocumentation } from "@/lib/bobos/cockpit/panel-docs";
import { isPanelVerified } from "@/lib/bobos/cockpit/panel-verification";
import type { CockpitPanelData } from "@/lib/bobos/cockpit/load-panel-data";
import type { PanelAction, PanelDefinition } from "@/lib/bobos/cockpit/types";
import { getRvIdByPanelType } from "@/lib/bobos/rv-ids";
import { RV_CATEGORY_BY_ID, getRvByPanelType } from "@/lib/bobos/rv-registry";
import type { Project } from "@/lib/bobos/project-zero/types";

import { cockpitStatus } from "./cockpit-status";
import { PanelDocumentationDrawer } from "./PanelDocumentationDrawer";
import { PanelVerifiedBadge } from "./PanelVerifiedBadge";

type Props = {
  cellIndex: number;
  definition: PanelDefinition;
  project: Project | null;
  panelData: CockpitPanelData;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onChangePanel: () => void;
  onRemove: () => void;
  /** Render slot for app-specific panels (e.g. Studio's Runtime panel).
   *  Kept as a prop so packages/shared never imports Studio-only server actions. */
  renderAppPanel?: (id: string) => React.ReactNode;
  placementMode?: boolean;
  onPlacementSelect?: () => void;
  cellConfig?: Record<string, string>;
  onRename?: (title: string) => void;
};

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
      return def.summary;
    case "public-homepage": {
      const { statusLabel, eventTitle } = data.publicHomepage;
      if (!eventTitle) return statusLabel;
      return `${statusLabel} · ${eventTitle}`;
    }
    case "pass-management": {
      const { totalPasses, registeredCount, recent } = data.passClaims;
      if (totalPasses === 0) return "No passes in claim inventory yet";
      const recentLine =
        recent.length > 0
          ? ` · Latest: ${recent[0]!.serial} (${recent[0]!.name})`
          : "";
      return `${registeredCount} claimed of ${totalPasses}${recentLine}`;
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
    case "pass-management": {
      // Cockpit faceplate click uses actions[0]. Always open the BobOS operator
      // route first — never Live /pass/[serial] on Studio (that path hangs / 404s).
      const actions: PanelAction[] = [
        { label: "Open Pass Management", href: "/bobos/pass-management" },
        { label: "Docs", href: "/bobos/docs/RV02-05" },
      ];
      if (data.passClaims.testPassHref) {
        actions.push({
          label: "Open Public Claim",
          href: data.passClaims.testPassHref,
        });
      }
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
  renderAppPanel,
  placementMode = false,
  onPlacementSelect,
  cellConfig,
  onRename,
}: Props) {
  const isClock = definition.id === "clock";
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [liveSummary, setLiveSummary] = useState(() => panelSummary(definition, project, panelData));
  const [activationMessage, setActivationMessage] = useState<string | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const actions = useMemo(() => panelActions(definition, panelData), [definition, panelData]);
  const primaryAction = actions[0];
  const summaryText = isClock ? (clockTime ?? "") : liveSummary;
  const panelDocs = useMemo(() => getPanelDocumentation(definition.id), [definition.id]);
  const verified = isPanelVerified(definition.id);

  useEffect(() => {
    if (isClock) {
      const tick = () => setClockTime(new Date().toLocaleTimeString());
      tick();
      const timer = setInterval(tick, 1000);
      return () => clearInterval(timer);
    }

    setLiveSummary(panelSummary(definition, project, panelData));
  }, [definition, project, panelData, isClock]);

  const status = cockpitStatus(definition, panelData);
  const statusClass = `cockpit-lamp cockpit-lamp--${status.tone}`;
  const faceplateTitle = cellConfig?.faceplateTitle?.trim() || definition.title;
  const rvCategory = (getRvByPanelType(definition.id)?.category ?? "unassigned").toLowerCase();
  const rvCategoryId = getRvByPanelType(definition.id)?.category;
  const rvCategoryLabel = rvCategoryId ? RV_CATEGORY_BY_ID[rvCategoryId].title : "Unassigned";

  async function activateModule() {
    if (placementMode) {
      onPlacementSelect?.();
      return;
    }
    if (definition.id === "six-up-viewer") {
      setActivationMessage("Checking Live…");
      try {
        const response = await fetch("/api/bobos/runtime/live-viewer", { method: "POST", cache: "no-store" });
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error ?? "Live server could not be started.");
        window.location.assign(data.url);
      } catch (error) {
        setActivationMessage(error instanceof Error ? error.message : "Live server could not be started.");
        window.setTimeout(() => setActivationMessage(null), 5000);
      }
      return;
    }
    if (primaryAction?.href) window.location.assign(primaryAction.href);
  }

  function editFaceplate() {
    const next = window.prompt("Rename faceplate", faceplateTitle)?.trim();
    if (next && next !== faceplateTitle) onRename?.(next);
  }

  return (
    <>
      <article
        onClick={activateModule}
        onDoubleClick={(event) => { event.stopPropagation(); editFaceplate(); }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activateModule(); } }}
        role="button"
        tabIndex={0}
        aria-label={`${definition.title}: ${status.label}${verified ? "; Verified" : ""}`}
        className={`cockpit-cell cockpit-cell--filled cockpit-module cockpit-module--${status.tone} cockpit-module--${rvCategory}${placementMode ? " cockpit-cell--placement-target" : ""}`}
        style={{ "--rv-category-accent": RV_CATEGORY_BY_ID[getRvByPanelType(definition.id)?.category ?? "RV01"].accent } as React.CSSProperties}
      >
        <header className="cockpit-panel__head">
          <h2 className="cockpit-panel__title">
            {faceplateTitle}
          </h2>
        </header>
        <span className={statusClass} title={status.label} aria-label={`Status: ${status.label}`} role="status" />
        {verified && panelDocs ? (
          <PanelVerifiedBadge onOpen={() => setDocsOpen(true)} />
        ) : null}

        <p className="cockpit-panel__data">{isClock ? summaryText : status.label}</p>
        {activationMessage ? <span className="cockpit-module__activation" role="status">{activationMessage}</span> : null}
        <span className="cockpit-module__rv-id">{getRvIdByPanelType(definition.id) ?? "NO RV NUMBER"}</span>
        <span className="cockpit-module__category">{rvCategoryLabel}</span>
      </article>
      {docsOpen && panelDocs ? (
        <PanelDocumentationDrawer docs={panelDocs} onClose={() => setDocsOpen(false)} />
      ) : null}
    </>
  );
}
