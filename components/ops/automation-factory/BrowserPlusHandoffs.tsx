"use client";

import { useEffect, useMemo, useState } from "react";

type PlannedWorkAction = "Find Cover" | "Resolve RVTR" | "Generate Package" | "Generate Deck" | "Publish";

type PlannedWorkItem = {
  id: string;
  action: PlannedWorkAction;
  count: number;
  createdAt: string;
};

const ACTIONS: PlannedWorkAction[] = ["Find Cover", "Resolve RVTR", "Generate Package", "Generate Deck", "Publish"];

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function BrowserPlusHandoffs() {
  const [plannedWork, setPlannedWork] = useState<PlannedWorkItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("browser-plus-planned-work");
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      setPlannedWork(Array.isArray(parsed) ? (parsed as PlannedWorkItem[]) : []);
    } catch {
      setPlannedWork([]);
    } finally {
      setReady(true);
    }
  }, []);

  const counts = useMemo(() => {
    const next = new Map<PlannedWorkAction, number>(ACTIONS.map((action) => [action, 0]));
    for (const item of plannedWork) {
      if (ACTIONS.includes(item.action)) next.set(item.action, (next.get(item.action) ?? 0) + item.count);
    }
    return next;
  }, [plannedWork]);

  return (
    <section className="automation-factory__section automation-factory__section--handoffs">
      <div className="automation-factory__section-head">
        <div>
          <p className="automation-factory__kicker">Browser+ Handoffs</p>
          <h2>Planned Work</h2>
        </div>
        <span className="automation-factory__badge">localStorage · read-only</span>
      </div>

      <div className="automation-factory__handoff-grid">
        {ACTIONS.map((action) => (
          <div key={action} className="automation-factory__handoff">
            <span>{action}</span>
            <strong>{ready ? formatNumber(counts.get(action) ?? 0) : "..."}</strong>
          </div>
        ))}
      </div>

      <div className="automation-factory__activity-list automation-factory__activity-list--compact">
        {!ready ? (
          <p>Loading Browser+ planned work...</p>
        ) : plannedWork.length === 0 ? (
          <p>No Browser+ planned work found in this browser.</p>
        ) : (
          plannedWork.slice(0, 5).map((item) => (
            <div key={item.id} className="automation-factory__activity">
              <span>{formatTime(item.createdAt)}</span>
              <strong>{item.action}</strong>
              <em>{formatNumber(item.count)} row{item.count === 1 ? "" : "s"}</em>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
