import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";

import { PUBLICATION_BY_ID } from "./publications";
import type { PublicationDefinition, PublicationId, PublicationTypography } from "./types";

function fontStack(typography: PublicationTypography): string {
  switch (typography) {
    case "bold_sans":
    case "display_sans":
      return '"Helvetica Neue", Helvetica, Arial, sans-serif';
    case "condensed_sans":
      return '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';
    case "monospace_label":
      return '"Courier New", Courier, monospace';
    case "editorial_serif":
    default:
      return '"Iowan Old Style", Georgia, "Times New Roman", serif';
  }
}

export function buildPublicationTheme(
  publicationId: PublicationId,
  artDirection: ArtDirectionProfile,
): { themeVars: Record<string, string>; className: string } {
  const pub = PUBLICATION_BY_ID[publicationId];
  const base = artDirection.themeVars;
  const spaceScale = parseFloat(String(base["--elab-space-scale"] ?? "1")) * pub.spacingScale;

  const themeVars: Record<string, string> = {
    ...base,
    "--elab-font": fontStack(pub.typography),
    "--elab-space-scale": String(spaceScale),
    "--ds-pub-spacing": String(pub.spacingScale),
  };

  const className = [
    "ds-pub",
    `ds-pub--${pub.id}`,
    `ds-pub--framing-${pub.framing}`,
    `ds-pub--headline-${pub.headlineTreatment}`,
    `ds-pub--caption-${pub.captionStyle}`,
    `ds-pub--card-${pub.cardStyle}`,
    `ds-pub--texture-${pub.backgroundTexture}`,
    `ds-pub--typo-${pub.typography}`,
  ].join(" ");

  return { themeVars, className };
}

export function publicationReason(pub: PublicationDefinition, mood: string): string {
  const hits = pub.dnaAffinities.filter((a) => mood.toLowerCase().includes(a));
  if (hits.length > 0) {
    return `${pub.name} fits ${hits.join(", ")} signals in Song DNA mood/theme.`;
  }
  return `${pub.name} offers ${pub.description.toLowerCase()}`;
}
