import { PLACEHOLDER_INTERRUPT_ASSETS } from "./initial-state";
import type {
  BoothAction,
  BoothAsset,
  BoothProgramLoadPayload,
  BoothProgramViewPayload,
  BoothShowLogEntry,
  BoothSource,
  BoothState,
} from "./types";
import { SOURCE_TO_PRIMARY, isOnAirPrimary } from "./types";

const LOG_CLOCK = "--:--:--";

function log(
  state: BoothState,
  action: string,
  source: string,
  asset: string,
  result: string,
): BoothShowLogEntry[] {
  const entry: BoothShowLogEntry = { clock: LOG_CLOCK, action, source, asset, result };
  return [entry, ...state.showLog].slice(0, 20);
}

function withMessage(state: BoothState, statusMessage: string, showLog?: BoothShowLogEntry[]): BoothState {
  return { ...state, statusMessage, showLog: showLog ?? state.showLog };
}

function onAirProgram(state: BoothState, asset: BoothAsset): BoothState {
  return {
    ...state,
    primary: "PROGRAM",
    currentSource: "Program",
    currentAsset: asset,
    nextAsset: state.nextAsset,
    returnTarget: asset,
    showActive: true,
    override: false,
    hold: false,
    paused: false,
    upcoming: state.upcoming,
    localConfidence: "Unconfirmed",
    publicConfidence: "Unconfirmed",
  };
}

function takeInterrupt(state: BoothState, source: Exclude<BoothSource, "Program">): BoothState {
  const asset = PLACEHOLDER_INTERRUPT_ASSETS[source];
  const returnTarget =
    state.primary === "PROGRAM"
      ? state.currentAsset
      : state.returnTarget ?? state.currentAsset;

  return {
    ...state,
    primary: SOURCE_TO_PRIMARY[source],
    currentSource: source,
    currentAsset: { id: asset.id, title: asset.title },
    returnTarget,
    override: true,
    hold: false,
    paused: true,
    upcoming: state.upcoming,
    localConfidence: "Unconfirmed",
    publicConfidence: "Unconfirmed",
    statusMessage: `TAKE ${source}`,
    showLog: log(state, "TAKE", source, asset.title, "OK"),
  };
}

function reduceTake(state: BoothState, source: BoothSource | null): BoothState {
  if (source == null) {
    return withMessage(state, "No Source armed", log(state, "TAKE", "—", "—", "BLOCKED"));
  }
  if (state.primary === "OFF") {
    return withMessage(state, "TAKE blocked — Booth OFF", log(state, "TAKE", source, "—", "BLOCKED"));
  }
  if (state.primary === "READY") {
    return withMessage(
      state,
      "TAKE blocked — use GO LIVE for Program",
      log(state, "TAKE", source, "—", "BLOCKED"),
    );
  }
  if (state.primary === "EMERGENCY") {
    return withMessage(
      state,
      "TAKE blocked — RETURN first",
      log(state, "TAKE", source, "—", "BLOCKED"),
    );
  }
  if (source === "Program") {
    if (state.primary === "PROGRAM") {
      return withMessage(
        state,
        "Already on Program",
        log(state, "TAKE", "Program", state.currentAsset?.title ?? "—", "NOOP"),
      );
    }
    return withMessage(
      state,
      "Use RETURN for Program",
      log(state, "TAKE", "Program", "—", "BLOCKED"),
    );
  }
  return takeInterrupt(state, source);
}

function reduceReturn(state: BoothState): BoothState {
  if (state.primary === "OFF" || state.primary === "READY") {
    return withMessage(state, "RETURN blocked", log(state, "RETURN", "—", "—", "BLOCKED"));
  }
  if (state.primary === "PROGRAM") {
    return withMessage(
      state,
      "Already on Program",
      log(state, "RETURN", "Program", state.currentAsset?.title ?? "—", "NOOP"),
    );
  }

  if (state.primary === "EMERGENCY" && !state.programLoaded) {
    return {
      ...state,
      primary: "READY",
      currentSource: null,
      currentAsset: null,
      returnTarget: null,
      showActive: false,
      override: false,
      hold: false,
      paused: false,
      upcoming: null,
      localConfidence: "—",
      publicConfidence: "—",
      statusMessage: "RETURN → READY",
      showLog: log(state, "RETURN", "—", "—", "OK"),
    };
  }

  const asset = state.returnTarget;
  if (!asset) {
    return withMessage(
      state,
      "RETURN blocked — no Program return target",
      log(state, "RETURN", "Program", "—", "BLOCKED"),
    );
  }
  const next = onAirProgram(state, asset);
  return {
    ...next,
    statusMessage: `RETURN Program ${asset.title}`,
    showLog: log(state, "RETURN", "Program", asset.title, "OK"),
  };
}

