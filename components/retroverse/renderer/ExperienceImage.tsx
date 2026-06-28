"use client";

import { useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function ExperienceImage({ src, alt, className, priority }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`rv-exp-image-placeholder ${className ?? ""}`} aria-hidden={!alt}>
        <span className="rv-exp-image-placeholder__icon" aria-hidden>
          ♪
        </span>
        {alt ? <span className="rv-exp-image-placeholder__label">{alt}</span> : null}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
