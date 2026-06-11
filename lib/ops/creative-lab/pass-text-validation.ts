import { readFile } from "fs/promises";
import { join } from "path";

import { creativeLabProjectDir } from "./paths";
import {
  containsDebugLeak,
  containsForbiddenCredentialText,
  CREDENTIAL_INVENTION_FORBIDDEN,
  DEBUG_LEAK_FORBIDDEN_PATTERNS,
} from "./pass-prompt-safety";
import {
  buildAllowedTextCorpus,
  type PassTextFields,
} from "./pass-text-governance";
import { projectSecondaryLine } from "./project-secondary-line";
import type { CreativeLabAsset, CreativeLabProjectFile, PassTextAudit } from "./types";

export class PassTextViolationError extends Error {
  readonly audit: PassTextAudit;

  constructor(audit: PassTextAudit) {
    super(audit.summary ?? "Pass text governance violation");
    this.name = "PassTextViolationError";
    this.audit = audit;
  }
}

function assetAbsPath(project: CreativeLabProjectFile, asset: CreativeLabAsset): string | null {
  if (!asset.filePath?.endsWith(".png")) return null;
  const root = creativeLabProjectDir(project.folderSlug || project.id);
  return join(root, asset.filePath);
}

/** Heuristic scan of vision-extracted text against governance rules. */
export function scanExtractedText(
  extractedText: string,
  fields: PassTextFields,
  qrUrl?: string,
): PassTextAudit {
  const checkedAt = new Date().toISOString();
  const allowed = buildAllowedTextCorpus(fields, qrUrl);
  const forbiddenFound: string[] = [];
  const debugLeaks: string[] = [];
  const unexpectedText: string[] = [];

  const upper = extractedText.toUpperCase();

  for (const phrase of CREDENTIAL_INVENTION_FORBIDDEN) {
    if (upper.includes(phrase)) forbiddenFound.push(phrase);
  }

  for (const pattern of DEBUG_LEAK_FORBIDDEN_PATTERNS) {
    const match = extractedText.match(pattern);
    if (match) debugLeaks.push(match[0]);
  }

  const leak = containsDebugLeak(extractedText);
  if (leak && !debugLeaks.includes(leak)) debugLeaks.push(leak);

  const cred = containsForbiddenCredentialText(extractedText);
  if (cred && !forbiddenFound.includes(cred)) forbiddenFound.push(cred);

  const tokens = extractedText
    .split(/[\s·,;|/\\]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);

  for (const token of tokens) {
    const tokenUpper = token.toUpperCase();
    if (allowed.some((a) => a.toUpperCase().includes(tokenUpper) || tokenUpper.includes(a.toUpperCase()))) {
      continue;
    }
    if (fields.secondaryLine.trim() && fields.secondaryLine.toUpperCase().includes(tokenUpper)) continue;
    if (CREDENTIAL_INVENTION_FORBIDDEN.some((p) => tokenUpper.includes(p))) continue;
    if (DEBUG_LEAK_FORBIDDEN_PATTERNS.some((p) => p.test(token))) continue;
    if (/^[^a-zA-Z0-9]*$/.test(token)) continue;
    unexpectedText.push(token);
  }

  const status =
    forbiddenFound.length || debugLeaks.length ? "fail" : unexpectedText.length ? "warn" : "pass";

  const summary =
    status === "fail"
      ? `Text violation: ${[...forbiddenFound, ...debugLeaks].join(", ")}`
      : status === "warn"
        ? `Unexpected text detected: ${unexpectedText.slice(0, 6).join(", ")}`
        : "Text governance check passed";

  return {
    status,
    summary,
    forbiddenFound,
    debugLeaks,
    unexpectedText: unexpectedText.slice(0, 12),
    extractedText: extractedText.slice(0, 2000),
    checkedAt,
  };
}

async function extractTextViaVision(pngBuffer: Buffer): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const b64 = pngBuffer.toString("base64");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "List every readable word, number, and phrase visible on this pass image. Return plain text only — one phrase per line. Include small text. If no readable text, return NONE.",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${b64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content || content.toUpperCase() === "NONE") return "";
  return content;
}

export async function validatePassAssetText(args: {
  project: CreativeLabProjectFile;
  asset: CreativeLabAsset;
}): Promise<PassTextAudit> {
  const fields: PassTextFields = {
    event: args.project.event,
    venue: args.project.venue,
    date: args.project.date,
    secondaryLine: projectSecondaryLine(args.project),
    passTypeLabel:
      (args.project.passTypeLabel as PassTextFields["passTypeLabel"]) ?? "VIP PASS",
  };

  const abs = assetAbsPath(args.project, args.asset);
  if (!abs) {
    return {
      status: "skipped",
      summary: "No PNG file to validate",
      forbiddenFound: [],
      debugLeaks: [],
      unexpectedText: [],
      checkedAt: new Date().toISOString(),
    };
  }

  let pngBuffer: Buffer;
  try {
    pngBuffer = await readFile(abs);
  } catch {
    return {
      status: "skipped",
      summary: "PNG file missing on disk",
      forbiddenFound: [],
      debugLeaks: [],
      unexpectedText: [],
      checkedAt: new Date().toISOString(),
    };
  }

  const extracted = await extractTextViaVision(pngBuffer);
  if (extracted === null) {
    return {
      status: "skipped",
      summary: "Vision text audit unavailable — check OPENAI_API_KEY",
      forbiddenFound: [],
      debugLeaks: [],
      unexpectedText: [],
      checkedAt: new Date().toISOString(),
    };
  }

  return scanExtractedText(extracted, fields, args.project.qrUrl);
}

export function assertPassTextApproved(audit: PassTextAudit | undefined): void {
  if (audit?.status === "fail") {
    throw new PassTextViolationError(audit);
  }
}
