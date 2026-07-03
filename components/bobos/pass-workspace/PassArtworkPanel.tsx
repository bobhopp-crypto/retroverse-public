"use client";

import { useMemo } from "react";

import type { PassCreativeBrief } from "@/lib/bobos/project-zero/creative-brief";
import type { PassWorkspaceTemplate } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import type { PassArtworkAdjustments } from "@/lib/bobos/project-zero/pass-artwork-adjustments";
import type { PassWorkspaceSlug, PassWorkspaceVersion } from "@/lib/bobos/project-zero/pass-workspace-store";

import { PassArtworkCard } from "./PassArtworkCard";

type Props = {
  projectId: string;
  brief: PassCreativeBrief;
  onBriefChange: (brief: PassCreativeBrief) => void;
  templates: PassWorkspaceTemplate[];
  onVersionCreated: (slug: PassWorkspaceSlug, version: PassWorkspaceVersion) => void;
  onApproved: (slug: PassWorkspaceSlug) => void;
  onAdjustmentsChange: (slug: PassWorkspaceSlug, adjustments: PassArtworkAdjustments) => void;
};

/** Artwork — every pass type starts empty. Generate creates Version 1; Regenerate creates the next. */
export function PassArtworkPanel({
  projectId,
  brief,
  onBriefChange,
  templates,
  onVersionCreated,
  onApproved,
  onAdjustmentsChange,
}: Props) {
  return (
    <section className="pzw-section" aria-label="Artwork">
      <h2 className="ps-step__title">2 · Artwork</h2>
      <p className="pzw-artwork__hint">Generate artwork for each pass type. Choose how many to issue in step 4.</p>

      <div className="ps-card-grid">
        {templates.map((template) => (
          <PassArtworkCard
            key={template.id}
            projectId={projectId}
            brief={brief}
            onBriefChange={onBriefChange}
            template={template}
            onVersionCreated={onVersionCreated}
            onApproved={onApproved}
            onAdjustmentsChange={onAdjustmentsChange}
          />
        ))}
      </div>
    </section>
  );
}
