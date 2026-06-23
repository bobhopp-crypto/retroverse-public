"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  BrowserPlusColumn,
  BrowserPlusColumnId,
  BrowserPlusFolderNode,
  BrowserPlusMode,
  BrowserPlusModel,
  BrowserPlusRow,
  BrowserPlusSavedFilterId,
} from "@/lib/ops/browser-plus/types";
import type { BrowserPlusExecutionActionId } from "@/lib/ops/browser-plus/execution-adapters";

type Props = {
  model: BrowserPlusModel;
  onReload: () => Promise<void>;
};

type BrowserPlusResponse = {
  ok?: boolean;
  error?: string;
  model?: BrowserPlusModel;
};

type BrowserPlusExecutionAction = {
  id: BrowserPlusExecutionActionId;
  label: string;
  supportsSingle: boolean;
  supportsBatch: boolean;
  requiresApproval: boolean;
  writeOperation: boolean;
  implementationStatus: "ready" | "adapter-only" | "blocked";
};

type BrowserPlusExecutionJob = {
  id: string;
  actionId: BrowserPlusExecutionActionId;
  status: "queued" | "running" | "complete" | "failed";
  step: string;
  current: number;
  total: number;
  results: Array<{ rvtr: string | null; status: "complete" | "skipped" | "failed"; message: string }>;
};

type BrowserPlusExecutionResponse = {
  ok?: boolean;
  error?: string;
  actions?: BrowserPlusExecutionAction[];
  job?: BrowserPlusExecutionJob;
};

type PlannedWorkAction = "Find Cover" | "Resolve RVTR" | "Generate Package" | "Generate Deck" | "Publish";

type PlannedWorkItem = {
  id: string;
  createdAt: string;
  action: PlannedWorkAction;
  count: number;
  rows: Array<Pick<BrowserPlusRow, "id" | "artist" | "title" | "rvtr" | "filePath" | "workStatus">>;
};

type ContextMenuState = {
  x: number;
  y: number;
  rowId: string;
} | null;

type BrowserPlusActiveLocation = {
  activeFolder: string | null;
  activeFilter: BrowserPlusSavedFilterId | null;
};

type BrowserPlusPersistedContext = {
  mode?: BrowserPlusMode;
  query?: string;
  sortColumn?: BrowserPlusColumnId;
  sortDirection?: "asc" | "desc";
  focusedRowId?: string | null;
  selectedRowIds?: string[];
  scrollTop?: number;
  columnOrder?: BrowserPlusColumnId[];
  columnWidths?: Partial<Record<BrowserPlusColumnId, number>>;
  columnVisibility?: Partial<Record<BrowserPlusColumnId, boolean>>;
};

const ROW_HEIGHT = 27;
const GRID_HEIGHT = 610;
const OVERSCAN = 12;

const SAVED_FILTERS: Array<{ id: BrowserPlusSavedFilterId; label: string }> = [
  { id: "missing-rvtr", label: "Missing RVTR" },
  { id: "missing-cover", label: "Missing Cover" },
  { id: "missing-file", label: "Missing File" },
  { id: "missing-thumbnail", label: "Active Missing Thumbnail" },
  { id: "thumbnail-present", label: "Thumbnail Present" },
  { id: "thumbnail-only", label: "Thumbnail Only" },
  { id: "thumbnail-cover", label: "Thumbnail + Cover" },
  { id: "patron-ready", label: "Visual Patron Ready" },
  { id: "missing-package", label: "Raw Missing Package" },
  { id: "missing-deck", label: "Missing Deck" },
  { id: "needs-review", label: "Needs Review" },
  { id: "cards-ready", label: "Cards Ready" },
  { id: "published", label: "Published" },
  { id: "complete", label: "Complete" },
  { id: "pk", label: "PK" },
  { id: "dk", label: "DK" },
  { id: "video-only", label: "Video Only" },
  { id: "high-play-count", label: "High Play Count" },
];

const WORK_ACTIONS: PlannedWorkAction[] = [
  "Find Cover",
  "Resolve RVTR",
  "Generate Package",
  "Generate Deck",
  "Publish",
];

