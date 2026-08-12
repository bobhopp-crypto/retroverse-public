import {
  discoveryQueryForProvider,
  externalSearchHref,
  type ExternalDiscoveryEntityType,
  type ExternalDiscoveryQuery,
} from "@/lib/public/external-search";

import "./external-discovery-links.css";

type Props = {
  entityType: ExternalDiscoveryEntityType;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  year?: number | string | null;
  className?: string;
};

const PROVIDERS = [
  { kind: "wikipedia" as const, label: "Wikipedia" },
  { kind: "youtube" as const, label: "YouTube" },
  { kind: "spotify" as const, label: "Spotify" },
  { kind: "apple_music" as const, label: "Apple Music" },
];

export function ExternalDiscoveryLinks({
  entityType,
  title,
  artist,
  album,
  year,
  className,
}: Props) {
  const queryInput: ExternalDiscoveryQuery = { entityType, title, artist, album, year };
  const links = PROVIDERS.map((provider) => ({
    ...provider,
    href: externalSearchHref(provider.kind, discoveryQueryForProvider(provider.kind, queryInput)),
  })).filter((entry) => entry.href);

  if (!links.length) return null;

  const rootClass = ["rv-external-discovery", className].filter(Boolean).join(" ");

  return (
    <section className={rootClass} aria-labelledby="rv-external-discovery-heading">
      <h2 id="rv-external-discovery-heading">Discover elsewhere</h2>
      <div className="rv-external-discovery__links">
        {links.map((link) => (
          <a
            key={link.kind}
            href={link.href!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.label} — opens search in a new tab`}
          >
            {link.label}
            <span aria-hidden="true"> ↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}
