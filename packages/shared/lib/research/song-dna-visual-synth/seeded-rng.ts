/** FNV-1a hash — RVTR seed for deterministic output. */
export function hashRvtr(rvtr: string): number {
  let h = 2166136261;
  for (let i = 0; i < rvtr.length; i += 1) {
    h ^= rvtr.charCodeAt(i);
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
