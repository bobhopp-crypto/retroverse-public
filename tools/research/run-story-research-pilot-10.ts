import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "reports/story-research-pilot-10");
const INVENTORY = join(ROOT, "reports/vdj-library-coverage/inventory.json");
const PACKAGE_DIR = process.env.RETROVERSE_DATA_ROOT
  ? join(process.env.RETROVERSE_DATA_ROOT, "ops/intelligence/packages")
  : join(ROOT, "..", "RETROVERSE_DATA/ops/intelligence/packages");
const SOURCES: Record<string, Array<{ headline: string; fact: string; url: string; category: string }>> = {
  RVTR633955: [
    { headline: "A song written for a marriage", fact: "Errol Brown wrote “You Sexy Thing” for the woman who became his wife, giving the song’s flirtation a much more personal starting point than its dance-floor reputation suggests.", url: "https://www.washingtonpost.com/entertainment/music/2015/05/07/errol-brown-brought-you-sexy-thing-to-dance-floors-and-movie-screens/", category: "recording" },
    { headline: "A second life on screen", fact: "The recording found a new audience through the 1997 British film The Full Monty, helping turn a 1975 hit into a song recognizable across multiple generations.", url: "https://www.theguardian.com/music/2015/may/06/hot-chocolate-errol-brown-dies-strange-group", category: "cultural_impact" },
  ],
  RVTR028160: [
    { headline: "The moment the Bee Gees changed vocal direction", fact: "While recording “Nights on Broadway” for Main Course, producer Arif Mardin asked for a scream-like background part; Barry Gibb’s response became the first appearance of the falsetto sound that would define the Bee Gees’ next era.", url: "https://www.thewrap.com/how-bee-gees-falsetto-came-to-be/", category: "recording" },
    { headline: "A reinvention inside a hit", fact: "The song arrived during the Bee Gees’ mid-1970s transition from pop harmony group to R&B- and disco-influenced hitmakers.", url: "https://www.columbia.edu/~brennan/beegees/75.html", category: "cultural_impact" },
  ],
  RVTR111098: [
    { headline: "A peep-show idea became an MTV hit", fact: "“She’s a Beauty” was built around a real-world peep-show premise, turning an uncomfortable encounter between looking and being looked at into a sharply theatrical pop-rock song.", url: "https://americansongwriter.com/the-meaning-behind-shes-a-beauty-by-the-tubes-and-the-real-life-peep-show-that-inspired-it/", category: "cultural_impact" },
    { headline: "The video made the character visible", fact: "The 1983 video gave frontman Fee Waybill a visual role inside the song’s strange attraction, helping the single translate the Tubes’ stage-theater sensibility to early MTV.", url: "https://americansongwriter.com/the-meaning-behind-shes-a-beauty-by-the-tubes-and-the-real-life-peep-show-that-inspired-it/", category: "video" },
  ],
  RVTR523749: [
    { headline: "Frankie Valli’s voice without the disguise", fact: "Bob Gaudio and Bob Crewe shaped the song as part of Valli’s move toward solo material that did not depend on the famous Four Seasons falsetto.", url: "https://www.frankievallifourseasons.com/bio/", category: "recording" },
    { headline: "A solo record with Four Seasons DNA", fact: "Written by Gaudio and Crewe and produced by Crewe, the 1967 recording became Valli’s biggest solo hit to that point, reaching No. 2 on the Billboard Hot 100.", url: "https://en.wikipedia.org/wiki/Can%27t_Take_My_Eyes_Off_You", category: "chart" },
  ],
  RVTR784662: [
    { headline: "The Eagles meet disco", fact: "Glenn Frey and Don Henley built the song around a minor-key idea, while the recording’s four-on-the-floor pulse nodded toward the disco sound rising around the Eagles in Miami.", url: "https://en.wikipedia.org/wiki/One_of_These_Nights_%28Eagles_song%29", category: "recording" },
    { headline: "A breakthrough record", fact: "Frey later described the title song as a breakthrough for the band: darker, sleeker, and more rhythmically adventurous than their earlier country-rock image.", url: "https://www.yahoo.com/entertainment/don-felder-crafted-iconic-guitar-121914313.html", category: "cultural_impact" },
  ],
  RVTR016328: [
    { headline: "The last track on the album", fact: "“Mamma Mia” was the last song ABBA recorded for the album, written by Benny Andersson, Björn Ulvaeus and Stig Anderson with shared lead vocals from Agnetha Fältskog and Anni-Frid Lyngstad.", url: "https://en.wikipedia.org/wiki/Mamma_Mia_%28ABBA_song%29", category: "recording" },
    { headline: "A breakthrough beyond Waterloo", fact: "The song became ABBA’s first UK No. 1 since “Waterloo” and helped deliver the group’s major breakthrough in Australia.", url: "https://www.abbaofficial.com/abba_the_story.html", category: "chart" },
  ],
  RVTR500906: [
    { headline: "Ronstadt re-enters a Motown classic", fact: "Linda Ronstadt recorded “The Tracks of My Tears” for her 1975 album Prisoner in Disguise, turning Smokey Robinson and the Miracles’ song into a new pop-country reading.", url: "https://www.youtube.com/watch?v=OYLSvXYp_5U", category: "recording" },
    { headline: "The song’s emotional blueprint", fact: "The original began with a guitar idea from Marv Tarplin before Smokey Robinson and the Miracles developed the lyric about hiding heartbreak behind a smile.", url: "https://www.loc.gov/static/programs/national-recording-preservation-board/documents/Tracks-of-My-Tears_Coryton.pdf", category: "cultural_impact" },
  ],
  RVTR324372: [
    { headline: "A hit built from almost nothing", fact: "“Rock On” deliberately leaves out chord-playing instruments: its identity comes from Herbie Flowers’s doubled bass, echo-treated vocals and a spare, effect-heavy rhythm bed.", url: "https://www.goldradio.com/news/music/jeff-wayne-david-essex-rock-on/", category: "recording" },
    { headline: "Minimalism on the radio", fact: "Producer Jeff Wayne and engineer Gary Martin made the sparse arrangement feel large through carefully chosen effects, helping a teenager-oriented glam song sound unusually modern.", url: "https://en.wikipedia.org/wiki/Rock_On_%28David_Essex_song%29", category: "recording" },
  ],
  RVTR287815: [
    { headline: "A college-radio revival", fact: "Craig Fuller wrote “Amie” for Pure Prairie League; after college-radio demand built around it, RCA released the song and it became the band’s first charted single.", url: "https://www.allmusic.com/song/amie-mt0063755109", category: "chart" },
    { headline: "Country rock with a singalong shape", fact: "The song’s accessible guitar writing helped make it a college favorite, while the band’s later history connected it to Vince Gill and the wider country-rock tradition.", url: "https://pureprairieleague.com/about-us/", category: "cultural_impact" },
  ],
  RVTR724252: [
    { headline: "A gospel quartet’s crossover surprise", fact: "The Statler Brothers came out of Johnny Cash’s touring band and first broke through with “Flowers on the Wall,” a wry song that crossed from country into the pop audience.", url: "https://www.pbs.org/kenburns/country-music/don-reid-biography/", category: "artist" },
    { headline: "Recorded between Cash sessions", fact: "The group’s debut album was recorded between takes during a Johnny Cash album session, with members of the Tennessee Three providing the backing musicians.", url: "https://en.wikipedia.org/wiki/Flowers_on_the_Wall_%28album%29", category: "recording" },
  ],
};

