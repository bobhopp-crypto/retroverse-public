import { redirect } from "next/navigation";

import { buildFeaturedYearsFromConfig } from "@/lib/ops/event-control/featured-years";
import { buildHomepageHero, yearsSectionLabel } from "@/lib/ops/event-control/homepage-hero";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { loadFeaturedYearCovers } from "@/lib/home/load-featured-year-covers";
import { getPublicLiveRedirectUrl } from "@/lib/live-control/public-entry";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import { HomeDirectory } from "./components/home-directory";

import "./home-directory.css";
import "./home.css";
import "./public-mobile-width.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const liveRedirect = await getPublicLiveRedirectUrl();
  if (liveRedirect) {
    redirect(liveRedirect);
  }

  const [opsEnabled, yearCovers, eventConfig] = await Promise.all([
    Promise.resolve(isOpsEnabled()),
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
        opsEnabled={opsEnabled}
        yearCovers={yearCovers}
        featuredYears={featuredYears}
        hero={hero}
        yearsLabel={yearsLabel}
      />
    </main>
  );
}
