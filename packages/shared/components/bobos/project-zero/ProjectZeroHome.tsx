"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { projectNextAction, projectProgress, projectStatusSummary } from "@/lib/bobos/project-zero/progress";
import type { Project } from "@/lib/bobos/project-zero/types";

type Props = {
  initialProjects: Project[];
};

export function ProjectZeroHome({ initialProjects }: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Tell BobOS what you want to accomplish.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bobos/project-zero/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = (await res.json()) as { project?: Project; error?: string };
      if (!res.ok || !data.project) {
        throw new Error(data.error ?? "Could not create project");
      }
      router.push(`/bobos/project/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
      setSubmitting(false);
    }
  }

  return (
    <main className="pz-home">
      <section className="pz-home__prompt">
        <h1 className="pz-home__question">What would you like to accomplish?</h1>
        <textarea
          className="pz-home__textarea"
          placeholder="I'm running Sunday Nights during July…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={submitting}
        />
        {error ? <p className="pz-home__error">{error}</p> : null}
        <button type="button" className="pz-home__start" onClick={() => void handleStart()} disabled={submitting}>
          {submitting ? "Starting…" : "Start"}
        </button>
      </section>

      {initialProjects.length > 0 ? (
        <section className="pz-home__active" aria-label="Currently working on">
          <h2 className="pz-home__active-title">Currently Working On</h2>
          <ul className="pz-home__active-list">
            {initialProjects.map((project) => {
              const progress = projectProgress(project);
              return (
                <li key={project.id} className="pz-home__active-item">
                  <Link href={`/bobos/project/${project.id}`} className="pz-home__active-link">
                    <span className="pz-home__active-name">{project.title}</span>
                    <span className="pz-home__active-progress">
                      {progress.done}/{progress.total}
                    </span>
                    <span className="pz-home__active-status">{projectStatusSummary(project)}</span>
                    <span className="pz-home__active-next">{projectNextAction(project)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
