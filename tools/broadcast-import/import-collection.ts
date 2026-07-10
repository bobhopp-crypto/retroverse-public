/**
 * Import a Broadcast Collection (Gamma ZIP export or image folder) into
 * RETROVERSE_DATA as real per-slide RVBA assets + auto-detected sequences.
 *
 * Usage:
 *   npx tsx tools/broadcast-import/import-collection.ts --zip <path> --title "Live Aid 1985"
 *   npx tsx tools/broadcast-import/import-collection.ts --folder <path> --title "Sponsor Content"
 *
 * Optional: --collection-id <id> to re-import into an existing collection.
 */
import { importBroadcastCollection } from "@/lib/bobos/importer";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg?.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1]!.startsWith("--") ? argv[++i]! : "true";
    args[key] = value;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const title = args.title;
  if (!title) {
    console.error("Missing --title \"Collection Name\"");
    process.exit(1);
  }
  if (!args.zip && !args.folder) {
    console.error("Provide --zip <path> or --folder <path>");
    process.exit(1);
  }

  const manifest = await importBroadcastCollection({
    sourceKind: args.zip ? "zip" : "folder",
    input: { path: args.zip ?? args.folder },
    collectionTitle: title,
    collectionId: args["collection-id"],
  });

  console.log(`Imported "${manifest.title}" (${manifest.id})`);
  console.log(`  ${manifest.slides.length} slides, ${manifest.sequences.length} sequences`);
  for (const sequence of manifest.sequences) {
    console.log(`  · ${sequence.title} — slides ${sequence.startSlide}-${sequence.endSlide}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
