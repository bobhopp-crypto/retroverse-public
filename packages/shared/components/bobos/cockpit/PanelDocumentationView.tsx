"use client";

import {
  PANEL_DOC_SECTION_ORDER,
  PANEL_DOC_SECTION_TITLES,
  type PanelDocumentation,
  type PanelDocSectionId,
} from "@/lib/bobos/cockpit/panel-docs";
import { panelVerificationLabel } from "@/lib/bobos/cockpit/panel-verification";
import { formatRvId } from "@/lib/bobos/rv-ids";

function Section({ id, children }: { id: PanelDocSectionId; children: React.ReactNode }) {
  return (
    <section className="cockpit-docs__section" aria-labelledby={`docs-sec-${id}`}>
      <h3 id={`docs-sec-${id}`} className="cockpit-docs__section-title">
        {PANEL_DOC_SECTION_TITLES[id]}
      </h3>
      <div className="cockpit-docs__section-body">{children}</div>
    </section>
  );
}

function Paras({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line.slice(0, 48)} className="cockpit-docs__p">
          {line}
        </p>
      ))}
    </>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="cockpit-docs__list">
      {items.map((item) => (
        <li key={item.slice(0, 64)}>{item}</li>
      ))}
    </ul>
  );
}

function renderSection(docs: PanelDocumentation, id: PanelDocSectionId): React.ReactNode {
  switch (id) {
    case "purpose":
      return <p className="cockpit-docs__p">{docs.purpose}</p>;
    case "userWorkflow":
      return (
        <ol className="cockpit-docs__steps">
          {docs.userWorkflow.map((step, index) => (
            <li key={`${index}-${step.slice(0, 40)}`}>{step}</li>
          ))}
        </ol>
      );
    case "operatorNotes":
      return <BulletList items={docs.operatorNotes} />;
    case "technicalArchitecture":
      return <Paras lines={docs.technicalArchitecture} />;
    case "sourceFiles":
      return (
        <ul className="cockpit-docs__files">
          {docs.sourceFiles.map((file) => (
            <li key={file.path}>
              <code className="cockpit-docs__code">{file.path}</code>
              <span className="cockpit-docs__file-role">{file.role}</span>
            </li>
          ))}
        </ul>
      );
    case "publicRoutes":
      return (
        <ul className="cockpit-docs__routes">
          {docs.publicRoutes.map((route) => (
            <li key={route.path}>
              <code className="cockpit-docs__code">{route.path}</code>
              <span className="cockpit-docs__file-role">{route.role}</span>
            </li>
          ))}
        </ul>
      );
    case "apis":
      return (
        <ul className="cockpit-docs__apis">
          {docs.apis.map((api) => (
            <li key={`${api.method}-${api.path}`}>
              <span className="cockpit-docs__method">{api.method}</span>
              <code className="cockpit-docs__code">{api.path}</code>
              <span className="cockpit-docs__file-role">{api.role}</span>
            </li>
          ))}
        </ul>
      );
    case "dataModel":
      return <BulletList items={docs.dataModel} />;
    case "runtimeDependencies":
      return <BulletList items={docs.runtimeDependencies} />;
    case "verification": {
      const v = docs.verification;
      const header = [
        `Status: ${panelVerificationLabel(v.status)}`,
        v.verifiedAt ? `Date: ${v.verifiedAt}` : null,
        v.verifiedBy ? `By: ${v.verifiedBy}` : null,
        v.notes ? `Notes: ${v.notes}` : null,
      ].filter(Boolean) as string[];
      return (
        <>
          <BulletList items={header} />
          <Paras lines={docs.verificationDetails} />
        </>
      );
    }
    case "knownLimitations":
      return <BulletList items={docs.knownLimitations} />;
    case "futureEnhancements":
      return <BulletList items={docs.futureEnhancements} />;
    case "changeHistory":
      return (
        <ul className="cockpit-docs__history">
          {docs.changeHistory.map((entry) => (
            <li key={`${entry.date}-${entry.summary.slice(0, 32)}`}>
              <strong className="cockpit-docs__history-date">{entry.date}</strong>
              <span>{entry.summary}</span>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

type Props = {
  docs: PanelDocumentation;
  /** Optional heading id for aria-labelledby on parent dialog/page. */
  titleId?: string;
  showHeader?: boolean;
};

/** Shared operator-manual body — used by drawer and RV00-00 full-page manuals. */
export function PanelDocumentationView({ docs, titleId, showHeader = true }: Props) {
  return (
    <div className="cockpit-docs__manual">
      {showHeader ? (
        <div className="cockpit-docs__manual-head">
          <p className="cockpit-docs__kicker">Operator Manual</p>
          <h2 id={titleId} className="cockpit-docs__title">
            {formatRvId(docs.rvId)} · {docs.title}
          </h2>
          {docs.subtitle ? <p className="cockpit-docs__subtitle">{docs.subtitle}</p> : null}
          <p className="cockpit-docs__verify-line">
            <span
              className={`cockpit-docs__verify-stamp${
                docs.verification.status === "verified" ? " cockpit-docs__verify-stamp--ok" : ""
              }`}
            >
              {panelVerificationLabel(docs.verification.status).toUpperCase()}
            </span>
            {docs.verification.verifiedAt ? (
              <span className="cockpit-docs__verify-meta">{docs.verification.verifiedAt}</span>
            ) : null}
          </p>
        </div>
      ) : null}

      <div className="cockpit-docs__body">
        {PANEL_DOC_SECTION_ORDER.map((sectionId) => (
          <Section key={sectionId} id={sectionId}>
            {renderSection(docs, sectionId)}
          </Section>
        ))}
      </div>
    </div>
  );
}
