import Link from "next/link";

type Props = {
  rvtr: string;
};

export function EditorStoryMissing({ rvtr }: Props) {
  return (
    <div className="ops-editor">
      <p className="ops-editor__empty">
        No Collector research found for <strong>{rvtr}</strong>. Editor needs a completed research
        package before drafting a story.
      </p>
      <p>
        <Link className="ops-studio__back" href="/ops/studio/collector">
          ← Research Library
        </Link>
      </p>
    </div>
  );
}
