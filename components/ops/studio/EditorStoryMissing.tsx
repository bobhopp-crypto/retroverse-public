import Link from "next/link";

import { GuideEmptyState } from "@/components/ops/studio/operator-guide";

type Props = {
  rvtr: string;
};

export function EditorStoryMissing({ rvtr }: Props) {
  return (
    <div className="ops-editor">
      <GuideEmptyState
        title="No Collector research for this song"
        explanation={`Editor requires a completed collector.json for ${rvtr}. The narrative blueprint is built from Collector output.`}
        recommendedAction="Run Collector from Library & Queue, then return to Editor."
        actionHref="/ops/browser-plus-2"
        actionLabel="Open Library & Queue"
      />
      <p style={{ marginTop: "1rem" }}>
        <Link className="ops-studio__back" href="/ops/studio/collector">
          ← Research Library
        </Link>
      </p>
    </div>
  );
}
