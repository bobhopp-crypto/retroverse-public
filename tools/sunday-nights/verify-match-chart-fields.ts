import { loadMatchCandidates } from "@/lib/sunday-nights/match-candidates";

async function main() {
  const cases = [
    ["Eagles", "Hotel California"],
    ["Luke Kelly", "The Black Velvet Band"],
  ] as const;

  for (const [artist, title] of cases) {
    const rows = await loadMatchCandidates(artist, title);
    console.log(`\n${artist} — ${title}`);
    console.log(JSON.stringify(rows.slice(0, 2), null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