function reduceGoLive(state: BoothState): BoothState {
  if (state.primary === "OFF") {
    return withMessage(state, "GO LIVE blocked — Booth OFF", log(state, "GO LIVE", "—", "—", "BLOCKED"));
  }
  if (state.primary === "READY") {
    if (!state.programLoaded) {
      return withMessage(
        state,
        "No Program loaded",
        log(state, "GO LIVE", "Program", "—", "BLOCKED"),
      );
    }
    if (!state.currentAsset) {
      return withMessage(
        state,
        "No valid Program asset",
        log(state, "GO LIVE", "Program", "—", "BLOCKED"),
      );
    }
    const next = onAirProgram(state, state.currentAsset);
    return {
      ...next,
      override: false,
      statusMessage: "GO LIVE",
      showLog: log(state, "GO LIVE", "Program", state.currentAsset.title, "OK"),
    };
  }
  if (state.primary === "PROGRAM") {
    return withMessage(
      state,
      "Already On Air",
      log(state, "GO LIVE", "Program", state.currentAsset?.title ?? "—", "NOOP"),
    );
  }
  return withMessage(state, "Return first", log(state, "GO LIVE", "—", "—", "BLOCKED"));
}

function reduceEmergencyStop(state: BoothState): BoothState {
  if (state.primary === "OFF") {
    return withMessage(
      state,
      "EMERGENCY STOP blocked — Booth OFF",
      log(state, "EMERGENCY", "—", "—", "BLOCKED"),
    );
  }
  if (state.primary === "EMERGENCY") {
    return withMessage(
      state,
      "Already EMERGENCY",
      log(state, "EMERGENCY", "Emergency", state.currentAsset?.title ?? "—", "NOOP"),
    );
  }

  const asset = PLACEHOLDER_INTERRUPT_ASSETS.Emergency;
  const returnTarget =
    state.primary === "PROGRAM"
      ? state.currentAsset
      : state.returnTarget ?? state.currentAsset;

  return {
    ...state,
    primary: "EMERGENCY",
    currentSource: "Emergency",
    currentAsset: { id: asset.id, title: asset.title },
    returnTarget,
    override: true,
    hold: false,
    paused: true,
    showActive: true,
    localConfidence: "Unconfirmed",
    publicConfidence: "Unconfirmed",
    statusMessage: "Emergency On Air",
    showLog: log(state, "EMERGENCY", "Emergency", asset.title, "OK"),
  };
}

function reduceEndShow(state: BoothState): BoothState {
  return {
    ...state,
    primary: "READY",
    currentSource: null,
    currentAsset: state.programLoaded ? state.currentAsset : null,
    returnTarget: null,
    showActive: false,
    override: false,
    hold: false,
    paused: false,
    upcoming: state.programLoaded ? state.upcoming : null,
    armedSource: null,
    localConfidence: "—",
    publicConfidence: "—",
    statusMessage: "End Show",
    showLog: log(state, "END", "—", "—", "OK"),
  };
}

function reduceApplyProgramLoad(state: BoothState, payload: BoothProgramLoadPayload): BoothState {
  if (isOnAirPrimary(state.primary)) {
    return withMessage(
      state,
      "End Show before Load Show",
      log(state, "LOAD", "Program", "—", "BLOCKED"),
    );
  }
  return {
    ...state,
    primary: "READY",
    programLoaded: true,
    presentationId: payload.presentationId,
    showName: payload.showName,
    currentAsset: payload.currentAsset,
    nextAsset: payload.nextAsset,
    upcoming: payload.upcoming,
    returnTarget: payload.currentAsset,
    paused: true,
    currentSource: null,
    showActive: false,
    override: false,
    hold: false,
    statusMessage: `Show loaded: ${payload.showName}`,
    showLog: log(state, "LOAD", "Program", payload.showName, "OK"),
  };
}

