"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { cellGridRef, cellLabel } from "@/lib/bobos/cockpit/defaults";
import { COCKPIT_COMMAND_BAR, getPanelDefinition } from "@/lib/bobos/cockpit/panel-library";
import type { CockpitState, CockpitWorkspaceId, PanelTypeId } from "@/lib/bobos/cockpit/types";
import { COCKPIT_WORKSPACES } from "@/lib/bobos/cockpit/types";
import type { Project } from "@/lib/bobos/project-zero/types";

import { CockpitPanel } from "./CockpitPanel";
import { PanelLibraryModal } from "./PanelLibraryModal";

import "./cockpit.css";

type Props = {
  initialState: CockpitState;
  projects: Project[];
};

export function BobosCockpit({ initialState, projects }: Props) {
  const [state, setState] = useState(initialState);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [menuCell, setMenuCell] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLayout = state.workspaces[state.activeWorkspace];
  const latestProject = projects[0] ?? null;

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

  return (
    <div className="bobos-cockpit">
      <header className="cockpit-header">
        <div className="cockpit-title-plate">
          <div className="cockpit-title-plate__rivets" aria-hidden="true" />
          <div className="cockpit-title-plate__body">
            <p className="cockpit-title-plate__kicker">Bob Operating System</p>
            <h1 className="cockpit-title-plate__title">BobOS Cockpit</h1>
            <p className="cockpit-title-plate__status">
              <span className="cockpit-lamp cockpit-lamp--green" aria-hidden="true" />
              SYSTEM NOMINAL
              {saving ? " · SAVING…" : ""}
            </p>
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

      <main className="cockpit-grid-frame">
        <div className="cockpit-grid">
          {activeLayout.cells.map((cell, index) => {
            if (!cell.panelType) {
              return (
                <button
                  key={`${state.activeWorkspace}-${index}`}
                  type="button"
                  className="cockpit-cell cockpit-cell--empty"
                  onClick={() => openLibrary(index)}
                  aria-label={`Add panel to cell ${cellLabel(index)}`}
                >
                  <span className="cockpit-cell__ref">{cellGridRef(index)}</span>
                  <span className="cockpit-cell__add">+ Add Panel</span>
                </button>
              );
            }

            const def = getPanelDefinition(cell.panelType);
            return (
              <CockpitPanel
                key={`${state.activeWorkspace}-${index}-${cell.panelType}`}
                cellIndex={index}
                definition={def}
                project={latestProject}
                menuOpen={menuCell === index}
                onToggleMenu={() => setMenuCell(menuCell === index ? null : index)}
                onChangePanel={() => openLibrary(index)}
                onRemove={() => removePanel(index)}
              />
            );
          })}
        </div>
      </main>

      <footer className="cockpit-command-bar">
        <p className="cockpit-command-bar__label">Command</p>
        <div className="cockpit-command-bar__buttons">
          {COCKPIT_COMMAND_BAR.map((cmd) => (
            <Link key={cmd.label} href={cmd.href} className="cockpit-cmd-btn">
              {cmd.label}
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
