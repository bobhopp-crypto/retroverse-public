"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { cellGridRef, cellLabel } from "@/lib/bobos/cockpit/defaults";
import { PANEL_DOCS_LIBRARY_HREF } from "@/lib/bobos/cockpit/panel-docs";
import { COCKPIT_COMMAND_BAR, getCockpitPanelRegistryEntry } from "@/lib/bobos/cockpit/registry";
import type { CockpitState, CockpitWorkspaceId, PanelTypeId } from "@/lib/bobos/cockpit/types";
import { COCKPIT_WORKSPACES } from "@/lib/bobos/cockpit/types";
import { layoutDefinitionFromWorkspace } from "@/lib/bobos/cockpit/layouts";
import type { CockpitPanelData } from "@/lib/bobos/cockpit/load-panel-data";
import type { Project } from "@/lib/bobos/project-zero/types";

import { CockpitPanel } from "./CockpitPanel";
import { cockpitStatus } from "./cockpit-status";
import { PanelLibraryModal } from "./PanelLibraryModal";
import { RvIdLabel, RvIdToggle } from "@/components/bobos/rv-ids";
import { getRvIdByHref } from "@/lib/bobos/rv-ids";
import { RV_REGISTRY } from "@/lib/bobos/rv-registry";
import { RvCategoryBar } from "./RvCategoryBar";

import "./cockpit.css";

type Props = {
  initialState: CockpitState;
  projects: Project[];
  panelData: CockpitPanelData;
  /** Optional renderer for app-specific panels not in the shared package. */
  renderAppPanel?: (id: string) => React.ReactNode;
};

