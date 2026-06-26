/**
 * Retroverse Studio Kernel — multi-worker execution engine.
 *
 * Registers department worker instances, tracks availability, selects workers,
 * and runs jobs sequentially. Parallel dispatch can extend this module later
 * without changing department worker code.
 */

import type { IsoTimestamp, Rvtr } from "./types";
import type {
  DepartmentWorkerAction,
  DepartmentWorkerRunResult,
  StudioDepartmentWorker,
  StudioDepartmentWorkerId,
} from "./worker";
import { blockedWorkerResult, failedWorkerResult } from "./worker";
import type { WorkerCapabilityProfile, WorkerProfileQuery } from "./worker-profile";
import { queryWorkerCapabilityProfiles } from "./worker-profile";

export type WorkerAvailabilityState = "idle" | "busy" | "unavailable";

export type WorkerRegistration = {
  instanceId: string;
  worker: StudioDepartmentWorker;
  /** When false, the engine skips this instance during discovery/selection. */
  enabled?: boolean;
  /** Capability profile for scheduler introspection. */
  profile?: WorkerCapabilityProfile;
};

export type WorkerInstanceSnapshot = {
  instanceId: string;
  workerId: StudioDepartmentWorkerId;
  department: StudioDepartmentWorker["department"];
  capabilities: DepartmentWorkerAction[];
  profile: WorkerCapabilityProfile | null;
  availability: WorkerAvailabilityState;
  enabled: boolean;
  currentRvtr: Rvtr | null;
  lastRunAt: IsoTimestamp | null;
};

export type WorkerDiscoveryCriteria = {
  workerId?: StudioDepartmentWorkerId;
  action?: DepartmentWorkerAction;
  availability?: WorkerAvailabilityState;
  enabled?: boolean;
};

export type WorkerSelectionCriteria = {
  workerId: StudioDepartmentWorkerId;
  action: DepartmentWorkerAction;
  /** When true, only idle instances are eligible (default). */
  requireIdle?: boolean;
};

export type ExecutionEngineRunInput = {
  workerId: StudioDepartmentWorkerId;
  rvtr: Rvtr;
  action: DepartmentWorkerAction;
  payload?: Record<string, unknown>;
};

export type ExecutionEngineRunResult = DepartmentWorkerRunResult & {
  instanceId: string;
};

export type StudioExecutionEngine = {
  register(registration: WorkerRegistration): WorkerInstanceSnapshot;
  unregister(instanceId: string): boolean;
  setEnabled(instanceId: string, enabled: boolean): WorkerInstanceSnapshot | null;
  setAvailability(instanceId: string, availability: WorkerAvailabilityState): WorkerInstanceSnapshot | null;
  listWorkers(): WorkerInstanceSnapshot[];
  discover(criteria?: WorkerDiscoveryCriteria): WorkerInstanceSnapshot[];
  selectWorker(criteria: WorkerSelectionCriteria): WorkerInstanceSnapshot | null;
  getWorkerProfile(instanceId: string): WorkerCapabilityProfile | null;
  listWorkerProfiles(): WorkerCapabilityProfile[];
  queryWorkerProfiles(query?: WorkerProfileQuery): WorkerCapabilityProfile[];
  execute(input: ExecutionEngineRunInput): Promise<ExecutionEngineRunResult>;
  executeSequential(inputs: ExecutionEngineRunInput[]): Promise<ExecutionEngineRunResult[]>;
};

type WorkerInstanceRecord = WorkerInstanceSnapshot & {
  worker: StudioDepartmentWorker;
};

function snapshot(record: WorkerInstanceRecord): WorkerInstanceSnapshot {
  return {
    instanceId: record.instanceId,
    workerId: record.workerId,
    department: record.department,
    capabilities: record.capabilities,
    profile: record.profile,
    availability: record.availability,
    enabled: record.enabled,
    currentRvtr: record.currentRvtr,
    lastRunAt: record.lastRunAt,
  };
}

function workerSupportsAction(
  record: WorkerInstanceRecord,
  action: DepartmentWorkerAction,
): boolean {
  return record.capabilities.includes(action);
}

function matchesDiscovery(
  record: WorkerInstanceRecord,
  criteria: WorkerDiscoveryCriteria,
): boolean {
  if (criteria.workerId && record.workerId !== criteria.workerId) return false;
  if (criteria.action && !workerSupportsAction(record, criteria.action)) return false;
  if (criteria.availability && record.availability !== criteria.availability) return false;
  if (criteria.enabled !== undefined && record.enabled !== criteria.enabled) return false;
  return true;
}

