import Link from "next/link";

import { CANONICAL_AUDIENCE_HREF } from "@/lib/bobos/presentation/canonical-audience";

type Props = {
  className?: string;
};

export function ReturnToLiveLink({ className }: Props) {
  return (
    <Link href={CANONICAL_AUDIENCE_HREF} className={className}>
      Return to Live
    </Link>
  );
}