export function BobosCockpit({ initialState, projects, panelData, renderAppPanel }: Props) {
  const [state, setState] = useState(initialState);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [menuCell, setMenuCell] = useState<number | null>(null);
  const [placementPanel, setPlacementPanel] = useState<PanelTypeId | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLayout = state.workspaces[state.activeWorkspace];
  const activeLayoutDefinition = layoutDefinitionFromWorkspace(state.activeWorkspace, activeLayout);
  const latestProject = projects[0] ?? null;
  function commandCategory(href: string): string {
    const rvId = getRvIdByHref(href);
    return RV_REGISTRY.find((entry) => entry.id === rvId)?.category.toLowerCase() ?? "unassigned";
  }

  const persistState = useCallback(async (next: CockpitState) => {
    setSaving(true);
    try {
      const res = await fetch("/api/bobos/cockpit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next }),
      });
      if (res.ok) {
        const data = (await res.json()) as { state: CockpitState };
        setState(data.state);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const scheduleSave = useCallback(
    (next: CockpitState) => {
      setState(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persistState(next), 400);
    },
    [persistState],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function switchWorkspace(workspaceId: CockpitWorkspaceId) {
    if (workspaceId === state.activeWorkspace) return;
    scheduleSave({ ...state, activeWorkspace: workspaceId });
  }

  function openLibrary(cellIndex: number) {
    setSelectedCell(cellIndex);
    setMenuCell(null);
    setLibraryOpen(true);
  }

  function assignPanel(panelType: PanelTypeId) {
    if (selectedCell === null) return;
    const layout = { ...activeLayout, cells: [...activeLayout.cells] };
    layout.cells[selectedCell] = { panelType };
    const next = {
      ...state,
      workspaces: { ...state.workspaces, [state.activeWorkspace]: layout },
    };
    scheduleSave(next);
    setLibraryOpen(false);
    setSelectedCell(null);
  }

  function removePanel(cellIndex: number) {
    const layout = { ...activeLayout, cells: [...activeLayout.cells] };
    layout.cells[cellIndex] = { panelType: null };
    const next = {
      ...state,
      workspaces: { ...state.workspaces, [state.activeWorkspace]: layout },
    };
    scheduleSave(next);
    setMenuCell(null);
  }

  function selectPlacement(cellIndex: number) {
    if (!placementPanel) return;
    const layout = { ...activeLayout, cells: [...activeLayout.cells] };
    layout.cells[cellIndex] = { panelType: placementPanel };
    scheduleSave({ ...state, workspaces: { ...state.workspaces, [state.activeWorkspace]: layout } });
    setPlacementPanel(null);
  }

  function renamePanel(cellIndex: number, title: string) {
    const layout = { ...activeLayout, cells: [...activeLayout.cells] };
    const cell = layout.cells[cellIndex];
    if (!cell) return;
    layout.cells[cellIndex] = { ...cell, config: { ...cell.config, faceplateTitle: title } };
    scheduleSave({ ...state, workspaces: { ...state.workspaces, [state.activeWorkspace]: layout } });
  }

  return (
    <div className="bobos-cockpit">
      <header className="cockpit-header">
        <div className="cockpit-header__top">
          <div className="cockpit-title-plate">
            <div className="cockpit-title-plate__rivets" aria-hidden="true" />
            <div className="cockpit-title-plate__body">
              <p className="cockpit-title-plate__kicker">Bob Operating System</p>
              <h1 className="cockpit-title-plate__title">
                <RvIdLabel rvId="RV01-01" label="BobOS Cockpit" />
              </h1>
              <p className="cockpit-title-plate__status">
                <span className="cockpit-lamp cockpit-lamp--green" aria-hidden="true" />
                SYSTEM NOMINAL
                {saving ? " · SAVING…" : ""}
              </p>
            </div>
          </div>
          <div className="cockpit-header__tools">
            <Link href={PANEL_DOCS_LIBRARY_HREF} className="cockpit-docs-launch">
              <RvIdLabel rvId="RV00-00" label="Documentation" />
            </Link>
            <RvIdToggle />
          </div>
        </div>

        <div className="cockpit-workspaces" role="tablist" aria-label="Workspaces">
          {COCKPIT_WORKSPACES.map((ws) => (
            <button
              key={ws.id}
              type="button"
              role="tab"
              aria-selected={state.activeWorkspace === ws.id}
              className={`cockpit-switch${state.activeWorkspace === ws.id ? " cockpit-switch--active" : ""}`}
              onClick={() => switchWorkspace(ws.id)}
            >
              <span className="cockpit-switch__lamp" aria-hidden="true" />
              {ws.label}
            </button>
          ))}
        </div>
      </header>

      <RvCategoryBar layout={activeLayout} panelData={panelData} onSelectPanel={setPlacementPanel} />
      {placementPanel ? <div className="cockpit-placement-banner">PLACE: {getCockpitPanelRegistryEntry(placementPanel).rvId ?? "NO RV NUMBER"} {getCockpitPanelRegistryEntry(placementPanel).title}</div> : null}

      <main className="cockpit-grid-frame">
        <div className="cockpit-grid">
          {Array.from({ length: 16 }, (_, index) => ({ panelType: activeLayoutDefinition.orderedPanels[index] ?? null, config: activeLayout.cells[index]?.config })).map((cell, index) => {
            if (!cell.panelType) {
              return (
                <button
                  key={`${state.activeWorkspace}-${index}`}
                  type="button"
                  onClick={() => placementPanel ? selectPlacement(index) : openLibrary(index)}
                  aria-label={placementPanel ? `Place panel in cell ${cellLabel(index)}` : `Add panel to cell ${cellLabel(index)}`}
                  className={`cockpit-cell cockpit-cell--empty${placementPanel ? " cockpit-cell--placement-target" : ""}`}
                >
                  <span className="cockpit-cell__ref">{cellGridRef(index)}</span>
                  <span className="cockpit-cell__add">UNASSIGNED</span>
                  <span className="cockpit-cell__empty-action">SELECT PANEL</span>
                </button>
              );
            }

            const def = getCockpitPanelRegistryEntry(cell.panelType);
            return (
              <CockpitPanel
                key={`${state.activeWorkspace}-${index}-${cell.panelType}`}
                cellIndex={index}
                definition={def}
                project={latestProject}
                panelData={panelData}
                menuOpen={menuCell === index}
                onToggleMenu={() => setMenuCell(menuCell === index ? null : index)}
                onChangePanel={() => openLibrary(index)}
                onRemove={() => removePanel(index)}
                renderAppPanel={renderAppPanel}
                placementMode={Boolean(placementPanel)}
                onPlacementSelect={() => selectPlacement(index)}
                cellConfig={cell.config}
                onRename={(title) => renamePanel(index, title)}
              />
            );
          })}
        </div>
      </main>

      <footer className="cockpit-command-bar">
        <p className="cockpit-command-bar__label">Command</p>
        <div className="cockpit-command-bar__buttons">
          {COCKPIT_COMMAND_BAR.map((cmd) => (
            <Link key={cmd.label} href={cmd.href} className={`cockpit-cmd-btn cockpit-cmd-btn--${commandCategory(cmd.href)}`}>
              {"panelType" in cmd ? <span className={`cockpit-lamp cockpit-lamp--${cockpitStatus(getCockpitPanelRegistryEntry(cmd.panelType), panelData).tone}`} aria-label={`Status: ${cockpitStatus(getCockpitPanelRegistryEntry(cmd.panelType), panelData).label}`} role="status" /> : null}
              <RvIdLabel rvId={getRvIdByHref(cmd.href)} label={cmd.label} />
            </Link>
          ))}
        </div>
      </footer>

      {libraryOpen ? (
        <PanelLibraryModal
          cellRef={selectedCell !== null ? cellGridRef(selectedCell) : "—"}
          onSelect={assignPanel}
          onClose={() => {
            setLibraryOpen(false);
            setSelectedCell(null);
          }}
        />
      ) : null}
    </div>
  );
}
