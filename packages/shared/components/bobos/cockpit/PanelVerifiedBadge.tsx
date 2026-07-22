"use client";

type Props = {
  onOpen: () => void;
  title?: string;
};

/** Rubber-stamp VERIFIED control — opens the panel documentation drawer. */
export function PanelVerifiedBadge({ onOpen, title = "Verified — open documentation" }: Props) {
  return (
    <button
      type="button"
      className="cockpit-verified-badge"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.stopPropagation();
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="cockpit-verified-badge__ink">VERIFIED</span>
    </button>
  );
}
