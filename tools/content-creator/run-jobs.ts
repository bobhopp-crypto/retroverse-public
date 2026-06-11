import { processContentCreatorJobQueue } from "@/lib/ops/content-creator/jobs/runner";

async function main() {
  const n = await processContentCreatorJobQueue();
  console.log(`[content-creator:jobs] processed ${n} job(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
