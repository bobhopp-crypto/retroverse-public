import type { PublicLoaderTiming } from "@/lib/public/canonical-public-resolver";

type Props = {
  enabled: boolean;
  rvtr?: string | null;
  artistId?: string | number | null;
  albumId?: string | number | null;
  primaryAlbum?: string | null;
  resolverPath: string[];
  discoverySources: string[];
  loaderTimings: PublicLoaderTiming[];
};

export function CanonicalPublicTrace({
  enabled,
  rvtr = null,
  artistId = null,
  albumId = null,
  primaryAlbum = null,
  resolverPath,
  discoverySources,
  loaderTimings,
}: Props) {
  if (!enabled || process.env.NODE_ENV === "production") return null;

  return (
    <aside data-canonical-public-trace="local-only" aria-label="Canonical resolver trace">
      <details open>
        <summary>Canonical resolver trace (local only)</summary>
        <dl>
          <dt>RVTR</dt><dd>{rvtr ?? "—"}</dd>
          <dt>Artist ID</dt><dd>{artistId ?? "—"}</dd>
          <dt>Album ID</dt><dd>{albumId ?? "—"}</dd>
          <dt>Primary Album</dt><dd>{primaryAlbum ?? "—"}</dd>
          <dt>Resolver path</dt><dd><code>{resolverPath.join(" → ") || "—"}</code></dd>
          <dt>Discovery sources</dt>
          <dd>
            {discoverySources.length > 0 ? (
              <ul>{discoverySources.map((source) => <li key={source}>{source}</li>)}</ul>
            ) : "—"}
          </dd>
          <dt>Loader timings</dt>
          <dd>
            {loaderTimings.length > 0 ? (
              <ul>
                {loaderTimings.map((timing, index) => (
                  <li key={`${timing.name}-${index}`}>
                    {timing.name}: {timing.durationMs.toFixed(2)} ms
                  </li>
                ))}
              </ul>
            ) : "—"}
          </dd>
        </dl>
      </details>
    </aside>
  );
}
