/** Optional presentation failures must not discard an already resolved identity. */
export async function optionalSongPresentation<T>(
  identity: string,
  source: string,
  load: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    // Do not expose local paths, credentials, or raw provider errors in public logs.
    console.warn("[public-song-payload] optional_source_failed", {
      identity,
      source,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return fallback;
  }
}
