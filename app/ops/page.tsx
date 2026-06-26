import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse Command Center",
  robots: { index: false, follow: false },
};

const mainThings: Array<{
  title: string;
  plain: string;
  note?: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: "All-Star Baseball",
    plain: "Living archive, player intelligence, and Cadaco research.",
    links: [
      { label: "Living Archive", href: "/ops/allstar" },
      { label: "Scorebook", href: "/ops/allstar/scorebook" },
      { label: "Seasons", href: "/ops/allstar/seasons" },
      { label: "Stats", href: "/ops/allstar/stats" },
      { label: "Preserve", href: "/ops/allstar/preserve" },
      { label: "Review", href: "/ops/allstar/review" },
      { label: "Audit", href: "/ops/allstar/audit" },
      { label: "Research", href: "/ops/allstar/research" },
      { label: "Disc Library", href: "/ops/allstar/library" },
    ],
  },
  {
    title: "Run A Show",
    plain: "Sunday Nights, live pages, and show controls.",
    links: [
      { label: "Live Control", href: "/ops/live-control" },
      { label: "Sunday Nights", href: "/ops/sunday-nights" },
      { label: "Live", href: "/ops/live" },
      { label: "Live Companion", href: "/ops/live-companion" },
      { label: "VDJ Bridge", href: "/ops/live#bridge" },
      { label: "Event Control", href: "/ops/event-control" },
    ],
  },
  {
    title: "Studio",
    plain: "The creative engine — AI departments and publishing workflows.",
    links: [{ label: "Studio Dashboard", href: "/ops/studio" }],
  },
  {
    title: "Research",
    plain: "Research Center — dashboard, gallery, queue, and maintenance.",
    links: [
      { label: "Research Center", href: "/ops/intelligence" },
    ],
  },
  {
    title: "Create Stuff",
    plain: "Posters, passes, artwork, and generated graphics.",
    links: [
      { label: "Content Creator", href: "/ops/content-creator" },
    ],
  },
  {
    title: "Manage My Library",
    plain: "Keep the music collection organized and connected.",
    links: [
      { label: "Browser+ 2.0 — Studio Ops", href: "/ops/browser-plus-2" },
      { label: "VirtualDJ Browser+", href: "/ops/browser-plus" },
      { label: "Automation Factory", href: "/ops/automation-factory" },
      { label: "Library Atlas", href: "/ops/atlas" },
      { label: "Media Sync", href: "/ops/media-sync" },
      { label: "RVTR Tools", href: "/ops/rvtags-review/1967" },
      { label: "Cover Tools", href: "/ops/review/covers" },
    ],
  },
  {
    title: "Keep Things Safe",
    plain: "Backups, storage, infrastructure, and money.",
    links: [
      { label: "Backups", href: "/ops/atlas/workshop" },
      { label: "Storage", href: "/ops/atlas" },
      { label: "R2 Covers", href: "/ops/covers/backfill" },
      { label: "Finance", href: "/ops/finance" },
    ],
  },
];

const topActions = [
  { label: "Studio", href: "/ops/studio" },
  { label: "All-Star Baseball", href: "/ops/allstar" },
  { label: "Live Control", href: "/ops/live-control" },
  { label: "Sunday Nights", href: "/ops/sunday-nights" },
  { label: "Live Companion", href: "/ops/live-companion" },
  { label: "Packages", href: "/ops/intelligence" },
  { label: "Factory", href: "/ops/automation-factory" },
  { label: "Backups", href: "/ops/atlas/workshop" },
  { label: "Storage", href: "/ops/atlas" },
];

const otherTools = [
  { label: "Acquisition", href: "/ops/acquisition" },
  { label: "Automation Factory", href: "/ops/automation-factory" },
  { label: "Atlas 1970s", href: "/ops/atlas/1970s" },
  { label: "Atlas Workshop", href: "/ops/atlas/workshop" },
  { label: "Cover Backfill", href: "/ops/covers/backfill" },
  { label: "Cover Corrections", href: "/ops/covers/corrections" },
  { label: "Crate Builder", href: "/ops/crate-builder" },
  { label: "Crossroads", href: "/ops/crossroads" },
  { label: "Finance Import", href: "/ops/finance/import" },
  { label: "Finance Reports", href: "/ops/finance/reports" },
  { label: "Healing", href: "/ops/healing" },
  { label: "Media Collections", href: "/ops/media-collections" },
  { label: "Media Lab", href: "/ops/media-lab" },
  { label: "Pass Registrations", href: "/ops/pass-registrations" },
  { label: "All-Star Baseball", href: "/ops/allstar" },
  { label: "Retroverse Map", href: "/ops/map" },
  { label: "Show Builder", href: "/ops/show-builder" },
  { label: "Statement Validation", href: "/ops/finance/statement-validation" },
];

const systemNotes = [
  ["Studio", "AI departments and publishing workflows"],
  ["All-Star Baseball", "Living archive — disc preservation and discovery"],
  ["Run A Show", "Live events"],
  ["Packages", "Research and storytelling"],
  ["Create Stuff", "Posters, passes, artwork"],
  ["Manage My Library", "Music collection management"],
  ["Keep Things Safe", "Backups, storage, finance"],
] as const;

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Retroverse Ops Console</h1>
      <p className="ops-dim">{props.message}</p>
      <p>This route is internal-only and is protected by middleware.</p>
      <p>
        Environment required: <code>RETROVERSE_OPS=1</code>
        <br />
        Access via <code>/internal/ops-pin</code> (local PIN gate).
      </p>
    </div>
  );
}

export default async function OpsPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <OpsBlocked message="Ops console disabled (set RETROVERSE_OPS=1)." />
        </div>
      </main>
    );
  }

  return (
    <main className="ops-page ops-command">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-command__hero">
          <p className="ops-command__kicker">What do you want to do today?</p>
          <h1 className="ops-command__title">RETROVERSE COMMAND CENTER</h1>
          <p className="ops-command__lead">
            Run shows, build song stories, make creative work, manage the library, and keep the system safe.
          </p>
          <nav className="ops-command__top-actions" aria-label="Top actions">
            {topActions.map((action) => (
              <Link key={action.href} className="ops-command__top-link" href={action.href}>
                {action.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="ops-command__section" aria-labelledby="main-things">
          <h2 id="main-things" className="ops-command__section-title">
            Main Things I Use
          </h2>
          <div className="ops-command__cards">
            {mainThings.map((thing) => (
              <article key={thing.title} className="ops-command__card">
                <h3>{thing.title}</h3>
                <p>{thing.plain}</p>
                {thing.note ? <p className="ops-command__note">{thing.note}</p> : null}
                <div className="ops-command__links">
                  {thing.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ops-command__section ops-command__system" aria-labelledby="what-is-retroverse">
          <h2 id="what-is-retroverse" className="ops-command__section-title">
            What Is Retroverse?
          </h2>
          <dl className="ops-command__system-list">
            {systemNotes.map(([term, definition]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        <details className="ops-command__other">
          <summary>Other Tools</summary>
          <div className="ops-command__other-grid">
            {otherTools.map((tool) => (
              <Link key={tool.href} href={tool.href}>
                {tool.label}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </main>
  );
}

