import type { VisualGeneratorId } from "./types";

export type VisualGeneratorContract = {
  id: VisualGeneratorId;
  name: string;
  description: string;
  inputType: "performance_frame" | "cover_art" | "chart_data";
  outputType: "derived_image";
  supportedStyles: string[];
  /** Future: call when generation infrastructure ships. */
  status: "contract_only";
};

/** Future generator contracts — no AI calls in Phase 2.9. */
export const VISUAL_GENERATOR_CONTRACTS: VisualGeneratorContract[] = [
  {
    id: "frame_stylizer",
    name: "Frame Stylizer",
    description: "Transform an extracted performance frame into a stylized still while preserving performer identity.",
    inputType: "performance_frame",
    outputType: "derived_image",
    supportedStyles: [
      "charcoal_sketch",
      "television_scanline",
      "monochrome_blue",
      "minimal_ink",
      "airbrush_1980s",
    ],
    status: "contract_only",
  },
  {
    id: "poster_generator",
    name: "Poster Generator",
    description: "Concert or television poster treatment from a performance frame.",
    inputType: "performance_frame",
    outputType: "derived_image",
    supportedStyles: ["concert_poster", "neon_poster", "screen_print"],
    status: "contract_only",
  },
  {
    id: "magazine_illustration",
    name: "Magazine Illustration",
    description: "Editorial illustration from performance reference — bold shapes, print texture.",
    inputType: "performance_frame",
    outputType: "derived_image",
    supportedStyles: ["magazine_illustration", "vintage_editorial", "halftone_print"],
    status: "contract_only",
  },
  {
    id: "album_painting",
    name: "Album Painting",
    description: "Sleeve-art composition from performance or cover reference.",
    inputType: "cover_art",
    outputType: "derived_image",
    supportedStyles: ["album_jacket", "airbrush_1980s", "pastel_illustration"],
    status: "contract_only",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    description: "Technical draft treatment for studio/innovation story beats.",
    inputType: "performance_frame",
    outputType: "derived_image",
    supportedStyles: ["blueprint"],
    status: "contract_only",
  },
  {
    id: "comic",
    name: "Comic",
    description: "Graphic novel panel from performance frame.",
    inputType: "performance_frame",
    outputType: "derived_image",
    supportedStyles: ["graphic_novel"],
    status: "contract_only",
  },
  {
    id: "sketch",
    name: "Sketch",
    description: "Hand-drawn sketch variants — charcoal, colored pencil, watercolor.",
    inputType: "performance_frame",
    outputType: "derived_image",
    supportedStyles: ["charcoal_sketch", "colored_pencil", "watercolor"],
    status: "contract_only",
  },
];

export const GENERATOR_BY_ID: Record<VisualGeneratorId, VisualGeneratorContract> = Object.fromEntries(
  VISUAL_GENERATOR_CONTRACTS.map((g) => [g.id, g]),
) as Record<VisualGeneratorId, VisualGeneratorContract>;

export function generatorForStyle(styleId: string): VisualGeneratorContract | null {
  return (
    VISUAL_GENERATOR_CONTRACTS.find((g) => g.supportedStyles.includes(styleId)) ?? null
  );
}