/** Create an in-process execution engine (one instance per registration). */
export function createStudioExecutionEngine(): StudioExecutionEngine {
  const instances = new Map<string, WorkerInstanceRecord>();

  function getRecord(instanceId: string): WorkerInstanceRecord | undefined {
    return instances.get(instanceId);
  }

  function register(registration: WorkerRegistration): WorkerInstanceSnapshot {
    const { worker, instanceId } = registration;
    const record: WorkerInstanceRecord = {
      instanceId,
      workerId: worker.id,
      department: worker.department,
      capabilities: [...worker.capabilities],
      profile: registration.profile ?? worker.profile ?? null,
      availability: "idle",
      enabled: registration.enabled ?? true,
      currentRvtr: null,
      lastRunAt: null,
      worker,
    };
    instances.set(instanceId, record);
    return snapshot(record);
  }

  function unregister(instanceId: string): boolean {
    return instances.delete(instanceId);
  }

  function setEnabled(instanceId: string, enabled: boolean): WorkerInstanceSnapshot | null {
    const record = getRecord(instanceId);
    if (!record) return null;
    record.enabled = enabled;
    if (!enabled) {
      record.availability = "unavailable";
      record.currentRvtr = null;
    } else if (record.availability === "unavailable") {
      record.availability = "idle";
    }
    return snapshot(record);
  }

  function setAvailability(
    instanceId: string,
    availability: WorkerAvailabilityState,
  ): WorkerInstanceSnapshot | null {
    const record = getRecord(instanceId);
    if (!record) return null;
    record.availability = availability;
    if (availability !== "busy") {
      record.currentRvtr = null;
    }
    return snapshot(record);
  }

  function listWorkers(): WorkerInstanceSnapshot[] {
    return [...instances.values()].map(snapshot);
  }

  function discover(criteria: WorkerDiscoveryCriteria = {}): WorkerInstanceSnapshot[] {
    return [...instances.values()]
      .filter((record) => matchesDiscovery(record, criteria))
      .map(snapshot);
  }

  function selectWorker(criteria: WorkerSelectionCriteria): WorkerInstanceSnapshot | null {
    const requireIdle = criteria.requireIdle ?? true;
    const candidates = discover({
      workerId: criteria.workerId,
      action: criteria.action,
      enabled: true,
    }).map((item) => getRecord(item.instanceId)!);

    const eligible = requireIdle
      ? candidates.filter((record) => record.availability === "idle")
      : candidates.filter((record) => record.availability !== "unavailable");

    if (eligible.length === 0) return null;

    eligible.sort((a, b) => a.instanceId.localeCompare(b.instanceId));
    return snapshot(eligible[0]!);
  }

  function getWorkerProfile(instanceId: string): WorkerCapabilityProfile | null {
    return getRecord(instanceId)?.profile ?? null;
  }

  function listWorkerProfiles(): WorkerCapabilityProfile[] {
    return listWorkers()
      .map((item) => item.profile)
      .filter((profile): profile is WorkerCapabilityProfile => profile !== null);
  }

  function queryWorkerProfiles(query: WorkerProfileQuery = {}): WorkerCapabilityProfile[] {
    return queryWorkerCapabilityProfiles(listWorkerProfiles(), query);
  }

  async function execute(input: ExecutionEngineRunInput): Promise<ExecutionEngineRunResult> {
    const selected = selectWorker({
      workerId: input.workerId,
      action: input.action,
      requireIdle: true,
    });

    if (!selected) {
      return {
        ...blockedWorkerResult(input.rvtr, input.action, ["No available worker"]),
        instanceId: "none",
      };
    }

    const record = getRecord(selected.instanceId)!;
    record.availability = "busy";
    record.currentRvtr = input.rvtr;

    try {
      const validation = await record.worker.validate({
        rvtr: input.rvtr,
        action: input.action,
      });
      if (!validation.ok) {
        return {
          ...blockedWorkerResult(input.rvtr, input.action, validation.blockers),
          instanceId: record.instanceId,
        };
      }

      const result = await record.worker.run({
        rvtr: input.rvtr,
        action: input.action,
        payload: input.payload,
      });

      record.lastRunAt = new Date().toISOString();
      return { ...result, instanceId: record.instanceId };
    } catch (err) {
      return {
        ...failedWorkerResult(input.rvtr, input.action, err),
        instanceId: record.instanceId,
      };
    } finally {
      record.availability = "idle";
      record.currentRvtr = null;
    }
  }

  async function executeSequential(
    inputs: ExecutionEngineRunInput[],
  ): Promise<ExecutionEngineRunResult[]> {
    const results: ExecutionEngineRunResult[] = [];
    for (const input of inputs) {
      results.push(await execute(input));
    }
    return results;
  }

  return {
    register,
    unregister,
    setEnabled,
    setAvailability,
    listWorkers,
    discover,
    selectWorker,
    getWorkerProfile,
    listWorkerProfiles,
    queryWorkerProfiles,
    execute,
    executeSequential,
  };
}

/** Default instance id for a department's primary worker. */
export function primaryWorkerInstanceId(workerId: StudioDepartmentWorkerId): string {
  return `${workerId}:primary`;
}
