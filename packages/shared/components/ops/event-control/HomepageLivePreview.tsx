"use client";

import { useMemo } from "react";

import { HomeDirectory } from "@/app/components/home-directory";
import {
  buildHomepagePreviewProps,
  type HomepageEditorDraft,
} from "@/lib/ops/event-control/editor-draft";
import type { EventControlConfig } from "@/lib/ops/event-control/types";

import "@/app/home-directory.css";

type Props = {
  draft: HomepageEditorDraft;
  preserved: EventControlConfig;
};

export function HomepageLivePreview({ draft, preserved }: Props) {
  const preview = useMemo(
    () => buildHomepagePreviewProps(draft, preserved),
    [draft, preserved],
  );

  const modeClass = preview.config.homepage.mode.toLowerCase();
  const heroClass = preview.hero ? " home-directory--has-hero" : "";

  return (
    <div className="event-ctrl__preview-surface" aria-label="Live homepage preview">
      <main
        className={`home-directory home-directory--embedded home-directory--mode-${modeClass}${heroClass}`}
      >
        <HomeDirectory
          yearCovers={[]}
          featuredYears={preview.featuredYears}
          hero={preview.hero}
          yearsLabel={preview.yearsLabel}
        />
      </main>
    </div>
  );
}
