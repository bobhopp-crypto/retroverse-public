"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  TRAINING_DEPARTMENTS,
  type TrainingDepartmentId,
  type TrainingDepartmentSnapshot,
} from "@/lib/ops/studio/training/types";

const LABELS: Record<TrainingDepartmentId, string> = {
  collector: "Collector",
  editor: "Editor",
  director: "Director",
  publisher: "Publisher",
  renderer: "Renderer",
};

type Props = {
  rvtr: string;
  artist: string;
  title: string;
  departments?: TrainingDepartmentSnapshot[];
};

export function TrainingPipelineNav({ rvtr, artist, title, departments }: Props) {
  const pathname = usePathname();

  return (
    <header className="rs-training-nav" data-guide="training-pipeline">
      <div className="rs-training-nav__song">
        <p className="rs-training-nav__rvtr">{rvtr}</p>
        <h1 className="rs-training-nav__title">
          {artist} — {title}
        </h1>
        <p className="rs-training-nav__lead">Production academy — one song, every department.</p>
      </div>
      <nav className="rs-training-nav__pipeline" aria-label="Training pipeline">
        <ol className="rs-training-nav__list">
          {TRAINING_DEPARTMENTS.map((dept, index) => {
            const href = `/ops/studio/training/${rvtr}/${dept}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const snap = departments?.find((d) => d.department === dept);
            return (
              <li key={dept} className={active ? "rs-training-nav__item rs-training-nav__item--active" : "rs-training-nav__item"}>
                {index > 0 ? <span className="rs-training-nav__arrow" aria-hidden>→</span> : null}
                <Link href={href} className="rs-training-nav__link">
                  <span className="rs-training-nav__label">{LABELS[dept]}</span>
                  {snap ? (
                    <span className="rs-training-nav__conf">{snap.confidence}%</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}
