import type { Metadata } from "next";

import { ExperienceLabShell } from "@/components/ops/studio/experience-lab/ExperienceLabShell";
import { loadExperienceLabPayload } from "@/lib/retroverse/experience-lab/load-lab-payload";

import "./experience-lab.css";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const payload = await loadExperienceLabPayload(rvtr);
  if (!payload) return { title: "Experience Lab — Retroverse Studio" };
  const { artist, title } = payload.experience.spec.metadata;
  return { title: `${title} — Experience Lab · ${artist}` };
}

export default async function ExperienceLabPage({ params }: Props) {
  const { rvtr } = await params;
  const payload = await loadExperienceLabPayload(rvtr);

  if (!payload) {
    return (
      <div className="elab-page elab-page--empty">
        <h1>Experience Lab</h1>
        <p>
          No render spec found for <strong>{rvtr.toUpperCase()}</strong>. Run Director first, then return.
        </p>
      </div>
    );
  }

  return (
    <div className="elab-page">
      <ExperienceLabShell payload={payload} />
    </div>
  );
}
