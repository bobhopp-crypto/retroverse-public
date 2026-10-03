export type HomepageSwipeDirection = "left" | "right" | "up" | "down";

export function classifyHomepageSwipe(dx: number, dy: number, elapsedMs: number): HomepageSwipeDirection | null {
  if (![dx, dy, elapsedMs].every(Number.isFinite) || elapsedMs < 0 || elapsedMs > 750) return null;
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  if (Math.max(horizontal, vertical) < (elapsedMs < 280 ? 52 : 72)) return null;
  if (horizontal > vertical * 1.4) return dx < 0 ? "left" : "right";
  if (vertical > horizontal * 1.4) return dy < 0 ? "up" : "down";
  return null;
}
