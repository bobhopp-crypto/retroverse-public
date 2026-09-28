import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { rvtrForVdjPath } from "./rvtr-from-vdj";

test("reads exact RVTR labels by filepath and decodes XML entities", async () => {
  const dir = await mkdtemp(join(tmpdir(), "retroverse-vdj-rvtr-"));
  const previous = process.env.RETROVERSE_VDJ_DATABASE;
  try {
    const file = join(dir, "database.xml");
    await writeFile(file, `<VirtualDJ_Database>
      <Song FilePath="/Music/Tom &amp; Jerry.mp3"><Tags Author="Tom" Title="Song" Label="RVTR123456" /></Song>
      <Song FilePath="/Music/Other.mp3"><Tags Author="Other" Label="no-track-id" /></Song>
    </VirtualDJ_Database>`);
    process.env.RETROVERSE_VDJ_DATABASE = file;
    assert.equal(await rvtrForVdjPath("/Music/Tom & Jerry.mp3"), "RVTR123456");
    assert.equal(await rvtrForVdjPath("/Music/Other.mp3"), null);
    assert.equal(await rvtrForVdjPath("/Music/Missing.mp3"), null);
  } finally {
    if (previous === undefined) delete process.env.RETROVERSE_VDJ_DATABASE;
    else process.env.RETROVERSE_VDJ_DATABASE = previous;
    await rm(dir, { recursive: true, force: true });
  }
});
