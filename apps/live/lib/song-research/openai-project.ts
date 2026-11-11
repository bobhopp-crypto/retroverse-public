import "server-only";

// Verified non-secret selector for the approved OpenAI Default project.
// Not a default: every caller must explicitly supply this trusted server value.
export const APPROVED_OPENAI_PROJECT_ID = "proj_tWHbhLiHknUMThDEiJWEejyP";
export function isApprovedOpenAIProject(value: unknown): value is string {
  return value === APPROVED_OPENAI_PROJECT_ID;
}
/** Explicit routing is not proof that a particular credential belongs to this
 * project or that a provider enforces every mismatched-key case. Credential scope,
 * project charging and the approved limit remain separate activation checks.
 */
export function approvedOpenAIProjectHeaders(value: unknown): { "OpenAI-Project": string } {
  if (!isApprovedOpenAIProject(value)) throw new Error("Approved OpenAI project unavailable");
  return { "OpenAI-Project": value };
}
