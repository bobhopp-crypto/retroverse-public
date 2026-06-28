"use client";

import { useEffect, useState } from "react";

import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";

type Props = {
  rvtr: string | null;
};

function DnaRow({ label, value }: { label: string; value: string }) {
  return (
    <li>
      <span>{label}</span>
      <strong>{value}</strong>
    </li>
  );
}

export function SongDnaInspector({ rvtr }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dna, setDna] = useState<CollectorSongDna | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDna(null);
    setError(null);
    setOpen(false);
  }, [rvtr]);

  useEffect(() => {
    if (!open || !rvtr || dna || loading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/ops/browser-plus-2/song-dna?rvtr=${encodeURIComponent(rvtr)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Song DNA unavailable");
        }
        return res.json() as Promise<CollectorSongDna>;
      })
      .then((data) => {
        if (!cancelled) setDna(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Song DNA");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, rvtr, dna, loading]);

  if (!rvtr) return null;

  return (
    <details
      className="bp2__ops-details bp2__song-dna-details"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary>Song DNA</summary>
      {loading ? <p className="bp2__muted">Loading Song DNA…</p> : null}
      {error ? <p className="bp2__muted">{error}</p> : null}
      {dna ? (
        <div className="bp2__song-dna-grid">
          <div>
            <h4>Visual</h4>
            <ul className="bp2__kv">
              {dna.visual ? (
                <>
                  <DnaRow label="Lighting" value={dna.visual.lightingStyle.replace(/_/g, " ")} />
                  <DnaRow label="Palette" value={dna.visual.primaryColor} />
                  <DnaRow label="Mood" value={dna.visual.stageAtmosphere.replace(/_/g, " ")} />
                  <DnaRow label="Typography" value={dna.visual.typographyStyle} />
                </>
              ) : (
                <li><span>Status</span><strong>No visual profile</strong></li>
              )}
            </ul>
          </div>
          <div>
            <h4>Musical</h4>
            <ul className="bp2__kv">
              {dna.musical ? (
                <>
                  <DnaRow label="Energy" value={dna.musical.energy.label} />
                  <DnaRow label="Valence" value={dna.musical.valence.label} />
                  <DnaRow label="Danceability" value={dna.musical.danceability.label} />
                  <DnaRow label="Tempo" value={dna.musical.tempo.label} />
                  <DnaRow label="Key" value={dna.musical.key.label} />
                </>
              ) : (
                <li><span>Status</span><strong>No acoustic analysis</strong></li>
              )}
            </ul>
          </div>
          <div>
            <h4>Story</h4>
            <ul className="bp2__kv">
              <DnaRow label="Primary theme" value={dna.story.primaryTheme} />
              <DnaRow label="Arc" value={dna.story.emotionalArc} />
              <DnaRow label="Angle" value={dna.story.storyAngle} />
              <DnaRow label="Discovery" value={dna.story.discoveryValue} />
            </ul>
          </div>
          <div>
            <h4>Experience</h4>
            <ul className="bp2__kv">
              <DnaRow label="Overall mood" value={dna.experience.overallMood} />
              <DnaRow label="Reading pace" value={dna.experience.readingPace} />
              <DnaRow label="Layout" value={dna.experience.preferredLayoutStyle} />
              <DnaRow label="Color family" value={dna.experience.recommendedColorFamily} />
            </ul>
          </div>
        </div>
      ) : null}
    </details>
  );
}
