import type {
  Bp2StudioQueueDepartment,
  Bp2StudioQueueJobStatus,
  Bp2WorkerAvailability,
} from "@/lib/ops/browser-plus-2/types";

const DEPARTMENT_NAMES: Record<string, string> = {
  collector: "Collector",
  editor: "Editor",
  director: "Director",
  publisher: "Publisher",
  research: "Research",
  archive: "Archive",
};

const QUEUE_DEPARTMENT_NAMES: Record<Bp2StudioQueueDepartment, string> = {
  "run-collector": "Collector",
  "run-editor": "Editor",
  "run-director": "Director",
  "refresh-research": "Research",
  "rebuild-experience": "Experience Plan",
};

export function departmentDisplayName(workerId: string): string {
  return DEPARTMENT_NAMES[workerId] ?? workerId.charAt(0).toUpperCase() + workerId.slice(1);
}

export function queueDepartmentLabel(dept: Bp2StudioQueueDepartment): string {
  return QUEUE_DEPARTMENT_NAMES[dept] ?? dept;
}

export function availabilityLabel(state: Bp2WorkerAvailability): string {
  switch (state) {
    case "busy":
      return "Working";
    case "unavailable":
      return "Offline";
    default:
      return "Ready";
  }
}

export function jobStatusLabel(status: Bp2StudioQueueJobStatus): string {
  switch (status) {
    case "queued":
      return "Waiting";
    case "running":
      return "In Progress";
    case "paused":
      return "Paused";
    case "complete":
      return "Done";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function costLabel(cost: string): string {
  switch (cost) {
    case "low":
      return "Light";
    case "high":
      return "Heavy";
    case "medium":
      return "Moderate";
    default:
      return cost;
  }
}

export function formatDurationShort(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} sec`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${hr} hr ${rem} min` : `${hr} hr`;
}

export function formatElapsedShort(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} sec`;
  const min = Math.floor(sec / 60);
  return `${min} min ${sec % 60} sec`;
}

export function requirementLabels(opts: {
  requiresOllama: boolean;
  requiresInternet: boolean;
  requiresVirtualDJ: boolean;
  requiresLocalAssets: boolean;
}): string[] {
  const tags: string[] = [];
  if (opts.requiresOllama) tags.push("Local AI");
  if (opts.requiresInternet) tags.push("Online");
  if (opts.requiresVirtualDJ) tags.push("VirtualDJ");
  if (opts.requiresLocalAssets) tags.push("Local Files");
  return tags;
}

export function aiEngineStatusLabel(available: boolean): string {
  return available ? "Online" : "Offline";
}
