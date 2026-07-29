import { ExternalDiscoveryLinks } from "@/components/public/ExternalDiscoveryLinks";

type Props = { entityLabel: string; queryParts: Array<string | null | undefined> };

/** @deprecated Use ExternalDiscoveryLinks */
export function ExternalSearchLinks({ entityLabel, queryParts }: Props) {
  const title = queryParts[1] ?? queryParts[0] ?? "";
  const artist = queryParts[0] ?? null;
  return (
    <ExternalDiscoveryLinks
      entityType="song"
      title={title}
      artist={artist}
    />
  );
}
