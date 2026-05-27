export function formatBytes(bytes: number | string | null | undefined): string {
  if (bytes == null) return "—";
  const n = typeof bytes === "string" ? Number(bytes) : bytes;
  if (!Number.isFinite(n)) return "—";
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  if (n >= gb) return `${(n / gb).toFixed(2)} GB`;
  if (n >= mb) return `${(n / mb).toFixed(1)} MB`;
  return `${n} B`;
}
