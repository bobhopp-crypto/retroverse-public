import type { CSSProperties } from "react";

type CoverProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function AtlasCoverArt({ src, alt, className = "", priority }: CoverProps) {
  if (src) {
    return (
      <div className={`atlas-cover ${className}`.trim()}>
        <img src={src} alt={alt} className="atlas-cover__img" loading={priority ? "eager" : "lazy"} />
      </div>
    );
  }

  return (
    <div className={`atlas-cover atlas-cover--placeholder ${className}`.trim()} aria-hidden>
      <span className="atlas-cover__vinyl" />
    </div>
  );
}

type RingProps = {
  pct: number;
  label?: string;
  tone?: "teal" | "orange";
  className?: string;
};

export function AtlasProgressRing({ pct, label, tone = "teal", className = "" }: RingProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const style = {
    "--ring-pct": clamped,
  } as CSSProperties;

  return (
    <div
      className={`atlas-ring atlas-ring--${tone} ${className}`.trim()}
      style={style}
      role="img"
      aria-label={label ? `${clamped}% ${label}` : `${clamped}%`}
    >
      <div className="atlas-ring__inner">
        <span className="atlas-ring__value">{clamped}%</span>
        {label ? <span className="atlas-ring__label">{label}</span> : null}
      </div>
    </div>
  );
}

type BarProps = {
  pct: number;
  label?: string;
  className?: string;
};

export function AtlasProgressBar({ pct, label, className = "" }: BarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={`atlas-bar ${className}`.trim()}>
      {label ? <span className="atlas-bar__label">{label}</span> : null}
      <div className="atlas-bar__track" aria-hidden>
        <div className="atlas-bar__fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
