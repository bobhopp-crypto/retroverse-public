import { loadAlbumPage } from "@/lib/album/load-album-page";
import { buildChartJourney } from "@/lib/chart-journey/build-chart-journey";
import { buildChartJourneyStory } from "@/lib/chart-journey/chart-journey-story";

async function test(rval: string, label: string) {
  const data = await loadAlbumPage(rval);
  if (!data) {
    console.log(label, "NOT FOUND");
    return;
  }
  console.log("---", label, rval, "---");
  console.log("title:", data.title, "|", data.artistName, data.releaseYear);
  console.log("peak:", data.b200Peak, "weeks:", data.chartWeeks, "at1:", data.weeksAtNumberOne);
  console.log("desc words:", data.description.split(/\s+/).length);
  console.log("desc:", `${data.description.slice(0, 200)}...`);
  console.log("tracks:", data.tracks.length, "with rvtr:", data.tracks.filter((t) => t.rvtr).length);
  console.log(
    "similar:",
    data.similarChartJourneys.length,
    data.similarChartJourneys.map((s) => `${s.title} (${s.reason})`).join(" | "),
  );
  const model = buildChartJourney({
    weeks: data.trajectoryWeeks,
    peak: data.b200Peak,
    chartLabel: data.chartRunLabel,
    maxRank: 200,
  });
  if (model) {
    console.log("journey:", `${buildChartJourneyStory(model).slice(0, 160)}...`);
  }
}

async function main() {
  await test("RVAL617838", "Faith");
  await test("RVAL000003", "Rumours");
  await test("RVAL000005", "Sparse");
}

main().catch(console.error);
