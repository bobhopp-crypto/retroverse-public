"use client";

import { useState } from "react";

import { getPageGuide } from "@/lib/ops/studio/operator-guide";
import type { StudioGuidePageId } from "@/lib/ops/studio/operator-guide";

type Props = {
  pageId: StudioGuidePageId;
};

export function AboutThisPage({ pageId }: Props) {
  const guide = getPageGuide(pageId);
  const [open, setOpen] = useState(false);

  if (!guide) return null;

  return (
    <section className="rs-guide-about" data-guide="about-page">
      <button
        type="button"
        className="rs-guide-about__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Hide" : "About This Page"} — {guide.title}
      </button>
      {open ? (
        <div className="rs-guide-about__body">
          <p>
            <strong>Purpose:</strong> {guide.purpose}
          </p>
          <p>
            <strong>Primary workflow:</strong> {guide.primaryWorkflow}
          </p>
          <div>
            <strong>Typical actions:</strong>
            <ul>
              {guide.typicalActions.map((a) => (
                <li key={a.id}>{a.text}</li>
              ))}
            </ul>
          </div>
          <p>
            <strong>Related:</strong> {guide.relatedDepartments.join(" · ")}
          </p>
          <div>
            <strong>Expected outputs:</strong>
            <ul>
              {guide.expectedOutputs.map((o) => (
                <li key={o.id}>{o.text}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Common problems:</strong>
            <ul>
              {guide.commonProblems.map((p) => (
                <li key={p.id}>{p.text}</li>
              ))}
            </ul>
          </div>
          {guide.checkFrequency ? (
            <p>
              <strong>How often to check:</strong> {guide.checkFrequency}
            </p>
          ) : null}
          {guide.actionRequiredWhen ? (
            <p>
              <strong>Action required when:</strong> {guide.actionRequiredWhen}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