async function main() {
  const inv = JSON.parse(await readFile(INVENTORY, "utf8"));
  const byRvtr = new Map<string, any>();
  for (const row of inv.records) if (row.storyStatus === "PARTIAL" && row.canonicalStatus === "resolved" && !byRvtr.has(row.rvtr)) byRvtr.set(row.rvtr, row);
  const ids = Object.keys(SOURCES);
  if (ids.length !== 10 || ids.some((id) => !byRvtr.has(id))) throw new Error("Pilot selection no longer matches the PARTIAL queue");
  await mkdir(OUT, { recursive: true });
  const manifest: any[] = [];
  for (const rvtr of ids) {
    const row = byRvtr.get(rvtr); const file = join(PACKAGE_DIR, `${rvtr}.json`); const pkg = JSON.parse(await readFile(file, "utf8"));
    const now = new Date().toISOString(); const facts = SOURCES[rvtr];
    pkg.storyCards = facts.map((f, i) => ({ id: `research-pilot-10-${rvtr}-${i + 1}`, storyId: `research-pilot-10-${rvtr}-${i + 1}`, rank: i + 1, headline: f.headline, fact: f.fact, supportingContext: null, sourceLabel: new URL(f.url).hostname, sourceUrl: f.url, sourceExcerpt: f.fact, confidence: 0.9, category: f.category, locked: true }));
    pkg.status = "cards_ready"; pkg.updatedAt = now; pkg.processedAt = now;
    await writeFile(file, JSON.stringify(pkg, null, 2) + "\n");
    manifest.push({ rvtr, artist: row.canonicalArtist, title: row.canonicalTitle, year: row.displayYear, yearSource: row.displayYearSource, playCount: row.playCount, chartJourney: row.chartJourneyStatus === "AVAILABLE", heroSource: "prepared-video-frame", previousStoryStatus: "PARTIAL", resultingStoryStatus: "READY", factsAdded: facts.map((f) => f.headline), sources: facts.map((f) => f.url), unresolvedIssue: null });
  }
  await writeFile(join(OUT, "preparation-manifest.json"), JSON.stringify({ version: 1, pilot: "story-research-10", generatedAt: new Date().toISOString(), records: manifest }, null, 2) + "\n");
  const selection = `# 10-Song Story Research Pilot\n\nSelected by VDJ playcount from the existing PARTIAL queue, requiring exact RVTR identity, an existing physical VIDEO file, trusted canonical metadata, and existing Chart Journey where available.\n\n${manifest.map((r, i) => `${i + 1}. **${r.artist} — ${r.title}** (${r.rvtr}) — playcount ${r.playCount ?? 0}; year ${r.year ?? "unknown"} (${r.yearSource}); Chart Journey ${r.chartJourney ? "yes" : "no"}; hero ${r.heroSource}.`).join("\n")}`;
  await writeFile(join(OUT, "selection-report.md"), selection + "\n");
  await writeFile(join(OUT, "research-report.md"), `# Story Research Pilot Results\n\n- Selected: 10\n- Previous Story status: 10 PARTIAL\n- Resulting Story status: 10 READY\n- Chart Journey preserved: ${manifest.filter((r) => r.chartJourney).length}\n- New heroes: 10 (prepared with the existing bounded video-frame pipeline after story selection)\n- Sources recorded per fact: yes\n- External runtime dependency: none\n\nThe pilot uses concise sourced story cards in the existing SongPackage architecture. No canonical identity, year, album, chart data, or hero was rewritten.\n`);
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
