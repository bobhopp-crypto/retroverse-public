export type BrowserPlusExecutionActionId =
  | "generate-thumbnail"
  | "recover-cover"
  | "generate-package"
  | "generate-deck"
  | "run-full-pipeline";

export type BrowserPlusExecutionImplementationStatus = "ready" | "adapter-only" | "blocked";

export type BrowserPlusExecutionAction = {
  id: BrowserPlusExecutionActionId;
  label: string;
  supportsSingle: boolean;
  supportsBatch: boolean;
  requiresApproval: boolean;
  writeOperation: boolean;
  implementationStatus: BrowserPlusExecutionImplementationStatus;
};

export const BROWSER_PLUS_EXECUTION_ACTIONS: BrowserPlusExecutionAction[] = [
  {
    id: "generate-thumbnail",
    label: "Generate Thumbnail",
    supportsSingle: true,
    supportsBatch: true,
    requiresApproval: true,
    writeOperation: true,
    implementationStatus: "adapter-only",
  },
  {
    id: "recover-cover",
    label: "Generate Cover",
    supportsSingle: true,
    supportsBatch: true,
    requiresApproval: true,
    writeOperation: true,
    implementationStatus: "adapter-only",
  },
  {
    id: "generate-package",
    label: "Generate Package",
    supportsSingle: true,
    supportsBatch: true,
    requiresApproval: false,
    writeOperation: true,
    implementationStatus: "ready",
  },
  {
    id: "generate-deck",
    label: "Generate Deck",
    supportsSingle: true,
    supportsBatch: true,
    requiresApproval: true,
    writeOperation: true,
    implementationStatus: "adapter-only",
  },
  {
    id: "run-full-pipeline",
    label: "Run Full Pipeline",
    supportsSingle: true,
    supportsBatch: true,
    requiresApproval: true,
    writeOperation: true,
    implementationStatus: "ready",
  },
];

export function browserPlusExecutionAction(id: BrowserPlusExecutionActionId) {
  return BROWSER_PLUS_EXECUTION_ACTIONS.find((action) => action.id === id) ?? null;
}
