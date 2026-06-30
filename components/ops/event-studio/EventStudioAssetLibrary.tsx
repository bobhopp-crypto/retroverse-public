import type { ProductionAssetSlot } from "@/lib/ops/event-studio/types";

type Props = {
  assets: ProductionAssetSlot[];
};

export function EventStudioAssetLibrary({ assets }: Props) {
  return (
    <section className="ops-event-studio__panel" aria-label="Approved artwork library">
      <h2 className="ops-event-studio__panel-title">Approved Artwork</h2>
      <p className="ops-event-studio__hint">
        Future generations overwrite or version these slots. Only approved artwork belongs in the
        binder.
      </p>
      <div className="ops-event-studio__assets-grid">
        {assets.map((asset) => (
          <article
            key={asset.id}
            className={`ops-event-studio__asset-card ops-event-studio__asset-card--${asset.status}`}
          >
            <div className="ops-event-studio__asset-preview">
              {asset.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.thumbnailUrl} alt={`${asset.label} preview`} />
              ) : (
                <span className="ops-event-studio__asset-empty">Awaiting artwork</span>
              )}
            </div>
            <div className="ops-event-studio__asset-meta">
              <h3>{asset.label}</h3>
              <span className="ops-event-studio__asset-status">{asset.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
