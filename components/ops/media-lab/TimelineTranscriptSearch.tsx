"use client";

type TimelineTranscriptSearchProps = {
  query: string;
  matchCount: number;
  onQueryChange: (query: string) => void;
  onNavigate?: (direction: "next" | "prev") => void;
};

export function TimelineTranscriptSearch(props: TimelineTranscriptSearchProps) {
  const hasQuery = props.query.trim().length >= 2;

  return (
    <div className="ops-ml-timeline-search">
      <input
        type="search"
        className="ops-ml-timeline-search__input"
        placeholder="Search…"
        value={props.query}
        aria-label="Search transcript and titles"
        onChange={(e) => props.onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || !props.onNavigate) return;
          e.preventDefault();
          props.onNavigate(e.shiftKey ? "prev" : "next");
        }}
      />
      {hasQuery ? (
        <span className="ops-ml-timeline-search__count" aria-live="polite">
          {props.matchCount}
        </span>
      ) : null}
    </div>
  );
}
