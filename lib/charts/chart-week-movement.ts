export function movementLabel(
  position: number,
  prev: number | null,
): "up" | "down" | "same" | "new" | null {
  if (prev == null || prev < 1) return "new";
  if (position < prev) return "up";
  if (position > prev) return "down";
  return "same";
}