const ACTIVE_LOCATION_KEY = "browser-plus-active-location";
const CONTEXT_STATE_KEY = "browser-plus-context-state";
const ALWAYS_VISIBLE_COLUMNS = new Set<BrowserPlusColumnId>(["icon", "artist", "title"]);

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function formatLength(seconds: number | null): string {
  if (!seconds) return "—";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function rowIcon(row: BrowserPlusRow): string {
  if (row.mediaKind === "video") return "▣";
  if (row.mediaKind === "audio") return "♪";
  if (row.mediaKind === "netsearch") return "◎";
  return "◇";
}

function valueForColumn(row: BrowserPlusRow, columnId: BrowserPlusColumnId): string | number {
  switch (columnId) {
    case "icon":
      return rowIcon(row);
    case "artist":
      return row.artist || "—";
    case "title":
      return row.title || row.fileName || "—";
    case "genre":
      return row.genre || "—";
    case "year":
      return row.year ?? "";
    case "playCount":
      return row.playCount ?? 0;
    case "label":
      return row.label || "—";
    case "grouping":
      return row.grouping || "—";
    case "rvTags":
      return row.rvTags || "—";
    case "rvtr":
      return row.rvtr ?? "—";
    case "packageStatus":
      return row.packageStatus;
    case "deckStatus":
      return row.deckStatus;
    case "coverStatus":
      return row.coverStatus;
    case "thumbnailStatus":
      return row.thumbnailStatus;
    case "thumbnailSource":
      return row.thumbnailSource;
    case "workStatus":
      return row.workStatus;
    case "album":
      return row.album || "—";
    case "bpm":
      return row.bpm ?? "";
    case "key":
      return row.key || "—";
    case "length":
      return formatLength(row.lengthSeconds);
    case "firstSeen":
      return formatDate(row.firstSeen);
    case "lastPlay":
      return formatDate(row.lastPlay);
    case "user1":
      return row.user1 || "—";
    case "user2":
      return row.user2 || "—";
    case "filePath":
      return row.filePath;
    case "thumbnailPath":
      return row.thumbnailPath ?? "—";
    case "matchMethod":
      return row.matchMethod;
    case "coverageScore":
      return row.coverageScore;
    case "canonicalArtist":
      return row.canonicalArtist ?? "—";
    case "canonicalTrack":
      return row.canonicalTrack ?? "—";
    case "lastGenerated":
      return row.lastGenerated ?? "—";
    case "lastPublished":
      return row.lastPublished ?? "—";
    case "coverageFlags":
      return row.coverageFlags.join(" ");
    case "poiCount":
      return row.poiCount;
    case "linkState":
      return row.linkCount;
    default:
      return "—";
  }
}

function sortValue(row: BrowserPlusRow, columnId: BrowserPlusColumnId): string | number {
  const value = valueForColumn(row, columnId);
  if (typeof value === "number") return value;
  return value.toLowerCase();
}

function filterRow(row: BrowserPlusRow, filter: BrowserPlusSavedFilterId | null): boolean {
  if (!filter) return true;
  switch (filter) {
    case "missing-rvtr":
      return !row.rvtr;
    case "missing-cover":
      return row.coverStatus === "Missing Cover";
    case "missing-file":
      return row.isVideo && !row.fileExists;
    case "missing-thumbnail":
      return row.isVideo && row.thumbnailStatus === "Missing";
    case "thumbnail-present":
      return row.thumbnailStatus === "Present";
    case "thumbnail-only":
      return row.thumbnailStatus === "Present" && !row.hasRetroverseCover;
    case "thumbnail-cover":
      return row.thumbnailStatus === "Present" && row.hasRetroverseCover;
    case "patron-ready":
      return Boolean(row.rvtr && (row.thumbnailStatus === "Present" || row.hasRetroverseCover));
    case "missing-package":
      return row.packageStatus === "Missing Package";
    case "missing-deck":
      return Boolean(row.rvtr && row.deckStatus === "Deck Missing");
    case "needs-review":
      return row.workStatus === "Needs Review";
    case "cards-ready":
      return row.workStatus === "Cards Ready";
    case "published":
      return row.workStatus === "Published" || row.workStatus === "Complete";
    case "complete":
      return row.workStatus === "Complete";
    case "pk":
      return row.label.startsWith("PK_");
    case "dk":
      return row.label.startsWith("DK_");
    case "video-only":
      return row.isVideo;
    case "high-play-count":
      return (row.playCount ?? 0) >= 25;
    default:
      return true;
  }
}

function statusClass(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, value]);
  return debounced;
}

function browserContextKey(activeFolder: string | null, activeFilter: BrowserPlusSavedFilterId | null): string {
  if (activeFilter) return `filter:${activeFilter}`;
  if (!activeFolder) return "folder:all";
  const [branch] = activeFolder.split("/");
  return `folder:${branch || "all"}`;
}

function folderAncestorIds(folderId: string | null): string[] {
  if (!folderId) return [];
  const parts = folderId.split("/").filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}

function readContextMap(): Record<string, BrowserPlusPersistedContext> {
  try {
    const raw = window.localStorage.getItem(CONTEXT_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, BrowserPlusPersistedContext>) : {};
  } catch {
    return {};
  }
}

function writeContextState(contextKey: string, state: BrowserPlusPersistedContext) {
  const contexts = readContextMap();
  contexts[contextKey] = state;
  window.localStorage.setItem(CONTEXT_STATE_KEY, JSON.stringify(contexts));
}

function StatPill({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" className={`browser-plus__stat browser-plus__stat--button${active ? " browser-plus__stat--active" : ""}`} onClick={onClick}>
        <strong>{value}</strong>
        {label}
      </button>
    );
  }
  return (
    <span className="browser-plus__stat">
      <strong>{value}</strong>
      {label}
    </span>
  );
}

