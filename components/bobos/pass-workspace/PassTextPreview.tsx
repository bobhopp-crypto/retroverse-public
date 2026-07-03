"use client";

import type { PassCreativeBrief } from "@/lib/bobos/project-zero/creative-brief";
import { passColorSchemeById } from "@/lib/bobos/project-zero/creative-brief";
import { BOBOS_PASS_ASPECT_RATIO } from "@/lib/bobos/project-zero/pass-production-spec";

type Props = {
  brief: PassCreativeBrief;
};

/**
 * Live typography preview — shows where each Event Information field lands on the
 * finished pass as the user types. This is NOT AI artwork; it exists so text ends up
 * in the right field before anything is generated.
 */
export function PassTextPreview({ brief }: Props) {
  const scheme = passColorSchemeById(brief.colorScheme);
  const primary = scheme?.swatch.primary ?? "#3d1a6e";
  const accent = scheme?.swatch.accent ?? "#e8b84b";
  const badge = brief.slots.general?.passTypeLabel ?? "GENERAL PASS";

  return (
    <div className="pzw-text-preview" aria-label="Text placement preview">
      <div
        className="pzw-text-preview__card"
        style={{ aspectRatio: BOBOS_PASS_ASPECT_RATIO, background: primary, borderColor: accent }}
      >
        <span className="pzw-text-preview__badge" style={{ background: accent, color: primary }}>
          {badge}
        </span>
        <span className="pzw-text-preview__event" style={{ color: "#ffffff" }}>
          {brief.event.trim() || "Event Name"}
        </span>
        <span className="pzw-text-preview__venue" style={{ color: accent }}>
          {brief.venue.trim() || "Venue"}
        </span>
        {brief.series.trim() ? (
          <span className="pzw-text-preview__series">{brief.series.trim()}</span>
        ) : null}
        <span className="pzw-text-preview__date">{brief.date.trim() || "Date"}</span>
      </div>
      <p className="pzw-text-preview__hint">
        Where your text appears — Event is the headline, Venue the second line, the badge
        shows the pass type. Not the final artwork.
      </p>
    </div>
  );
}
