/** FNV-1a — deterministic seed from RVTR + domain string. */
export function hashSeed(rvtr: string, domain: string): number {
  let h = 2166136261;
  const s = `${rvtr.toUpperCase()}${domain}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type EngineSeeds = {
  composition: number;
  background: number;
  brush: number;
  rhythm: number;
  particle: number;
  lighting: number;
  signature: number;
};

export function buildEngineSeeds(rvtr: string): EngineSeeds {
  return {
    composition: hashSeed(rvtr, "composition"),
    background: hashSeed(rvtr, "background"),
    brush: hashSeed(rvtr, "brush"),
    rhythm: hashSeed(rvtr, "rhythm"),
    particle: hashSeed(rvtr, "particle"),
    lighting: hashSeed(rvtr, "lighting"),
    signature: hashSeed(rvtr, "signature"),
  };
}