function FolderNode(props: {
  node: BrowserPlusFolderNode;
  depth: number;
  activeFolder: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const { node, depth, activeFolder, expanded, onToggle, onSelect } = props;
  const isExpanded = expanded.has(node.id);
  const isActive = activeFolder === node.id;

  return (
    <div>
      <div className={`browser-plus-folder${isActive ? " browser-plus-folder--active" : ""}`} style={{ paddingLeft: 8 + depth * 12 }}>
        <button
          type="button"
          className="browser-plus-folder__twist"
          onClick={() => onToggle(node.id)}
          aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
        >
          {node.children.length > 0 ? (isExpanded ? "▾" : "▸") : "·"}
        </button>
        <button type="button" className="browser-plus-folder__name" onClick={() => onSelect(node.id)}>
          {node.name}
        </button>
        <span className="browser-plus-folder__count">{node.trackCount.toLocaleString()}</span>
      </div>
      {isExpanded
        ? node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFolder={activeFolder}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

function Breakdown({ rows }: { rows: BrowserPlusRow[] }) {
  const work = new Map<string, number>();
  const coverage = new Map<number, number>();
  const thumbnail = new Map<string, number>();
  for (const row of rows) {
    work.set(row.workStatus, (work.get(row.workStatus) ?? 0) + 1);
    coverage.set(row.coverageScore, (coverage.get(row.coverageScore) ?? 0) + 1);
    thumbnail.set(row.thumbnailStatus, (thumbnail.get(row.thumbnailStatus) ?? 0) + 1);
  }
  return (
    <>
      <section className="browser-plus-inspector__section">
        <h3>Thumbnail Breakdown</h3>
        {[...thumbnail.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => (
          <p key={label} className="browser-plus-inspector__line">
            <span>{label}</span>
            <strong>{count.toLocaleString()}</strong>
          </p>
        ))}
      </section>
      <section className="browser-plus-inspector__section">
        <h3>Work Status Breakdown</h3>
        {[...work.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => (
          <p key={label} className="browser-plus-inspector__line">
            <span>{label}</span>
            <strong>{count.toLocaleString()}</strong>
          </p>
        ))}
      </section>
      <section className="browser-plus-inspector__section">
        <h3>Coverage Breakdown</h3>
        {[...coverage.entries()].sort((a, b) => a[0] - b[0]).map(([score, count]) => (
          <p key={score} className="browser-plus-inspector__line">
            <span>Score {score}</span>
            <strong>{count.toLocaleString()}</strong>
          </p>
        ))}
      </section>
    </>
  );
}

function BrowserPlusWorkspace({ model, onReload }: Props) {
  const defaultColumnOrder = useMemo(
    () => model.columns.map((column) => column.id),
    [model.columns],
  );
  const defaultColumnWidths = useMemo(
    () =>
      Object.fromEntries(
        model.columns.map((column) => [column.id, column.width]),
      ) as Record<BrowserPlusColumnId, number>,
    [model.columns],
  );
  const [mode, setMode] = useState<BrowserPlusMode>("library");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim().toLowerCase(), 120);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<BrowserPlusSavedFilterId | null>(null);
  const [sortColumn, setSortColumn] = useState<BrowserPlusColumnId>("playCount");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedRowId, setFocusedRowId] = useState<string | null>(model.rows[0]?.id ?? null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [columnOrder, setColumnOrder] = useState<BrowserPlusColumnId[]>(defaultColumnOrder);
  const [columnWidths, setColumnWidths] = useState<Record<BrowserPlusColumnId, number>>(defaultColumnWidths);
  const [columnVisibility, setColumnVisibility] = useState<Record<BrowserPlusColumnId, boolean>>(
    () => Object.fromEntries(defaultColumnOrder.map((id) => [id, true])) as Record<BrowserPlusColumnId, boolean>,
  );
  const [showColumnChooser, setShowColumnChooser] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [plannedWork, setPlannedWork] = useState<PlannedWorkItem[]>([]);
  const [executionActions, setExecutionActions] = useState<BrowserPlusExecutionAction[]>([]);
  const [executionJob, setExecutionJob] = useState<BrowserPlusExecutionJob | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const didRestoreLocation = useRef(false);
  const applyingContext = useRef(false);
  const expandedDefault = useMemo(() => new Set(model.folders.slice(0, 3).map((folder) => folder.id)), [model.folders]);
  const [expanded, setExpanded] = useState<Set<string>>(expandedDefault);
  const contextKey = useMemo(() => browserContextKey(activeFolder, activeFilter), [activeFilter, activeFolder]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("browser-plus-planned-work");
      if (raw) setPlannedWork(JSON.parse(raw) as PlannedWorkItem[]);
      const locationRaw = window.localStorage.getItem(ACTIVE_LOCATION_KEY);
      if (locationRaw) {
        const location = JSON.parse(locationRaw) as BrowserPlusActiveLocation;
        setActiveFolder(location.activeFolder ?? null);
        setActiveFilter(location.activeFilter ?? null);
        setExpanded((current) => new Set([...current, ...folderAncestorIds(location.activeFolder ?? null)]));
      }
    } catch {
      setPlannedWork([]);
    } finally {
      didRestoreLocation.current = true;
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadActions() {
      try {
        const res = await fetch("/api/ops/browser-plus/execution", { cache: "no-store", credentials: "include" });
        const data = (await res.json()) as BrowserPlusExecutionResponse;
        if (!cancelled && res.ok && data.ok && data.actions) setExecutionActions(data.actions);
      } catch {
        if (!cancelled) setExecutionActions([]);
      }
    }
    void loadActions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("browser-plus-planned-work", JSON.stringify(plannedWork));
  }, [plannedWork]);

  useEffect(() => {
    if (!storageReady || !didRestoreLocation.current) return;
    applyingContext.current = true;
    const persisted = readContextMap()[contextKey];
    if (persisted?.mode) setMode(persisted.mode);
    setQuery(persisted?.query ?? "");
    if (persisted?.sortColumn) setSortColumn(persisted.sortColumn);
    if (persisted?.sortDirection) setSortDirection(persisted.sortDirection);
    setFocusedRowId(persisted?.focusedRowId ?? model.rows[0]?.id ?? null);
    setSelected(new Set(persisted?.selectedRowIds ?? []));
    setLastSelectedId(persisted?.focusedRowId ?? null);
    setColumnOrder(persisted?.columnOrder?.length ? persisted.columnOrder : defaultColumnOrder);
    setColumnWidths({ ...defaultColumnWidths, ...(persisted?.columnWidths ?? {}) });
    setColumnVisibility({
      ...(Object.fromEntries(defaultColumnOrder.map((id) => [id, true])) as Record<BrowserPlusColumnId, boolean>),
      ...(persisted?.columnVisibility ?? {}),
    });
    const nextScrollTop = persisted?.scrollTop ?? 0;
    setScrollTop(nextScrollTop);
    window.setTimeout(() => {
      if (gridRef.current) gridRef.current.scrollTop = nextScrollTop;
      applyingContext.current = false;
    }, 0);
  }, [contextKey, defaultColumnOrder, defaultColumnWidths, model.rows, storageReady]);

  useEffect(() => {
    if (!storageReady || !didRestoreLocation.current || applyingContext.current) return;
    const state: BrowserPlusPersistedContext = {
      mode,
      query,
      sortColumn,
      sortDirection,
      focusedRowId,
      selectedRowIds: [...selected],
      scrollTop,
      columnOrder,
      columnWidths,
      columnVisibility,
    };
    writeContextState(contextKey, state);
    const location: BrowserPlusActiveLocation = { activeFolder, activeFilter };
    window.localStorage.setItem(ACTIVE_LOCATION_KEY, JSON.stringify(location));
  }, [
    activeFilter,
    activeFolder,
    columnOrder,
    columnWidths,
    columnVisibility,
    contextKey,
    focusedRowId,
    mode,
    query,
    scrollTop,
    selected,
    sortColumn,
    sortDirection,
    storageReady,
  ]);

  const visibleColumns = useMemo(
    () => {
      const order = new Map(columnOrder.map((id, index) => [id, index]));
      return model.columns
        .filter((column) => column.modes.includes(mode) && columnVisibility[column.id] !== false)
        .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
        .map((column) => ({ ...column, width: columnWidths[column.id] ?? column.width }));
    },
    [columnOrder, columnVisibility, columnWidths, mode, model.columns],
  );

  const filteredRows = useMemo(() => {
    const scoped = model.rows.filter((row) => {
      if (activeFolder && row.folderKey !== activeFolder && !row.folderKey.startsWith(`${activeFolder}/`)) return false;
      if (!filterRow(row, activeFilter)) return false;
      if (debouncedQuery && !row.searchText.includes(debouncedQuery)) return false;
      return true;
    });
    return scoped.sort((a, b) => {
      const av = sortValue(a, sortColumn);
      const bv = sortValue(b, sortColumn);
      const dir = sortDirection === "asc" ? 1 : -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [activeFilter, activeFolder, debouncedQuery, model.rows, sortColumn, sortDirection]);

  const selectedRows = useMemo(
    () => filteredRows.filter((row) => selected.has(row.id)),
    [filteredRows, selected],
  );
  const focusedRow =
    selectedRows.length === 1
      ? selectedRows[0]
      : model.rows.find((row) => row.id === focusedRowId) ?? filteredRows[0] ?? null;

  const totalHeight = filteredRows.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(GRID_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const visibleRows = filteredRows.slice(startIndex, startIndex + visibleCount);
  const contextRow = contextMenu ? model.rows.find((row) => row.id === contextMenu.rowId) ?? null : null;

  const executionRows = selectedRows.length > 0 ? selectedRows : focusedRow ? [focusedRow] : [];

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!executionJob || (executionJob.status !== "queued" && executionJob.status !== "running")) return;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/ops/browser-plus/execution?jobId=${encodeURIComponent(executionJob.id)}`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await res.json()) as BrowserPlusExecutionResponse;
        if (!res.ok || !data.ok || !data.job) return;
        setExecutionJob(data.job);
        if (data.job.status === "complete" || data.job.status === "failed") {
          window.clearInterval(id);
          await onReload();
        }
      } catch {
        // Keep the current job state visible; the next poll may recover.
      }
    }, 1500);
    return () => window.clearInterval(id);
  }, [executionJob, onReload]);

  function setSort(column: BrowserPlusColumn) {
    if (!column.sortable) return;
    if (sortColumn === column.id) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column.id);
      setSortDirection("asc");
    }
  }

  function selectFolder(id: string | null) {
    setActiveFolder(id);
    setActiveFilter(null);
    setSelected(new Set());
    setScrollTop(0);
    if (gridRef.current) gridRef.current.scrollTop = 0;
  }

  function selectFilter(id: BrowserPlusSavedFilterId) {
    setActiveFilter((current) => (current === id ? null : id));
    setActiveFolder(null);
    setSelected(new Set());
    setScrollTop(0);
    if (gridRef.current) gridRef.current.scrollTop = 0;
  }

  function applyHealthFilter(id: BrowserPlusSavedFilterId | null) {
    setActiveFilter(id);
    setActiveFolder(null);
    setSelected(new Set());
    setScrollTop(0);
    if (gridRef.current) gridRef.current.scrollTop = 0;
  }

  function moveColumn(id: BrowserPlusColumnId, direction: -1 | 1) {
    setColumnOrder((current) => {
      const next = [...current];
      const index = next.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function resizeColumn(id: BrowserPlusColumnId, delta: number) {
    const minWidth = model.columns.find((column) => column.id === id)?.minWidth ?? 50;
    setColumnWidths((current) => ({
      ...current,
      [id]: Math.max(minWidth, (current[id] ?? defaultColumnWidths[id] ?? minWidth) + delta),
    }));
  }

  function resetColumns() {
    setColumnOrder(defaultColumnOrder);
    setColumnWidths(defaultColumnWidths);
    setColumnVisibility(Object.fromEntries(defaultColumnOrder.map((id) => [id, true])) as Record<BrowserPlusColumnId, boolean>);
  }

  function toggleRow(row: BrowserPlusRow, checked: boolean, shiftKey = false) {
    setFocusedRowId(row.id);
    setSelected((current) => {
      const next = new Set(current);
      if (shiftKey && lastSelectedId) {
        const a = filteredRows.findIndex((item) => item.id === lastSelectedId);
        const b = filteredRows.findIndex((item) => item.id === row.id);
        if (a >= 0 && b >= 0) {
          const [start, end] = a < b ? [a, b] : [b, a];
          for (const item of filteredRows.slice(start, end + 1)) next.add(item.id);
          return next;
        }
      }
      if (checked) next.add(row.id);
      else next.delete(row.id);
      return next;
    });
    setLastSelectedId(row.id);
  }

  function addPlannedWork(action: PlannedWorkAction) {
    const rows = selectedRows.length > 0 ? selectedRows : focusedRow ? [focusedRow] : [];
    if (rows.length === 0) return;
    const item: PlannedWorkItem = {
      id: `${Date.now()}-${action}`,
      createdAt: new Date().toISOString(),
      action,
      count: rows.length,
      rows: rows.map(({ id, artist, title, rvtr, filePath, workStatus }) => ({
        id,
        artist,
        title,
        rvtr,
        filePath,
        workStatus,
      })),
    };
    setPlannedWork((current) => [item, ...current].slice(0, 50));
  }

  function addRowsToPlannedWork(action: PlannedWorkAction, rows: BrowserPlusRow[]) {
    if (rows.length === 0) return;
    const item: PlannedWorkItem = {
      id: `${Date.now()}-${action}`,
      createdAt: new Date().toISOString(),
      action,
      count: rows.length,
      rows: rows.map(({ id, artist, title, rvtr, filePath, workStatus }) => ({
        id,
        artist,
        title,
        rvtr,
        filePath,
        workStatus,
      })),
    };
    setPlannedWork((current) => [item, ...current].slice(0, 50));
  }

  function copyText(value: string | null | undefined) {
    if (!value) return;
    void navigator.clipboard?.writeText(value);
  }

  function actionCapability(action: BrowserPlusExecutionAction, rows: BrowserPlusRow[]): { label: "READY" | "NOT AVAILABLE" | "REQUIRES REVIEW"; reason: string } {
    if (rows.length === 0) return { label: "NOT AVAILABLE", reason: "Select a row first." };
    if (rows.length > 1 && !action.supportsBatch) return { label: "NOT AVAILABLE", reason: "Batch not supported." };
    if (rows.some((row) => !row.rvtr)) return { label: "NOT AVAILABLE", reason: "RVTR required." };
    if (action.implementationStatus !== "ready") {
      return {
        label: action.requiresApproval ? "REQUIRES REVIEW" : "NOT AVAILABLE",
        reason: "Adapter registered; safe execution wrapper is not implemented yet.",
      };
    }
    if (action.id === "generate-package" && rows.every((row) => row.packageStatus !== "Missing Package")) {
      return { label: "NOT AVAILABLE", reason: "Package already exists or is not eligible." };
    }
    return { label: "READY", reason: action.writeOperation ? "Runs through Browser+ execution adapter." : "Available." };
  }

  function rowsForExecution(rows: BrowserPlusRow[]) {
    return rows.map((row) => ({
      rvtr: row.rvtr,
      title: row.title || row.fileName,
      artist: row.artist,
      filePath: row.filePath,
    }));
  }

  async function startExecution(action: BrowserPlusExecutionAction, rows: BrowserPlusRow[]) {
    const capability = actionCapability(action, rows);
    if (capability.label !== "READY") {
      setExecutionMessage(capability.reason);
      return;
    }
    setExecutionMessage(null);
    setContextMenu(null);
    try {
      const res = await fetch("/api/ops/browser-plus/execution", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ actionId: action.id, rows: rowsForExecution(rows) }),
      });
      const data = (await res.json()) as BrowserPlusExecutionResponse;
      if (!res.ok || !data.ok || !data.job) {
        setExecutionMessage(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setExecutionJob(data.job);
    } catch (err) {
      setExecutionMessage(err instanceof Error ? err.message : "Could not start execution.");
    }
  }

  return (
    <div className="browser-plus">
      <header className="browser-plus__status-strip">
        <div>
          <p className="browser-plus__kicker">VirtualDJ Browser+ · Phase 1</p>
          <h1>Browser Grid</h1>
        </div>
        <div className="browser-plus__status-meta">
          <StatPill label="VDJ Rows" value={formatNumber(model.stats.totalTracks)} active={!activeFilter && !activeFolder} onClick={() => applyHealthFilter(null)} />
          <StatPill label="Active Videos" value={formatNumber(model.stats.videoTracks)} active={activeFilter === "video-only"} onClick={() => applyHealthFilter("video-only")} />
          <StatPill label="Label RVTR" value={formatNumber(model.stats.rvtrMapped)} />
          <StatPill label="PK" value={formatNumber(model.stats.pkCount)} active={activeFilter === "pk"} onClick={() => applyHealthFilter("pk")} />
          <StatPill label="DK" value={formatNumber(model.stats.dkCount)} active={activeFilter === "dk"} onClick={() => applyHealthFilter("dk")} />
          <StatPill label="Missing Label RVTR" value={formatNumber(model.stats.noRvtr)} active={activeFilter === "missing-rvtr"} onClick={() => applyHealthFilter("missing-rvtr")} />
          <StatPill label="Active Missing" value={formatNumber(model.stats.missingThumbnails)} active={activeFilter === "missing-thumbnail"} onClick={() => applyHealthFilter("missing-thumbnail")} />
          <StatPill label="Missing Active File" value={formatNumber(model.stats.missingFiles)} active={activeFilter === "missing-file"} onClick={() => applyHealthFilter("missing-file")} />
          <StatPill label="Selected Rows" value={formatNumber(selected.size)} />
          <span className="browser-plus__badge browser-plus__badge--readonly">ADAPTER</span>
          <span className={`browser-plus__badge${model.virtualDjRunning ? " browser-plus__badge--running" : ""}`}>
            VDJ {model.virtualDjRunning ? "Running" : "Not Running"}
          </span>
        </div>
      </header>

      <section className="browser-plus__toolbar" aria-label="Browser controls">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search artist, title, label, RVTR, path..."
          className="browser-plus__search"
        />
        <div className="browser-plus__modes" aria-label="Layout modes">
          {(["library", "retroverse", "work"] as BrowserPlusMode[]).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              className={mode === nextMode ? "browser-plus__mode browser-plus__mode--active" : "browser-plus__mode"}
              onClick={() => setMode(nextMode)}
            >
              {nextMode}
            </button>
          ))}
          <Link href="/ops/automation-factory" prefetch={false} className="browser-plus__mode">
            factory
          </Link>
          <button type="button" className="browser-plus__mode" onClick={() => selectFolder(null)}>
            All Database
          </button>
        </div>
        <button type="button" className="browser-plus__ghost" onClick={() => setShowColumnChooser((current) => !current)}>
          Columns
        </button>
      </section>
      {showColumnChooser ? (
        <section className="browser-plus-column-chooser" aria-label="Column chooser">
          <div className="browser-plus-column-chooser__head">
            <strong>Column Chooser</strong>
            <button type="button" onClick={resetColumns}>Reset</button>
          </div>
          <div className="browser-plus-column-chooser__list">
            {columnOrder.map((id) => {
              const column = model.columns.find((item) => item.id === id);
              if (!column) return null;
              const locked = ALWAYS_VISIBLE_COLUMNS.has(id);
              return (
                <div key={id} className="browser-plus-column-chooser__row">
                  <label>
                    <input
                      type="checkbox"
                      checked={columnVisibility[id] !== false}
                      disabled={locked}
                      onChange={(event) => setColumnVisibility((current) => ({ ...current, [id]: event.target.checked }))}
                    />
                    {column.label || "Icon"}
                  </label>
                  <button type="button" onClick={() => moveColumn(id, -1)}>Up</button>
                  <button type="button" onClick={() => moveColumn(id, 1)}>Down</button>
                  <button type="button" onClick={() => resizeColumn(id, -16)}>-</button>
                  <button type="button" onClick={() => resizeColumn(id, 16)}>+</button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="browser-plus__workspace">
        <aside className="browser-plus__folders" aria-label="Folder tree">
          <div className="browser-plus-panel__head">
            <h2>Browser Folders</h2>
            <span>{model.stats.folderCount.toLocaleString()}</span>
          </div>
          <button
            type="button"
            className={`browser-plus-folder browser-plus-folder--root${activeFolder === null && activeFilter === null ? " browser-plus-folder--active" : ""}`}
            onClick={() => selectFolder(null)}
          >
            <span>▾</span>
            <strong>All VDJ Rows</strong>
            <span>{model.stats.totalTracks.toLocaleString()}</span>
          </button>
          <div className="browser-plus__folder-scroll">
            {model.folders.map((folder) => (
              <FolderNode
                key={folder.id}
                node={folder}
                depth={0}
                activeFolder={activeFolder}
                expanded={expanded}
                onToggle={(id) =>
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                onSelect={selectFolder}
              />
            ))}
          </div>

          <div className="browser-plus-saved">
            <div className="browser-plus-panel__head">
              <h2>Saved Filters</h2>
            </div>
            {SAVED_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={activeFilter === filter.id ? "browser-plus-saved__item browser-plus-saved__item--active" : "browser-plus-saved__item"}
                onClick={() => selectFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="browser-plus-health">
            <div className="browser-plus-panel__head">
              <h2>Library Health</h2>
            </div>
            <button type="button" onClick={() => applyHealthFilter("missing-file")}>
              <span>Missing Active File</span>
              <strong>{model.stats.libraryHealth.missingFile.toLocaleString()}</strong>
            </button>
            <button type="button" onClick={() => applyHealthFilter("missing-thumbnail")}>
              <span>Active Missing</span>
              <strong>{model.stats.libraryHealth.missingThumbnail.toLocaleString()}</strong>
            </button>
            <button type="button">
              <span>Repairable</span>
              <strong>{model.stats.libraryHealth.repairableThumbnail.toLocaleString()}</strong>
            </button>
            <button type="button">
              <span>Requires Generation</span>
              <strong>{model.stats.libraryHealth.requiresGenerationThumbnail.toLocaleString()}</strong>
            </button>
            <button type="button">
              <span>Vault Missing</span>
              <strong>{model.stats.libraryHealth.vaultMissingThumbnail.toLocaleString()}</strong>
            </button>
            <button type="button" onClick={() => applyHealthFilter("missing-rvtr")}>
              <span>Missing Label RVTR</span>
              <strong>{model.stats.libraryHealth.missingRvtr.toLocaleString()}</strong>
            </button>
            <div className="browser-plus-panel__head">
              <h2>Retroverse Health</h2>
            </div>
            <button type="button">
              <span>Package Candidates</span>
              <strong>{model.stats.retroverseHealth.packageCandidates.toLocaleString()}</strong>
            </button>
            <button type="button" onClick={() => applyHealthFilter("missing-rvtr")}>
              <span>Needs RVTR</span>
              <strong>{model.stats.retroverseHealth.needsRvtr.toLocaleString()}</strong>
            </button>
            <button type="button" onClick={() => applyHealthFilter("missing-cover")}>
              <span>Cover First</span>
              <strong>{model.stats.retroverseHealth.coverFirst.toLocaleString()}</strong>
            </button>
            <button type="button">
              <span>Out Of Scope</span>
              <strong>{model.stats.retroverseHealth.outOfScope.toLocaleString()}</strong>
            </button>
            <button type="button" onClick={() => applyHealthFilter("needs-review")}>
              <span>Needs Review</span>
              <strong>{model.stats.retroverseHealth.needsReview.toLocaleString()}</strong>
            </button>
            <button type="button" onClick={() => applyHealthFilter("missing-deck")}>
              <span>Missing Deck</span>
              <strong>{model.stats.retroverseHealth.missingDeck.toLocaleString()}</strong>
            </button>
            <button type="button" onClick={() => applyHealthFilter("patron-ready")}>
              <span>Visual Patron Ready</span>
              <strong>{model.stats.patronReady.toLocaleString()}</strong>
            </button>
          </div>
        </aside>

        <section className="browser-plus__grid-panel" aria-label="Browser grid">
          <div className="browser-plus-grid__summary">
            <span>Visible Rows {filteredRows.length.toLocaleString()}</span>
            <span>PK {model.stats.pkCount.toLocaleString()}</span>
            <span>DK {model.stats.dkCount.toLocaleString()}</span>
            <span>Missing Label RVTR {model.stats.noRvtr.toLocaleString()}</span>
            <span>Thumbs {model.stats.thumbnailsPresent.toLocaleString()}</span>
            <span>VDJ Covers {model.stats.vdjCovers.toLocaleString()}</span>
            <span>Retro Covers {model.stats.retroverseCovers.toLocaleString()}</span>
            <span>Visual Patron Ready {model.stats.patronReady.toLocaleString()}</span>
          </div>
          <div className="browser-plus-grid" style={{ ["--grid-height" as string]: `${GRID_HEIGHT}px` }}>
            <div className="browser-plus-grid__header" style={{ gridTemplateColumns: `34px ${visibleColumns.map((column) => `${column.width}px`).join(" ")}` }}>
              <div className="browser-plus-grid__cell browser-plus-grid__cell--select">
                <input
                  type="checkbox"
                  aria-label="Select visible rows"
                  checked={filteredRows.length > 0 && filteredRows.every((row) => selected.has(row.id))}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelected((current) => {
                      const next = new Set(current);
                      for (const row of filteredRows) {
                        if (checked) next.add(row.id);
                        else next.delete(row.id);
                      }
                      return next;
                    });
                  }}
                />
              </div>
              {visibleColumns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  className={`browser-plus-grid__head-cell${sortColumn === column.id ? " browser-plus-grid__head-cell--sorted" : ""}`}
                  onClick={() => setSort(column)}
                  style={{ textAlign: column.align ?? "left" }}
                >
                  {column.label}
                  {sortColumn === column.id ? <span>{sortDirection === "asc" ? " ▲" : " ▼"}</span> : null}
                </button>
              ))}
            </div>
            <div
              ref={gridRef}
              className="browser-plus-grid__viewport"
              onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            >
              <div className="browser-plus-grid__spacer" style={{ height: totalHeight }}>
                <div className="browser-plus-grid__rows" style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }}>
                  {visibleRows.map((row) => {
                    const isSelected = selected.has(row.id);
                    const isFocused = focusedRow?.id === row.id;
                    return (
                      <div
                        key={row.id}
                        className={`browser-plus-grid__row${isSelected ? " browser-plus-grid__row--selected" : ""}${isFocused ? " browser-plus-grid__row--focused" : ""}`}
                        style={{ gridTemplateColumns: `34px ${visibleColumns.map((column) => `${column.width}px`).join(" ")}` }}
                        onClick={() => setFocusedRowId(row.id)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setFocusedRowId(row.id);
                          setContextMenu({ x: event.clientX, y: event.clientY, rowId: row.id });
                        }}
                      >
                        <div className="browser-plus-grid__cell browser-plus-grid__cell--select">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleRow(row, !isSelected, event.shiftKey);
                            }}
                            aria-label={`Select ${row.title || row.fileName}`}
                          />
                        </div>
                        {visibleColumns.map((column) => (
                          <div
                            key={column.id}
                            className={`browser-plus-grid__cell browser-plus-grid__cell--${column.align ?? "left"} browser-plus-grid__cell--${column.id}`}
                            title={String(valueForColumn(row, column.id))}
                          >
                            {column.id === "workStatus" || column.id === "packageStatus" || column.id === "deckStatus" || column.id === "coverStatus" || column.id === "thumbnailStatus" ? (
                              <span className={`browser-plus-pill browser-plus-pill--${statusClass(String(valueForColumn(row, column.id)))}`}>
                                {valueForColumn(row, column.id)}
                              </span>
                            ) : (
                              valueForColumn(row, column.id)
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="browser-plus__inspector" aria-label="Inspector">
          <div className="browser-plus-panel__head">
            <h2>Inspector</h2>
            <span>{mode}</span>
          </div>

          {selectedRows.length > 1 ? (
            <>
              <section className="browser-plus-inspector__section">
                <h3>Selection</h3>
                <p className="browser-plus-inspector__big">{selectedRows.length.toLocaleString()} songs selected</p>
                <p className="browser-plus-inspector__muted">Adapter actions support single-row and eligible batch execution.</p>
              </section>
              <Breakdown rows={selectedRows} />
            </>
          ) : focusedRow ? (
            <>
              <section className="browser-plus-inspector__section">
                <h3>Selection Summary</h3>
                <p className="browser-plus-inspector__title">{focusedRow.title || focusedRow.fileName}</p>
                <p className="browser-plus-inspector__artist">{focusedRow.artist || "Unknown Artist"}</p>
                <p className="browser-plus-inspector__path">{focusedRow.filePath}</p>
              </section>
              <section className="browser-plus-inspector__section">
                <h3>Preview</h3>
                <div className="browser-plus-preview">
                  <figure>
                    <div className="browser-plus-preview__frame">
                      {focusedRow.thumbnailUrl ? (
                        <img src={focusedRow.thumbnailUrl} alt="Video thumbnail preview" />
                      ) : (
                        <span>{focusedRow.thumbnailStatus}</span>
                      )}
                    </div>
                    <figcaption>Video Thumbnail</figcaption>
                  </figure>
                  <figure>
                    <div className="browser-plus-preview__frame browser-plus-preview__frame--cover">
                      {focusedRow.retroverseCoverUrl ? (
                        <img src={focusedRow.retroverseCoverUrl} alt="Retroverse cover preview" />
                      ) : (
                        <span>Missing</span>
                      )}
                    </div>
                    <figcaption>Retroverse Cover</figcaption>
                  </figure>
                </div>
              </section>
              <section className="browser-plus-inspector__section">
                <h3>VirtualDJ Tags</h3>
                <p className="browser-plus-inspector__line"><span>Label</span><strong>{focusedRow.label || "—"}</strong></p>
                <p className="browser-plus-inspector__line"><span>Grouping</span><strong>{focusedRow.grouping || "—"}</strong></p>
                <p className="browser-plus-inspector__line"><span>User1</span><strong>{focusedRow.user1 || "—"}</strong></p>
                <p className="browser-plus-inspector__line"><span>RV Tags</span><strong>{focusedRow.rvTags || "—"}</strong></p>
                <p className="browser-plus-inspector__line"><span>Plays</span><strong>{focusedRow.playCount ?? 0}</strong></p>
              </section>
              <section className="browser-plus-inspector__section browser-plus-inspector__section--accent">
                <h3>Retroverse Intelligence</h3>
                <p className="browser-plus-inspector__line"><span>RVTR</span><strong>{focusedRow.rvtr ?? "—"}</strong></p>
                <p className="browser-plus-inspector__line"><span>Match Method</span><strong>{focusedRow.matchMethod}</strong></p>
                <p className="browser-plus-inspector__line"><span>Coverage Score</span><strong>{focusedRow.coverageScore}</strong></p>
                <p className="browser-plus-inspector__line"><span>Canonical Artist</span><strong>{focusedRow.canonicalArtist ?? "—"}</strong></p>
                <p className="browser-plus-inspector__line"><span>Canonical Track</span><strong>{focusedRow.canonicalTrack ?? "—"}</strong></p>
                <p className="browser-plus-inspector__line"><span>Package</span><strong>{focusedRow.packageStatus}</strong></p>
                <p className="browser-plus-inspector__line"><span>Deck</span><strong>{focusedRow.deckStatus}</strong></p>
              </section>
              <section className="browser-plus-inspector__section">
                <h3>Thumbnail Health</h3>
                <p className="browser-plus-inspector__line"><span>Status</span><strong>{focusedRow.thumbnailStatus}</strong></p>
                <p className="browser-plus-inspector__line"><span>Source</span><strong>{focusedRow.thumbnailSource}</strong></p>
                <p className="browser-plus-inspector__line"><span>Path</span><strong>{focusedRow.thumbnailPath ?? "—"}</strong></p>
                <p className="browser-plus-inspector__line"><span>Video File</span><strong>{focusedRow.fileExists ? "Present" : "Missing"}</strong></p>
              </section>
              <section className="browser-plus-inspector__section">
                <h3>Cover</h3>
                <p className="browser-plus-inspector__line"><span>Status</span><strong>{focusedRow.coverStatus}</strong></p>
                <p className="browser-plus-inspector__line"><span>Retroverse</span><strong>{focusedRow.hasRetroverseCover ? "Present" : "Missing"}</strong></p>
                <p className="browser-plus-inspector__line"><span>Links</span><strong>{focusedRow.linkCount}</strong></p>
              </section>
              <section className="browser-plus-inspector__section">
                <h3>Work Status</h3>
                <p className={`browser-plus-inspector__work browser-plus-pill--${statusClass(focusedRow.workStatus)}`}>{focusedRow.workStatus}</p>
                <p className="browser-plus-inspector__muted">{focusedRow.workStatusReason}</p>
              </section>
              <details className="browser-plus-inspector__debug">
                <summary>Debug</summary>
                <p>POI count: {focusedRow.poiCount}</p>
                <p>Link count: {focusedRow.linkCount}</p>
                <p>File type: {focusedRow.fileType}</p>
                <p>Flags: {focusedRow.coverageFlags.join(", ")}</p>
              </details>
            </>
          ) : (
            <section className="browser-plus-inspector__section">
              <h3>No row selected</h3>
            </section>
          )}

          <section className="browser-plus-inspector__section">
            <h3>Execution Adapter</h3>
            <p className="browser-plus-inspector__muted">
              {executionRows.length > 1 ? `${executionRows.length.toLocaleString()} selected rows` : "Selected row actions"}
            </p>
            <div className="browser-plus-actions">
              {focusedRow?.rvtr ? (
                <>
                  <Link href={`/ops/intelligence/package/${focusedRow.rvtr}`} prefetch={false}>View Package</Link>
                  <Link href={`/rvtr/${focusedRow.rvtr}/deck`} prefetch={false}>View Deck</Link>
                </>
              ) : null}
              {executionActions.map((action) => {
                const capability = actionCapability(action, executionRows);
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={`browser-plus-action browser-plus-action--${capability.label.toLowerCase().replace(/\s+/g, "-")}`}
                    disabled={capability.label !== "READY"}
                    title={capability.reason}
                    onClick={() => void startExecution(action, executionRows)}
                  >
                    <span>{action.label}</span>
                    <strong>{capability.label}</strong>
                  </button>
                );
              })}
            </div>
            {executionMessage ? <p className="browser-plus-inspector__muted browser-plus-execution__message">{executionMessage}</p> : null}
            {executionJob ? (
              <div className="browser-plus-execution">
                <p>
                  <strong>{executionJob.step}</strong>
                  <span>{executionJob.current} / {executionJob.total}</span>
                </p>
                <progress value={executionJob.current} max={executionJob.total} />
                {executionJob.results.slice(-3).map((result, index) => (
                  <p key={`${result.rvtr}-${index}`} className={`browser-plus-execution__result browser-plus-execution__result--${result.status}`}>
                    {result.rvtr ?? "No RVTR"} · {result.status}: {result.message}
                  </p>
                ))}
              </div>
            ) : null}
          </section>

          <section className="browser-plus-inspector__section">
            <h3>VirtualDJ Handoff</h3>
            <button type="button" disabled>Open Tag Editor</button>
            <button type="button" disabled>Open BPM Editor</button>
            <button type="button" disabled>Open POI Editor</button>
            <p className="browser-plus-inspector__muted">VDJScript integration is not active in Phase 1.</p>
          </section>

          <section className="browser-plus-inspector__section browser-plus-planned">
            <h3>Planned Work Archive</h3>
            <p className="browser-plus-inspector__muted">{plannedWork.length} older planned batches. Adapter actions run above.</p>
            <div className="browser-plus-planned__list">
              {plannedWork.slice(0, 5).map((item) => (
                <div key={item.id} className="browser-plus-planned__item">
                  <strong>{item.action}</strong>
                  <span>{item.count} song{item.count === 1 ? "" : "s"} · {formatDate(item.createdAt)}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {contextMenu && contextRow ? (
        <div
          className="browser-plus-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <strong>{contextRow.title || contextRow.fileName}</strong>
          {contextRow.rvtr ? (
            <>
              <Link href={`/ops/intelligence/package/${contextRow.rvtr}/artifacts`} prefetch={false}>View Assets</Link>
              <Link href={`/ops/intelligence/package/${contextRow.rvtr}`} prefetch={false}>View Package</Link>
              <Link href={`/rvtr/${contextRow.rvtr}/deck`} prefetch={false}>View Deck</Link>
              <Link href={`/rvtr/${contextRow.rvtr}/song-sheet`} prefetch={false}>View Song Sheet</Link>
              <button type="button" onClick={() => copyText(contextRow.rvtr)}>Copy RVTR</button>
            </>
          ) : (
            <>
              <button type="button" disabled>View Assets</button>
              <button type="button" disabled>View Package</button>
              <button type="button" disabled>View Deck</button>
              <button type="button" disabled>View Song Sheet</button>
              <button type="button" disabled>Copy RVTR</button>
            </>
          )}
          <button type="button" onClick={() => copyText(contextRow.filePath)}>Copy File Path</button>
          <div className="browser-plus-context-menu__group">
            <span>Generation</span>
            {executionActions.map((action) => {
              const capability = actionCapability(action, [contextRow]);
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={capability.label !== "READY"}
                  title={capability.reason}
                  onClick={() => void startExecution(action, [contextRow])}
                >
                  {action.label} · {capability.label}
                </button>
              );
            })}
          </div>
          <div className="browser-plus-context-menu__group">
            <span>Planned Work Archive</span>
            {WORK_ACTIONS.map((action) => (
              <button key={action} type="button" onClick={() => addRowsToPlannedWork(action, [contextRow])}>
                Add: {action}
              </button>
            ))}
          </div>
          <button type="button" disabled>Open Tag Editor</button>
          <button type="button" disabled>Generate Thumbnail</button>
        </div>
      ) : null}

      <footer className="browser-plus__footer">
        <span>{model.databasePath}</span>
        <span>XML {formatBytes(model.databaseSizeBytes)}</span>
        <span>mtime {formatDate(model.databaseMtime)}</span>
        <span>parsed {new Date(model.parsedAt).toLocaleTimeString()}</span>
        <span>parse {model.stats.parseMs}ms</span>
        <strong>No XML writes. Automation runs through adapters only.</strong>
      </footer>
    </div>
  );
}

export function VirtualDjBrowserPlus() {
  const [model, setModel] = useState<BrowserPlusModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/browser-plus", { cache: "no-store", credentials: "include" });
      const data = (await res.json()) as BrowserPlusResponse;
      if (!res.ok || !data.ok || !data.model) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setError(null);
      setModel(data.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Browser+.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        const res = await fetch("/api/ops/browser-plus", { cache: "no-store", credentials: "include" });
        const data = (await res.json()) as BrowserPlusResponse;
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.model) {
          setError(data.error ?? `HTTP ${res.status}`);
          return;
        }
        setModel(data.model);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Browser+.");
      }
    }
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="browser-plus browser-plus--empty">
        <section className="browser-plus-loader">
          <p className="browser-plus__kicker">VirtualDJ Browser+ · Phase 1</p>
          <h1>Could Not Load Browser+</h1>
          <p>{error}</p>
        </section>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="browser-plus browser-plus--empty">
        <section className="browser-plus-loader">
          <p className="browser-plus__kicker">VirtualDJ Browser+ · Phase 1</p>
          <h1>Loading database.xml</h1>
          <p>Read-only parse in progress. Execution adapters load after the grid.</p>
        </section>
      </div>
    );
  }

  return <BrowserPlusWorkspace model={model} onReload={load} />;
}
