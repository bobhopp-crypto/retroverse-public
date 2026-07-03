import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsRvTagsReview } from "@/components/ops/OpsRvTagsReview";

import "../../ops.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `RV Tags ${year} — Retroverse Ops`,
    robots: { index: false, follow: false },
  };
}

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>RV Tags</h1>
      <p className="ops-dim">{props.message}</p>
    </div>
  );
}

export default async function OpsRvTagsReviewPage({ params }: Props) {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page ops-page--rvreview">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <OpsBlocked message="Ops disabled (set RETROVERSE_OPS=1)." />
        </div>
      </main>
    );
  }

  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isFinite(year) || year < 1900 || year >= 2100) {
    notFound();
  }

  return (
    <main className="ops-page ops-page--rvreview">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--rvreview">
        <Link className="ops-rvreview__back" href={`/ops/year/${year}`}>
          ← {year}
        </Link>
        <OpsRvTagsReview year={year} />
      </div>
    </main>
  );
}
