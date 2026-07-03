import type { ArtBoardSpec } from "../art-board-spec";
import type { IllustrationAsset } from "./types";

/** Deterministic integer seed from spec — stable across renders */
export function compositionSeed(spec: ArtBoardSpec): number {
  const parts = [
    spec.artDirectionId,
    spec.treatment?.id ?? "base",
    String(spec.refinementIndex ?? 0),
    spec.passNumber,
  ].join("|");
  let h = 0;
  for (let i = 0; i < parts.length; i++) {
    h = (h * 31 + parts.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickAsset(pool: IllustrationAsset[], seed: number, offset: number): IllustrationAsset {
  if (!pool.length) throw new Error("Empty illustration pool");
  return pool[(seed + offset) % pool.length]!;
}

export function pickMany(pool: IllustrationAsset[], seed: number, count: number, stride: number): IllustrationAsset[] {
  const out: IllustrationAsset[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count && out.length < pool.length; i++) {
    const asset = pickAsset(pool, seed, i * stride + 3);
    if (!seen.has(asset.id)) {
      seen.add(asset.id);
      out.push(asset);
    }
  }
  return out;
}

export function densityCount(spec: ArtBoardSpec, light: number, medium: number, heavy: number): number {
  const d = spec.treatment?.illustrationDensity ?? "medium";
  if (d === "light") return light;
  if (d === "heavy") return heavy;
  return medium;
}
