type Props = {
  className?: string;
};

/** Hot 100 single marker — vinyl disc, not album artwork. */
export function RetroverseSingleMarker({ className }: Props) {
  return (
    <div
      className={`retroverse-single-marker${className ? ` ${className}` : ""}`}
      aria-hidden
    >
      <span className="retroverse-single-marker__disc" />
    </div>
  );
}
