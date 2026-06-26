import { buildFeaturedYearsFromConfig } from "@/lib/ops/event-control/featured-years";
import { buildHomepageHero, yearsSectionLabel } from "@/lib/ops/event-control/homepage-hero";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { loadFeaturedYearCovers } from "@/lib/home/load-featured-year-covers";

import { HomeDirectory } from "./components/home-directory";

import "./home-directory.css";
import "./home.css";
import "./public-mobile-width.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [yearCovers, eventConfig] = await Promise.all([
    loadFeaturedYearCovers(),
    loadEventControlConfig(),
  ]);

  const featuredYears = buildFeaturedYearsFromConfig(eventConfig);
  const hero = buildHomepageHero(eventConfig);
  const homepageMode = eventConfig.homepage.mode;
  const yearsLabel = yearsSectionLabel(homepageMode, hero != null);

  return (
    <main className={`home-directory home-directory--mode-${homepageMode.toLowerCase()}${hero ? " home-directory--has-hero" : ""}`}>
      <HomeDirectory
        yearCovers={yearCovers}
        featuredYears={featuredYears}
        hero={hero}
        yearsLabel={yearsLabel}
      />
    </main>
  );
}
