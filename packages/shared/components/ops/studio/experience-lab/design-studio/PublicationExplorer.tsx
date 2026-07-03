"use client";

import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import {
  PUBLICATION_BY_ID,
  PUBLICATION_LIBRARY,
  suggestPublications,
} from "@/lib/retroverse/experience-design/publications";
import { publicationReason } from "@/lib/retroverse/experience-design/publication-theme";
import type { PublicationId } from "@/lib/retroverse/experience-design/types";

type Props = {
  publicationId: PublicationId;
  onSelect: (id: PublicationId) => void;
  songDna: CollectorSongDna | null;
  artDirection: ArtDirectionProfile;
};

export function PublicationExplorer({ publicationId, onSelect, songDna, artDirection }: Props) {
  const mood = `${songDna?.experience.overallMood ?? ""} ${songDna?.story.primaryTheme ?? ""}`;
  const suggested = suggestPublications(songDna, 4);
  const selected = PUBLICATION_BY_ID[publicationId];

  return (
    <div className="ds-workspace">
      <p className="ds-workspace__intro">
        Preview the song as different period publications. Colors from Song DNA · presentation language from publication family.
      </p>
      <div className="ds-pub-grid">
        {PUBLICATION_LIBRARY.map((pub) => (
          <button
            key={pub.id}
            type="button"
            className={
              publicationId === pub.id ? "ds-pub-card ds-pub-card--active" : "ds-pub-card"
            }
            onClick={() => onSelect(pub.id)}
          >
            <span className="ds-pub-card__name">{pub.name}</span>
            <span className="ds-pub-card__meta">
              {pub.typography.replace(/_/g, " ")} · {pub.framing} · {pub.cardStyle}
            </span>
          </button>
        ))}
      </div>
      <div className="ds-workspace__detail">
        <h4 className="ds-workspace__detail-title">{selected.name}</h4>
        <p className="ds-workspace__detail-body">{selected.description}</p>
        <dl className="ds-pub-spec">
          <div><dt>Typography</dt><dd>{selected.typography.replace(/_/g, " ")}</dd></div>
          <div><dt>Framing</dt><dd>{selected.framing}</dd></div>
          <div><dt>Headlines</dt><dd>{selected.headlineTreatment.replace(/_/g, " ")}</dd></div>
          <div><dt>Captions</dt><dd>{selected.captionStyle}</dd></div>
          <div><dt>Cards</dt><dd>{selected.cardStyle}</dd></div>
          <div><dt>Texture</dt><dd>{selected.backgroundTexture}</dd></div>
        </dl>
        <p className="ds-workspace__reason">
          <strong>Why:</strong> {publicationReason(selected, mood)}
        </p>
        {suggested.length > 0 ? (
          <p className="ds-workspace__hint">
            Suggested for this song: {suggested.map((p) => p.name).join(", ")}
          </p>
        ) : null}
        <p className="ds-workspace__hint">
          Art direction: {artDirection.typography.characteristic.label} · {artDirection.composition.whiteSpace.label} spacing
        </p>
      </div>
    </div>
  );
}
