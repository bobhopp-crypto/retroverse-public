import { hsl } from "@/lib/research/song-dna-visual-synth/normalize";

/** Valence-driven warm/cool palette — control input only. */
export function paletteFromWarmth(warmth: number): {
  void: string;
  deep: string;
  mid: string;
  accent: string;
  hot: string;
  cool: string;
} {
  if (warmth < 0.38) {
    return {
      void: "#000000",
      deep: hsl(248, 48, 8),
      mid: hsl(265, 42, 22),
      accent: hsl(210, 55, 38),
      hot: hsl(280, 35, 45),
      cool: hsl(200, 60, 28),
    };
  }
  if (warmth > 0.72) {
    return {
      void: "#000000",
      deep: hsl(18, 55, 10),
      mid: hsl(32, 78, 42),
      accent: hsl(48, 90, 55),
      hot: hsl(12, 88, 48),
      cool: hsl(165, 50, 38),
    };
  }
  return {
    void: "#000000",
    deep: hsl(220, 35, 12),
    mid: hsl(38, 55, 35),
    accent: hsl(175, 45, 38),
    hot: hsl(28, 70, 45),
    cool: hsl(230, 40, 30),
  };
}
