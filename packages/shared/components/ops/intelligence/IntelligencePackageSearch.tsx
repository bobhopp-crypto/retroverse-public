"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { SongPackageIndex } from "@/lib/ops/intelligence/song-package-types";

type Props = {
  packages: SongPackageIndex["packages"];
};

export function IntelligencePackageSearch({ packages }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((pkg) =>
      [pkg.rvtr, pkg.artist, pkg.title].some((value) => value.toLowerCase().includes(q)),
    );
  }, [packages, query]);

  return (
    <div>
      <label className="intel-search">
        <span className="intel-search__label">Search by RVTR, artist, or title</span>
        <input
          className="intel-search__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="RVTR974150, Herb Alpert, A Taste Of Honey"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="intel-dim">No packages match that search.</p>
      ) : (
        <ul className="intel-package-list">
          {filtered.map((pkg) => (
            <li key={pkg.rvtr} className="intel-package-item">
              <Link className="intel-package-item__link" href={`/ops/intelligence/package/${pkg.rvtr}`}>
                <div>
                  <p className="intel-package-item__rvtr">{pkg.rvtr}</p>
                  <p className="intel-package-item__title">{pkg.title}</p>
                  <p className="intel-package-item__artist">{pkg.artist}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
