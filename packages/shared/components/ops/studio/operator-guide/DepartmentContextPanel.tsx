"use client";

import { getDepartmentContext } from "@/lib/ops/studio/operator-guide";
import type { StudioGuidePageId } from "@/lib/ops/studio/operator-guide";

import { useOperatorGuideOptional } from "./OperatorGuideProvider";

type Props = {
  pageId: StudioGuidePageId;
};

export function DepartmentContextPanel({ pageId }: Props) {
  const guide = useOperatorGuideOptional();
  const ctx = getDepartmentContext(pageId);

  if (!guide?.enabled || !ctx) return null;

  return (
    <aside className="rs-guide-context" aria-label="Department context">
      <p className="rs-guide-context__title">Department flow</p>
      <dl className="rs-guide-context__dl">
        <div>
          <dt>Input</dt>
          <dd>
            <ul>
              {ctx.inputs.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt>Output</dt>
          <dd>
            <ul>
              {ctx.outputs.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt>Next</dt>
          <dd>{ctx.nextDepartment}</dd>
        </div>
      </dl>
    </aside>
  );
}
