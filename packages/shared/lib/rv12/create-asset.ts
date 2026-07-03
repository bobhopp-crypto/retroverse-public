import { copyFile, mkdir, writeFile } from "node:fs/promises";

import { fetchImageFromUrl } from "@/lib/rv12/fetch-image";
import {
  detectImageExt,
  hashBuffer,
  probeImageDimensions,
  validateImageBytes,
} from "@/lib/rv12/image-meta";
import {
  allocateRv12Id,
  appendPromotionAudit,
  appendRv12Asset,
  type Rv12AssetRow,
} from "@/lib/rv12/ledger";
import { rv12StagingDir, stagingPathForRv12 } from "@/lib/rv12/paths";

export type CreateRv12Input = {
  sourceType: "upload" | "url" | "discogs";
  sourceUrl?: string | null;
  fileBuffer?: Buffer;
  curatorNotes?: string | null;
  actor: string;
};

export async function createRv12Asset(input: CreateRv12Input): Promise<Rv12AssetRow> {
  let buf: Buffer;
  if (input.fileBuffer) {
    buf = input.fileBuffer;
  } else if (input.sourceUrl?.trim()) {
    buf = await fetchImageFromUrl(input.sourceUrl.trim());
  } else {
    throw new Error("file or sourceUrl required");
  }

  const valid = validateImageBytes(buf);
  if (!valid.ok) throw new Error(valid.message);

  const contentHash = hashBuffer(buf);
  const { width, height } = probeImageDimensions(buf);
  const ext = detectImageExt(buf);
  const rv12Id = await allocateRv12Id();

  await mkdir(rv12StagingDir(), { recursive: true });
  const localPath = stagingPathForRv12(rv12Id, ext);
  await writeFile(localPath, buf);

  const row: Rv12AssetRow = {
    rv12Id,
    contentHash,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl?.trim() || null,
    localPath,
    width,
    height,
    trustLevel: "provisional",
    placeholderVariant: null,
    curatorNotes: input.curatorNotes?.trim() || null,
    activeFlag: true,
    createdAt: new Date().toISOString(),
  };

  await appendRv12Asset(row);
  await appendPromotionAudit({
    action: "create_asset",
    ok: true,
    rval: "",
    rv12Id,
    albumId: null,
    actor: input.actor,
    message: `Created RV12 asset ${rv12Id}`,
    priorCanonicalPath: null,
    newCanonicalPath: localPath,
    priorContentHash: null,
    newContentHash: contentHash,
    backupPath: null,
  });

  return row;
}

export async function copyRv12ToPath(rv12: Rv12AssetRow, destAbsPath: string): Promise<void> {
  await mkdir(destAbsPath.replace(/\/[^/]+$/, ""), { recursive: true });
  await copyFile(rv12.localPath, destAbsPath);
}
