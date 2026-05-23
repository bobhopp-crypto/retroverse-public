import type { Metadata } from "next";
import Link from "next/link";

import { isControlCenterEnabled } from "@/lib/control-center/dev-gate";
import { CONTROL_SECTIONS } from "@/lib/control-center/links";
import { loadControlCenterStatus } from "@/lib/control-center/status";
import { welcomeUpstreamBase } from "@/lib/control-center/welcome-base";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Control Center — Retroverse (dev)",
  robots: { index: false, follow: false },
};

function ControlDisabled() {
  return (
    <main className="cc-page">
      <div className="cc-page__inner">
        <p className="cc-banner cc-banner--warn">
          Control Center is only available in local development.
        </p>
        <p className="cc-lead">
          Set <code>RETROVERSE_CONTROL_CENTER=1</code> to enable in production.
        </p>
        <Link href="/" className="cc-back">
          ← Home
        </Link>
      </div>
    </main>
  );
}

export default async function ControlCenterPage() {
  if (!isControlCenterEnabled()) {
    return <ControlDisabled />;
  }

  const status = await loadControlCenterStatus();
  const welcome = welcomeUpstreamBase() || "(not configured)";

  return (
    <main className="cc-page">
      <div className="cc-page__grain" aria-hidden />
      <div className="cc-page__inner">
        <header className="cc-hero">
          <div className="cc-hero__top">
            <div>
              <p className="cc-hero__kicker">Dev only · backstage</p>
              <h1 className="cc-hero__title">Control Center</h1>
              <p className="cc-hero__tagline">Retroverse mission control</p>
            </div>
            <Link href="/" className="cc-hero__home">
              ← Home
            </Link>
          </div>
          <p className="cc-hero__note">
            Launchpad for PUBLIC + welcome upstream ({welcome})
          </p>
        </header>

        <section className="cc-status" aria-labelledby="cc-status-heading">
          <h2 id="cc-status-heading" className="cc-status__title">
            System status
          </h2>
          <ul className="cc-status__grid">
            {status.map((item) => (
              <li
                key={item.id}
                className={`cc-status__item${item.ok ? " cc-status__item--ok" : " cc-status__item--bad"}`}
              >
                <span className="cc-status__lamp" aria-hidden />
                <div>
                  <strong className="cc-status__label">{item.label}</strong>
                  <p className="cc-status__detail">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {CONTROL_SECTIONS.map((section) => (
          <section
            key={section.id}
            className={`cc-panel cc-panel--${section.tone}`}
            aria-labelledby={`cc-${section.id}`}
          >
            <h2 id={`cc-${section.id}`} className="cc-panel__title">
              {section.title}
            </h2>
            <ul className="cc-panel__links">
              {section.links.map((link) => (
                <li key={`${section.id}-${link.href}-${link.label}`}>
                  {link.external ? (
                    <a
                      href={link.href}
                      className="cc-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="cc-link__label">{link.label}</span>
                      {link.note ? (
                        <span className="cc-link__note">{link.note}</span>
                      ) : null}
                      <span className="cc-link__ext" aria-hidden>
                        ↗
                      </span>
                    </a>
                  ) : (
                    <Link href={link.href} className="cc-link">
                      <span className="cc-link__label">{link.label}</span>
                      {link.note ? (
                        <span className="cc-link__note">{link.note}</span>
                      ) : null}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <footer className="cc-footer">
          <p>Hardcoded dev routes · not indexed · not public-facing</p>
        </footer>
      </div>
    </main>
  );
}
