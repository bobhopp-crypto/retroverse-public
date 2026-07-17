"use client";

export type GraphHeaderData = {
  rvtr: string;
  rvar?: string | null;
  rval?: string | null;
  rvyr?: string | number | null;
  rvwk?: string | null;
  integrity?: string | null;
  relationshipStatus?: string | null;
  graphVersion?: string | null;
  historicalAlbum?: string | null;
  artworkAlbum?: string | null;
  albumAppearanceCount?: number | null;
  enrichmentStatus?: string | null;
};

export function GraphHeader({ data }: { data: GraphHeaderData }) {
  return (
    <details className="rv-graph-header" data-graph-version={data.graphVersion ?? "canonical-v1"}>
      <summary>Graph · {data.rvtr}</summary>
      <dl>
        <dt>RVTR</dt><dd>{data.rvtr}</dd>
        {data.rvar ? <><dt>RVAR</dt><dd>{data.rvar}</dd></> : null}
        {data.rval ? <><dt>RVAL</dt><dd>{data.rval}</dd></> : null}
        {data.rvyr ? <><dt>RVYR</dt><dd>{data.rvyr}</dd></> : null}
        {data.rvwk ? <><dt>RVWK</dt><dd>{data.rvwk}</dd></> : null}
        {data.integrity ? <><dt>Integrity</dt><dd>{data.integrity}</dd></> : null}
        {data.relationshipStatus ? <><dt>Relationships</dt><dd>{data.relationshipStatus}</dd></> : null}
        <dt>Graph version</dt><dd>{data.graphVersion ?? "canonical-v1"}</dd>
        {data.historicalAlbum ? <><dt>Historical album</dt><dd>{data.historicalAlbum}</dd></> : null}
        {data.artworkAlbum ? <><dt>Artwork album</dt><dd>{data.artworkAlbum}</dd></> : null}
        {data.albumAppearanceCount ? <><dt>Album appearances</dt><dd>{data.albumAppearanceCount}</dd></> : null}
        {data.enrichmentStatus ? <><dt>Enrichments</dt><dd>{data.enrichmentStatus}</dd></> : null}
      </dl>
    </details>
  );
}