function reduceApplyProgramView(state: BoothState, payload: BoothProgramViewPayload, statusMessage?: string): BoothState {
  const programOwnsAir = state.primary === "PROGRAM";
  if (programOwnsAir) {
    return {
      ...state,
      presentationId: payload.presentationId,
      showName: payload.showName,
      currentAsset: payload.currentAvailable ? payload.currentAsset : state.currentAsset,
      nextAsset: payload.nextAsset,
      upcoming: payload.upcoming,
      returnTarget: payload.currentAvailable ? payload.currentAsset : state.returnTarget,
      paused: payload.paused,
      statusMessage: statusMessage ?? state.statusMessage,
    };
  }

  // Interrupt owns air — update frozen Program return position only.
  return {
    ...state,
    presentationId: payload.presentationId,
    showName: payload.showName,
    nextAsset: payload.nextAsset,
    upcoming: payload.upcoming,
    returnTarget: payload.returnTarget ?? payload.currentAsset ?? state.returnTarget,
    paused: true,
    statusMessage: statusMessage ?? state.statusMessage,
  };
}

function reduceSetHold(state: BoothState): BoothState {
  if (state.primary === "OFF" || state.primary === "READY" || state.primary === "EMERGENCY") {
    return withMessage(state, "HOLD blocked", log(state, "HOLD", "—", "—", "BLOCKED"));
  }
  if (state.hold) {
    return withMessage(state, "Already HOLD", log(state, "HOLD", state.currentSource ?? "—", "—", "NOOP"));
  }
  return {
    ...state,
    hold: true,
    statusMessage: "HOLD",
    showLog: log(state, "HOLD", state.currentSource ?? "—", state.currentAsset?.title ?? "—", "OK"),
  };
}

function reduceClearHold(state: BoothState): BoothState {
  if (!state.hold) {
    return withMessage(state, "HOLD not active", log(state, "RELEASE", "—", "—", "NOOP"));
  }
  return {
    ...state,
    hold: false,
    statusMessage: "RELEASE HOLD",
    showLog: log(state, "RELEASE", state.currentSource ?? "—", state.currentAsset?.title ?? "—", "OK"),
  };
}

/** Pure Booth Store reducer — Program position is applied via APPLY_PROGRAM_* from the server. */
export function reduceBooth(state: BoothState, action: BoothAction): BoothState {
  switch (action.type) {
    case "TAKE":
      return reduceTake(state, action.source);
    case "RETURN":
      return reduceReturn(state);
    case "GO_LIVE":
      return reduceGoLive(state);
    case "SET_AUTO":
      return {
        ...state,
        auto: action.armed,
        statusMessage: action.armed ? "AUTO armed" : "AUTO disarmed",
        showLog: log(state, "AUTO", "—", "—", action.armed ? "ARMED" : "DISARMED"),
      };
    case "SET_HOLD":
      return reduceSetHold(state);
    case "CLEAR_HOLD":
      return reduceClearHold(state);
    case "EMERGENCY_STOP":
      return reduceEmergencyStop(state);
    case "END_SHOW":
      return reduceEndShow(state);
    case "ARM_SOURCE":
      return {
        ...state,
        armedSource: action.source,
        statusMessage: `Armed ${action.source}`,
      };
    case "LOAD_SHOW":
      // Server load is authoritative — local action is a no-op placeholder.
      return withMessage(state, "Loading show…");
    case "LOAD_SHOW_FAILED":
      return withMessage(
        state,
        action.error,
        log(state, "LOAD", "Program", "—", "FAIL"),
      );
    case "APPLY_PROGRAM_LOAD":
      return reduceApplyProgramLoad(state, action.payload);
    case "APPLY_PROGRAM_VIEW":
      return reduceApplyProgramView(state, action.payload, action.statusMessage);
    case "PREVIOUS":
    case "NEXT":
    case "PAUSE":
    case "RESUME":
      // Transport is server-driven against Presentation playhead.
      return state;
    case "PREVIEW":
      return withMessage(
        state,
        state.armedSource ? `Preview ${state.armedSource}` : "Preview — no Source armed",
      );
    case "JUMP":
      return state;
    case "OPEN_RUNTIME":
      return withMessage(state, "Open Runtime — not connected");
    case "APPLY_PUBLISH_RESULT":
      return {
        ...state,
        localConfidence: action.localConfidence,
        publicConfidence: action.publicConfidence,
        statusMessage: action.statusMessage,
        lastPublishedKey:
          action.publishedKey !== undefined ? action.publishedKey : state.lastPublishedKey,
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
