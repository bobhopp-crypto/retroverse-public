import { artDirectionById } from "../art-directions";
import type { ArtDirectionId } from "../art-directions";
import type { PaletteSlots } from "./types";

export function paletteForDirection(id: ArtDirectionId): PaletteSlots {
  const [c1, c2, c3, c4, c5] = artDirectionById(id).palette;
  return { c1, c2, c3, c4, c5 };
}

export function applyPalette(svg: string, palette: PaletteSlots): string {
  return svg
    .replace(/\{\{c1\}\}/g, palette.c1)
    .replace(/\{\{c2\}\}/g, palette.c2)
    .replace(/\{\{c3\}\}/g, palette.c3)
    .replace(/\{\{c4\}\}/g, palette.c4)
    .replace(/\{\{c5\}\}/g, palette.c5);
}
