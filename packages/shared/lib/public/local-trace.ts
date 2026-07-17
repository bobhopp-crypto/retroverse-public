export type PublicTraceSearchParams = Record<string, string | string[] | undefined>;

/** Trace is intentionally impossible to enable in a production build. */
export function localPublicTraceEnabled(searchParams: PublicTraceSearchParams | undefined): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const value = searchParams?.trace;
  return Array.isArray(value) ? value.includes("1") : value === "1";
}

export async function timePublicLoader<T>(
  name: string,
  loader: () => Promise<T>,
): Promise<{ value: T; timing: { name: string; durationMs: number } }> {
  const startedAt = performance.now();
  const value = await loader();
  return {
    value,
    timing: {
      name,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    },
  };
}
