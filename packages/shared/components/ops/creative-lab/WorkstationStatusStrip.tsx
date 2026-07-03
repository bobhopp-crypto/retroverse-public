"use client";

import type { WorkstationStatus } from "@/lib/ops/creative-lab/workstation-state";

type Props = {
  status: WorkstationStatus;
};

function statusClass(kind: "front" | "back" | "export", value: string): string {
  const base = "cl-ws__status-pill";
  if (value === "Approved" || value === "Ready") return `${base} ${base}--ok`;
  if (value === "Draft") return `${base} ${base}--draft`;
  return `${base} ${base}--none`;
}

export function WorkstationStatusStrip(props: Props) {
  const { status } = props;

  return (
    <header className="cl-ws__status-strip" aria-label="Workstation status">
      <div className="cl-ws__status-project">
        <span className="cl-ws__status-label">Project</span>
        <strong>{status.projectName}</strong>
      </div>
      <div className="cl-ws__status-group">
        <span className="cl-ws__status-label">Front</span>
        <span className={statusClass("front", status.frontStatus)}>
          {status.frontStatus}
          {status.selectedFrontKey && status.frontStatus === "Draft"
            ? ` · ${status.selectedFrontKey}`
            : ""}
          {status.approvedFrontKey && status.frontStatus === "Approved"
            ? ` · ${status.approvedFrontKey}`
            : ""}
        </span>
      </div>
      <div className="cl-ws__status-group">
        <span className="cl-ws__status-label">Back</span>
        <span className={statusClass("back", status.backStatus)}>
          {status.backStatus}
          {status.selectedBackKey && status.backStatus !== "None" ? ` · ${status.selectedBackKey}` : ""}
        </span>
      </div>
      <div className="cl-ws__status-group">
        <span className="cl-ws__status-label">Export</span>
        <span className={statusClass("export", status.exportStatus)}>{status.exportStatus}</span>
      </div>
    </header>
  );
}
