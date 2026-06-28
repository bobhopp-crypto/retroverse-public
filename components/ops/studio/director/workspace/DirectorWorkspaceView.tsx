import Link from "next/link";

import { productionTrackerPath } from "@/lib/ops/studio/production-tracker/paths";
import type { DirectorStoryPlan } from "@/lib/ops/studio/director/storytelling/types";
import { experienceTypeLabel } from "@/lib/ops/studio/director/storytelling/design-experiences";
import { PALETTE_HEX } from "@/lib/ops/studio/director/storytelling/visual-language-library";
import type {
  DirectorWorkspaceSnapshot,
  ExperienceCatalogCard,
  PreviewCard,
  PreviewChapter,
} from "@/lib/ops/studio/director/workspace/types";

type Props = {
  snapshot: DirectorWorkspaceSnapshot;
};

function statusClass(prefix: string, status: string): string {
  return `${prefix} ${prefix}--${status.replace(/_/g, "-")}`;
}

function CatalogCard({ card }: { card: ExperienceCatalogCard }) {
  return (
    <article className={statusClass("rs-dw__catalog-card", card.status)}>
      <div className="rs-dw__catalog-card-head">
        <h3 className="rs-dw__catalog-card-title">{card.label}</h3>
        <span className="rs-dw__catalog-card-category">{card.category}</span>
      </div>
      <p className={statusClass("rs-dw__catalog-status", card.status)}>{card.statusLabel}</p>
      <p className="rs-dw__catalog-reason">{card.reason}</p>
    </article>
  );
}

function ReadinessBadge({ readiness }: { readiness: string }) {
  return <span className={statusClass("rs-dw__readiness", readiness)}>{readiness.replace(/_/g, " ")}</span>;
}

function WarningBadges({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="rs-dw__badge-list">
      {warnings.map((w) => (
        <li key={w} className="rs-dw__badge rs-dw__badge--warn">{w}</li>
      ))}
    </ul>
  );
}

