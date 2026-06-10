"use client";

type ProjectRow = { id: string; name: string; event: string; updatedAt: string };

type Props = {
  projects: ProjectRow[];
  activeProjectId: string | null;
  busy?: boolean;
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
};

export function WorkstationSidebar(props: Props) {
  const { projects, activeProjectId, busy, onOpenProject, onNewProject } = props;

  return (
    <aside className="cl-ws__sidebar" aria-label="Projects">
      <p className="cl-ws__sidebar-kicker">Creative Lab</p>
      <h2 className="cl-ws__sidebar-title">Projects</h2>
      <button type="button" className="cl-ws__new-btn" disabled={busy} onClick={onNewProject}>
        + New Project
      </button>
      <ul className="cl-ws__project-list">
        {projects.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className={`cl-ws__project-btn${activeProjectId === row.id ? " cl-ws__project-btn--on" : ""}`}
              disabled={busy}
              onClick={() => onOpenProject(row.id)}
            >
              <strong>{row.name}</strong>
              <span>{row.event || "—"}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
