"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomepageSearchHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    router.push(q.length >= 2 ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <section className="home-hero" aria-label="Search Retroverse">
      <p className="home-hero__eyebrow">Retroverse</p>
      <h1 className="home-hero__title">Discover music history</h1>
      <form className="home-hero__form" onSubmit={onSubmit}>
        <label className="home-hero__label" htmlFor="home-search">
          Search songs, artists, albums, years…
        </label>
        <div className="home-hero__row">
          <input
            id="home-search"
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search songs, artists, albums, years…"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit">Search</button>
        </div>
      </form>
    </section>
  );
}
