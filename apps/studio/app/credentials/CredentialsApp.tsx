"use client";

import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  RETROVERSE_STYLE_CATALOG,
  retroverseStyleById,
} from "@/lib/retroverse/style-catalog";
import {
  BOBOS_PRINT_SHEET_HEIGHT_IN,
  BOBOS_PRINT_SHEET_WIDTH_IN,
  DESIGN_BUILDER_PRINT_LAYOUTS,
} from "@/lib/bobos/project-zero/pass-production-spec";

import { CredentialPreview } from "./CredentialPreview";
import {
  CREDENTIAL_TYPES,
  DEFAULT_FINISHING,
  EVENT_TYPES,
  VENUE_TYPES,
  allSelectedFaces,
  artworkIsCurrent,
  clamp,
  cloneValue,
  contextKey,
  createDefaultPreferences,
  createDraftFromPreferences,
  credentialTypeLabel,
  draftFromRecord,
  fieldsFromDraft,
  firstSelectedFace,
  formatCredentialDate,
  hasAnyArtwork,
  orderedCredentialTypes,
  preferencesFromDraft,
  selectedArtworkIsCurrent,
  type ArtworkPair,
  type AuthenticationLayout,
  type CredentialDraft,
  type CredentialFields,
  type CredentialRecord,
  type CredentialSerialMap,
  type CredentialTypeId,
  type FinishingAdjustments,
  type FinishingMap,
  type SelectedFace,
  type SessionPreferences,
} from "./model";
import { credentialsArtworkProvider } from "./artwork-provider";
import {
  loadLibrary,
  loadPreferences,
  recordFromDraft,
  removeFromLibrary,
  saveLibrary,
  savePreferences,
  sortLibrary,
  upsertLibrary,
} from "./storage";

import "./credentials.css";

type Screen = "create" | "generating" | "review" | "finish" | "complete" | "library";
type CreateMode = "fresh" | "reuse";
type FieldErrorKey = "eventName" | "venue" | "date" | "eventType" | "venueType";
type ValidationErrors = Partial<Record<FieldErrorKey, string>>;
type ToastState = { message: string; actionLabel?: string; onAction?: () => void } | null;

type GenerationState = {
  completed: Partial<Record<CredentialTypeId, ArtworkPair>>;
  total: number;
};

type UnsavedAction = "new" | { kind: "open"; record: CredentialRecord } | { kind: "duplicate"; record: CredentialRecord };

type IconName = "back" | "library" | "edit" | "finish" | "save" | "refresh" | "copy" | "delete" | "search" | "close";

const DEFAULT_AUTH_LAYOUT: AuthenticationLayout = { qrSize: 32, qrX: 50, qrY: 47, serialX: 50, serialY: 88, serialScale: 100, safe: false, reserved: true };
const DEFAULT_AUTH_LAYOUTS: Record<CredentialTypeId, AuthenticationLayout> = {
  event: { ...DEFAULT_AUTH_LAYOUT }, vip: { ...DEFAULT_AUTH_LAYOUT }, backstage: { ...DEFAULT_AUTH_LAYOUT },
};
const DEFAULT_PRODUCTION_QUANTITIES: Record<CredentialTypeId, number> = { event: 30, vip: 8, backstage: 4 };

const FINISH_SECTIONS = {
  image: ["exposure", "contrast", "saturation"],
  color: ["temperature", "tint"],
  framing: ["scale", "x", "y"],
  advanced: ["brightness", "hue", "vibrance", "sharpen", "grain", "fade"],
} as const satisfies Record<string, readonly (keyof FinishingAdjustments)[]>;

const FINISH_CONTROLS: Record<keyof FinishingAdjustments, { label: string; min: number; max: number; step: number; suffix?: string }> = {
  exposure: { label: "Exposure", min: -2, max: 2, step: 0.05, suffix: " EV" },
  contrast: { label: "Contrast", min: -100, max: 100, step: 1 },
  saturation: { label: "Saturation", min: -100, max: 100, step: 1 },
  temperature: { label: "Temperature", min: -100, max: 100, step: 1 },
  tint: { label: "Tint", min: -100, max: 100, step: 1 },
  scale: { label: "Scale", min: 100, max: 200, step: 1, suffix: "%" },
  x: { label: "X Position", min: -100, max: 100, step: 1 },
  y: { label: "Y Position", min: -100, max: 100, step: 1 },
  brightness: { label: "Brightness", min: -100, max: 100, step: 1 },
  hue: { label: "Hue", min: -180, max: 180, step: 1, suffix: "°" },
  vibrance: { label: "Vibrance", min: -100, max: 100, step: 1 },
  sharpen: { label: "Sharpen", min: 0, max: 100, step: 1 },
  grain: { label: "Grain", min: 0, max: 100, step: 1 },
  fade: { label: "Fade", min: 0, max: 100, step: 1 },
};

function AppIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    back: <><path d="M15 18 9 12l6-6" /><path d="M9 12h10" /></>,
    library: <><path d="M4 5.5h16v14H4z" /><path d="M8 5.5v14M12 5.5v14" /></>,
    edit: <><path d="m4 16-.5 4.5L8 20l10.5-10.5-4-4Z" /><path d="m13 7 4 4" /></>,
    finish: <><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="13" cy="18" r="2" /></>,
    save: <><path d="M5 4h12l2 2v14H5z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M18.5 15a7 7 0 1 1-.3-6.3L20 12" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M16 8V5H5v11h3" /></>,
    delete: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /><path d="M10 11v5M14 11v5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };
  return <svg className="credentials-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function ActionButton({
  children,
  icon,
  tone = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: IconName;
  tone?: "primary" | "secondary" | "quiet" | "danger" | "success";
}) {
  return (
    <button {...props} className={`credentials-button credentials-button--${tone}${className ? ` ${className}` : ""}`}>
      {icon ? <AppIcon name={icon} /> : null}
      <span>{children}</span>
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
  labelledBy = "credentials-modal-title",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  labelledBy?: string;
}) {
  return (
    <div className="credentials-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="credentials-modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <header className="credentials-modal__header">
          <h2 id={labelledBy}>{title}</h2>
          <button type="button" className="credentials-icon-button" onClick={onClose} aria-label="Close">
            <AppIcon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function FieldMessage({ message }: { message?: string }) {
  return message ? <p className="credentials-field-error" role="alert">{message}</p> : null;
}

function SliderControl({
  control,
  value,
  onChange,
}: {
  control: keyof FinishingAdjustments;
  value: number;
  onChange: (value: number) => void;
}) {
  const definition = FINISH_CONTROLS[control];
  const id = `finish-${control}`;
  return (
    <div className="finish-control">
      <div className="finish-control__heading">
        <label htmlFor={id}>{definition.label}</label>
        <div className="finish-control__number-wrap">
          <input
            className="finish-control__number"
            type="number"
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={Number(value.toFixed(definition.step < 1 ? 2 : 0))}
            onChange={(event) => onChange(clamp(Number(event.target.value), definition.min, definition.max))}
            aria-label={`${definition.label} value`}
          />
          {definition.suffix ? <span>{definition.suffix}</span> : null}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={definition.min}
        max={definition.max}
        step={definition.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

export function CredentialsApp() {
  const defaultsRef = useRef(createDefaultPreferences());
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<SessionPreferences>(defaultsRef.current);
  const [draft, setDraft] = useState<CredentialDraft>(() => createDraftFromPreferences(defaultsRef.current));
  const [library, setLibrary] = useState<CredentialRecord[]>([]);
  const [screen, setScreen] = useState<Screen>("create");
  const [returnScreen, setReturnScreen] = useState<Exclude<Screen, "library" | "generating">>("create");
  const [createMode, setCreateMode] = useState<CreateMode>("fresh");
  const [selectedFace, setSelectedFace] = useState<SelectedFace>({ type: "event", face: "front" });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [generation, setGeneration] = useState<GenerationState | null>(null);
  const [regenerating, setRegenerating] = useState<Set<CredentialTypeId>>(new Set());
  const [toast, setToast] = useState<ToastState>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showBefore, setShowBefore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deferredSearch, setDeferredSearch] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [deleteLibraryId, setDeleteLibraryId] = useState<string | null>(null);
  const [unsavedAction, setUnsavedAction] = useState<UnsavedAction | null>(null);
  const [authLayouts, setAuthLayouts] = useState<Record<CredentialTypeId, AuthenticationLayout>>(() => cloneValue(DEFAULT_AUTH_LAYOUTS));
  const [productionQuantities, setProductionQuantities] = useState<Record<CredentialTypeId, number>>(() => ({ ...DEFAULT_PRODUCTION_QUANTITIES }));
  const [productionIncluded, setProductionIncluded] = useState<Record<CredentialTypeId, boolean>>({ event: true, vip: true, backstage: true });
  const [productionBusy, setProductionBusy] = useState<"proof" | "export" | "print" | null>(null);
  const [imageExportBusy, setImageExportBusy] = useState<"png" | "jpeg" | null>(null);
  const [productionSerials, setProductionSerials] = useState<Partial<Record<CredentialTypeId, string[]>>>({});
  const [startingSerial, setStartingSerial] = useState("RVSN000001");
  const [finishUndo, setFinishUndo] = useState<FinishingMap[]>([]);
  const [finishRedo, setFinishRedo] = useState<FinishingMap[]>([]);
  const generationAbortRef = useRef<AbortController | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    history: FinishingMap;
  } | null>(null);

  const selectedFaces = useMemo(() => allSelectedFaces(draft.credentialTypes), [draft.credentialTypes]);
  const selectedAdjustments = draft.finishing[selectedFace.type]?.[selectedFace.face] ?? DEFAULT_FINISHING;
  const selectedLibraryRecord = selectedLibraryId ? library.find((record) => record.id === selectedLibraryId) ?? null : null;
  const deleteLibraryRecord = deleteLibraryId ? library.find((record) => record.id === deleteLibraryId) ?? null : null;
  const allArtworkCurrent = selectedArtworkIsCurrent(draft);
  const hasSelectedArtwork = draft.credentialTypes.every((type) => Boolean(draft.artwork[type]));

  useEffect(() => {
    const loadedPreferences = loadPreferences();
    setPreferences(loadedPreferences);
    setDraft(createDraftFromPreferences(loadedPreferences));
    setSelectedFace(firstSelectedFace(loadedPreferences.credentialTypes));
    setLibrary(loadLibrary());
    setAdvancedOpen(window.sessionStorage.getItem("bobos.credentials.v1.advanced-open") === "1");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      savePreferences(preferences);
    } catch {
      // Preference persistence should never block the active credential workflow.
    }
  }, [preferences, ready]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDeferredSearch(searchQuery.trim().toLowerCase()), 140);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4200);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [toast]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const showToast = useCallback((next: Exclude<ToastState, null>) => setToast(next), []);

  function markChanged(previous: CredentialDraft) {
    setSaved(false);
    setSaveError(null);
    if (previous.id || hasAnyArtwork(previous) || createMode === "reuse") setDirty(true);
  }

  function updateField<K extends keyof CredentialFields>(key: K, value: CredentialFields[K]) {
    markChanged(draft);
    setDraft((previous) => ({ ...previous, [key]: value }));
    setPreferences((previous) => ({ ...previous, [key]: value }));
    if (key in validationErrors) {
      setValidationErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  }

  function toggleCredentialType(type: CredentialTypeId) {
    const currentlySelected = draft.credentialTypes.includes(type);
    if (currentlySelected && draft.credentialTypes.length === 1) {
      showToast({ message: "Choose at least one credential type." });
      return;
    }
    const next = orderedCredentialTypes(
      currentlySelected
        ? draft.credentialTypes.filter((value) => value !== type)
        : [...draft.credentialTypes, type],
    );
    updateField("credentialTypes", next);
    if (!next.some((value) => value === selectedFace.type)) setSelectedFace(firstSelectedFace(next));
  }

  function validateDraft(): boolean {
    const errors: ValidationErrors = {};
    if (!draft.eventName.trim()) errors.eventName = "Enter an event name.";
    if (!draft.venue.trim()) errors.venue = "Enter a venue.";
    if (!draft.date) errors.date = "Choose a date.";
    if (!draft.eventType) errors.eventType = "Choose the kind of event.";
    if (!draft.venueType) errors.venueType = "Choose the kind of venue.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function startGeneration(forceAll = false) {
    if (!validateDraft()) return;
    const selected = orderedCredentialTypes(draft.credentialTypes);
    const existingContextChanged = selected.some((type) => {
      const pair = draft.artwork[type];
      return pair ? !artworkIsCurrent(draft, type) : false;
    });
    const targets = forceAll || existingContextChanged
      ? selected
      : selected.filter((type) => !artworkIsCurrent(draft, type));
    if (targets.length === 0) {
      setScreen("review");
      setSelectedFace((current) => selected.some((type) => type === current.type) ? current : firstSelectedFace(selected));
      return;
    }

    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    const baseDraft = cloneValue(draft);
    const nextArtwork = cloneValue(draft.artwork);
    const completed: GenerationState["completed"] = {};
    for (const type of selected) {
      if (!targets.includes(type) && draft.artwork[type]) completed[type] = draft.artwork[type];
    }
    setGeneration({ completed, total: selected.length });
    setScreen("generating");

    try {
      const familySeed = Date.now();
      for (const type of targets) {
        const pair = await credentialsArtworkProvider.generatePair(
          fieldsFromDraft(baseDraft),
          type,
          controller.signal,
          familySeed,
        );
        nextArtwork[type] = pair;
        setGeneration((previous) => previous ? {
          ...previous,
          completed: { ...previous.completed, [type]: pair },
        } : previous);
      }
      if (controller.signal.aborted) return;
      const completedDraft = { ...baseDraft, artwork: nextArtwork };
      setDraft(completedDraft);
      setSelectedFace(firstSelectedFace(completedDraft.credentialTypes));
      setCreateMode("reuse");
      setDirty(true);
      setSaved(false);
      setGeneration(null);
      setScreen("review");
    } catch (error) {
      if (controller.signal.aborted) return;
      setGeneration(null);
      setScreen("create");
      showToast({ message: error instanceof Error ? error.message : "Artwork couldn’t be created." });
    } finally {
      if (generationAbortRef.current === controller) generationAbortRef.current = null;
    }
  }

  function cancelGeneration() {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    setGeneration(null);
    setScreen("create");
  }

  async function regenerateType(type: CredentialTypeId) {
    if (regenerating.has(type)) return;
    const oldPair = draft.artwork[type];
    setRegenerating((previous) => new Set(previous).add(type));
    try {
      const pair = await credentialsArtworkProvider.generatePair(
        fieldsFromDraft(draft),
        type,
        undefined,
        Date.now(),
      );
      setDraft((previous) => ({ ...previous, artwork: { ...previous.artwork, [type]: pair } }));
      setDirty(true);
      setSaved(false);
      setSaveError(null);
      if (oldPair) {
        showToast({
          message: `${credentialTypeLabel(type)} regenerated.`,
          actionLabel: "Undo",
          onAction: () => {
            setDraft((previous) => ({ ...previous, artwork: { ...previous.artwork, [type]: oldPair } }));
            setDirty(true);
            setSaved(false);
            setToast(null);
          },
        });
      }
    } catch {
      showToast({ message: "New artwork couldn’t be created. Your current artwork is unchanged." });
    } finally {
      setRegenerating((previous) => {
        const next = new Set(previous);
        next.delete(type);
        return next;
      });
    }
  }

  async function saveCurrent(): Promise<CredentialRecord | null> {
    if (!hasSelectedArtwork || !allArtworkCurrent) {
      showToast({ message: "Regenerate artwork before saving this credential." });
      return null;
    }
    if (regenerating.size > 0 || saving) return null;
    setSaving(true);
    try {
      const provisional = {
        ...recordFromDraft(draft),
        authenticationLayouts: cloneValue(authLayouts),
      };
      const response = await fetch("/api/bobos/credentials/serials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: provisional.id,
          eventName: provisional.eventName,
          credentialTypes: provisional.credentialTypes,
          existing: provisional.serials,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        serials?: CredentialSerialMap;
      };
      if (!response.ok || !result.serials) {
        throw new Error(result.error || "Serial allocation failed.");
      }
      const record: CredentialRecord = { ...provisional, serials: result.serials };
      const nextLibrary = upsertLibrary(library, record);
      saveLibrary(nextLibrary);
      setLibrary(nextLibrary);
      setDraft(draftFromRecord(record));
      setDirty(false);
      setSaved(true);
      setSaveError(null);
      showToast({ message: "Saved to Library." });
      return record;
    } catch (error) {
      setSaveError("This credential hasn’t been saved. Try again.");
      showToast({ message: error instanceof Error ? error.message : "The credential couldn’t be saved." });
      return null;
    } finally {
      setSaving(false);
    }
  }

  function newCredential() {
    const next = createDraftFromPreferences(preferences);
    setDraft(next);
    setCreateMode("fresh");
    setSelectedFace(firstSelectedFace(next.credentialTypes));
    setValidationErrors({});
    setDirty(false);
    setSaved(false);
    setSaveError(null);
    setAuthLayouts(cloneValue(DEFAULT_AUTH_LAYOUTS));
    setProductionQuantities({ ...DEFAULT_PRODUCTION_QUANTITIES });
    setProductionIncluded({ event: true, vip: true, backstage: true });
    setProductionSerials({});
    setScreen("create");
  }

  function performOpen(record: CredentialRecord) {
    const nextDraft = draftFromRecord(record);
    setDraft(nextDraft);
    setPreferences(preferencesFromDraft(nextDraft));
    setSelectedFace(firstSelectedFace(nextDraft.credentialTypes));
    setCreateMode("reuse");
    setDirty(false);
    setSaved(true);
    setSaveError(null);
    setSelectedLibraryId(null);
    setAuthLayouts({
      ...cloneValue(DEFAULT_AUTH_LAYOUTS),
      ...cloneValue(record.authenticationLayouts ?? {}),
    });
    setProductionQuantities({ ...DEFAULT_PRODUCTION_QUANTITIES });
    setProductionIncluded({ event: true, vip: true, backstage: true });
    setProductionSerials({});
    setScreen("review");
  }

  function performDuplicate(record: CredentialRecord) {
    const nextDraft = draftFromRecord(record, true);
    setDraft(nextDraft);
    setPreferences(preferencesFromDraft(nextDraft));
    setSelectedFace(firstSelectedFace(nextDraft.credentialTypes));
    setCreateMode("reuse");
    setDirty(true);
    setSaved(false);
    setSaveError(null);
    setSelectedLibraryId(null);
    setAuthLayouts({
      ...cloneValue(DEFAULT_AUTH_LAYOUTS),
      ...cloneValue(record.authenticationLayouts ?? {}),
    });
    setProductionQuantities({ ...DEFAULT_PRODUCTION_QUANTITIES });
    setProductionIncluded({ event: true, vip: true, backstage: true });
    setProductionSerials({});
    setScreen("create");
  }

  function requestUnsavedAction(action: UnsavedAction) {
    if (dirty) {
      setUnsavedAction(action);
      return;
    }
    if (action === "new") newCredential();
    else if (action.kind === "open") performOpen(action.record);
    else performDuplicate(action.record);
  }

  function completeUnsavedAction(action: UnsavedAction) {
    setUnsavedAction(null);
    if (action === "new") newCredential();
    else if (action.kind === "open") performOpen(action.record);
    else performDuplicate(action.record);
  }

  function openLibraryScreen() {
    if (screen !== "library" && screen !== "generating") setReturnScreen(screen);
    setSelectedLibraryId(null);
    setScreen("library");
  }

  function deleteRecord(record: CredentialRecord) {
    try {
      const next = removeFromLibrary(library, record.id);
      saveLibrary(next);
      setLibrary(next);
      if (draft.id === record.id) {
        setDraft((previous) => ({ ...previous, id: null, createdDate: null, modifiedDate: null }));
        setDirty(true);
        setSaved(false);
      }
      setDeleteLibraryId(null);
      setSelectedLibraryId(null);
      showToast({ message: `Deleted “${record.eventName}”.` });
    } catch {
      showToast({ message: "The credential couldn’t be deleted." });
    }
  }

  function enterFinish(face = selectedFace) {
    setSelectedFace(face);
    setFinishUndo([]);
    setFinishRedo([]);
    setScreen("finish");
  }

  function updateFinishing(control: keyof FinishingAdjustments, value: number, recordHistory = true) {
    const definition = FINISH_CONTROLS[control];
    const normalized = clamp(value, definition.min, definition.max);
    if (recordHistory) {
      setFinishUndo((previous) => [...previous.slice(-49), cloneValue(draft.finishing)]);
      setFinishRedo([]);
    }
    const finishing = cloneValue(draft.finishing);
    const nextAdjustments = { ...finishing[selectedFace.type][selectedFace.face], [control]: normalized };
    finishing[selectedFace.type][selectedFace.face] = nextAdjustments;
    setDraft((previous) => ({ ...previous, finishing }));
    setPreferences((current) => ({ ...current, lastFinishing: { ...nextAdjustments } }));
    setDirty(true);
    setSaved(false);
  }

  function updateAuthenticationLayout(layout: AuthenticationLayout) {
    setAuthLayouts((current) => ({ ...current, [selectedFace.type]: layout }));
    setDirty(true);
    setSaved(false);
  }

  function resetFinishSection(section: keyof typeof FINISH_SECTIONS) {
    setFinishUndo((previous) => [...previous.slice(-49), cloneValue(draft.finishing)]);
    setFinishRedo([]);
    const finishing = cloneValue(draft.finishing);
    const current = { ...finishing[selectedFace.type][selectedFace.face] };
    for (const control of FINISH_SECTIONS[section]) current[control] = DEFAULT_FINISHING[control];
    finishing[selectedFace.type][selectedFace.face] = current;
    setDraft((previous) => ({ ...previous, finishing }));
    setPreferences((stored) => ({ ...stored, lastFinishing: { ...current } }));
    setDirty(true);
    setSaved(false);
  }

  function undoFinish() {
    const previous = finishUndo.at(-1);
    if (!previous) return;
    setFinishRedo((items) => [...items, cloneValue(draft.finishing)]);
    setFinishUndo((items) => items.slice(0, -1));
    setDraft((current) => ({ ...current, finishing: cloneValue(previous) }));
    setDirty(true);
    setSaved(false);
  }

  function redoFinish() {
    const next = finishRedo.at(-1);
    if (!next) return;
    setFinishUndo((items) => [...items, cloneValue(draft.finishing)]);
    setFinishRedo((items) => items.slice(0, -1));
    setDraft((current) => ({ ...current, finishing: cloneValue(next) }));
    setDirty(true);
    setSaved(false);
  }

  function moveSelectedFace(direction: -1 | 1) {
    const index = selectedFaces.findIndex((face) => face.type === selectedFace.type && face.face === selectedFace.face);
    const nextIndex = (index + direction + selectedFaces.length) % selectedFaces.length;
    setSelectedFace(selectedFaces[nextIndex] ?? selectedFace);
  }

  function onFramingPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("[data-auth-object]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: selectedAdjustments.x,
      startY: selectedAdjustments.y,
      history: cloneValue(draft.finishing),
    };
  }

  function onFramingPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = clamp(drag.startX + ((event.clientX - drag.startClientX) / rect.width) * 220, -100, 100);
    const nextY = clamp(drag.startY + ((event.clientY - drag.startClientY) / rect.height) * 220, -100, 100);
    const finishing = cloneValue(draft.finishing);
    const current = { ...finishing[selectedFace.type][selectedFace.face], x: nextX, y: nextY };
    finishing[selectedFace.type][selectedFace.face] = current;
    setDraft((previous) => ({ ...previous, finishing }));
    setPreferences((stored) => ({ ...stored, lastFinishing: { ...current } }));
    setDirty(true);
    setSaved(false);
  }

  function onFramingPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setFinishUndo((previous) => [...previous.slice(-49), drag.history]);
    setFinishRedo([]);
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onFramingWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    updateFinishing("scale", selectedAdjustments.scale + (event.deltaY > 0 ? -2 : 2));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const command = event.metaKey || event.ctrlKey;
      if (unsavedAction || deleteLibraryId || selectedLibraryId) {
        if (event.key === "Escape") {
          setUnsavedAction(null);
          setDeleteLibraryId(null);
          setSelectedLibraryId(null);
        }
        return;
      }
      if (command && event.key.toLowerCase() === "n") {
        event.preventDefault();
        requestUnsavedAction("new");
        return;
      }
      if (command && event.key.toLowerCase() === "o") {
        event.preventDefault();
        openLibraryScreen();
        return;
      }
      if (command && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (screen === "review" || screen === "finish") void saveCurrent();
        return;
      }
      if (screen === "create" && command && event.key === "Enter") {
        event.preventDefault();
        void startGeneration(createMode === "reuse" && allArtworkCurrent);
        return;
      }
      if (screen === "review" && command && event.key === "Enter") {
        event.preventDefault();
        void regenerateType(selectedFace.type);
        return;
      }
      if (screen === "review" && event.key.toLowerCase() === "f" && !isTypingTarget(event.target)) {
        event.preventDefault();
        enterFinish();
        return;
      }
      if (screen === "finish") {
        if (command && event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) redoFinish();
          else undoFinish();
          return;
        }
        if (event.key === "\\") {
          event.preventDefault();
          setShowBefore(true);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setScreen("review");
          return;
        }
        if (!isTypingTarget(event.target) && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          moveSelectedFace(event.key === "ArrowLeft" ? -1 : 1);
          return;
        }
      }
      if (screen === "library" && event.key === "Escape") {
        event.preventDefault();
        if (searchQuery) setSearchQuery("");
        else setScreen(returnScreen);
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key === "\\") setShowBefore(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  const filteredLibrary = useMemo(() => {
    const sorted = sortLibrary(library);
    if (!deferredSearch) return sorted;
    return sorted.filter((record) => {
      const date = formatCredentialDate(record.date).toLowerCase();
      return record.eventName.toLowerCase().includes(deferredSearch)
        || record.venue.toLowerCase().includes(deferredSearch)
        || date.includes(deferredSearch);
    });
  }, [deferredSearch, library]);

  function renderCreate() {
    const retroverseStyle = retroverseStyleById(draft.retroverseStyle);
    const heroType = draft.credentialTypes[0] ?? "event";
    const heroArtwork = draft.artwork[heroType]?.front ?? null;
    const contextChanged = draft.credentialTypes.some((type) => draft.artwork[type] && !artworkIsCurrent(draft, type));
    const missingArtwork = draft.credentialTypes.some((type) => !draft.artwork[type]);
    const canReviewExisting = hasSelectedArtwork && !contextChanged;
    const primaryLabel = contextChanged
      ? "Regenerate Artwork"
      : missingArtwork
        ? (hasAnyArtwork(draft) ? "Generate New Type" : "Generate")
        : "Review Existing";

    return (
      <div className="credentials-screen credentials-create">
        <header className="credentials-topbar">
          <div className="credentials-topbar__side">
            {createMode === "reuse" && hasAnyArtwork(draft) ? (
              <ActionButton tone="quiet" icon="back" onClick={() => setScreen("review")}>Review</ActionButton>
            ) : <span className="credentials-wordmark">Credentials</span>}
          </div>
          <div className="credentials-topbar__title">
            {createMode === "reuse" ? (draft.id ? draft.eventName : `Duplicate of ${draft.eventName}`) : null}
          </div>
          <div className="credentials-topbar__side credentials-topbar__side--end">
            <ActionButton tone="quiet" icon="library" onClick={openLibraryScreen}>Library</ActionButton>
          </div>
        </header>

        <main className="credentials-create__main">
          <section className="credentials-create__hero" aria-label="Credential preview">
            <h1>A credential should feel collectible before it is finished.</h1>
            <div className="credentials-create__hero-artwork">
              <CredentialPreview
                draft={draft}
                credentialType={heroType}
                face="front"
                artwork={heroArtwork}
                adjustments={draft.finishing[heroType].front}
              />
            </div>
            <p>{retroverseStyle.paletteName}</p>
          </section>
          <form
            className="credentials-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (primaryLabel === "Review Existing") setScreen("review");
              else void startGeneration(contextChanged);
            }}
          >
            {createMode === "reuse" ? <p className="credentials-form__mode">Update credential details</p> : null}

            <section className="credentials-form-section" aria-labelledby="credentials-story-heading">
              <header><span>01</span><h2 id="credentials-story-heading">Story</h2></header>
              <div className="credentials-form__row">
                <div className="credentials-field">
                  <label htmlFor="credential-event-name">Event Name</label>
                  <input
                    id="credential-event-name"
                    autoFocus
                    maxLength={120}
                    value={draft.eventName}
                    onChange={(event) => updateField("eventName", event.target.value)}
                    aria-invalid={Boolean(validationErrors.eventName)}
                    aria-describedby={validationErrors.eventName ? "credential-event-name-error" : undefined}
                  />
                  <div id="credential-event-name-error"><FieldMessage message={validationErrors.eventName} /></div>
                </div>
                <div className="credentials-field">
                  <div className="credentials-field__label-row">
                    <label htmlFor="credential-optional-text">Optional Text</label>
                    {draft.optionalText.length >= 140 ? <span>{draft.optionalText.length}/180</span> : null}
                  </div>
                  <input
                    id="credential-optional-text"
                    maxLength={180}
                    value={draft.optionalText}
                    onChange={(event) => updateField("optionalText", event.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="credentials-form-section" aria-labelledby="credentials-place-heading">
              <header><span>02</span><h2 id="credentials-place-heading">Place</h2></header>
              <div className="credentials-form__row">
                <div className="credentials-field">
                  <label htmlFor="credential-venue">Venue</label>
                  <input
                    id="credential-venue"
                    maxLength={120}
                    value={draft.venue}
                    onChange={(event) => updateField("venue", event.target.value)}
                    aria-invalid={Boolean(validationErrors.venue)}
                  />
                  <FieldMessage message={validationErrors.venue} />
                </div>
                <div className="credentials-field">
                  <label htmlFor="credential-date">Date</label>
                  <input
                    id="credential-date"
                    type="date"
                    value={draft.date}
                    onInput={(event) => updateField("date", event.currentTarget.value)}
                    aria-invalid={Boolean(validationErrors.date)}
                  />
                  <FieldMessage message={validationErrors.date} />
                </div>
              </div>
              <div className="credentials-form__row">
                <div className="credentials-field">
                  <label htmlFor="credential-venue-type">Venue Type</label>
                  <select
                    id="credential-venue-type"
                    value={draft.venueType}
                    onChange={(event) => updateField("venueType", event.target.value as CredentialFields["venueType"])}
                    aria-invalid={Boolean(validationErrors.venueType)}
                  >
                    <option value="" disabled>Choose venue type</option>
                    {VENUE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <FieldMessage message={validationErrors.venueType} />
                </div>
                <div className="credentials-field">
                  <label htmlFor="credential-event-type">Event Type</label>
                  <select
                    id="credential-event-type"
                    value={draft.eventType}
                    onChange={(event) => updateField("eventType", event.target.value as CredentialFields["eventType"])}
                    aria-invalid={Boolean(validationErrors.eventType)}
                  >
                    <option value="" disabled>Choose event type</option>
                    {EVENT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <FieldMessage message={validationErrors.eventType} />
                </div>
              </div>
            </section>

            <section className="credentials-form-section" aria-labelledby="credentials-series-heading">
              <header><span>03</span><h2 id="credentials-series-heading">Series identity</h2></header>
              <div className="credentials-form__row credentials-form__row--single">
                <div className="credentials-field">
                  <div className="credentials-style-picker" role="radiogroup" aria-label="Color Palette">
                    {RETROVERSE_STYLE_CATALOG.map((style) => {
                      const colors = [...style.identity.primaryPalette, ...style.identity.secondaryPalette, ...style.identity.accentColors].slice(0, 6);
                      const selected = draft.retroverseStyle === style.id;
                      return <button type="button" role="radio" aria-checked={selected} aria-label={style.paletteName} title={style.paletteName} key={style.id} className={`credentials-palette-card${selected ? " credentials-palette-card--selected" : ""}`} onClick={() => updateField("retroverseStyle", style.id)}>
                        <span className="credentials-palette-card__swatches" aria-hidden="true">{colors.map((color, index) => <span key={`${style.id}-${index}`} style={{ background: color }} />)}</span>
                        <span className="credentials-palette-card__name">{style.paletteName}</span>
                      </button>;
                    })}
                  </div>
                  <p className="credentials-style-note">Supplies the official primary, secondary, accent, tone, and contrast system.</p>
                </div>
              </div>
              <fieldset className="credentials-types">
                <legend>Credential Types</legend>
                <div className="credentials-types__options">
                  {CREDENTIAL_TYPES.map((option) => (
                    <label key={option.value}>
                      <input
                        type="checkbox"
                        checked={draft.credentialTypes.includes(option.value)}
                        onChange={() => toggleCredentialType(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>

            <div className="credentials-form__actions">
              {createMode === "reuse" && canReviewExisting ? (
                <ActionButton type="button" tone="secondary" icon="refresh" onClick={() => void startGeneration(true)}>
                  Regenerate Artwork
                </ActionButton>
              ) : null}
              <ActionButton type="submit" tone="primary">
                {primaryLabel}
              </ActionButton>
            </div>
            {createMode === "reuse" && canReviewExisting ? (
              <p className="credentials-form__context-note">Existing artwork will be retained.</p>
            ) : null}
          </form>
        </main>
      </div>
    );
  }

  function renderGenerating() {
    const completedCount = draft.credentialTypes.filter((type) => generation?.completed[type]).length;
    return (
      <div className="credentials-screen credentials-generating">
        <header className="credentials-topbar">
          <span className="credentials-wordmark">Credentials</span>
          <span />
          <ActionButton tone="quiet" icon="library" disabled>Library</ActionButton>
        </header>
        <main className="credentials-generating__main" aria-live="polite">
          <div className="credentials-generating__heading">
            <h1>Creating your credential family</h1>
            <p>{draft.eventName}</p>
          </div>
          <div className="credentials-generating__list">
            {draft.credentialTypes.map((type) => {
              const pair = generation?.completed[type];
              return (
                <div key={type} className="credentials-generating__row">
                  <div className={`credentials-generating__placeholder${pair ? " credentials-generating__placeholder--complete" : ""}`}>
                    {pair ? <CredentialPreview draft={draft} credentialType={type} face="front" artwork={pair.front} adjustments={draft.finishing[type].front} /> : null}
                  </div>
                  <div className={`credentials-generating__placeholder${pair ? " credentials-generating__placeholder--complete" : ""}`}>
                    {pair ? <CredentialPreview draft={draft} credentialType={type} face="back" artwork={pair.back} adjustments={draft.finishing[type].back} /> : null}
                  </div>
                  <div className="credentials-generating__status">
                    <strong>{credentialTypeLabel(type)}</strong>
                    <span>{pair ? "Complete" : "Creating artwork…"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="credentials-generating__footer">
            <span>{completedCount} of {generation?.total ?? draft.credentialTypes.length} credential types complete</span>
            <ActionButton tone="secondary" onClick={cancelGeneration}>Cancel</ActionButton>
          </div>
        </main>
      </div>
    );
  }

  function renderReview() {
    const retroverseStyle = retroverseStyleById(draft.retroverseStyle);
    return (
      <div className="credentials-screen credentials-review">
        <header className="credentials-topbar credentials-review__topbar">
          <ActionButton tone="quiet" icon="back" onClick={() => { setCreateMode("reuse"); setScreen("create"); }}>Create</ActionButton>
          <div className="credentials-review__identity">
            <strong>{draft.eventName}</strong>
            <span>Review the family</span>
          </div>
          <ActionButton tone="quiet" icon="library" onClick={openLibraryScreen}>Library</ActionButton>
        </header>
        <main className="credentials-review__main">
          <header className="credentials-review__heading">
            <h1>Credential Family</h1>
            <p>The family reads together; each pass keeps its own voice.</p>
          </header>
          <div className="credentials-review__workspace">
            <div className="credentials-review__family">
              {draft.credentialTypes.map((type, index) => {
                const pair = draft.artwork[type];
                const isRegenerating = regenerating.has(type);
                return (
                  <section className="credentials-review__row" key={type} aria-labelledby={`review-${type}-heading`}>
                    <span className="credentials-review__index">{String(index + 1).padStart(2, "0")}</span>
                    <h2 id={`review-${type}-heading`}>{credentialTypeLabel(type)}</h2>
                    {(["front", "back"] as const).map((face) => {
                      const active = selectedFace.type === type && selectedFace.face === face;
                      return (
                        <div className="credentials-review__face" key={face}>
                          <span>{face}</span>
                          <button
                            type="button"
                            className={`credentials-preview-button${active ? " credentials-preview-button--selected" : ""}`}
                            onClick={() => setSelectedFace({ type, face })}
                            onDoubleClick={() => enterFinish({ type, face })}
                            aria-pressed={active}
                            aria-label={`Select ${credentialTypeLabel(type)} ${face}`}
                          >
                            <CredentialPreview
                              draft={draft}
                              credentialType={type}
                              face={face}
                              artwork={pair?.[face] ?? null}
                              adjustments={draft.finishing[type][face]}
                            />
                          </button>
                        </div>
                      );
                    })}
                    <p className="credentials-review__style">{retroverseStyle.paletteName}</p>
                    <div className="credentials-review__row-action">
                      <ActionButton
                        tone="secondary"
                        icon="refresh"
                        disabled={isRegenerating}
                        onClick={() => void regenerateType(type)}
                      >
                        {isRegenerating ? "Regenerating…" : "Regenerate"}
                      </ActionButton>
                    </div>
                    {isRegenerating ? <div className="credentials-review__generation-veil" aria-live="polite"><span>Creating new pair…</span></div> : null}
                  </section>
                );
              })}
            </div>
            <aside className="credentials-review__selection" aria-label="Selected credential face">
              <p className="credentials-review__selection-label">Selected</p>
              <h2>{credentialTypeLabel(selectedFace.type)}<br />{selectedFace.face === "front" ? "Front" : "Back"}</h2>
              <p className="credentials-review__selection-copy">{draft.venue}<br />{formatCredentialDate(draft.date)}</p>
              <div className="credentials-review__selection-actions">
                <ActionButton tone="primary" icon="finish" onClick={() => enterFinish()}>Edit</ActionButton>
                <ActionButton
                  tone={saved ? "success" : "secondary"}
                  icon="save"
                  disabled={saved || saving || regenerating.size > 0 || !allArtworkCurrent}
                  onClick={() => void saveCurrent()}
                >
                  {saved ? "Saved" : saving ? "Saving…" : "Save to Library"}
                </ActionButton>
              </div>
            </aside>
          </div>
        </main>
        {saveError ? <div className="credentials-save-error" role="alert">{saveError}</div> : null}
        <footer className="credentials-review__actions">
          <p>{draft.credentialTypes.length} {draft.credentialTypes.length === 1 ? "type" : "types"} · {draft.credentialTypes.length * 2} faces</p>
          <p>{retroverseStyle.paletteName}</p>
        </footer>
      </div>
    );
  }

  function renderFinishSection(title: string, section: keyof typeof FINISH_SECTIONS) {
    return (
      <section className="finish-section">
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={() => resetFinishSection(section)}>Reset</button>
        </header>
        {FINISH_SECTIONS[section].map((control) => (
          <SliderControl
            key={control}
            control={control}
            value={selectedAdjustments[control]}
            onChange={(value) => updateFinishing(control, value)}
          />
        ))}
      </section>
    );
  }

  function renderFinish() {
    const pair = draft.artwork[selectedFace.type];
    const asset = pair?.[selectedFace.face] ?? null;
    return (
      <div className="credentials-screen credentials-finish">
        <header className="credentials-topbar">
          <ActionButton tone="quiet" icon="back" onClick={() => setScreen("review")}>Review</ActionButton>
          <div className="credentials-finish__title">{credentialTypeLabel(selectedFace.type)} · {selectedFace.face === "front" ? "Front" : "Back"}</div>
          <div className="credentials-topbar__side credentials-topbar__side--end">
            <ActionButton tone="primary" onClick={() => setScreen("complete")}>Finalize</ActionButton>
          </div>
        </header>
        <div className="credentials-finish__workspace">
          <nav className="credentials-finish__filmstrip" aria-label="Credential family faces">
            <span className="credentials-finish__filmstrip-title">Family</span>
            {selectedFaces.map((face) => {
              const active = face.type === selectedFace.type && face.face === selectedFace.face;
              const artwork = draft.artwork[face.type]?.[face.face] ?? null;
              return (
                <button
                  type="button"
                  key={`${face.type}-${face.face}`}
                  className={active ? "credentials-filmstrip-item credentials-filmstrip-item--selected" : "credentials-filmstrip-item"}
                  onClick={() => setSelectedFace(face)}
                  aria-pressed={active}
                >
                  <CredentialPreview
                    draft={draft}
                    credentialType={face.type}
                    face={face.face}
                    artwork={artwork}
                    adjustments={draft.finishing[face.type][face.face]}
                  />
                  <span>{credentialTypeLabel(face.type).replace(" Pass", "")} {face.face === "front" ? "F" : "B"}</span>
                </button>
              );
            })}
          </nav>
          <main className="credentials-finish__stage">
            <div
              className="credentials-finish__canvas-wrap"
              onPointerDown={onFramingPointerDown}
              onPointerMove={onFramingPointerMove}
              onPointerUp={onFramingPointerUp}
              onPointerCancel={onFramingPointerUp}
              onWheel={onFramingWheel}
              title="Drag to reframe. Scroll to change scale."
            >
              <CredentialPreview
                draft={draft}
                credentialType={selectedFace.type}
                face={selectedFace.face}
                artwork={asset}
                adjustments={selectedAdjustments}
                before={showBefore}
                className="credential-canvas--finish"
                authLayout={selectedFace.face === "back" ? authLayouts[selectedFace.type] : undefined}
                onAuthChange={selectedFace.face === "back" ? updateAuthenticationLayout : undefined}
              />
              {showBefore ? <span className="credentials-finish__before-label">Before</span> : null}
            </div>
            <p>Drag to reframe · Scroll to scale · Hold \ to compare before / after</p>
          </main>
          <aside className="credentials-finish__inspector" aria-label="Finishing controls">
            <h1>Finish</h1>
            <section className="finish-section finish-section--authentication">
              <header><h2>Authentication</h2><button type="button" onClick={() => updateAuthenticationLayout({ ...DEFAULT_AUTH_LAYOUT })}>Reset layout</button></header>
              <p className="finish-auth-instruction">Drag the QR and serial directly on the credential. Safe and reserved areas are guides only.</p>
              <label className="finish-auth-toggle"><input type="checkbox" checked={authLayouts[selectedFace.type].safe} onChange={(e) => updateAuthenticationLayout({ ...authLayouts[selectedFace.type], safe: e.target.checked })} /> Safe Area</label>
              <label className="finish-auth-toggle"><input type="checkbox" checked={authLayouts[selectedFace.type].reserved} onChange={(e) => updateAuthenticationLayout({ ...authLayouts[selectedFace.type], reserved: e.target.checked })} /> Reserved Zone</label>
            </section>
            {renderFinishSection("Light", "image")}
            {renderFinishSection("Color", "color")}
            {renderFinishSection("Frame", "framing")}
            <section className={`finish-section finish-section--advanced${advancedOpen ? " finish-section--open" : ""}`}>
              <header>
                <button
                  type="button"
                  className="finish-section__disclosure"
                  aria-expanded={advancedOpen}
                  onClick={() => {
                    const next = !advancedOpen;
                    setAdvancedOpen(next);
                    window.sessionStorage.setItem("bobos.credentials.v1.advanced-open", next ? "1" : "0");
                  }}
                >
                  <span aria-hidden="true">{advancedOpen ? "▾" : "▸"}</span>
                  Advanced
                </button>
                <button type="button" onClick={() => resetFinishSection("advanced")}>Reset</button>
              </header>
              {advancedOpen ? FINISH_SECTIONS.advanced.map((control) => (
                <SliderControl
                  key={control}
                  control={control}
                  value={selectedAdjustments[control]}
                  onChange={(value) => updateFinishing(control, value)}
                />
              )) : null}
            </section>
          </aside>
        </div>
      </div>
    );
  }

  function renderComplete() {
    type ProductionCard = { type: CredentialTypeId; serial: string };

    async function allocateProductionCards(proof: boolean): Promise<ProductionCard[] | null> {
      const record = draft.id && draft.credentialTypes.every((type) => draft.serials[type]) ? recordFromDraft(draft) : await saveCurrent();
      if (!record) return null;
      const quantities = Object.fromEntries(draft.credentialTypes.map((type) => [type, productionIncluded[type] ? (proof ? 1 : productionQuantities[type]) : 0])) as Partial<Record<CredentialTypeId, number>>;
      const response = await fetch("/api/bobos/credentials/serials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordId: record.id, eventName: record.eventName, quantities, startingSerial, productionExisting: proof ? undefined : productionSerials }) });
      const result = await response.json() as { productionSerials?: Partial<Record<CredentialTypeId, string[]>>; error?: string };
      if (!response.ok || !result.productionSerials) throw new Error(result.error || "Production serial allocation failed.");
      if (!proof) setProductionSerials(result.productionSerials);
      return draft.credentialTypes.flatMap((type) => (result.productionSerials?.[type] ?? []).slice(0, quantities[type] ?? 0).map((serial) => ({ type, serial })));
    }

    async function qrSvgPath(serial: string): Promise<string> {
      const svg = await (await fetch(`/api/bobos/credentials/qr/${encodeURIComponent(serial)}`)).text();
      const match = /<path stroke="#000000" d="([^"]+)"/.exec(svg);
      if (!match?.[1]) throw new Error("QR vector data is unavailable.");
      return match[1];
    }

    async function finishedArtworkBytes(
      source: string,
      adjustments: FinishingAdjustments,
    ): Promise<Uint8Array> {
      const response = await fetch(source);
      if (!response.ok) throw new Error("Credential artwork could not be loaded for print.");
      const sourceBlob = await response.blob();
      const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
      if (Object.keys(DEFAULT_FINISHING).every((key) => adjustments[key as keyof FinishingAdjustments] === DEFAULT_FINISHING[key as keyof FinishingAdjustments])) {
        return sourceBytes;
      }

      const sourceUrl = URL.createObjectURL(sourceBlob);
      const sourceImage = new Image();
      sourceImage.src = sourceUrl;
      try {
        await sourceImage.decode();
      } catch {
        URL.revokeObjectURL(sourceUrl);
        throw new Error("Credential artwork could not be decoded for print.");
      }
      const canvas = document.createElement("canvas");
      canvas.width = sourceImage.naturalWidth;
      canvas.height = sourceImage.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Credential finishing is unavailable for print.");

      const scale = Math.max(100, adjustments.scale) / 100;
      const maxTranslation = ((scale - 1) / (2 * scale)) * 100;
      const x = (adjustments.x / 100) * maxTranslation;
      const y = (adjustments.y / 100) * maxTranslation;
      const exposure = 2 ** adjustments.exposure;
      const brightness = Math.max(0.15, exposure * (1 + adjustments.brightness / 180));
      const contrast = Math.max(0, 1 + adjustments.contrast / 100 + adjustments.sharpen / 500);
      const saturation = Math.max(0, (1 + adjustments.saturation / 100) * (1 + adjustments.vibrance / 180));
      context.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${adjustments.hue}deg)`;
      context.translate(canvas.width / 2 + (x / 100) * canvas.width * scale, canvas.height / 2 + (y / 100) * canvas.height * scale);
      context.scale(scale, scale);
      context.drawImage(sourceImage, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      URL.revokeObjectURL(sourceUrl);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.filter = "none";

      const temperatureColor = adjustments.temperature >= 0 ? "255, 151, 61" : "70, 139, 255";
      const tintColor = adjustments.tint >= 0 ? "221, 76, 178" : "52, 184, 112";
      context.globalCompositeOperation = "color";
      context.fillStyle = `rgba(${temperatureColor}, ${Math.abs(adjustments.temperature) / 360})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = `rgba(${tintColor}, ${Math.abs(adjustments.tint) / 420})`;
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (adjustments.grain > 0) {
        context.globalCompositeOperation = "soft-light";
        context.globalAlpha = Math.min(0.5, adjustments.grain / 135);
        context.fillStyle = "#fff";
        for (let grainY = 1; grainY < canvas.height; grainY += 7) {
          for (let grainX = (grainY * 13) % 7; grainX < canvas.width; grainX += 11) {
            context.fillRect(grainX, grainY, 1, 1);
          }
        }
      }
      context.globalAlpha = Math.min(1, adjustments.fade / 140);
      context.globalCompositeOperation = "screen";
      context.fillStyle = "#d8d0c2";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";

      const output = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Finished artwork could not be rendered.")), "image/jpeg", 0.96));
      return new Uint8Array(await output.arrayBuffer());
    }

    async function buildCredentialImageBlob(format: "png" | "jpeg"): Promise<Blob> {
      const { type, face } = selectedFace;
      const asset = draft.artwork[type]?.[face];
      if (!asset) throw new Error("The selected credential artwork is unavailable.");
      const bytes = await finishedArtworkBytes(asset.source, draft.finishing[type][face]);
      const sourceBlob = new Blob([bytes.buffer as ArrayBuffer], { type: bytes[0] === 0xff ? "image/jpeg" : "image/png" });
      const sourceUrl = URL.createObjectURL(sourceBlob);
      const sourceImage = new Image();
      sourceImage.src = sourceUrl;
      try { await sourceImage.decode(); } catch { URL.revokeObjectURL(sourceUrl); throw new Error("The selected credential artwork could not be decoded."); }

      const width = 1350;
      const height = 2100;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(sourceUrl); throw new Error("Credential image export is unavailable."); }
      if (format === "jpeg") { context.fillStyle = "#fff"; context.fillRect(0, 0, width, height); }
      const scale = Math.max(width / sourceImage.naturalWidth, height / sourceImage.naturalHeight);
      const drawWidth = sourceImage.naturalWidth * scale;
      const drawHeight = sourceImage.naturalHeight * scale;
      context.drawImage(sourceImage, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      URL.revokeObjectURL(sourceUrl);

      if (face === "back") {
        const layout = authLayouts[type];
        const qrOuterSize = width * layout.qrSize / 100;
        const qrOuterX = width * layout.qrX / 100 - qrOuterSize / 2;
        const qrOuterY = height * layout.qrY / 100 - qrOuterSize / 2;
    const qrResponse = await fetch(`/api/bobos/credentials/qr/${encodeURIComponent(draft.serials[type] ?? "")}`);
    if (!qrResponse.ok) throw new Error("The selected credential QR could not be rendered.");
    const qrMarkup = await qrResponse.text();
    const qrSvg = qrMarkup;
        const qrImage = new Image();
        qrImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`;
        try { await qrImage.decode(); } catch { throw new Error("The selected credential QR could not be rendered."); }
        const qrInset = qrOuterSize * 3 / 37;
        const qrImageSize = qrOuterSize * 31 / 37;
        context.fillStyle = "#fff";
        context.fillRect(qrOuterX, qrOuterY, qrOuterSize, qrOuterSize);
        context.drawImage(qrImage, qrOuterX + qrInset, qrOuterY + qrInset, qrImageSize, qrImageSize);

        const serial = draft.serials[type] ?? "";
        const fontSize = 9 * (width / (2.25 * 72)) * (layout.serialScale / 100);
        context.fillStyle = "#171311";
        context.font = `800 ${fontSize}px "Courier New", monospace`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(serial, width * layout.serialX / 100, height * layout.serialY / 100);
      }

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Credential image export failed.")), `image/${format}`, format === "jpeg" ? 0.98 : undefined);
      });
    }

    async function runImageExport(format: "png" | "jpeg") {
      if (productionBusy || imageExportBusy) return;
      setImageExportBusy(format);
      try {
        const blob = await buildCredentialImageBlob(format);
        const type = credentialTypeLabel(selectedFace.type).replace(/\s+/g, "-").toLowerCase();
        const face = selectedFace.face;
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `${(draft.eventName || "credential").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-${type}-${face}.${format}`;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        window.setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 60_000);
        showToast({ message: `${credentialTypeLabel(selectedFace.type)} ${face} exported as ${format.toUpperCase()}.` });
      } catch (error) {
        showToast({ message: error instanceof Error ? error.message : "Credential image export failed." });
      } finally { setImageExportBusy(null); }
    }

    async function buildProductionPdf(proof: boolean): Promise<Blob | null> {
      try {
        const cards = await allocateProductionCards(proof); if (!cards?.length) return null;
        const { Duplex, PDFDocument, PrintScaling, StandardFonts, rgb } = await import("pdf-lib");
        const pdf = await PDFDocument.create();
        const viewerPreferences = pdf.catalog.getOrCreateViewerPreferences();
        viewerPreferences.setPrintScaling(PrintScaling.None);
        viewerPreferences.setDuplex(Duplex.DuplexFlipLongEdge);
        const font = await pdf.embedFont(StandardFonts.CourierBold);
        const pageWidth = BOBOS_PRINT_SHEET_WIDTH_IN * 72; const pageHeight = BOBOS_PRINT_SHEET_HEIGHT_IN * 72; const trimWidth = 2.25 * 72; const trimHeight = 3.5 * 72;
        const { cols, rows, perSheet } = DESIGN_BUILDER_PRINT_LAYOUTS["16up"]; const cellWidth = trimWidth; const cellHeight = trimHeight;
        const gridWidth = cols * cellWidth; const gridHeight = rows * cellHeight;
        const gridX = (pageWidth - gridWidth) / 2; const gridY = (pageHeight - gridHeight) / 2;
        const art = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>();
        for (const type of draft.credentialTypes) for (const face of ["front", "back"] as const) {
          const asset = draft.artwork[type]?.[face]; if (!asset) continue;
          try {
            const bytes = await finishedArtworkBytes(asset.source, draft.finishing[type][face]);
            art.set(`${type}-${face}`, bytes[0] === 0xff ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes));
          } catch (error) {
            throw new Error(`${credentialTypeLabel(type)} ${face} print artwork failed: ${error instanceof Error ? error.message : "image decode failed"}`);
          }
        }
        function cropMarks(page: ReturnType<typeof pdf.addPage>) {
          const color = rgb(.45, .45, .45); const mark = 1.6; const top = pageHeight - gridY; const bottom = gridY; const right = gridX + gridWidth;
          for (let column = 0; column <= cols; column += 1) {
            const x = gridX + column * cellWidth;
            page.drawLine({ start:{x:x-mark,y:top}, end:{x:x+mark,y:top}, thickness:.35, color });
            page.drawLine({ start:{x:x-mark,y:bottom}, end:{x:x+mark,y:bottom}, thickness:.35, color });
          }
          for (let row = 0; row <= rows; row += 1) {
            const y = gridY + row * cellHeight;
            page.drawLine({ start:{x:gridX,y:y-mark}, end:{x:gridX,y:y+mark}, thickness:.35, color });
            page.drawLine({ start:{x:right,y:y-mark}, end:{x:right,y:y+mark}, thickness:.35, color });
          }
        }
        const sheetCount = Math.ceil(cards.length / perSheet);
        for (let sheet = 0; sheet < sheetCount; sheet++) {
          const slice = cards.slice(sheet * perSheet, (sheet + 1) * perSheet);
          for (const face of ["front", "back"] as const) {
            const page = pdf.addPage([pageWidth, pageHeight]);
            cropMarks(page);
            for (let index = 0; index < slice.length; index++) {
              const card = slice[index]!; const row = Math.floor(index / cols); const sourceCol = index % cols; const col = face === "back" ? cols - 1 - sourceCol : sourceCol;
              const cellX = gridX + col * cellWidth; const cellY = pageHeight - gridY - (row + 1) * cellHeight; const trimX = cellX; const trimY = cellY;
              const image = art.get(`${card.type}-${face}`); if (!image) continue;
              page.drawImage(image, { x: cellX, y: cellY, width: cellWidth, height: cellHeight });
              if (face === "back") {
                const layout = authLayouts[card.type]; const qrOuterSize = trimWidth * layout.qrSize / 100; const qrOuterX = trimX + trimWidth * layout.qrX / 100 - qrOuterSize / 2; const qrOuterY = trimY + trimHeight * (1 - layout.qrY / 100) - qrOuterSize / 2; const qrInset = qrOuterSize * 3 / 37; const qrImageSize = qrOuterSize * 31 / 37;
                let qrPath: string;
                try { qrPath = await qrSvgPath(card.serial); }
                catch (error) { throw new Error(`${card.serial} QR failed: ${error instanceof Error ? error.message : "QR vector failed"}`); }
                // Keep only the QR's required quiet zone opaque; artwork outside this square remains untouched.
                page.drawRectangle({ x:qrOuterX, y:qrOuterY, width:qrOuterSize, height:qrOuterSize, color:rgb(1,1,1) });
                page.drawSvgPath(qrPath, { x:qrOuterX+qrInset, y:qrOuterY+qrOuterSize-qrInset, scale:qrImageSize/31, borderColor:rgb(0,0,0), borderWidth:1 });
                const size = 9 * layout.serialScale / 100; const textWidth = font.widthOfTextAtSize(card.serial, size); const serialX = trimX + trimWidth * layout.serialX / 100 - textWidth / 2; const serialY = trimY + trimHeight * (1 - layout.serialY / 100) - size / 3;
                page.drawText(card.serial,{x:serialX,y:serialY,size,font,color:rgb(.08,.06,.05)});
              }
            }
          }
        }
        const pdfBytes = await pdf.save(); return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      } catch (error) { showToast({ message: error instanceof Error ? error.message : "The production PDF could not be built." }); return null; }
    }

    function downloadPdf(blob: Blob, suffix: string) {
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${(draft.eventName || "credential-family").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()}-${suffix}.pdf`; link.hidden = true; document.body.appendChild(link); link.click(); window.setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 60_000);
    }

    function preparePrintWindow(): Window | null {
      const printWindow = window.open("", "retroverse-credentials-print");
      if (!printWindow) return null;
      printWindow.document.open();
      printWindow.document.write("<!doctype html><title>Preparing credential print…</title><body style=\"margin:0;display:grid;min-height:100vh;place-items:center;background:#171719;color:#f4f0e8;font:600 18px system-ui,sans-serif\">Preparing print-ready credentials…</body>");
      printWindow.document.close();
      return printWindow;
    }

    function printPdf(blob: Blob, printWindow: Window | null): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!printWindow || printWindow.closed) { reject(new Error("Allow the Credentials print window, then try again.")); return; }
        const url = URL.createObjectURL(blob);
        let settled = false;
        let readyTimer = 0;
        let readyChecks = 0;
        const finishWithError = (message: string) => {
          if (settled) return;
          settled = true;
          window.clearInterval(readyTimer);
          printWindow.close();
          URL.revokeObjectURL(url);
          reject(new Error(message));
        };
        const openPrintDialog = () => {
          if (settled || printWindow.closed) return;
          settled = true;
          window.clearInterval(readyTimer);
          try { printWindow.focus(); printWindow.print(); resolve(); }
          catch { printWindow.close(); URL.revokeObjectURL(url); reject(new Error("The print dialog is unavailable.")); }
        };
        try {
          const link = document.createElement("a");
          link.href = url;
          link.target = "retroverse-credentials-print";
          document.body.appendChild(link);
          link.click();
          link.remove();
        } catch { finishWithError("The print-ready PDF could not be opened."); return; }
        readyTimer = window.setInterval(() => {
          readyChecks += 1;
          if (printWindow.closed) { finishWithError("The print window was closed."); return; }
          try {
            if (printWindow.location.href === url) { window.setTimeout(openPrintDialog, 750); window.clearInterval(readyTimer); return; }
          } catch { window.setTimeout(openPrintDialog, 750); window.clearInterval(readyTimer); return; }
          if (readyChecks >= 100) finishWithError("The print-ready PDF did not open.");
        }, 100);
        window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
      });
    }

    async function exportProductionImages() {
      if (productionBusy) return;
      setProductionBusy("export");
      try {
        const cards = await allocateProductionCards(false); if (!cards?.length) return;
        const pageWidth = 3300; const pageHeight = 5100; const cardWidth = 675; const cardHeight = 1050; const cols = 4; const rows = 4;
        const image = async (source: string, adjustments: FinishingAdjustments) => { const bytes = await finishedArtworkBytes(source, adjustments); const blob = new Blob([bytes.buffer as ArrayBuffer], { type: bytes[0] === 0xff ? "image/jpeg" : "image/png" }); const url = URL.createObjectURL(blob); const item = new Image(); item.src = url; await item.decode(); URL.revokeObjectURL(url); return item; };
        const imageFromSvg = async (svg: string) => { const item = new Image(); item.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await item.decode(); return item; };
        const pages = Math.ceil(cards.length / (cols * rows));
        for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) for (const face of ["front", "back"] as const) {
          const canvas = document.createElement("canvas"); canvas.width = pageWidth; canvas.height = pageHeight; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Production image export is unavailable."); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pageWidth, pageHeight);
          const slice = cards.slice(pageIndex * cols * rows, (pageIndex + 1) * cols * rows);
          for (let index = 0; index < slice.length; index += 1) {
            const card = slice[index]!; const asset = draft.artwork[card.type]?.[face]; if (!asset) continue;
            const artwork = await image(asset.source, draft.finishing[card.type][face]);
            const sourceCol = index % cols; const col = face === "back" ? cols - 1 - sourceCol : sourceCol;
            const x = Math.floor((pageWidth - cols * cardWidth) / 2) + col * cardWidth; const y = Math.floor((pageHeight - rows * cardHeight) / 2) + Math.floor(index / cols) * cardHeight;
            ctx.drawImage(artwork, x, y, cardWidth, cardHeight);
            if (face === "back") {
              const layout = authLayouts[card.type]; const qrOuterSize = cardWidth * layout.qrSize / 100; const qrOuterX = x + cardWidth * layout.qrX / 100 - qrOuterSize / 2; const qrOuterY = y + cardHeight * layout.qrY / 100 - qrOuterSize / 2;
              const qrResponse = await fetch(`/api/bobos/credentials/qr/${encodeURIComponent(card.serial)}`); if (!qrResponse.ok) throw new Error(`${card.serial} QR failed.`); const qrImage = await imageFromSvg(await qrResponse.text());
              ctx.fillStyle = "#fff"; ctx.fillRect(qrOuterX, qrOuterY, qrOuterSize, qrOuterSize); const qrInset = qrOuterSize * 3 / 37; ctx.drawImage(qrImage, qrOuterX + qrInset, qrOuterY + qrInset, qrOuterSize * 31 / 37, qrOuterSize * 31 / 37);
              ctx.fillStyle = "#171311"; ctx.font = `800 ${9 * (pageWidth / (11 * 72)) * (layout.serialScale / 100)}px Courier New`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(card.serial, x + cardWidth * layout.serialX / 100, y + cardHeight * layout.serialY / 100);
            }
          }
          await new Promise<void>((resolve, reject) => canvas.toBlob((blob) => { if (!blob) return reject(new Error("Production image export failed.")); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${(draft.eventName || "credential-family").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${face === "front" ? "Front" : "Back"}-${String(pageIndex + 1).padStart(2, "0")}.png`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); resolve(); }, "image/png"));
        }
        showToast({ message: "Production images exported." });
      } catch (error) { showToast({ message: error instanceof Error ? error.message : "Production image export failed." }); }
      finally { setProductionBusy(null); }
    }

    async function runProductionAction(action: "proof" | "export" | "print") {
      if (productionBusy) return; const printWindow = action === "export" ? null : preparePrintWindow(); setProductionBusy(action);
      try { const blob = await buildProductionPdf(action === "proof"); if (!blob) { printWindow?.close(); return; } if (action === "export") { downloadPdf(blob,"production"); showToast({message:"Production PDF exported."}); } else { await printPdf(blob, printWindow); showToast({message:action === "proof" ? "Test sheet opened in Print." : "Production run opened in Print."}); } }
      catch (error) { printWindow?.close(); showToast({ message: error instanceof Error ? error.message : "The production PDF could not be printed." }); }
      finally { setProductionBusy(null); }
    }
    const activeTypes = draft.credentialTypes.filter((type) => productionIncluded[type]);
    const totalCards = activeTypes.reduce((sum, type) => sum + productionQuantities[type], 0);
    const estimatedSheets = Math.ceil(totalCards / 12);
    const estimatedMinutes = estimatedSheets * 2;
    return (
      <div className="credentials-screen credentials-production-sheet">
        <header className="credentials-topbar">
          <ActionButton tone="quiet" icon="back" onClick={() => setScreen("review")}>Back</ActionButton>
          <div className="credentials-finish__title">Production Sheet</div>
          <ActionButton tone="quiet" onClick={openLibraryScreen}>Library</ActionButton>
        </header>
        <main className="credentials-production-sheet__main">
          <header className="credentials-production-sheet__heading">
            <div><p>Production planning</p><h1>{draft.eventName}</h1></div>
            <p>Fronts and backs are paired for long-edge duplex printing.</p>
          </header>
          <label className="credentials-production-starting-serial">Starting Serial
            <input value={startingSerial} onChange={(event) => { setStartingSerial(event.target.value.toUpperCase()); setProductionSerials({}); }} placeholder="RVSN000485" spellCheck={false} />
          </label>
          <div className="credentials-production-sheet__grid">
            <div className="credentials-production-sheet__families">
              {draft.credentialTypes.map((type) => (
                <section className="credentials-production-row" key={type}>
                  <div className="credentials-production-row__title">
                    <h2>{credentialTypeLabel(type)}</h2>
                    <label>
                      <input type="checkbox" checked={productionIncluded[type]} onChange={(event) => setProductionIncluded((current) => ({ ...current, [type]: event.target.checked }))} />
                      Include in Print
                    </label>
                  </div>
                  {(["front", "back"] as const).map((face) => (
                    <div className="credentials-production-row__face" key={face}>
                      <span>{face}</span>
                      <CredentialPreview draft={draft} credentialType={type} face={face} artwork={draft.artwork[type]?.[face] ?? null} adjustments={draft.finishing[type][face]} authLayout={face === "back" ? authLayouts[type] : undefined} />
                    </div>
                  ))}
                  <div className="credentials-production-row__quantity">
                    <span>Copies</span>
                    <div>
                      <button type="button" aria-label={`Decrease ${credentialTypeLabel(type)} copies`} onClick={() => setProductionQuantities((current) => ({ ...current, [type]: Math.max(0, current[type] - 1) }))}>−</button>
                      <strong>{productionQuantities[type]}</strong>
                      <button type="button" aria-label={`Increase ${credentialTypeLabel(type)} copies`} onClick={() => setProductionQuantities((current) => ({ ...current, [type]: Math.min(500, current[type] + 1) }))}>+</button>
                    </div>
                  </div>
                </section>
              ))}
            </div>
            <aside className="credentials-production-summary">
              <h2>Production Summary</h2>
              {draft.credentialTypes.map((type) => <p key={type}><span>{credentialTypeLabel(type)}</span><strong>{productionIncluded[type] ? productionQuantities[type] : 0}</strong></p>)}
              <hr />
              <p><span>Total Cards</span><strong>{totalCards}</strong></p>
              <p><span>Estimated Sheets</span><strong>{estimatedSheets}</strong></p>
              <p><span>Estimated Print Time</span><strong>{estimatedMinutes} min</strong></p>
              <div className="credentials-production-summary__actions">
                <ActionButton tone="secondary" disabled={Boolean(productionBusy)} onClick={() => void runProductionAction("proof")}>{productionBusy === "proof" ? "Building Test Sheet…" : "Print One Test Sheet"}</ActionButton>
                <ActionButton tone="quiet" icon="back" disabled={Boolean(productionBusy)} onClick={() => setScreen("review")}>Back</ActionButton>
                <ActionButton tone="secondary" disabled={Boolean(productionBusy) || Boolean(imageExportBusy) || totalCards === 0} onClick={() => void runProductionAction("export")}>{productionBusy === "export" ? "Building PDF…" : "Export PDF"}</ActionButton>
                <ActionButton tone="secondary" disabled={Boolean(productionBusy) || totalCards === 0} onClick={() => void exportProductionImages()}>{productionBusy === "export" ? "Exporting Images…" : "Export Production Images"}</ActionButton>
                <ActionButton tone="secondary" disabled={Boolean(productionBusy) || Boolean(imageExportBusy)} onClick={() => void runImageExport("png")}>{imageExportBusy === "png" ? "Exporting PNG…" : "Export PNG"}</ActionButton>
                <ActionButton tone="secondary" disabled={Boolean(productionBusy) || Boolean(imageExportBusy)} onClick={() => void runImageExport("jpeg")}>{imageExportBusy === "jpeg" ? "Exporting JPEG…" : "Export JPEG"}</ActionButton>
                <ActionButton tone="primary" disabled={Boolean(productionBusy) || totalCards === 0} onClick={() => void runProductionAction("print")}>{productionBusy === "print" ? "Building Production Run…" : "Print Production Run"}</ActionButton>
                <ActionButton tone="quiet" disabled={Boolean(productionBusy)} onClick={openLibraryScreen}>Done</ActionButton>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  function renderLibrary() {
    const featuredRecord = filteredLibrary[0] ?? null;
    return (
      <div className="credentials-screen credentials-library">
        <header className="credentials-topbar">
          <ActionButton tone="quiet" icon="back" onClick={() => setScreen(returnScreen)}>Back to Credential</ActionButton>
          <h1>Library</h1>
          <ActionButton tone="primary" onClick={() => requestUnsavedAction("new")}>New</ActionButton>
        </header>
        <main className="credentials-library__main">
          <header className="credentials-library__heading">
            <div>
              <h2>The work</h2>
              <p>Newest first. Local by design.</p>
            </div>
            <label className="credentials-search">
              <AppIcon name="search" />
              <span className="sr-only">Search Library</span>
              <input
                type="search"
                placeholder="Search Library"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </header>
          {filteredLibrary.length === 0 ? (
            <div className="credentials-library__empty">
              <h2>{library.length === 0 ? "No saved credentials yet" : "No matching credentials"}</h2>
              <p>{library.length === 0 ? "Your saved credentials will appear here." : "Try a different event name, venue, or date."}</p>
              {library.length === 0 ? <ActionButton tone="primary" onClick={() => setScreen(returnScreen)}>Back to Credential</ActionButton> : null}
            </div>
          ) : (
            <div className="credentials-library__collection">
              {featuredRecord ? (() => {
                const firstType = featuredRecord.credentialTypes[0] ?? "event";
                const artwork = featuredRecord.artwork[firstType]?.front ?? null;
                const recordDraft = draftFromRecord(featuredRecord);
                const style = retroverseStyleById(featuredRecord.retroverseStyle);
                return (
                  <section className="credentials-library-feature" aria-label={`Newest credential: ${featuredRecord.eventName}`}>
                    <button type="button" className="credentials-library-feature__preview" onClick={() => setSelectedLibraryId(featuredRecord.id)}>
                      <CredentialPreview
                        draft={recordDraft}
                        credentialType={firstType}
                        face="front"
                        artwork={artwork}
                        adjustments={recordDraft.finishing[firstType].front}
                      />
                    </button>
                    <div className="credentials-library-feature__details">
                      <div>
                        <h3>{featuredRecord.eventName}</h3>
                        <p>{featuredRecord.venue}<br />{formatCredentialDate(featuredRecord.date)}</p>
                      </div>
                      <p className="credentials-library-feature__style">{style.paletteName}</p>
                      <div className="credentials-library-feature__actions">
                        <ActionButton tone="primary" onClick={() => requestUnsavedAction({ kind: "open", record: featuredRecord })}>Open</ActionButton>
                        <div>
                          <ActionButton tone="secondary" icon="copy" onClick={() => requestUnsavedAction({ kind: "duplicate", record: featuredRecord })}>Duplicate</ActionButton>
                          <ActionButton tone="danger" icon="delete" onClick={() => setDeleteLibraryId(featuredRecord.id)}>Delete</ActionButton>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })() : null}
              <div className="credentials-library__grid">
              {filteredLibrary.slice(1).map((record) => {
                const firstType = record.credentialTypes[0] ?? "event";
                const artwork = record.artwork[firstType]?.front ?? null;
                const recordDraft = draftFromRecord(record);
                return (
                  <button
                    type="button"
                    className="credentials-library-card"
                    key={record.id}
                    onClick={() => setSelectedLibraryId(record.id)}
                    onDoubleClick={() => requestUnsavedAction({ kind: "open", record })}
                  >
                    <CredentialPreview
                      draft={recordDraft}
                      credentialType={firstType}
                      face="front"
                      artwork={artwork}
                      adjustments={recordDraft.finishing[firstType].front}
                    />
                    <span className="credentials-library-card__meta">
                      <strong>{record.eventName}</strong>
                      <span>{record.venue}</span>
                      <span>{formatCredentialDate(record.date)}</span>
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (!ready) {
    return <div className="credentials-root credentials-root--loading"><span>Credentials</span></div>;
  }

  return (
    <div className="credentials-root">
      {screen === "create" ? renderCreate() : null}
      {screen === "generating" ? renderGenerating() : null}
      {screen === "review" ? renderReview() : null}
      {screen === "finish" ? renderFinish() : null}
      {screen === "complete" ? renderComplete() : null}
      {screen === "library" ? renderLibrary() : null}

      {selectedLibraryRecord ? (
        <Modal title={selectedLibraryRecord.eventName} onClose={() => setSelectedLibraryId(null)}>
          <div className="credentials-library-dialog__content">
            <div className="credentials-library-dialog__previews">
              {(["front", "back"] as const).map((face) => {
                const firstType = selectedLibraryRecord.credentialTypes[0] ?? "event";
                const recordDraft = draftFromRecord(selectedLibraryRecord);
                return (
                  <div key={face}>
                    <span>{face}</span>
                    <CredentialPreview
                      draft={recordDraft}
                      credentialType={firstType}
                      face={face}
                      artwork={selectedLibraryRecord.artwork[firstType]?.[face] ?? null}
                      adjustments={recordDraft.finishing[firstType][face]}
                    />
                  </div>
                );
              })}
            </div>
            <div className="credentials-library-dialog__metadata">
              <p>{selectedLibraryRecord.venue}</p>
              <p>{formatCredentialDate(selectedLibraryRecord.date)}</p>
            </div>
          </div>
          <footer className="credentials-modal__actions credentials-modal__actions--spread">
            <ActionButton tone="danger" icon="delete" onClick={() => setDeleteLibraryId(selectedLibraryRecord.id)}>Delete</ActionButton>
            <div>
              <ActionButton tone="secondary" icon="copy" onClick={() => requestUnsavedAction({ kind: "duplicate", record: selectedLibraryRecord })}>Duplicate</ActionButton>
              <ActionButton tone="primary" onClick={() => requestUnsavedAction({ kind: "open", record: selectedLibraryRecord })}>Open</ActionButton>
            </div>
          </footer>
        </Modal>
      ) : null}

      {deleteLibraryRecord ? (
        <Modal title={`Delete “${deleteLibraryRecord.eventName}”?`} onClose={() => setDeleteLibraryId(null)} labelledBy="delete-credential-title">
          <p className="credentials-modal__copy">This removes the credential and its artwork from the Library.</p>
          <footer className="credentials-modal__actions">
            <ActionButton tone="secondary" autoFocus onClick={() => setDeleteLibraryId(null)}>Cancel</ActionButton>
            <ActionButton tone="danger" icon="delete" onClick={() => deleteRecord(deleteLibraryRecord)}>Delete</ActionButton>
          </footer>
        </Modal>
      ) : null}

      {unsavedAction ? (
        <Modal title="Save this credential before closing?" onClose={() => setUnsavedAction(null)} labelledBy="unsaved-credential-title">
          <p className="credentials-modal__copy">Your generated artwork or recent changes have not been saved to the Library.</p>
          <footer className="credentials-modal__actions credentials-modal__actions--spread">
            <ActionButton tone="danger" onClick={() => completeUnsavedAction(unsavedAction)}>Discard Changes</ActionButton>
            <div>
              <ActionButton tone="secondary" autoFocus onClick={() => setUnsavedAction(null)}>Cancel</ActionButton>
              <ActionButton
                tone="primary"
                icon="save"
                disabled={saving}
                onClick={async () => {
                  const savedRecord = await saveCurrent();
                  if (savedRecord) completeUnsavedAction(unsavedAction);
                }}
              >
                {saving ? "Saving…" : "Save to Library"}
              </ActionButton>
            </div>
          </footer>
        </Modal>
      ) : null}

      {toast ? (
        <div className="credentials-toast" role="status">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction ? <button type="button" onClick={toast.onAction}>{toast.actionLabel}</button> : null}
        </div>
      ) : null}
    </div>
  );
}
