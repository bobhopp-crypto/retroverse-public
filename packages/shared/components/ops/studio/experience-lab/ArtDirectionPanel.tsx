"use client";

import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import { LAB_LAYOUTS, type LabLayoutId } from "@/lib/retroverse/experience-lab/types";

type Props = {
  songDna: CollectorSongDna | null;
  profile: ArtDirectionProfile;
  layoutId: LabLayoutId;
};

function ChoiceRow({ label, choice }: { label: string; choice: { label: string; reason: string } }) {
  return (
    <div className="elab-ad__choice">
      <dt>{label}</dt>
      <dd>
        <strong>{choice.label}</strong>
        <p className="elab-ad__reason">{choice.reason}</p>
      </dd>
    </div>
  );
}

export function ArtDirectionPanel({ songDna, profile, layoutId }: Props) {
  const layoutLabel = LAB_LAYOUTS.find((l) => l.id === layoutId)?.label ?? layoutId;

  return (
    <section className="elab-ad" aria-label="Art Direction">
      <header className="elab-ad__header">
        <h2 className="elab-ad__title">Art Direction</h2>
        <p className="elab-ad__subtitle">
          Profile for <strong>{layoutLabel}</strong> layout · derived from Song DNA
        </p>
      </header>

      <div className="elab-pipeline">
        <div className="elab-pipeline__step elab-pipeline__step--dna">
          <h3 className="elab-pipeline__label">Song DNA</h3>
          {songDna ? (
            <dl className="elab-ad__dna-list">
              <div>
                <dt>Mood</dt>
                <dd>{profile.dnaSummary.overallMood}</dd>
              </div>
              <div>
                <dt>Visual energy</dt>
                <dd>{profile.dnaSummary.visualEnergy}</dd>
              </div>
              <div>
                <dt>Reading pace</dt>
                <dd>{profile.dnaSummary.readingPace}</dd>
              </div>
              <div>
                <dt>Story theme</dt>
                <dd>{profile.dnaSummary.primaryTheme}</dd>
              </div>
              <div>
                <dt>Lighting</dt>
                <dd>{profile.dnaSummary.lightingStyle?.replace(/_/g, " ") ?? "—"}</dd>
              </div>
              <div>
                <dt>Color family</dt>
                <dd>{profile.dnaSummary.recommendedColorFamily}</dd>
              </div>
            </dl>
          ) : (
            <p className="elab-ad__missing">No Song DNA on disk — profile uses RVTR-derived fallback palette.</p>
          )}
        </div>

        <div className="elab-pipeline__arrow" aria-hidden="true">
          ↓
        </div>

        <div className="elab-pipeline__step elab-pipeline__step--profile">
          <h3 className="elab-pipeline__label">Art Direction Profile</h3>

          <div className="elab-ad__swatches">
            {(
              [
                ["Background", profile.colorSystem.background, profile.colorSystem.swatches.background],
                ["Surface", profile.colorSystem.surface, profile.colorSystem.swatches.surface],
                ["Accent", profile.colorSystem.accent, profile.colorSystem.swatches.accent],
                ["Highlight", profile.colorSystem.highlight, profile.colorSystem.swatches.highlight],
              ] as const
            ).map(([name, choice, hex]) => (
              <div key={name} className="elab-ad__swatch">
                <span className="elab-ad__swatch-chip" style={{ background: hex }} />
                <span className="elab-ad__swatch-name">{name}</span>
                <span className="elab-ad__swatch-value">{choice.label}</span>
              </div>
            ))}
          </div>

          <dl className="elab-ad__choices">
            <ChoiceRow label="Background" choice={profile.colorSystem.background} />
            <ChoiceRow label="Surface" choice={profile.colorSystem.surface} />
            <ChoiceRow label="Accent" choice={profile.colorSystem.accent} />
            <ChoiceRow label="Highlight" choice={profile.colorSystem.highlight} />
            <ChoiceRow label="Contrast" choice={profile.colorSystem.contrastStrategy} />
            <ChoiceRow label="Typography" choice={profile.typography.characteristic} />
            <ChoiceRow label="Type weight" choice={profile.typography.weight} />
            <ChoiceRow label="Tracking" choice={profile.typography.tracking} />
            <ChoiceRow label="Image dominance" choice={profile.composition.imageDominance} />
            <ChoiceRow label="Text density" choice={profile.composition.textDensity} />
            <ChoiceRow label="Spacing" choice={profile.composition.whiteSpace} />
            <ChoiceRow label="Card treatment" choice={profile.composition.cardTreatment} />
            <ChoiceRow label="Framing" choice={profile.composition.framingStyle} />
            <ChoiceRow label="Motion (plan)" choice={profile.motion.profile} />
            <ChoiceRow label="Scene rhythm" choice={profile.motion.sceneRhythm} />
          </dl>

          <div className="elab-ad__motifs">
            <h4 className="elab-ad__motifs-title">Visual motifs (recommendations)</h4>
            <ul className="elab-ad__motifs-list">
              {profile.visualMotifs.map((motif) => (
                <li key={motif.value}>
                  <strong>{motif.label}</strong>
                  <span>{motif.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="elab-pipeline__arrow" aria-hidden="true">
          ↓
        </div>

        <div className="elab-pipeline__step elab-pipeline__step--scene">
          <h3 className="elab-pipeline__label">Rendered Scene</h3>
          <p className="elab-ad__scene-hint">
            Live preview below applies this profile to the active {layoutLabel} layout.
          </p>
        </div>
      </div>
    </section>
  );
}