function PreviewPageCard({ card }: { card: PreviewCard }) {
  const icon = card.wireframeIcon ?? "📄";
  const label = card.layoutType ?? card.wireframeLabel ?? card.template;
  const priority = card.visualPriority ?? 0;

  return (
    <article className={`rs-dw__creative-board rs-dw__creative-board--${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="rs-dw__creative-board-top">
        <span className="rs-dw__creative-board-icon" aria-hidden>{icon}</span>
        {card.paletteChips && card.paletteChips.length > 0 ? (
          <ul className="rs-dw__palette-chips" aria-label="Color palette">
            {card.paletteChips.map((chip) => (
              <li
                key={chip}
                className="rs-dw__palette-chip"
                style={{ background: PALETTE_HEX[chip] ?? "#888" }}
                title={chip}
              />
            ))}
          </ul>
        ) : null}
      </div>
      <p className="rs-dw__creative-board-type">{label}</p>
      <h4>{card.label || card.headline}</h4>
      <div className="rs-dw__creative-board-meta">
        {card.cameraIcon ? (
          <span title={card.cameraLabel ?? "Camera"}>{card.cameraIcon} {card.cameraLabel}</span>
        ) : null}
        {card.motionIcon ? (
          <span title={card.motionLabel ?? "Motion"}>{card.motionIcon} {card.motionLabel}</span>
        ) : null}
      </div>
      {card.texture ? <p className="rs-dw__creative-board-texture">{card.texture}</p> : null}
      {card.mood ? <p className="rs-dw__creative-board-mood">{card.mood}</p> : null}
      {priority > 0 ? (
        <p className="rs-dw__creative-board-priority" aria-label={`Visual priority ${priority} of 5`}>
          {"★".repeat(priority)}{"☆".repeat(5 - priority)}
        </p>
      ) : null}
      {card.warnings && card.warnings.length > 0 ? (
        <WarningBadges warnings={card.warnings} />
      ) : null}
    </article>
  );
}

function StorytellingWorkspace({
  plan,
  previewChapters,
}: {
  plan: DirectorStoryPlan;
  previewChapters: PreviewChapter[];
}) {
  const summary = plan.summary;
  const hasPlan = plan.version >= 2 && summary;
  const hasDiscovery = plan.version >= 3 && plan.discoveries?.length;
  const hasExperienceDesign = plan.version >= 4 && plan.experienceConcepts?.length;
  const hasArtDirection = plan.version >= 5 && plan.artDirectionBriefs?.length;

  if (!hasPlan) {
    return (
      <section className="rs-dw__section">
        <p className="rs-dw__empty">Regenerate Director to load storytelling workspace.</p>
      </section>
    );
  }

  const creativeBrief = summary.creativeBrief ?? summary.narrativeParagraph;

  return (
    <>
      <section className="rs-dw__section rs-dw__section--summary" aria-labelledby="dw-summary">
        <div className="rs-dw__section-head">
          <h2 id="dw-summary">Director Summary</h2>
          <ReadinessBadge readiness={summary.publishReadiness} />
        </div>
        <p className="rs-dw__summary-lead">{summary.mainStory}</p>
        <p className="rs-dw__summary-narrative">{creativeBrief}</p>
        {summary.topDiscoveries?.length ? (
          <ul className="rs-dw__discovery-top">
            {summary.topDiscoveries.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        ) : null}
        <dl className="rs-dw__summary-stats">
          {summary.majorDiscoveryCount != null ? (
            <div><dt>Major discoveries</dt><dd>{summary.majorDiscoveryCount}</dd></div>
          ) : null}
          <div><dt>Stories</dt><dd>{summary.storyCount}</dd></div>
          <div><dt>Pages</dt><dd>{summary.pageCount}</dd></div>
          <div><dt>Readiness</dt><dd>{summary.publishReadinessLabel}</dd></div>
        </dl>
        {summary.weaknesses.length > 0 ? (
          <div className="rs-dw__summary-block rs-dw__summary-block--weak">
            <h3>Attention</h3>
            <ul>{summary.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        ) : null}
      </section>

      {hasDiscovery ? (
        <>
          <section className="rs-dw__section rs-dw__section--discoveries" aria-labelledby="dw-discoveries">
            <div className="rs-dw__section-head">
              <h2 id="dw-discoveries">Interesting Discoveries</h2>
              <p>{plan.discoveryCoverage.discoveriesFound} found · {plan.discoveryCoverage.discoveriesUsed} used in storyboard</p>
            </div>
            <div className="rs-dw__discovery-board">
              {plan.discoveries.map((d) => (
                <article key={d.id} className={`rs-dw__discovery-card rs-dw__discovery-card--${d.status}`}>
                  <header className="rs-dw__discovery-head">
                    <span className="rs-dw__discovery-rank">#{d.rank}</span>
                    <h3>{d.title}</h3>
                    <span className="rs-dw__discovery-confidence">{d.confidence}% confidence</span>
                  </header>
                  <p className="rs-dw__discovery-why">{d.whyItMatters}</p>
                  <p className="rs-dw__discovery-meta">
                    {d.factIds.length} facts · {d.mediaIds.length} media · score {d.scores.composite}
                  </p>
                  <p className="rs-dw__discovery-supports">
                    Supports: {d.potentialExperiences.join(" · ")}
                  </p>
                  {d.ignoreReason ? (
                    <p className="rs-dw__discovery-ignored">Ignored: {d.ignoreReason}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="rs-dw__section" aria-labelledby="dw-ranked">
            <div className="rs-dw__section-head">
              <h2 id="dw-ranked">Discovery Ranking</h2>
              <p>Strongest discoveries first — storyboard follows this curiosity order</p>
            </div>
            <ol className="rs-dw__rank-list">
              {plan.discoveries.map((d) => (
                <li key={d.id}>
                  <strong>{d.rank}. {d.title}</strong>
                  <span>
                    Interest {d.scores.audienceInterest} · History {d.scores.historicalSignificance} ·
                    Visual {d.scores.visualPotential} · Unique {d.scores.uniqueness}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rs-dw__section" aria-labelledby="dw-opportunities">
            <div className="rs-dw__section-head">
              <h2 id="dw-opportunities">Experience Opportunities</h2>
              <p>Discoveries mapped to story experiences — not pages</p>
            </div>
            <ul className="rs-dw__opp-list">
              {plan.opportunities.filter((o) => o.discoveryId).map((o) => (
                <li key={o.id}>
                  <strong>{o.title}</strong>
                  <span>Priority {o.priority} · score {o.compositeScore}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rs-dw__section" aria-labelledby="dw-narrative-chapters">
            <div className="rs-dw__section-head">
              <h2 id="dw-narrative-chapters">Story Construction</h2>
              <p>Narrative chapters built from discoveries</p>
            </div>
            <div className="rs-dw__narrative-chapters">
              {plan.narrativeChapters.map((ch) => (
                <article key={ch.id} className="rs-dw__narrative-chapter">
                  <h3>{ch.title}</h3>
                  <p>{ch.thesis}</p>
                  <p className="rs-dw__discovery-meta">
                    {ch.discoveryIds.length} discoveries · stories: {ch.storyIds.join(", ")}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rs-dw__section" aria-labelledby="dw-discovery-coverage">
            <div className="rs-dw__section-head">
              <h2 id="dw-discovery-coverage">Discovery Coverage</h2>
              <p>Maximize meaningful discovery — not page count</p>
            </div>
            <dl className="rs-dw__summary-stats">
              <div><dt>Found</dt><dd>{plan.discoveryCoverage.discoveriesFound}</dd></div>
              <div><dt>Used</dt><dd>{plan.discoveryCoverage.discoveriesUsed}</dd></div>
              <div><dt>Ignored</dt><dd>{plan.discoveryCoverage.discoveriesIgnored}</dd></div>
            </dl>
            {plan.discoveryCoverage.ignored.length > 0 ? (
              <ul className="rs-dw__coverage-brief">
                {plan.discoveryCoverage.ignored.map((item) => (
                  <li key={item.id}>{item.title}: {item.reason}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      ) : null}

      {hasExperienceDesign ? (
        <>
          <section className="rs-dw__section rs-dw__section--experience" aria-labelledby="dw-experience-concepts">
            <div className="rs-dw__section-head">
              <h2 id="dw-experience-concepts">Experience Concepts</h2>
              <p>Creative direction per story — how someone should experience this</p>
            </div>
            <div className="rs-dw__experience-board">
              {plan.experienceConcepts.map((concept) => (
                <article key={concept.storyId} className="rs-dw__experience-card">
                  <header className="rs-dw__experience-head">
                    <h3>{concept.storyTitle}</h3>
                    <span className="rs-dw__experience-priority">
                      {"★".repeat(concept.visualPriority)}{"☆".repeat(5 - concept.visualPriority)}
                    </span>
                  </header>
                  <p className="rs-dw__experience-concept">{concept.conceptTitle}</p>
                  <dl className="rs-dw__experience-meta">
                    <div><dt>Type</dt><dd>{experienceTypeLabel(concept.experienceType)}</dd></div>
                    <div><dt>Mood</dt><dd>{concept.mood}</dd></div>
                    <div><dt>Primary</dt><dd>{concept.primaryMedia}</dd></div>
                  </dl>
                  <p className="rs-dw__experience-narration">&ldquo;{concept.narration}&rdquo;</p>
                  <p className="rs-dw__experience-animation">{concept.animation}</p>
                  <p className="rs-dw__discovery-meta">
                    Supporting: {concept.supportingMedia.join(" · ")}
                  </p>
                  <p className="rs-dw__discovery-meta">
                    Reaction: {concept.visualVocabulary.desiredEmotionalReaction}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {hasArtDirection ? (
            <>
              <section className="rs-dw__section rs-dw__section--art" aria-labelledby="dw-art-direction">
                <div className="rs-dw__section-head">
                  <h2 id="dw-art-direction">Art Direction</h2>
                  <p>How every experience should look — before any illustration is generated</p>
                </div>
                <div className="rs-dw__art-board">
                  {plan.artDirectionBriefs.map((brief) => (
                    <article key={brief.id} className="rs-dw__art-card">
                      <header className="rs-dw__art-head">
                        <h3>{brief.storyTitle}</h3>
                        <span className="rs-dw__art-identity">{brief.visualIdentity}</span>
                      </header>
                      <p className="rs-dw__art-opening">{brief.openingBeat}</p>
                      <dl className="rs-dw__art-meta">
                        <div><dt>Environment</dt><dd>{brief.primaryEnvironment}</dd></div>
                        <div><dt>Camera</dt><dd>{brief.camera}</dd></div>
                        <div><dt>Lighting</dt><dd>{brief.lighting}</dd></div>
                        <div><dt>Motion</dt><dd>{brief.motion}</dd></div>
                        <div><dt>Layout</dt><dd>{brief.layoutStyle}</dd></div>
                        <div><dt>Focus</dt><dd>{brief.primaryFocus}</dd></div>
                      </dl>
                      <ul className="rs-dw__palette-chips rs-dw__palette-chips--inline" aria-label="Palette">
                        {brief.colorPalette.map((c) => (
                          <li
                            key={c}
                            className="rs-dw__palette-chip"
                            style={{ background: PALETTE_HEX[c] ?? "#888" }}
                            title={c}
                          />
                        ))}
                      </ul>
                      <p className="rs-dw__discovery-meta">
                        Texture: {brief.textures.join(" · ")} · Tone: {brief.emotionalTone}
                      </p>
                      <p className="rs-dw__art-emotion">&ldquo;{brief.emotionalGoal}&rdquo;</p>
                      <p className="rs-dw__discovery-meta">{brief.eraNotes}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rs-dw__section rs-dw__section--art-overview" aria-labelledby="dw-art-overview">
                <div className="rs-dw__section-head">
                  <h2 id="dw-art-overview">Art Direction Overview</h2>
                  <p>
                    {plan.artDirectionOverview.overallCreativeIdentity} · consistency{" "}
                    {plan.artDirectionOverview.consistencyScore}/100
                  </p>
                </div>
                <dl className="rs-dw__summary-stats">
                  <div><dt>Cameras</dt><dd>{plan.artDirectionOverview.cameraVariety.join(", ")}</dd></div>
                  <div><dt>Motion</dt><dd>{plan.artDirectionOverview.motionVariety.join(", ")}</dd></div>
                  <div><dt>Era</dt><dd>{plan.artDirectionOverview.eraAuthenticity}</dd></div>
                </dl>
                <p className="rs-dw__discovery-meta">
                  Textures: {plan.artDirectionOverview.textureBalance.join(" · ")}
                </p>
                <p className="rs-dw__discovery-meta">
                  Colors: {plan.artDirectionOverview.colorDiversity.join(" · ")}
                </p>
                <p className="rs-dw__art-pacing">
                  Emotional pacing: {plan.artDirectionOverview.emotionalPacing}
                </p>
                {plan.artDirectionConsistency.warnings.length > 0 ? (
                  <div className="rs-dw__summary-block rs-dw__summary-block--weak">
                    <h3>Visual consistency warnings</h3>
                    <ul>{plan.artDirectionConsistency.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                  </div>
                ) : null}
              </section>
            </>
          ) : null}

          <section className="rs-dw__section rs-dw__section--variety" aria-labelledby="dw-experience-variety">
            <div className="rs-dw__section-head">
              <h2 id="dw-experience-variety">Experience Variety</h2>
              <p>
                Variety score {plan.experienceVariety.varietyScore}/100 — would you stop scrolling?
              </p>
            </div>
            <dl className="rs-dw__summary-stats">
              {Object.entries(plan.experienceVariety.visualTypesUsed).map(([type, count]) => (
                <div key={type}><dt>{type}</dt><dd>{count}</dd></div>
              ))}
            </dl>
            {plan.experienceVariety.textHeavyWarnings.length > 0 ? (
              <div className="rs-dw__summary-block rs-dw__summary-block--weak">
                <h3>Text-heavy warnings</h3>
                <ul>{plan.experienceVariety.textHeavyWarnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            ) : null}
            {plan.experienceVariety.repeatedLayouts.length > 0 ? (
              <div className="rs-dw__summary-block rs-dw__summary-block--weak">
                <h3>Repeated layouts</h3>
                <ul>{plan.experienceVariety.repeatedLayouts.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            ) : null}
            {plan.experienceVariety.missingVisualOpportunities.length > 0 ? (
              <div className="rs-dw__summary-block">
                <h3>Missing visual opportunities</h3>
                <ul>{plan.experienceVariety.missingVisualOpportunities.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            ) : null}
            {plan.experienceVariety.scrollStopMoments.filter((m) => m.verdict === "strong").length > 0 ? (
              <div className="rs-dw__summary-block">
                <h3>Strong scroll-stop moments</h3>
                <ul>
                  {plan.experienceVariety.scrollStopMoments
                    .filter((m) => m.verdict === "strong")
                    .map((m) => (
                      <li key={m.pageId}>{m.reason}</li>
                    ))}
                </ul>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      <section className="rs-dw__section rs-dw__section--sequence" aria-labelledby="dw-audience">
        <div className="rs-dw__section-head">
          <h2 id="dw-audience">Audience Sequence</h2>
          <p>Exact order the public experience will follow — {plan.audienceSequence.length} beats</p>
        </div>
        <ol className="rs-dw__audience-sequence">
          {plan.audienceSequence.map((step) => (
            <li key={step.pageId} className="rs-dw__audience-step">
              <span className="rs-dw__audience-num">{step.order}</span>
              <div>
                <strong>{step.label}</strong>
                <span className="rs-dw__audience-meta">{step.templateId} · {step.storyId.replace(/_/g, " ")}</span>
                {step.warnings.length > 0 ? <WarningBadges warnings={step.warnings} /> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rs-dw__section" aria-labelledby="dw-chapters">
        <div className="rs-dw__section-head">
          <h2 id="dw-chapters">Story Chapters</h2>
          <p>Vertical documentary chapters — no horizontal scrolling</p>
        </div>
        <div className="rs-dw__chapter-stack">
          {plan.chapters.map((chapter) => (
            <article key={chapter.storyId} className={`rs-dw__chapter rs-dw__chapter--${chapter.role}`}>
              <header className="rs-dw__chapter-head">
                <span className="rs-dw__chapter-num">{chapter.order}</span>
                <div>
                  <h3>{chapter.title}</h3>
                  <p>{chapter.purpose}</p>
                </div>
              </header>
              <dl className="rs-dw__chapter-stats">
                <div><dt>Facts</dt><dd>{chapter.factCount}</dd></div>
                <div><dt>Media</dt><dd>{chapter.mediaCount}</dd></div>
                <div><dt>Exhibits</dt><dd>{chapter.exhibitCount}</dd></div>
                <div><dt>Pages</dt><dd>{chapter.pageCount}</dd></div>
              </dl>
              <WarningBadges warnings={chapter.warnings} />
            </article>
          ))}
        </div>
      </section>

      <section className="rs-dw__section rs-dw__section--coverage-compact" aria-labelledby="dw-coverage">
        <div className="rs-dw__section-head">
          <h2 id="dw-coverage">Coverage</h2>
          <p>Facts {plan.coverage.factsUsed}/{plan.coverage.factsTotal} · Media {plan.coverage.mediaUsed}/{plan.coverage.mediaTotal}</p>
        </div>
        {plan.coverage.missingResearchOpportunities.length > 0 ? (
          <ul className="rs-dw__coverage-brief">
            {plan.coverage.missingResearchOpportunities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="rs-dw__empty">No open research gaps flagged.</p>
        )}
      </section>

      <section className="rs-dw__section rs-dw__section--wall" aria-labelledby="dw-preview">
        <div className="rs-dw__section-head">
          <h2 id="dw-preview">Preview Wall</h2>
          <p>Creative boards — palette, camera, motion at a glance</p>
        </div>
        {previewChapters.length > 0 ? (
          <div className="rs-dw__preview-chapters">
            {previewChapters.map((chapter) => (
              <div key={chapter.storyId} className="rs-dw__preview-chapter">
                <h3>{chapter.title}</h3>
                <WarningBadges warnings={chapter.warnings} />
                {chapter.pages.length > 0 ? (
                  <div className="rs-dw__preview-grid">
                    {chapter.pages.map((card) => (
                      <PreviewPageCard key={card.id} card={card} />
                    ))}
                  </div>
                ) : (
                  <p className="rs-dw__empty">No pages in this chapter.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rs-dw__empty">No generated experiences yet.</p>
        )}
      </section>
    </>
  );
}

function LegacyWorkspace({ snapshot }: { snapshot: DirectorWorkspaceSnapshot }) {
  const availableCount = snapshot.inventory.filter((i) => i.available).length;
  const catalogGenerated = snapshot.experienceCatalog.filter(
    (c) => c.status === "generated" || c.status === "published",
  ).length;

  return (
    <>
      <section className="rs-dw__section" aria-labelledby="dw-collector">
        <div className="rs-dw__section-head">
          <h2 id="dw-collector">Collector Inventory</h2>
          <p>{availableCount} of {snapshot.inventory.length} sources available</p>
        </div>
        <ul className="rs-dw__inventory">
          {snapshot.inventory.map((item) => (
            <li key={item.id} className={item.available ? "rs-dw__inventory-item rs-dw__inventory-item--yes" : "rs-dw__inventory-item rs-dw__inventory-item--no"}>
              <span className="rs-dw__inventory-mark" aria-hidden>{item.available ? "✓" : "—"}</span>
              <div>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rs-dw__section" aria-labelledby="dw-editor">
        <div className="rs-dw__section-head">
          <h2 id="dw-editor">Editor Output</h2>
          <p>Clean dataset — facts only, no narrative</p>
        </div>
        <dl className="rs-dw__facts">
          {snapshot.editorFacts.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        {snapshot.editorWarnings.length > 0 ? (
          <ul className="rs-dw__warnings">
            {snapshot.editorWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rs-dw__section rs-dw__section--catalog" aria-labelledby="dw-catalog">
        <div className="rs-dw__section-head">
          <h2 id="dw-catalog">Director Experience Catalog</h2>
          <p>{catalogGenerated} generated · {snapshot.experienceCatalog.length} total experience types</p>
        </div>
        <div className="rs-dw__catalog">
          {snapshot.experienceCatalog.map((card) => (
            <CatalogCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      <section className="rs-dw__section" aria-labelledby="dw-blueprint">
        <div className="rs-dw__section-head">
          <h2 id="dw-blueprint">Director Blueprint</h2>
          <p>Plan Publisher will receive</p>
        </div>
        <dl className="rs-dw__blueprint-stats">
          <div>
            <dt>Estimated pages</dt>
            <dd>{snapshot.blueprint.estimatedPages}</dd>
          </div>
          <div>
            <dt>Estimated runtime</dt>
            <dd>{snapshot.blueprint.estimatedRuntimeSec}s</dd>
          </div>
          <div>
            <dt>Estimated AI calls</dt>
            <dd>{snapshot.blueprint.estimatedAiCalls}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

export function DirectorWorkspaceView({ snapshot }: Props) {
  const storytelling = snapshot.storyPlan;
  const published = snapshot.review.departments.find((d) => d.id === "publisher")?.status === "approved";

  return (
    <div className="rs-dw">
      <header className="rs-dw__hero">
        <Link href="/ops/studio/director" className="rs-dw__back">
          ← Director Department
        </Link>
        <p className="rs-dw__kicker">Director Workspace</p>
        {storytelling ? (
          <p className="rs-dw__pipeline-kicker">Discovery-driven · Sprint 3.34</p>
        ) : null}
        <div className="rs-dw__song">
          {snapshot.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={snapshot.coverUrl} alt="" className="rs-dw__art" />
          ) : (
            <div className="rs-dw__art rs-dw__art--fallback" aria-hidden>
              {snapshot.title.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="rs-dw__title">{snapshot.title}</h1>
            <p className="rs-dw__artist">{snapshot.artist}</p>
            <p className="rs-dw__rvtr">{snapshot.rvtr}</p>
          </div>
        </div>
        <dl className="rs-dw__overview-grid">
          <div><dt>Album</dt><dd>{snapshot.album ?? "—"}</dd></div>
          <div><dt>Year</dt><dd>{snapshot.year ?? "—"}</dd></div>
          <div><dt>Package status</dt><dd>{snapshot.packageStatus}</dd></div>
          <div><dt>Current stage</dt><dd>{snapshot.currentStage}</dd></div>
          <div>
            <dt>Completion</dt>
            <dd>
              <span className="rs-dw__completion-bar" aria-hidden>
                <span className="rs-dw__completion-fill" style={{ width: `${snapshot.completionPct}%` }} />
              </span>
              {snapshot.completionPct}%
            </dd>
          </div>
        </dl>
        <div className="rs-dw__links">
          <Link href={productionTrackerPath(snapshot.rvtr)} className="rs-dw__link">
            Follow This Song
          </Link>
          {published ? (
            <Link href={`/experience/${snapshot.rvtr}`} className="rs-dw__link">
              Live experience
            </Link>
          ) : null}
        </div>
      </header>

      {storytelling ? (
        <StorytellingWorkspace plan={storytelling} previewChapters={snapshot.previewChapters} />
      ) : (
        <>
          <LegacyWorkspace snapshot={snapshot} />
          <section className="rs-dw__section rs-dw__section--wall" aria-labelledby="dw-preview-legacy">
            <div className="rs-dw__section-head">
              <h2 id="dw-preview-legacy">Preview Wall</h2>
              <p>{snapshot.previews.length} generated scenes</p>
            </div>
            {snapshot.previews.length > 0 ? (
              <div className="rs-dw__preview-grid">
                {snapshot.previews.map((card) => (
                  <PreviewPageCard key={card.id} card={card} />
                ))}
              </div>
            ) : (
              <p className="rs-dw__empty">No generated experiences yet.</p>
            )}
          </section>
        </>
      )}

      <section className="rs-dw__section" aria-labelledby="dw-review">
        <div className="rs-dw__section-head">
          <h2 id="dw-review">Review Board</h2>
          <p>Actionable quality checks before publishing</p>
        </div>
        <ul className="rs-dw__review-board">
          {snapshot.review.departments.map((dept) => (
            <li key={dept.id} className={statusClass("rs-dw__review-dept", dept.status)}>
              <strong>{dept.label}</strong>
              <span>{dept.statusLabel}</span>
            </li>
          ))}
        </ul>
        {snapshot.review.warnings.length > 0 ? (
          <ul className="rs-dw__warnings rs-dw__warnings--actionable">
            {snapshot.review.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p className="rs-dw__empty">No quality warnings.</p>
        )}
      </section>
    </div>
  );
}
