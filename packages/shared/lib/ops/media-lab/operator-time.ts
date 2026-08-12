export function formatOperatorTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—:—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatOperatorDuration(seconds: number): string {
  return formatOperatorTime(seconds);
}

export function formatTrimPrecision(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—:—.––";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const value = (seconds % 60).toFixed(2).padStart(5, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${value}` : `${String(minutes).padStart(2, "0")}:${value}`;
}
