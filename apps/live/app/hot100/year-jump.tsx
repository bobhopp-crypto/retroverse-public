"use client";

import { useRouter } from "next/navigation";

import { decadeHeading, hot100Years } from "@/lib/hot100/chart";

type Props = {
  current?: number;
  id?: string;
};

export function Hot100YearJump({ current, id = "hot100-year-jump" }: Props) {
  const router = useRouter();
  const groups: { heading: string; years: number[] }[] = [];
  for (const year of hot100Years()) {
    const heading = decadeHeading(year);
    const last = groups.at(-1);
    if (!last || last.heading !== heading) groups.push({ heading, years: [year] });
    else last.years.push(year);
  }

  return (
    <div className="hot100-jump">
      <label htmlFor={id}>Jump to year</label>
      <select
        id={id}
        value={current ? String(current) : ""}
        onChange={(event) => {
          const year = event.target.value;
          if (year) router.push(`/hot100/${year}`);
        }}
      >
        {current ? null : <option value="">1958–2024</option>}
        {groups.map((group) => (
          <optgroup key={group.heading} label={group.heading}>
            {group.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
