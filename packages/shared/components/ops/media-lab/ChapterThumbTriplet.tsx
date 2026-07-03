"use client";

export type ChapterThumbSet = {
  chapterId: string;
  first: { sec: number; url: string };
  mid: { sec: number; url: string };
  last: { sec: number; url: string };
};

type ChapterThumbTripletProps = {
  thumbs: ChapterThumbSet | null;
  loading?: boolean;
  onSelect?: (sec: number) => void;
};

export function ChapterThumbTriplet(props: ChapterThumbTripletProps) {
  if (props.loading) {
    return (
      <div className="ops-ml-thumb-triplet ops-ml-thumb-triplet--loading">
        <span className="ops-dim">…</span>
      </div>
    );
  }

  if (!props.thumbs) {
    return <div className="ops-ml-thumb-triplet ops-ml-thumb-triplet--empty" />;
  }

  const frames = [
    { role: "first", ...props.thumbs.first },
    { role: "mid", ...props.thumbs.mid },
    { role: "last", ...props.thumbs.last },
  ] as const;

  return (
    <div className="ops-ml-thumb-triplet">
      {frames.map((f) => (
        <button
          key={f.role}
          type="button"
          className="ops-ml-thumb-triplet__frame"
          title={`${f.role} · ${f.sec.toFixed(1)}s`}
          onClick={() => props.onSelect?.(f.sec)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ops-ml-thumb-triplet__img" src={f.url} alt={f.role} loading="lazy" />
        </button>
      ))}
    </div>
  );
}
