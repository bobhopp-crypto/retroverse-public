"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { SystemMap } from "@/lib/atlas/system-map/types";

type Props = {
  map: SystemMap;
};

function reportHref(relativePath: string, kind: "file" | "folder"): string | null {
  if (kind !== "file") return null;
  if (!/\.(md|txt|json|csv|log)$/i.test(relativePath)) return null;
  return `/api/ops/atlas/system/report?path=${encodeURIComponent(relativePath)}`;
}

function Section({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="atlas-system__section">
      <h2 className="atlas-system__section-title">
        {title}
        {count != null ? <span>{count}</span> : null}
      </h2>
      {children}
    </section>
  );
}

export function AtlasSystemMapView({ map }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filteredRoutes = useMemo(() => {
    if (!q) return map.routes;
    return map.routes.filter(
      (route) =>
        route.url.toLowerCase().includes(q) ||
        route.title.toLowerCase().includes(q) ||
        route.category.toLowerCase().includes(q) ||
        route.status.toLowerCase().includes(q),
    );
  }, [map.routes, q]);

  const filteredApis = useMemo(() => {
    if (!q) return map.apis;
    return map.apis.filter(
      (api) =>
        api.endpoint.toLowerCase().includes(q) ||
        api.purpose.toLowerCase().includes(q) ||
        api.methods.join(",").toLowerCase().includes(q),
    );
  }, [map.apis, q]);

  return (
    <div className="atlas-system">
      <header className="atlas-system__hero">
        <p className="atlas-system__eyebrow">Atlas System Map</p>
        <h1 className="atlas-system__title">System Map</h1>
        <p className="atlas-system__lead">
          Filesystem-discovered map of routes, APIs, scripts, workers, data, and reports.
          {map.cached ? " Loaded from local cache." : " Fresh scan cached locally."}
        </p>
        <dl className="atlas-system__health">
          <div>
            <dt>Routes</dt>
            <dd>{map.health.routes}</dd>
          </div>
          <div>
            <dt>API endpoints</dt>
            <dd>{map.health.apiEndpoints}</dd>
          </div>
          <div>
            <dt>Scripts</dt>
            <dd>{map.health.scripts}</dd>
          </div>
          <div>
            <dt>Workers</dt>
            <dd>{map.health.workers}</dd>
          </div>
          <div>
            <dt>Reports</dt>
            <dd>{map.health.reports}</dd>
          </div>
          <div>
            <dt>Data sources</dt>
            <dd>{map.health.dataSources}</dd>
          </div>
        </dl>
      </header>

      <nav className="atlas-system__nav" aria-label="System map sections">
        <a href="#routes">Routes</a>
        <a href="#apis">API Map</a>
        <a href="#scripts">Scripts</a>
        <a href="#data">Data Sources</a>
        <a href="#workers">Workers</a>
        <a href="#reports">Reports</a>
      </nav>

      <label className="atlas-system__search-wrap">
        <span className="atlas-system__search-label">Filter routes and APIs</span>
        <input
          className="atlas-system__search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search URL, title, endpoint, purpose…"
        />
      </label>

      <Section id="routes" title="Routes" count={filteredRoutes.length}>
        <div className="atlas-system__table-wrap">
          <table className="atlas-system__table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route) => (
                <tr key={route.url}>
                  <td>
                    <code>{route.url}</code>
                  </td>
                  <td>{route.title}</td>
                  <td>{route.category}</td>
                  <td>{route.status}</td>
                  <td>
                    <Link href={route.url} className="atlas-system__link">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="apis" title="API Map" count={filteredApis.length}>
        <div className="atlas-system__list">
          {filteredApis.map((api) => (
            <article key={api.endpoint} className="atlas-system__card">
              <div className="atlas-system__card-head">
                <code>{api.endpoint}</code>
                <span>{api.methods.join(", ")}</span>
              </div>
              <p>{api.purpose}</p>
              <p className="atlas-system__meta">
                <span>{api.filePath}</span>
              </p>
              {api.referencedBy.length > 0 ? (
                <p className="atlas-system__refs">
                  Referenced by: {api.referencedBy.join(" · ")}
                </p>
              ) : (
                <p className="atlas-system__refs atlas-system__refs--dim">Referenced by: not found in app/components/lib scan</p>
              )}
            </article>
          ))}
        </div>
      </Section>

      <Section id="scripts" title="Script Relationships">
        <p className="atlas-system__intro">
          {map.scriptSummary.total} npm scripts cataloged. Full launcher at{" "}
          <Link href={map.scriptSummary.launcherHref}>Script Launcher</Link>.
        </p>
        <div className="atlas-system__pipelines">
          {map.pipelines.map((pipeline) => (
            <article key={pipeline.id} className="atlas-system__pipeline">
              <h3>{pipeline.title}</h3>
              <div className="atlas-system__pipeline-steps">
                {pipeline.steps.map((step, index) => (
                  <span key={step}>
                    {index > 0 ? <span className="atlas-system__arrow">↓</span> : null}
                    <span className="atlas-system__step">{step}</span>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <dl className="atlas-system__script-counts">
          {Object.entries(map.scriptSummary.byCategory).map(([category, count]) => (
            <div key={category}>
              <dt>{category}</dt>
              <dd>{count}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="data" title="Data Sources" count={map.dataSources.length}>
        <div className="atlas-system__list">
          {map.dataSources.map((source) => (
            <article key={source.id} className="atlas-system__card">
              <div className="atlas-system__card-head">
                <strong>{source.path}</strong>
                <span>{source.exists ? source.sizeLabel : "missing"}</span>
              </div>
              <p>{source.purpose}</p>
              <p className="atlas-system__meta">
                {source.lastModified
                  ? `Last modified ${new Date(source.lastModified).toLocaleString()}`
                  : "Not present on disk"}
              </p>
            </article>
          ))}
        </div>

        <h3 className="atlas-system__subheading">Environment variables (names only)</h3>
        <p className="atlas-system__env-grid">
          {map.environmentVariables.map((name) => (
            <code key={name}>{name}</code>
          ))}
        </p>
      </Section>

      <Section id="workers" title="Workers" count={map.workers.length}>
        <div className="atlas-system__list">
          {map.workers.map((worker) => (
            <article key={`${worker.name}-${worker.entryPoint}`} className="atlas-system__card">
              <div className="atlas-system__card-head">
                <strong>{worker.name}</strong>
              </div>
              <p>{worker.purpose}</p>
              <p className="atlas-system__meta">
                Entry: <code>{worker.entryPoint}</code>
              </p>
              <p className="atlas-system__meta">
                Started by: <code>{worker.startedByScript}</code>
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="reports" title="Reports" count={map.health.reports}>
        <div className="atlas-system__report-groups">
          {map.reportGroups.map((group) => (
            <article key={group.folder} className="atlas-system__report-group">
              <h3>
                {group.folder} <span>{group.reports.length}</span>
              </h3>
              <ul>
                {group.reports.map((report) => {
                  const href = reportHref(report.relativePath, report.kind);
                  return (
                    <li key={report.relativePath}>
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" className="atlas-system__link">
                          {report.name}
                        </a>
                      ) : (
                        <span>{report.name}</span>
                      )}
                      <span>{new Date(report.lastModified).toLocaleDateString()}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <p className="atlas-system__back">
        <Link href="/ops">← Command Center</Link>
        {" · "}
        <Link href="/ops/atlas/scripts">Script Launcher</Link>
        {" · "}
        <Link href="/ops/atlas/architecture">Architecture</Link>
      </p>
    </div>
  );
}
