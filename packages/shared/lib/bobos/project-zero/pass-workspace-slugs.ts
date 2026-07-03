/** Pass tier slugs — shared by client and server; the server-only store re-exports these. */

export type PassWorkspaceSlug = "general" | "vip" | "backstage";

export const PASS_WORKSPACE_SLUGS: PassWorkspaceSlug[] = ["general", "vip", "backstage"];
