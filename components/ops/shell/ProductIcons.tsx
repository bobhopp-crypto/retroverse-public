import type { RetroverseProductSlug } from "@/lib/ops/products";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BrowserIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="13" r="2" fill="currentColor" />
      <circle cx="16" cy="9" r="5" stroke="currentColor" strokeWidth="2" opacity="0.55" />
    </svg>
  );
}

function StudioIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="5" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function KnowledgeIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4H16v16H7.5A2.5 2.5 0 0 1 5 17.5v-11Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20H16" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="8" r="1.5" fill="currentColor" />
      <path d="M18 9.5v4M16.5 11.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<RetroverseProductSlug, (props: IconProps) => React.JSX.Element> = {
  browser: BrowserIcon,
  studio: StudioIcon,
  knowledge: KnowledgeIcon,
};

export function ProductIcon({
  slug,
  className,
}: {
  slug: RetroverseProductSlug;
  className?: string;
}) {
  const Icon = ICONS[slug];
  return <Icon className={className} />;
}
