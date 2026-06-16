import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

import { coverFsRoot, welcomeRoot } from "@/lib/covers/backfill/paths";

type S3Module = typeof import("@aws-sdk/client-s3");

export type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export type PublishR2Result = {
  ok: boolean;
  r2Key: string;
  localAbs: string;
  byteSize: number;
  r2HeadOk: boolean;
  cdnHeadStatus: number | "err";
  error: string | null;
};

function loadS3Module(): S3Module {
  const welcome = welcomeRoot();
  const req = createRequire(join(welcome, "package.json"));
  return req("@aws-sdk/client-s3") as S3Module;
}

async function loadWelcomeR2Env(): Promise<R2Env> {
  const { readFile: rf } = await import("node:fs/promises");
  const envPath = join(welcomeRoot(), ".env.local");
  const text = await rf(envPath, "utf8");
  const map: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  const accountId = map.R2_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID ?? "";
  const accessKeyId = map.R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey =
    map.R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY ?? "";
  const bucket = map.R2_BUCKET_NAME ?? process.env.R2_BUCKET_NAME ?? "";
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("missing_r2_env — set R2_* in welcome .env.local or process env");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function contentTypeForPath(relPath: string): string {
  const lower = relPath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function localAbsFromRel(relPath: string): string {
  return join(coverFsRoot(), relPath.replace(/^\/+/, ""));
}

export async function publishLocalCoverToR2(input: {
  r2Key: string;
  localRelPath?: string;
  publicCdnUrl?: string | null;
}): Promise<PublishR2Result> {
  const r2Key = input.r2Key.trim().replace(/^\/+/, "");
  const localRel = (input.localRelPath ?? r2Key).trim().replace(/^\/+/, "");
  const localAbs = localAbsFromRel(localRel);

  let bytes: Buffer;
  try {
    bytes = await readFile(localAbs);
  } catch (e) {
    return {
      ok: false,
      r2Key,
      localAbs,
      byteSize: 0,
      r2HeadOk: false,
      cdnHeadStatus: "err",
      error: e instanceof Error ? e.message : "local_file_missing",
    };
  }

  const env = await loadWelcomeR2Env();
  const { S3Client, PutObjectCommand, HeadObjectCommand } = loadS3Module();
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: env.bucket,
        Key: r2Key,
        Body: bytes,
        ContentType: contentTypeForPath(r2Key),
        CacheControl: "public, max-age=300, must-revalidate",
      }),
    );
    await client.send(
      new HeadObjectCommand({
        Bucket: env.bucket,
        Key: r2Key,
      }),
    );
  } catch (e) {
    return {
      ok: false,
      r2Key,
      localAbs,
      byteSize: bytes.length,
      r2HeadOk: false,
      cdnHeadStatus: "err",
      error: e instanceof Error ? e.message : "r2_put_failed",
    };
  }

  const cdnUrl = input.publicCdnUrl?.trim();
  let cdnHeadStatus: number | "err" = "err";
  if (cdnUrl) {
    try {
      const res = await fetch(cdnUrl, { method: "HEAD", redirect: "follow" });
      cdnHeadStatus = res.status;
    } catch {
      cdnHeadStatus = "err";
    }
  }

  return {
    ok: cdnHeadStatus === 200 || cdnHeadStatus === "err",
    r2Key,
    localAbs,
    byteSize: bytes.length,
    r2HeadOk: true,
    cdnHeadStatus,
    error: cdnHeadStatus === 200 ? null : `cdn_head_${cdnHeadStatus}`,
  };
}
