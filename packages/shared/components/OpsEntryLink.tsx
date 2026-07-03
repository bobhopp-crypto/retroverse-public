import Link from "next/link";

type Props = {
  className?: string;
  next?: string;
};

/** Unobtrusive ops entry — PIN gate protects access. */
export function OpsEntryLink({ className, next = "/ops/sunday-nights" }: Props) {
  const href = `/internal/ops-pin?next=${encodeURIComponent(next)}`;
  return (
    <Link href={href} className={className} prefetch={false}>
      Ops
    </Link>
  );
}
