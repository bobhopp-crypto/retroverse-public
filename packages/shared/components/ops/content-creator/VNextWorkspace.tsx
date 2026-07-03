"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

import { JobQueuePanel } from "@/components/ops/content-creator/JobQueuePanel";
import { ProviderErrorAlert } from "@/components/ops/creative-lab/ProviderErrorAlert";
import type { ProviderErrorDetail } from "@/lib/ops/creative-lab/artwork/provider-error";
import { PromptInspectorModal, QualityPanel } from "@/components/ops/content-creator/PromptInspectorModal";
import { QR_EXPORT_REQUIRED_MESSAGE } from "@/lib/ops/creative-lab/qr-production";
import {
  QR_STATUS_LABELS,
  resolveQrExportStatus,
  type QrExportStatus,
} from "@/lib/ops/content-creator/qr-export-status";
import {
  PASS_NUMBER_FORMAT_OPTIONS,
  PRINT_QUANTITY_PRESETS,
  serialNumberPreview,
  type PassNumberFormatId,
} from "@/lib/ops/content-creator/pass-numbering";
import type { ComposedRvbrPrompt, PromptQualityScores } from "@/lib/creative/rvbr-prompt-types";
import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { RETROVERSE_COLLECTIBLE_CREDENTIAL_LABEL } from "@/lib/creative/artifact-archetypes";
import {
  CREATIVE_DIRECTIONS,
  CREATIVE_DIRECTION_IDS,
  type CreativeDirectionId,
} from "@/lib/ops/content-creator/creative-direction";
import type { ContentArtifactType, ContentCreatorEraOption } from "@/lib/ops/content-creator/types";
import type { QrVerificationResult } from "@/lib/ops/creative-lab/pass-export-composite";
import {
  normalizeQrPlacement,
  PASS_HEIGHT,
  PASS_WIDTH,
  resolveQrPlacement,
} from "@/lib/ops/creative-lab/pass-layout";
import {
  CONTROLLED_PASS_TYPE_LABELS,
  normalizePassTypeLabel,
  type ControlledPassTypeLabel,
} from "@/lib/ops/creative-lab/pass-text-governance";
import type { PassQrPlacement } from "@/lib/ops/creative-lab/types";
import {
  COLLECTOR_DECK_RANKS,
  COLLECTOR_DECK_YEAR_SUITS,
  COLLECTOR_DECK_YEARS,
  COLLECTOR_CARD_SUIT_LABELS,
  COLLECTOR_CARD_EMPTY_CONTENT,
  collectorCardForRetroversePick,
  type CollectorCard,
  type CollectorCardContent,
  type CollectorCardPresentation,
  type CollectorDeckRank,
  type CollectorDeckYear,
} from "@/lib/ops/content-creator/collector-card";

type Props = {
  eras: ContentCreatorEraOption[];
};

type ProviderApiBody = {
  error?: string;
  providerError?: ProviderErrorDetail;
};

function raiseApiError(data: ProviderApiBody, fallback: string): never {
  const err = new Error(data.error ?? fallback) as Error & { providerError?: ProviderErrorDetail };
  err.providerError = data.providerError;
  throw err;
}

function readProviderError(error: unknown): ProviderErrorDetail | null {
  if (error && typeof error === "object" && "providerError" in error) {
    const detail = (error as { providerError?: ProviderErrorDetail }).providerError;
    return detail ?? null;
  }
  return null;
}

type ExportDownloads = {
  exportZipUrl?: string;
  singleFrontUrl?: string;
  singleBackUrl?: string;
  singlePassZipUrl?: string;
  printFrontPngUrls?: string[];
  printBackPngUrls?: string[];
  printFrontPdfUrls?: string[];
  printBackPdfUrls?: string[];
  printInstructionsUrl?: string;
};

type ExportApiResponse = {
  ok?: boolean;
  error?: string;
  qrVerification?: QrVerificationResult;
  qrStatus?: QrExportStatus;
  exportZipUrl?: string;
  singleFrontUrl?: string;
  singleBackUrl?: string;
  singlePassZipUrl?: string;
  printFrontPngUrls?: string[];
  printBackPngUrls?: string[];
  printFrontPdfUrls?: string[];
  printBackPdfUrls?: string[];
  printInstructionsUrl?: string;
};

type RunState = {
  runId: string;
  frontUrl: string | null;
  backUrl: string | null;
  artworkBackUrl?: string | null;
  exportZipUrl?: string;
  qrStatus?: QrExportStatus;
  qrVerification?: QrVerificationResult;
  downloads?: ExportDownloads;
};

const MIN_QR_EDIT_SIZE = 96;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampQrPlacement(placement: PassQrPlacement): PassQrPlacement {
  const size = Math.round(clampNumber(placement.size, MIN_QR_EDIT_SIZE, Math.min(PASS_WIDTH, PASS_HEIGHT)));
  return {
    left: Math.round(clampNumber(placement.left, 0, PASS_WIDTH - size)),
    top: Math.round(clampNumber(placement.top, 0, PASS_HEIGHT - size)),
    size,
  };
}

type QrDragState =
  | {
      mode: "move";
      pointerId: number;
      startX: number;
      startY: number;
      startPlacement: PassQrPlacement;
    }
  | {
      mode: "resize";
      pointerId: number;
      startX: number;
      startY: number;
      startPlacement: PassQrPlacement;
    };

type RenderedPassSize = {
  width: number;
  height: number;
};

function QrPlacementEditor(props: {
  placement: PassQrPlacement;
  editing: boolean;
  onChange: (placement: PassQrPlacement) => void;
}) {
  const { placement, editing, onChange } = props;
  const dragRef = useRef<QrDragState | null>(null);
  const frameRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [passSize, setPassSize] = useState<RenderedPassSize | null>(null);

  useEffect(() => {
    const passEl = frameRef.current?.parentElement;
    if (!passEl) return;
    const measuredEl = passEl;

    function measure() {
      const rect = measuredEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setPassSize({ width: rect.width, height: rect.height });
      }
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(measuredEl);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  function scheduleChange(next: PassQrPlacement) {
    const clamped = clampQrPlacement(next);
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      onChange(clamped);
    });
  }

  function pointFromEvent(event: PointerEvent<HTMLElement>): { x: number; y: number } | null {
    const rect = frameRef.current?.parentElement?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clampNumber(((event.clientX - rect.left) / rect.width) * PASS_WIDTH, 0, PASS_WIDTH),
      y: clampNumber(((event.clientY - rect.top) / rect.height) * PASS_HEIGHT, 0, PASS_HEIGHT),
    };
  }

  function startMove(event: PointerEvent<HTMLSpanElement>) {
    if (!editing) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "move",
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      startPlacement: placement,
    };
  }

  function startResize(event: PointerEvent<HTMLSpanElement>) {
    if (!editing) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "resize",
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      startPlacement: placement,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLSpanElement>) {
    const drag = dragRef.current;
    if (!editing || !drag || drag.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();

    if (drag.mode === "move") {
      const next = {
        ...drag.startPlacement,
        left: drag.startPlacement.left + point.x - drag.startX,
        top: drag.startPlacement.top + point.y - drag.startY,
      };
      scheduleChange(next);
      return;
    }

    const maxSize = Math.min(
      PASS_WIDTH - drag.startPlacement.left,
      PASS_HEIGHT - drag.startPlacement.top,
    );
    const delta = Math.max(point.x - drag.startX, point.y - drag.startY);
    scheduleChange({
      ...drag.startPlacement,
      size: clampNumber(drag.startPlacement.size + delta, MIN_QR_EDIT_SIZE, maxSize),
    });
  }

  function stopDrag(event: PointerEvent<HTMLSpanElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  const scaleX = passSize ? passSize.width / PASS_WIDTH : 1;
  const scaleY = passSize ? passSize.height / PASS_HEIGHT : 1;
  const squareSize = passSize ? placement.size * Math.min(scaleX, scaleY) : undefined;
  const placementStyle: CSSProperties = passSize
    ? {
        left: `${placement.left * scaleX}px`,
        top: `${placement.top * scaleY}px`,
        width: `${squareSize}px`,
        height: `${squareSize}px`,
      }
    : {
        left: `${(placement.left / PASS_WIDTH) * 100}%`,
        top: `${(placement.top / PASS_HEIGHT) * 100}%`,
        width: `${(placement.size / PASS_WIDTH) * 100}%`,
        aspectRatio: "1 / 1",
      };

  return (
    <span
      ref={frameRef}
      className={`cc-creator__qr-placement-preview${editing ? " is-editing" : " is-outline"}`}
      aria-hidden
      style={placementStyle}
      onPointerDown={startMove}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      {editing ? (
        <span
          className="cc-creator__qr-resize-handle"
          onPointerDown={startResize}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        />
      ) : null}
    </span>
  );
}

type ContentFields = {
  event: string;
  venue: string;
  date: string;
  secondaryLine: string;
  passTypeLabel: ControlledPassTypeLabel;
  qrUrl: string;
};

type CollectorDeckSlotStatus = "empty" | "ready" | "generated" | "needs_review";

type RetroverseHot100RankingResponse = {
  ok?: boolean;
  sourceName?: string;
  year?: number;
  cards?: CollectorCardContent[];
  liveCards?: CollectorCardContent[];
  lockedAt?: string | null;
  error?: string;
};

type CollectorDeckReviewYear = {
  year: CollectorDeckYear;
  suit: CollectorCardPresentation["suit"];
  cards: CollectorCardContent[];
  liveCards: CollectorCardContent[];
  lockedAt: string | null;
  error: string | null;
};

type CollectorStyleId = "vintage-magazine" | "museum-artifact" | "record-sleeve" | "trading-card" | "retroverse-signature";
type CollectorSuitExperimentId = "minimal" | "classic" | "art-deco" | "music-note" | "retroverse";
type CollectorColorSystemId = "cream-paper" | "seventies-print" | "library-archive" | "retroverse-house";
type CollectorBrandingId = "none" | "retroverse" | "press-play" | "era-collection";
type CollectorTitleSize = "standard" | "large" | "poster";
type CollectorFactPlacement = "bottom" | "caption" | "side";
type CollectorSuitPlacement = "upper-right" | "badge" | "sidebar";
type CollectorNumberPlacement = "footer" | "backstamp" | "corner";
type CollectorBorderStyle = "plain" | "archive" | "bold" | "ornate";

type CollectorConceptId = "memory-object" | "environment" | "cultural-artifact" | "symbolic-metaphor";

type CollectorConcept = {
  id: CollectorConceptId;
  label: string;
  value: string;
};

type CollectorConceptProviderId = "ollama" | "rule-based";
type CollectorImageProviderId = "local-placeholder";

type CollectorGeneratedConcept = {
  id: CollectorConceptId;
  label: string;
  prompt: string;
  imagePath: string;
  imageUrl: string;
  favorite: boolean;
  generatedAt: string;
};

type CollectorGeneratedTextConcept = CollectorConcept & {
  provider: CollectorConceptProviderId;
  model: string;
  generatedAt: string;
};

type CollectorEvaluationCategory =
  | "feelsLikeMemory"
  | "feelsLikeYear"
  | "feelsUnique"
  | "feelsCollectible"
  | "feelsRetroverse";

type CollectorConceptRatings = Record<CollectorEvaluationCategory, number>;

type CollectorConceptEvaluation = {
  id: CollectorConceptId;
  ratings: CollectorConceptRatings;
  total: number;
  notes: {
    whatWorks: string;
    whatDoesntWork: string;
    freeform: string;
  };
  rank?: number;
  updatedAt: string;
};

type CollectorEvaluationState = {
  targetConceptId: CollectorConceptId | null;
  evaluations: Partial<Record<CollectorConceptId, CollectorConceptEvaluation>>;
  updatedAt: string;
};

type CollectorArtworkProviderId = "chatgpt-images";
type CollectorArtworkStatus = "not-generated" | "generated" | "approved";

type CollectorArtworkVariation = {
  id: string;
  index: number;
  imagePath: string;
  imageUrl: string;
  prompt: string;
  generatedAt: string;
};

type CollectorArtworkFile = {
  provider: CollectorArtworkProviderId;
  status: CollectorArtworkStatus;
  prompt: string;
  selectedConceptId: CollectorConceptId | null;
  variations: CollectorArtworkVariation[];
  favoriteVariationId: string | null;
  generatedAt: string;
  updatedAt: string;
};

type CollectorConceptApiFile = {
  concepts: CollectorGeneratedConcept[];
  conceptDirections?: CollectorGeneratedTextConcept[];
  conceptProvider?: CollectorConceptProviderId;
  conceptModel?: string;
  evaluation?: CollectorEvaluationState;
  favoriteConceptId: CollectorConceptId | null;
  bestConceptId: CollectorConceptId | null;
};

const COLLECTOR_STYLE_LAB_STYLES: { id: CollectorStyleId; label: string; notes: string }[] = [
  { id: "vintage-magazine", label: "A. Vintage Magazine", notes: "Editorial cover hierarchy, large title, strong period typography." },
  { id: "museum-artifact", label: "B. Museum Artifact", notes: "Archival label, exhibit-card restraint, collector object energy." },
  { id: "record-sleeve", label: "C. Record Sleeve", notes: "Album jacket influence, music-first crop, sleeve-like framing." },
  { id: "trading-card", label: "D. Trading Card", notes: "Classic collectible structure, dense stats, strong card geometry." },
  { id: "retroverse-signature", label: "E. Retroverse Signature", notes: "Original Retroverse language built for cultural-memory cards." },
];

const COLLECTOR_SUIT_EXPERIMENTS: { id: CollectorSuitExperimentId; label: string; mark: string }[] = [
  { id: "minimal", label: "Minimal", mark: "♠" },
  { id: "classic", label: "Classic", mark: "♠" },
  { id: "art-deco", label: "Art Deco", mark: "♤" },
  { id: "music-note", label: "Music Note", mark: "♬" },
  { id: "retroverse", label: "Retroverse", mark: "RV" },
];

const COLLECTOR_COLOR_SYSTEMS: { id: CollectorColorSystemId; label: string }[] = [
  { id: "cream-paper", label: "Cream Paper" },
  { id: "seventies-print", label: "Seventies Print" },
  { id: "library-archive", label: "Library Archive" },
  { id: "retroverse-house", label: "Retroverse House Style" },
];

const COLLECTOR_BRANDING_EXPERIMENTS: { id: CollectorBrandingId; label: string; text: string }[] = [
  { id: "none", label: "Version A", text: "" },
  { id: "retroverse", label: "Version B", text: "Retroverse" },
  { id: "press-play", label: "Version C", text: "Press Play for the Past" },
  { id: "era-collection", label: "Version D", text: "Retroverse Era Collection" },
];

const DEFAULT_COLLECTOR_CONCEPTS: CollectorConcept[] = [
  {
    id: "memory-object",
    label: "Concept A · Memory Object",
    value: "handwritten love letter\nframed photograph\nrotary phone",
  },
  {
    id: "environment",
    label: "Concept B · Environment",
    value: "empty suburban living room\nsunset through curtains\nradio glowing on a side table",
  },
  {
    id: "cultural-artifact",
    label: "Concept C · Cultural Artifact",
    value: "1977 magazine clipping\nfolded fan letter\nrecord-store display card",
  },
  {
    id: "symbolic-metaphor",
    label: "Concept D · Symbolic Metaphor",
    value: "mailbox overflowing with letters\nheart-shaped trail of postcards\ntelephone cord forming a loop",
  },
];

const COLLECTOR_EVALUATION_CATEGORIES: { id: CollectorEvaluationCategory; label: string }[] = [
  { id: "feelsLikeMemory", label: "Feels Like A Memory" },
  { id: "feelsLikeYear", label: "Feels Like The Year" },
  { id: "feelsUnique", label: "Feels Unique" },
  { id: "feelsCollectible", label: "Feels Collectible" },
  { id: "feelsRetroverse", label: "Feels Retroverse" },
];

const COLLECTOR_ARTWORK_STATUS_LABELS: Record<CollectorArtworkStatus, string> = {
  "not-generated": "Not Generated",
  generated: "Generated",
  approved: "Approved",
};

type CollectorDeckSlot = {
  rank: CollectorDeckRank;
  card: CollectorCard;
  status: CollectorDeckSlotStatus;
};

const DEFAULT_COLLECTOR_CARD: CollectorCard = {
  content: COLLECTOR_CARD_EMPTY_CONTENT,
  presentation: { suit: "spades", rank: "1", cardType: "top10" },
};

const ARTIFACTS: { id: ContentArtifactType; label: string; enabled: boolean }[] = [
  { id: "pass", label: "Event Pass", enabled: true },
  { id: "collector-card", label: "Collector Card", enabled: true },
  { id: "poster", label: "Poster", enabled: false },
  { id: "bumper", label: "Bumper", enabled: false },
  { id: "social", label: "Social", enabled: false },
  { id: "slide", label: "Slide", enabled: false },
];

function defaultFields(): ContentFields {
  return {
    event: CONTENT_CREATOR_DEFAULTS.event,
    venue: CONTENT_CREATOR_DEFAULTS.venue,
    date: CONTENT_CREATOR_DEFAULTS.date,
    secondaryLine: CONTENT_CREATOR_DEFAULTS.secondaryLine,
    passTypeLabel: CONTENT_CREATOR_DEFAULTS.passTypeLabel,
    qrUrl: CONTENT_CREATOR_DEFAULTS.qrUrl,
  };
}

function creativePayload(
  creativeDirection: CreativeDirectionId,
  avoidEraTropes: boolean,
  maximizeVariation: boolean,
) {
  return {
    creativeDirection,
    avoidEraTropes,
    maximizeVariation,
    artifactArchetype: CONTENT_CREATOR_DEFAULTS.artifactArchetype,
  };
}

function fieldsPayload(prefix: "front" | "back", f: ContentFields) {
  return {
    [`${prefix}Event`]: f.event,
    [`${prefix}Venue`]: f.venue,
    [`${prefix}Date`]: f.date,
    [`${prefix}SecondaryLine`]: f.secondaryLine,
    [`${prefix}PassTypeLabel`]: f.passTypeLabel,
    ...(prefix === "back" ? { backQrUrl: f.qrUrl } : {}),
  };
}

function cardFieldsFromContent(content: CollectorCardContent): ContentFields {
  return {
    event: content.song || `${content.year} Collector Card`,
    venue: content.artist || "Retroverse",
    date: String(content.year),
    secondaryLine: content.chartPosition ? `Retroverse Hot 100 #${content.chartPosition}` : content.fact,
    passTypeLabel: "EVENT PASS",
    qrUrl: CONTENT_CREATOR_DEFAULTS.qrUrl,
  };
}

function collectorCardPayload(content: CollectorCardContent, presentation: CollectorCardPresentation) {
  return {
    collectorCardContent: content,
    collectorCardPresentation: presentation,
  };
}

function defaultCollectorEvaluation(id: CollectorConceptId): CollectorConceptEvaluation {
  const ratings = {
    feelsLikeMemory: 0,
    feelsLikeYear: 0,
    feelsUnique: 0,
    feelsCollectible: 0,
    feelsRetroverse: 0,
  };
  return {
    id,
    ratings,
    total: collectorEvaluationTotal(ratings),
    notes: { whatWorks: "", whatDoesntWork: "", freeform: "" },
    updatedAt: new Date().toISOString(),
  };
}

function collectorEvaluationTotal(ratings: CollectorConceptRatings): number {
  return COLLECTOR_EVALUATION_CATEGORIES.reduce((sum, category) => sum + (ratings[category.id] || 0), 0);
}

function emptyCollectorEvaluationState(): CollectorEvaluationState {
  return {
    targetConceptId: null,
    evaluations: {},
    updatedAt: new Date().toISOString(),
  };
}

function CollapsiblePanel(props: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`cc-creator__panel${props.open ? " is-open" : ""}`}>
      <button type="button" className="cc-creator__panel-toggle" onClick={props.onToggle} aria-expanded={props.open}>
        <span>{props.title}</span>
        <span className="cc-creator__panel-chevron" aria-hidden>
          {props.open ? "−" : "+"}
        </span>
      </button>
      {props.open ? <div className="cc-creator__panel-body">{props.children}</div> : null}
    </div>
  );
}

function sameQrPlacement(a: PassQrPlacement, b: PassQrPlacement): boolean {
  return a.left === b.left && a.top === b.top && a.size === b.size;
}

export function VNextWorkspace({ eras }: Props) {
  const searchParams = useSearchParams();
  const [artifact, setArtifact] = useState<ContentArtifactType>("pass");
  const [eraSlug, setEraSlug] = useState(eras[0]?.slug ?? "");
  const [creativeDirection, setCreativeDirection] = useState<CreativeDirectionId>(
    CONTENT_CREATOR_DEFAULTS.creativeDirection,
  );
  const [avoidEraTropes, setAvoidEraTropes] = useState(CONTENT_CREATOR_DEFAULTS.avoidEraTropes);
  const [maximizeVariation, setMaximizeVariation] = useState(CONTENT_CREATOR_DEFAULTS.maximizeVariation);
  const [printQuantity, setPrintQuantity] = useState(CONTENT_CREATOR_DEFAULTS.quantity);
  const [printSerialNumbers, setPrintSerialNumbers] = useState(CONTENT_CREATOR_DEFAULTS.printSerialNumbers);
  const [collectorEdition, setCollectorEdition] = useState(CONTENT_CREATOR_DEFAULTS.collectorEdition);
  const [numberFormat, setNumberFormat] = useState<PassNumberFormatId>(CONTENT_CREATOR_DEFAULTS.numberFormat);
  const [customFormat, setCustomFormat] = useState(CONTENT_CREATOR_DEFAULTS.customFormat);
  const [qrPlacement, setQrPlacement] = useState<PassQrPlacement>(() => resolveQrPlacement(null));
  const [savedQrPlacement, setSavedQrPlacement] = useState<PassQrPlacement>(() => resolveQrPlacement(null));
  const [top, setTop] = useState(defaultFields);
  const [front, setFront] = useState(defaultFields);
  const [back, setBack] = useState(defaultFields);
  const [collectorCardContent, setCollectorCardContent] = useState<CollectorCardContent>(DEFAULT_COLLECTOR_CARD.content);
  const [collectorCardPresentation, setCollectorCardPresentation] = useState<CollectorCardPresentation>(
    DEFAULT_COLLECTOR_CARD.presentation,
  );
  const [collectorDeckYear, setCollectorDeckYear] = useState<CollectorDeckYear>(1977);
  const [collectorDeckRank, setCollectorDeckRank] = useState<CollectorDeckRank>("1");
  const [collectorRankingCards, setCollectorRankingCards] = useState<CollectorCardContent[]>([]);
  const [collectorReviewYears, setCollectorReviewYears] = useState<CollectorDeckReviewYear[]>([]);
  const [collectorRankingBusy, setCollectorRankingBusy] = useState(false);
  const [collectorRankingError, setCollectorRankingError] = useState<string | null>(null);
  const [collectorWorkbenchOpen, setCollectorWorkbenchOpen] = useState(false);
  const [collectorWorkbenchStyle, setCollectorWorkbenchStyle] = useState<CollectorStyleId>("retroverse-signature");
  const [collectorWorkbenchBranding, setCollectorWorkbenchBranding] = useState<CollectorBrandingId>("retroverse");
  const [collectorTitleSize, setCollectorTitleSize] = useState<CollectorTitleSize>("large");
  const [collectorFactPlacement, setCollectorFactPlacement] = useState<CollectorFactPlacement>("bottom");
  const [collectorSuitPlacement, setCollectorSuitPlacement] = useState<CollectorSuitPlacement>("upper-right");
  const [collectorNumberPlacement, setCollectorNumberPlacement] = useState<CollectorNumberPlacement>("footer");
  const [collectorBorderStyle, setCollectorBorderStyle] = useState<CollectorBorderStyle>("bold");
  const [collectorConcepts, setCollectorConcepts] = useState<CollectorConcept[]>(DEFAULT_COLLECTOR_CONCEPTS);
  const [collectorConceptProvider, setCollectorConceptProvider] = useState<CollectorConceptProviderId>("ollama");
  const [collectorConceptModel, setCollectorConceptModel] = useState<string>("");
  const [collectorImageProvider, setCollectorImageProvider] = useState<CollectorImageProviderId>("local-placeholder");
  const [collectorGeneratedConcepts, setCollectorGeneratedConcepts] = useState<CollectorGeneratedConcept[]>([]);
  const [collectorFavoriteConceptId, setCollectorFavoriteConceptId] = useState<CollectorConceptId | null>(null);
  const [collectorBestConceptId, setCollectorBestConceptId] = useState<CollectorConceptId | null>(null);
  const [collectorEvaluation, setCollectorEvaluation] = useState<CollectorEvaluationState>(emptyCollectorEvaluationState);
  const [collectorEvaluationSavedAt, setCollectorEvaluationSavedAt] = useState<string | null>(null);
  const [collectorArtworkProvider, setCollectorArtworkProvider] = useState<CollectorArtworkProviderId>("chatgpt-images");
  const [collectorArtworkFile, setCollectorArtworkFile] = useState<CollectorArtworkFile | null>(null);
  const [collectorArtworkBusy, setCollectorArtworkBusy] = useState<string | null>(null);
  const [collectorArtworkError, setCollectorArtworkError] = useState<string | null>(null);
  const [collectorConceptBusy, setCollectorConceptBusy] = useState<string | null>(null);
  const [collectorConceptError, setCollectorConceptError] = useState<string | null>(null);
  const [frontOpen, setFrontOpen] = useState(false);
  const [backOpen, setBackOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [qrEditMode, setQrEditMode] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerError, setProviderError] = useState<ProviderErrorDetail | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const collectorWorkbenchRef = useRef<HTMLElement | null>(null);
  const [promptInspector, setPromptInspector] = useState<{
    front: ComposedRvbrPrompt | null;
    back: ComposedRvbrPrompt | null;
  }>({ front: null, back: null });
  const [qualityScores, setQualityScores] = useState<PromptQualityScores | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const collectorEvaluationRows = collectorConcepts.map((concept) => {
    const evaluation = collectorEvaluation.evaluations[concept.id] ?? defaultCollectorEvaluation(concept.id);
    return { concept, evaluation, total: collectorEvaluationTotal(evaluation.ratings) };
  });
  const collectorSelectedWinner = collectorEvaluation.targetConceptId
    ? collectorEvaluationRows.find((row) => row.concept.id === collectorEvaluation.targetConceptId)
    : null;
  const collectorBestEvaluation = [...collectorEvaluationRows].sort((a, b) => b.total - a.total)[0] ?? null;
  const collectorAverageScore =
    collectorEvaluationRows.length > 0
      ? collectorEvaluationRows.reduce((sum, row) => sum + row.total, 0) / collectorEvaluationRows.length
      : 0;
  const collectorCategoryAverages = COLLECTOR_EVALUATION_CATEGORIES.map((category) => ({
    ...category,
    average:
      collectorEvaluationRows.length > 0
        ? collectorEvaluationRows.reduce((sum, row) => sum + (row.evaluation.ratings[category.id] || 0), 0) /
          collectorEvaluationRows.length
        : 0,
  }));
  const collectorHighestCategory = [...collectorCategoryAverages].sort((a, b) => b.average - a.average)[0];
  const collectorLowestCategory = [...collectorCategoryAverages].sort((a, b) => a.average - b.average)[0];
  const collectorTargetConcept = collectorEvaluation.targetConceptId
    ? collectorConcepts.find((concept) => concept.id === collectorEvaluation.targetConceptId) ?? null
    : null;
  const collectorArtworkStatus = collectorArtworkFile?.status ?? "not-generated";
  const collectorFavoriteArtwork = collectorArtworkFile?.favoriteVariationId
    ? collectorArtworkFile.variations.find((variation) => variation.id === collectorArtworkFile.favoriteVariationId) ?? null
    : null;

  async function loadCollectorReviewRankings() {
    setCollectorRankingBusy(true);
    setCollectorRankingError(null);
    try {
      const results = await Promise.all(
        COLLECTOR_DECK_YEARS.map(async (year) => {
          const res = await fetch(`/api/ops/content-creator/collector-card/ranking?year=${year}`);
          const data = (await res.json()) as RetroverseHot100RankingResponse;
          if (!res.ok || !data.ok || !data.cards) throw new Error(data.error ?? `ranking_load_failed_${year}`);
          return {
            year,
            suit: COLLECTOR_DECK_YEAR_SUITS[year],
            cards: data.cards,
            liveCards: data.liveCards ?? data.cards,
            lockedAt: data.lockedAt ?? null,
            error: null,
          } satisfies CollectorDeckReviewYear;
        }),
      );
      setCollectorReviewYears(results);
      const selected = results.find((entry) => entry.year === collectorDeckYear) ?? results[0];
      const first = selected?.cards[0];
      setCollectorRankingCards(selected?.cards ?? []);
      if (selected && first) {
        setCollectorDeckYear(selected.year);
        setCollectorDeckRank("1");
        setCollectorCardContent(first);
        setCollectorCardPresentation({
          suit: selected.suit,
          rank: "1",
          cardType: "top10",
        });
      }
    } catch (e) {
      setCollectorRankingError(e instanceof Error ? e.message : "ranking_load_failed");
    } finally {
      setCollectorRankingBusy(false);
    }
  }

  useEffect(() => {
    if (artifact !== "collector-card") return;
    void loadCollectorReviewRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when entering collector workflow
  }, [artifact]);

  useEffect(() => {
    if (artifact !== "collector-card") return;
    const selected = collectorReviewYears.find((entry) => entry.year === collectorDeckYear);
    if (!selected) return;
    setCollectorRankingCards(selected.cards);
    const first = selected.cards[0];
    if (first) {
      setCollectorDeckRank("1");
      setCollectorCardContent(first);
      setCollectorCardPresentation({
        suit: selected.suit,
        rank: "1",
        cardType: "top10",
      });
    }
  }, [artifact, collectorDeckYear, collectorReviewYears]);

  useEffect(() => {
    if (artifact !== "collector-card" || !collectorWorkbenchOpen) return;
    void loadCollectorConceptState();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load saved concepts when switching target cards
  }, [
    artifact,
    collectorWorkbenchOpen,
    collectorCardContent.year,
    collectorCardContent.rvtr,
    collectorCardContent.song,
    collectorCardPresentation.suit,
    collectorCardPresentation.rank,
  ]);

  useEffect(() => {
    if (artifact !== "collector-card" || !collectorWorkbenchOpen) return;
    void runCollectorArtworkAction({ action: "load" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load saved artwork when switching target cards
  }, [
    artifact,
    collectorWorkbenchOpen,
    collectorCardContent.year,
    collectorCardContent.rvtr,
    collectorCardContent.song,
    collectorCardPresentation.suit,
    collectorCardPresentation.rank,
  ]);

  async function lockCollectorYear(year: CollectorDeckYear) {
    const entry = collectorReviewYears.find((candidate) => candidate.year === year);
    const cards = entry?.cards ?? [];
    setCollectorRankingBusy(true);
    setCollectorRankingError(null);
    try {
      const res = await fetch("/api/ops/content-creator/collector-card/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, cards }),
      });
      const data = (await res.json()) as RetroverseHot100RankingResponse;
      if (!res.ok || !data.ok || !data.cards) throw new Error(data.error ?? "lock_failed");
      await loadCollectorReviewRankings();
    } catch (e) {
      setCollectorRankingError(e instanceof Error ? e.message : "lock_failed");
    } finally {
      setCollectorRankingBusy(false);
    }
  }

  function exportCollectorYearCsv(year: CollectorDeckYear) {
    const entry = collectorReviewYears.find((candidate) => candidate.year === year);
    if (!entry) return;
    const rows = [
      ["Rank", "Song", "Artist", "RVTR", "Peak", "Weeks"],
      ...entry.cards.map((card) => [
        String(card.chartPosition ?? ""),
        card.song,
        card.artist,
        card.rvtr,
        String(card.peak ?? ""),
        String(card.weeks ?? ""),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `retroverse-hot-100-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyConceptFile(file: CollectorConceptApiFile) {
    setCollectorGeneratedConcepts(file.concepts);
    if (file.conceptDirections?.length) {
      setCollectorConcepts(file.conceptDirections.map(({ id, label, value }) => ({ id, label, value })));
    }
    if (file.conceptProvider) setCollectorConceptProvider(file.conceptProvider);
    if (file.conceptModel) setCollectorConceptModel(file.conceptModel);
    setCollectorEvaluation(file.evaluation ?? emptyCollectorEvaluationState());
    setCollectorEvaluationSavedAt(file.evaluation?.updatedAt ?? null);
    setCollectorFavoriteConceptId(file.favoriteConceptId);
    setCollectorBestConceptId(file.bestConceptId);
  }

  async function loadCollectorConceptState() {
    setCollectorConceptError(null);
    try {
      const res = await fetch("/api/ops/content-creator/collector-card/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "load",
          collectorCardContent,
          collectorCardPresentation,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; file?: CollectorConceptApiFile | null; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "concept_state_load_failed");
      if (data.file) {
        applyConceptFile(data.file);
      } else {
        setCollectorConcepts(DEFAULT_COLLECTOR_CONCEPTS);
        setCollectorConceptModel("");
        setCollectorGeneratedConcepts([]);
        setCollectorFavoriteConceptId(null);
        setCollectorBestConceptId(null);
        setCollectorEvaluation(emptyCollectorEvaluationState());
        setCollectorEvaluationSavedAt(null);
      }
    } catch (e) {
      setCollectorConceptError(e instanceof Error ? e.message : "concept_state_load_failed");
    }
  }

  async function saveCollectorEvaluation(evaluationOverride?: CollectorEvaluationState) {
    const evaluationToSave = evaluationOverride ?? collectorEvaluation;
    setCollectorConceptBusy("save-evaluation");
    setCollectorConceptError(null);
    try {
      const res = await fetch("/api/ops/content-creator/collector-card/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-evaluation",
          collectorCardContent,
          collectorCardPresentation,
          selectedStyle: collectorWorkbenchStyle,
          brandingChoice: collectorWorkbenchBranding,
          evaluation: evaluationToSave,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; file?: CollectorConceptApiFile; error?: string };
      if (!res.ok || !data.ok || !data.file) throw new Error(data.error ?? "evaluation_save_failed");
      applyConceptFile(data.file);
    } catch (e) {
      setCollectorConceptError(e instanceof Error ? e.message : "evaluation_save_failed");
    } finally {
      setCollectorConceptBusy(null);
    }
  }

  function selectCollectorTargetConcept(conceptId: CollectorConceptId) {
    const next = {
      ...collectorEvaluation,
      targetConceptId: conceptId,
      updatedAt: new Date().toISOString(),
    };
    setCollectorEvaluation(next);
    void saveCollectorEvaluation(next);
  }

  function applyCollectorArtworkFile(file: CollectorArtworkFile | null) {
    setCollectorArtworkFile(file);
  }

  async function runCollectorArtworkAction(args: {
    action: "load" | "generate" | "favorite" | "approve";
    favoriteVariationId?: string;
  }) {
    setCollectorArtworkBusy(args.action);
    setCollectorArtworkError(null);
    setProviderError(null);
    try {
      const res = await fetch("/api/ops/content-creator/collector-card/artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: args.action,
          collectorCardContent,
          collectorCardPresentation,
          selectedConcept: collectorTargetConcept,
          selectedStyle: collectorWorkbenchStyle,
          brandingChoice: collectorWorkbenchBranding,
          provider: collectorArtworkProvider,
          favoriteVariationId: args.favoriteVariationId,
        }),
      });
      const data = (await res.json()) as ProviderApiBody & { ok?: boolean; file?: CollectorArtworkFile | null };
      if (!res.ok || !data.ok) {
        raiseApiError(data, args.action === "generate" ? "artwork_generation_failed" : "artwork_action_failed");
      }
      applyCollectorArtworkFile(data.file ?? null);
    } catch (e) {
      setProviderError(readProviderError(e));
      setCollectorArtworkError(e instanceof Error ? e.message : "artwork_action_failed");
    } finally {
      setCollectorArtworkBusy(null);
    }
  }

  async function generateConceptDirections() {
    setCollectorConceptBusy("generate-concepts");
    setCollectorConceptError(null);
    try {
      const res = await fetch("/api/ops/content-creator/collector-card/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-concepts",
          collectorCardContent,
          collectorCardPresentation,
          selectedStyle: collectorWorkbenchStyle,
          brandingChoice: collectorWorkbenchBranding,
          conceptProvider: collectorConceptProvider,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        file?: CollectorConceptApiFile;
        conceptDirections?: CollectorGeneratedTextConcept[];
        conceptProvider?: CollectorConceptProviderId;
        conceptModel?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.file) throw new Error(data.error ?? "concept_generation_failed");
      applyConceptFile(data.file);
    } catch (e) {
      setCollectorConceptError(e instanceof Error ? e.message : "concept_generation_failed");
    } finally {
      setCollectorConceptBusy(null);
    }
  }

  async function favoriteConceptDirection(conceptId: CollectorConceptId) {
    setCollectorConceptBusy(conceptId);
    setCollectorConceptError(null);
    try {
      const res = await fetch("/api/ops/content-creator/collector-card/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "favorite-concept",
          collectorCardContent,
          collectorCardPresentation,
          conceptId,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; file?: CollectorConceptApiFile; error?: string };
      if (!res.ok || !data.ok || !data.file) throw new Error(data.error ?? "favorite_failed");
      applyConceptFile(data.file);
    } catch (e) {
      setCollectorConceptError(e instanceof Error ? e.message : "favorite_failed");
    } finally {
      setCollectorConceptBusy(null);
    }
  }

  async function runConceptAction(args: {
    action?: "generate" | "favorite" | "best";
    conceptId?: CollectorConceptId;
    regenerateConceptId?: CollectorConceptId;
  }) {
    setCollectorConceptBusy(args.regenerateConceptId ?? args.conceptId ?? "generate");
    setCollectorConceptError(null);
    try {
      const res = await fetch("/api/ops/content-creator/collector-card/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: args.action ?? "generate",
          collectorCardContent,
          collectorCardPresentation,
          concepts: collectorConcepts,
          selectedStyle: collectorWorkbenchStyle,
          brandingChoice: collectorWorkbenchBranding,
          provider: collectorImageProvider,
          conceptId: args.conceptId,
          regenerateConceptId: args.regenerateConceptId,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; file?: CollectorConceptApiFile; error?: string };
      if (!res.ok || !data.ok || !data.file) throw new Error(data.error ?? "concept_action_failed");
      applyConceptFile(data.file);
    } catch (e) {
      setCollectorConceptError(e instanceof Error ? e.message : "concept_action_failed");
    } finally {
      setCollectorConceptBusy(null);
    }
  }

  async function refreshCollectorRankings() {
    await loadCollectorReviewRankings();
  }

  useEffect(() => {
    const runId = searchParams.get("runId");
    const duplicateId = searchParams.get("duplicate");
    const loadId = duplicateId ?? runId;
    if (!loadId) return;

    void (async () => {
      try {
        const res = await fetch(`/api/ops/content-creator/library/${encodeURIComponent(loadId)}`);
        const data = (await res.json()) as {
          ok?: boolean;
          generation?: {
            runId: string;
            eraSlug: string;
            creativeDirection: CreativeDirectionId;
            creativeSettings?: {
              creativeDirection: CreativeDirectionId;
              avoidEraTropes: boolean;
              maximizeVariation: boolean;
            };
            event: string;
            venue: string;
            date: string;
            secondaryLine: string;
            passTypeLabel: string;
            qrUrl: string;
            qrPlacement?: PassQrPlacement;
            exportZipPath: string | null;
            frontUrl: string;
            backUrl: string;
            template?: {
              isTemplate: boolean;
              templateName: string;
              usedCount: number;
            };
          };
        };
        if (!res.ok || !data.generation) return;
        const g = data.generation;
        setEraSlug(g.eraSlug);
        setCreativeDirection(g.creativeDirection);
        if (g.creativeSettings) {
          setCreativeDirection(g.creativeSettings.creativeDirection);
          setAvoidEraTropes(g.creativeSettings.avoidEraTropes);
          setMaximizeVariation(g.creativeSettings.maximizeVariation);
        }
        const fields = {
          event: g.event,
          venue: g.venue,
          date: g.date,
          secondaryLine: g.secondaryLine,
          passTypeLabel: g.passTypeLabel as ControlledPassTypeLabel,
          qrUrl: g.qrUrl,
        };
        setTop(fields);
        setFront(fields);
        setBack(fields);
        const placement = resolveQrPlacement({ qrPlacement: normalizeQrPlacement(g.qrPlacement) });
        setQrPlacement(placement);
        setSavedQrPlacement(placement);

        if (duplicateId) {
          if (g.template?.isTemplate) {
            void fetch(`/api/ops/content-creator/library/${encodeURIComponent(duplicateId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                template: {
                  isTemplate: true,
                  templateName: g.template.templateName,
                  usedCount: g.template.usedCount + 1,
                  lastUsedAt: new Date().toISOString(),
                },
              }),
            });
          }
          const t = Date.now();
          setRun({
            runId: "",
            frontUrl: `${g.frontUrl}?t=${t}`,
            backUrl: `${g.backUrl}?t=${t}`,
            artworkBackUrl: `${g.backUrl}?t=${t}`,
          });
          return;
        }

        const t = Date.now();
        setRun({
          runId: g.runId,
          frontUrl: `/api/ops/content-creator/vnext/files/${encodeURIComponent(g.runId)}/front.png?t=${t}`,
          backUrl: `/api/ops/content-creator/vnext/files/${encodeURIComponent(g.runId)}/back.png?t=${t}`,
          artworkBackUrl: `/api/ops/content-creator/vnext/files/${encodeURIComponent(g.runId)}/back.png?t=${t}`,
          exportZipUrl: g.exportZipPath
            ? `/api/ops/content-creator/vnext/files/${encodeURIComponent(g.runId)}/${encodeURIComponent(g.exportZipPath.split("/").pop() ?? "")}`
            : undefined,
        });
      } catch {
        // library entry may exist without live vnext run
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when query present
  }, [searchParams]);

  async function composePrompts(): Promise<void> {
    const cardFields = cardFieldsFromContent(collectorCardContent);
    const payload = {
      eraSlug,
      artifact,
      event: artifact === "collector-card" ? cardFields.event : top.event,
      venue: artifact === "collector-card" ? cardFields.venue : top.venue,
      date: artifact === "collector-card" ? cardFields.date : top.date,
      secondaryLine: artifact === "collector-card" ? cardFields.secondaryLine : top.secondaryLine,
      passTypeLabel: artifact === "collector-card" ? cardFields.passTypeLabel : top.passTypeLabel,
      qrUrl: artifact === "collector-card" ? cardFields.qrUrl : top.qrUrl,
      compositionSeed: Date.now(),
      ...(artifact === "collector-card" ? collectorCardPayload(collectorCardContent, collectorCardPresentation) : {}),
      ...creativePayload(creativeDirection, avoidEraTropes, maximizeVariation),
    };

    const [frontRes, backRes] = await Promise.all([
      fetch("/api/ops/content-creator/vnext/compose-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, side: "front" }),
      }),
      fetch("/api/ops/content-creator/vnext/compose-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, side: "back" }),
      }),
    ]);

    const frontData = (await frontRes.json()) as ComposedRvbrPrompt & { ok?: boolean; error?: string };
    const backData = (await backRes.json()) as ComposedRvbrPrompt & { ok?: boolean; error?: string };
    if (!frontRes.ok || !frontData.finalPrompt) throw new Error(frontData.error ?? "compose_front_failed");
    if (!backRes.ok || !backData.finalPrompt) throw new Error(backData.error ?? "compose_back_failed");

    setPromptInspector({ front: frontData, back: backData });
    setQualityScores(frontData.qualityScores);
  }

  async function viewPrompt() {
    setBusy(true);
    setError(null);
    setProviderError(null);
    try {
      await composePrompts();
      setInspectorOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "compose_failed");
    } finally {
      setBusy(false);
    }
  }

  async function pollJobUntilDone(jobId: string): Promise<RunState> {
    for (let i = 0; i < 180; i++) {
      const res = await fetch(`/api/ops/content-creator/jobs/${encodeURIComponent(jobId)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        job?: {
          status: string;
          error: string | null;
          errorDetail?: ProviderErrorDetail | null;
          result: { runId?: string; frontUrl?: string; backUrl?: string } | null;
        };
      };
      const job = data.job;
      if (!res.ok || !job) throw new Error("job_poll_failed");
      if (job.status === "completed" && job.result?.runId) {
        const t = Date.now();
        const backUrl = `${job.result.backUrl ?? `/api/ops/content-creator/vnext/files/${job.result.runId}/back.png`}?t=${t}`;
        return {
          runId: job.result.runId,
          frontUrl: `${job.result.frontUrl ?? `/api/ops/content-creator/vnext/files/${job.result.runId}/front.png`}?t=${t}`,
          backUrl,
          artworkBackUrl: backUrl,
        };
      }
      if (job.status === "failed") {
        raiseApiError(
          { error: job.error ?? "generate_failed", providerError: job.errorDetail ?? undefined },
          "generate_failed",
        );
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("job_timeout");
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setProviderError(null);
    const cardFields = cardFieldsFromContent(collectorCardContent);
    const f = artifact === "collector-card" ? cardFields : { ...top };
    const b = artifact === "collector-card" ? cardFields : { ...top };
    setFront(f);
    setBack(b);
    try {
      const payload = {
        eraSlug,
        artifact,
        ...fieldsPayload("front", f),
        ...fieldsPayload("back", b),
        ...(artifact === "collector-card" ? collectorCardPayload(collectorCardContent, collectorCardPresentation) : {}),
        ...creativePayload(creativeDirection, avoidEraTropes, maximizeVariation),
        background: true,
      };
      const res = await fetch("/api/ops/content-creator/vnext/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as RunState &
        ProviderApiBody & {
          ok?: boolean;
          background?: boolean;
          jobId?: string;
          promptInspector?: { front: ComposedRvbrPrompt; back: ComposedRvbrPrompt };
          qualityScores?: PromptQualityScores;
        };
      if (!res.ok || !data.ok) raiseApiError(data, "generate_failed");

      if (data.background && data.jobId) {
        const result = await pollJobUntilDone(data.jobId);
        setRun(result);
        setSavedQrPlacement(qrPlacement);
        return;
      }

      const t = Date.now();
      const backUrl = `${data.backUrl}?t=${t}`;
      setRun({
        runId: data.runId,
        frontUrl: `${data.frontUrl}?t=${t}`,
        backUrl,
        artworkBackUrl: backUrl,
      });
      setSavedQrPlacement(qrPlacement);
      if (data.promptInspector) {
        setPromptInspector(data.promptInspector);
        setQualityScores(data.qualityScores ?? data.promptInspector.front.qualityScores);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "generate_failed");
      setProviderError(readProviderError(e));
    } finally {
      setBusy(false);
    }
  }

  async function printScanTest() {
    if (!run?.runId) return;
    if (!run.exportZipUrl) {
      setError(QR_EXPORT_REQUIRED_MESSAGE);
      return;
    }
    try {
      const res = await fetch("/api/ops/content-creator/vnext/print-scan-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: run.runId }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? QR_EXPORT_REQUIRED_MESSAGE);
        }
        throw new Error("print_scan_test_failed");
      }
      const html = await res.text();
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "print_scan_test_failed");
    }
  }

  async function regenerateFront() {
    if (!run) return;
    setBusy(true);
    setError(null);
    setProviderError(null);
    try {
      const res = await fetch("/api/ops/content-creator/vnext/regenerate-front", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.runId,
          eraSlug,
          ...fieldsPayload("front", front),
          ...creativePayload(creativeDirection, avoidEraTropes, maximizeVariation),
        }),
      });
      const data = (await res.json()) as RunState & ProviderApiBody & { ok?: boolean };
      if (!res.ok || !data.ok) raiseApiError(data, "regenerate_failed");
      setRun({
        ...run,
        frontUrl: `${data.frontUrl}?t=${Date.now()}`,
        exportZipUrl: undefined,
        qrVerification: undefined,
        qrStatus: undefined,
        downloads: undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "regenerate_failed");
      setProviderError(readProviderError(e));
    } finally {
      setBusy(false);
    }
  }

  async function regenerateBack() {
    if (!run) return;
    setBusy(true);
    setError(null);
    setProviderError(null);
    try {
      const res = await fetch("/api/ops/content-creator/vnext/regenerate-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.runId,
          eraSlug,
          ...fieldsPayload("back", back),
          ...creativePayload(creativeDirection, avoidEraTropes, maximizeVariation),
        }),
      });
      const data = (await res.json()) as RunState & ProviderApiBody & { ok?: boolean };
      if (!res.ok || !data.ok) raiseApiError(data, "regenerate_failed");
      const t = Date.now();
      const backUrl = `${data.backUrl}?t=${t}`;
      setRun({
        ...run,
        backUrl,
        artworkBackUrl: backUrl,
        exportZipUrl: undefined,
        qrVerification: undefined,
        qrStatus: undefined,
        downloads: undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "regenerate_failed");
      setProviderError(readProviderError(e));
    } finally {
      setBusy(false);
    }
  }

  const numberingSettings = useMemo(
    () => ({
      printSerialNumbers,
      collectorEdition,
      numberFormat,
      customFormat,
    }),
    [printSerialNumbers, collectorEdition, numberFormat, customFormat],
  );

  const serialPreview = useMemo(
    () => serialNumberPreview(numberingSettings, printQuantity),
    [numberingSettings, printQuantity],
  );

  function exportRequestBody() {
    return {
      runId: run?.runId,
      eraSlug,
      artifact,
      quantity: printQuantity,
      qrUrl: back.qrUrl,
      printSerialNumbers,
      collectorEdition,
      numberFormat,
      customFormat,
      qrPlacement,
    };
  }

  async function saveQrPlacement() {
    if (!run?.runId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/content-creator/vnext/qr-placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...exportRequestBody(), runId: run.runId }),
      });
      const data = (await res.json()) as { ok?: boolean; qrPlacement?: PassQrPlacement; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "qr_placement_save_failed");
      const placement = resolveQrPlacement({ qrPlacement: normalizeQrPlacement(data.qrPlacement) });
      setQrPlacement(placement);
      setSavedQrPlacement(placement);
      setRun({
        ...run,
        exportZipUrl: undefined,
        qrVerification: undefined,
        qrStatus: undefined,
        downloads: undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "qr_placement_save_failed");
    } finally {
      setBusy(false);
    }
  }

  function applyExportResponse(prev: RunState, data: ExportApiResponse): RunState {
    const qrVerification = data.qrVerification;
    const qrStatus =
      data.qrStatus ?? resolveQrExportStatus({ exported: true, qrVerification });
    return {
      ...prev,
      exportZipUrl: data.exportZipUrl,
      backUrl: data.singleBackUrl ? `${data.singleBackUrl}?t=${Date.now()}` : prev.backUrl,
      artworkBackUrl: prev.artworkBackUrl ?? prev.backUrl,
      qrVerification,
      qrStatus,
      downloads: {
        exportZipUrl: data.exportZipUrl,
        singleFrontUrl: data.singleFrontUrl,
        singleBackUrl: data.singleBackUrl,
        singlePassZipUrl: data.singlePassZipUrl,
        printFrontPngUrls: data.printFrontPngUrls,
        printBackPngUrls: data.printBackPngUrls,
        printFrontPdfUrls: data.printFrontPdfUrls,
        printBackPdfUrls: data.printBackPdfUrls,
        printInstructionsUrl: data.printInstructionsUrl,
      },
    };
  }

  async function exportPackage() {
    if (!run) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/content-creator/vnext/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...exportRequestBody(), runId: run.runId }),
      });
      const data = (await res.json()) as ExportApiResponse;
      if (!res.ok || !data.ok) {
        if (data.qrVerification) {
          setRun({
            ...run,
            qrVerification: data.qrVerification,
            qrStatus: "failed",
          });
        }
        throw new Error(data.error ?? "export_failed");
      }
      setRun(applyExportResponse(run, data));
      setSavedQrPlacement(qrPlacement);
    } catch (e) {
      setError(e instanceof Error ? e.message : "export_failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportPrintSheet() {
    if (!run) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/content-creator/vnext/export-print-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...exportRequestBody(), runId: run.runId }),
      });
      const data = (await res.json()) as ExportApiResponse;
      if (!res.ok || !data.ok) {
        if (data.qrVerification) {
          setRun({
            ...run,
            qrVerification: data.qrVerification,
            qrStatus: "failed",
          });
        }
        throw new Error(data.error ?? "export_print_sheet_failed");
      }
      setRun(applyExportResponse(run, data));
      setSavedQrPlacement(qrPlacement);
    } catch (e) {
      setError(e instanceof Error ? e.message : "export_print_sheet_failed");
    } finally {
      setBusy(false);
    }
  }

  function FieldGrid(props: {
    fields: ContentFields;
    onChange: (f: ContentFields) => void;
    showQr?: boolean;
  }) {
    const { fields, onChange, showQr } = props;
    return (
      <div className="cc-creator__field-grid">
        <label className="cc-creator__field">
          <span>Event</span>
          <input value={fields.event} onChange={(e) => onChange({ ...fields, event: e.target.value })} />
        </label>
        <label className="cc-creator__field">
          <span>Venue</span>
          <input value={fields.venue} onChange={(e) => onChange({ ...fields, venue: e.target.value })} />
        </label>
        <label className="cc-creator__field">
          <span>Date</span>
          <input value={fields.date} onChange={(e) => onChange({ ...fields, date: e.target.value })} />
        </label>
        <label className="cc-creator__field">
          <span>Secondary Line</span>
          <input
            value={fields.secondaryLine}
            onChange={(e) => onChange({ ...fields, secondaryLine: e.target.value })}
          />
        </label>
        <label className="cc-creator__field">
          <span>Pass type</span>
          <select
            value={fields.passTypeLabel}
            onChange={(e) => onChange({ ...fields, passTypeLabel: normalizePassTypeLabel(e.target.value) })}
          >
            {CONTROLLED_PASS_TYPE_LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {showQr ? (
          <label className="cc-creator__field">
            <span>QR URL</span>
            <input value={fields.qrUrl} onChange={(e) => onChange({ ...fields, qrUrl: e.target.value })} />
          </label>
        ) : null}
      </div>
    );
  }

  function CollectorStyleCard(props: {
    styleId: CollectorStyleId;
    styleLabel: string;
    card: CollectorCardContent;
    branding?: string;
    compact?: boolean;
  }) {
    const { styleId, styleLabel, card, branding, compact } = props;
    return (
      <article className={`cc-style-card cc-style-card--${styleId}${compact ? " cc-style-card--compact" : ""}`}>
        <div className="cc-style-card__topline">
          <span>{branding}</span>
          <strong>#1 ♠</strong>
        </div>
        <div className="cc-style-card__art">Placeholder Artwork</div>
        <div className="cc-style-card__body">
          <p className="cc-style-card__style">{styleLabel}</p>
          <h3>{card.song || "Retroverse Hot 100 #1"}</h3>
          <p className="cc-style-card__artist">{card.artist || "Artist"} · 1977</p>
          <p className="cc-style-card__fact">{card.fact || "Retroverse Hot 100 rank #1 for 1977."}</p>
        </div>
        <div className="cc-style-card__number">RVYR 1977 · 01/56</div>
      </article>
    );
  }

  function CollectorSuitTile(props: { experiment: (typeof COLLECTOR_SUIT_EXPERIMENTS)[number] }) {
    return (
      <div className={`cc-suit-tile cc-suit-tile--${props.experiment.id}`}>
        <span>{props.experiment.mark}</span>
        <strong>{props.experiment.label}</strong>
      </div>
    );
  }

  function CollectorWorkbenchPreview() {
    const brand = COLLECTOR_BRANDING_EXPERIMENTS.find((item) => item.id === collectorWorkbenchBranding)?.text ?? "";
    return (
      <article
        className={[
          "cc-workbench-card",
          `cc-workbench-card--${collectorWorkbenchStyle}`,
          `cc-workbench-card--title-${collectorTitleSize}`,
          `cc-workbench-card--fact-${collectorFactPlacement}`,
          `cc-workbench-card--suit-${collectorSuitPlacement}`,
          `cc-workbench-card--number-${collectorNumberPlacement}`,
          `cc-workbench-card--border-${collectorBorderStyle}`,
        ].join(" ")}
      >
        <div className="cc-workbench-card__brand">{brand}</div>
        <div className="cc-workbench-card__suit">
          <strong>{collectorCardPresentation.rank}</strong>
          <span>{COLLECTOR_CARD_SUIT_LABELS[collectorCardPresentation.suit]}</span>
        </div>
        <div className="cc-workbench-card__art">Placeholder Artwork Direction</div>
        <div className="cc-workbench-card__copy">
          <h3>{collectorCardContent.song || "Selected Song"}</h3>
          <p className="cc-workbench-card__artist">
            {collectorCardContent.artist || "Artist"} · {collectorCardContent.year}
          </p>
          <p className="cc-workbench-card__fact">{collectorCardContent.fact || "Editable short fact goes here."}</p>
        </div>
        <div className="cc-workbench-card__number">
          {collectorCardContent.year} · {collectorCardPresentation.suit.toUpperCase()} · {collectorCardPresentation.rank}/56
        </div>
      </article>
    );
  }

  const qrStatus: QrExportStatus =
    run?.qrStatus ??
    resolveQrExportStatus({
      exported: Boolean(run?.exportZipUrl),
      qrVerification: run?.qrVerification,
    });
  const qrPlacementDirty = !sameQrPlacement(qrPlacement, savedQrPlacement);
  const hasCurrentExportedQr = Boolean(run?.exportZipUrl && !qrPlacementDirty);
  const backPreviewUrl =
    run && hasCurrentExportedQr && !qrEditMode ? run.backUrl : run?.artworkBackUrl ?? run?.backUrl;
  const showQrPlacementOverlay = Boolean(run?.backUrl && (qrEditMode || !hasCurrentExportedQr));

  const qrWarn =
    run?.qrVerification &&
    (run.qrVerification.matrixFillWarning ||
      run.qrVerification.printSizeWarning ||
      !run.qrVerification.decodePass);

  function statusForSlot(rank: CollectorDeckRank, content: CollectorCardContent | null): CollectorDeckSlotStatus {
    if (!content || !content.song) return "empty";
    if (
      run?.runId &&
      collectorCardContent.year === content.year &&
      collectorCardPresentation.rank === rank
    ) {
      return "generated";
    }
    return content.rvtr ? "ready" : "needs_review";
  }

  const collectorDeckSlots: CollectorDeckSlot[] = COLLECTOR_DECK_RANKS.map((rank) => {
    const isFace = rank === "J" || rank === "Q" || rank === "K";
    const content = isFace ? collectorCardForRetroversePick(collectorDeckYear, rank).content : collectorRankingCards[Number(rank) - 1] ?? null;
    const card: CollectorCard = isFace
      ? collectorCardForRetroversePick(collectorDeckYear, rank)
      : {
          content:
            content ?? {
              ...COLLECTOR_CARD_EMPTY_CONTENT,
              year: collectorDeckYear,
              chartPosition: Number(rank),
            },
          presentation: {
            suit: COLLECTOR_DECK_YEAR_SUITS[collectorDeckYear],
            rank,
            cardType: "top10",
          },
        };
    return { rank, card, status: isFace ? "empty" : statusForSlot(rank, content) };
  });

  function selectCollectorSlot(slot: CollectorDeckSlot) {
    setCollectorDeckRank(slot.rank);
    setCollectorCardContent(slot.card.content);
    setCollectorCardPresentation(slot.card.presentation);
  }

  function openCollectorWorkbench(card: CollectorCardContent, rank: CollectorDeckRank) {
    const suit = COLLECTOR_DECK_YEAR_SUITS[card.year as CollectorDeckYear] ?? "spades";
    setCollectorDeckYear(card.year as CollectorDeckYear);
    setCollectorDeckRank(rank);
    setCollectorCardContent(card);
    setCollectorCardPresentation({
      suit,
      rank,
      cardType: "top10",
    });
    setCollectorWorkbenchOpen(true);
    window.requestAnimationFrame(() => {
      collectorWorkbenchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const selectedCollectorSlot =
    collectorDeckSlots.find((slot) => slot.rank === collectorDeckRank) ?? collectorDeckSlots[0];
  const styleLabSampleCard =
    collectorReviewYears.find((entry) => entry.year === 1977)?.cards[0] ??
    collectorCardContent ??
    COLLECTOR_CARD_EMPTY_CONTENT;

  return (
    <div className="cc-creator">
      <JobQueuePanel />
      <header className="cc-creator__titlebar">
        <h1>Content Creator</h1>
      </header>

      <section className="cc-creator__create-panel" aria-label="Create product type">
        <span className="cc-creator__setup-label">Create</span>
        <div className="cc-creator__radio-row">
          <label className="cc-creator__radio-choice">
            <input
              type="radio"
              name="artifact"
              value="pass"
              checked={artifact === "pass"}
              onChange={() => setArtifact("pass")}
            />
            <span>Event Pass</span>
          </label>
          <label className="cc-creator__radio-choice">
            <input
              type="radio"
              name="artifact"
              value="collector-card"
              checked={artifact === "collector-card"}
              onChange={() => setArtifact("collector-card")}
            />
            <span>Collector Card</span>
          </label>
        </div>
      </section>

      {artifact === "pass" ? <section className="cc-creator__hero" aria-label="Artwork previews">
        <figure className="cc-creator__preview">
          <figcaption>Front Preview</figcaption>
          <div className="cc-creator__preview-frame">
            {run?.frontUrl ? (
              <img src={run.frontUrl} alt="Front artwork preview" />
            ) : (
              <p className="cc-creator__preview-placeholder">Generate to see your pass front</p>
            )}
          </div>
        </figure>
        <figure className="cc-creator__preview">
          <figcaption>{hasCurrentExportedQr ? "Back Preview (exported)" : "Back Preview"}</figcaption>
          <div className="cc-creator__preview-frame cc-creator__preview-frame--back">
            <div className="cc-creator__pass-aspect">
              {backPreviewUrl ? (
                <>
                  <img src={backPreviewUrl} alt="Back artwork preview" className="cc-creator__pass-img" />
                  {showQrPlacementOverlay ? (
                    <QrPlacementEditor placement={qrPlacement} editing={qrEditMode} onChange={setQrPlacement} />
                  ) : null}
                </>
              ) : (
                <p className="cc-creator__preview-placeholder">Generate to see your pass back</p>
              )}
            </div>
          </div>
        </figure>
      </section> : null}

      <section className="cc-creator__action-bar" aria-label="Primary actions">
        {artifact === "pass" ? <button
          type="button"
          className="cc-creator__btn cc-creator__btn--generate"
          disabled={busy || !eraSlug || !creativeDirection}
          onClick={() => void generate()}
        >
          {busy ? "Creating…" : "Generate"}
        </button> : null}
        {artifact === "pass" ? <button
          type="button"
          className="cc-creator__btn cc-creator__btn--export"
          disabled={busy || !run}
          onClick={() => void exportPackage()}
        >
          Export
        </button> : null}
        {artifact === "pass" ? <button
          type="button"
          className="cc-creator__btn cc-creator__btn--secondary"
          disabled={busy || !run}
          onClick={() => void exportPrintSheet()}
        >
          Print Sheet
        </button> : null}
        {artifact === "pass" ? <button
          type="button"
          className={`cc-creator__btn cc-creator__btn--secondary${qrEditMode ? " is-on" : ""}`}
          disabled={!run?.backUrl}
          onClick={() => setQrEditMode((v) => !v)}
          aria-pressed={qrEditMode}
        >
          Edit QR Area
        </button> : null}
        <Link href="/ops/content-creator" className="cc-creator__btn cc-creator__btn--secondary">
          Library
        </Link>
        {artifact === "collector-card" ? (
          <span className="cc-creator__validation-note">Deck Review mode: generation disabled.</span>
        ) : null}
      </section>

      {artifact === "collector-card" ? (
        <section className="cc-creator__event-panel cc-creator__card-panel" aria-label="Collector card workflow">
          <div className="cc-creator__event-head">
            <h2>Deck Review</h2>
            <p className="cc-creator__qr-hint">
              Review-only validation. Cards 1-10 come from Retroverse Hot 100; J/Q/K and Jokers are placeholders.
            </p>
          </div>
          <div className="cc-creator__review-actions">
            <button
              type="button"
              className="cc-creator__btn cc-creator__btn--secondary"
              disabled={collectorRankingBusy}
              onClick={() => void refreshCollectorRankings()}
            >
              Refresh Rankings
            </button>
            <span>Album 200 exists, but coverage is incomplete. Album cards are not part of this phase.</span>
          </div>
          {collectorRankingBusy ? <p className="cc-creator__qr-hint">Loading Retroverse Hot 100...</p> : null}
          {collectorRankingError ? <p className="cc-creator__qr-warning">{collectorRankingError}</p> : null}

          <div className="cc-creator__review-summary" aria-label="Deck summary">
            {COLLECTOR_DECK_YEARS.map((year) => {
              const entry = collectorReviewYears.find((candidate) => candidate.year === year);
              const assigned = entry?.cards.filter((card) => card.song && card.artist).length ?? 0;
              return (
                <p key={year}>
                  <strong>{year}:</strong> {assigned}/10 assigned
                </p>
              );
            })}
            <p>
              <strong>Total cards:</strong> 40 ranking cards · 12 Retroverse picks · 4 Jokers · 56 total cards
            </p>
          </div>

          <section className="cc-style-lab" aria-label="Collector Deck Style Lab">
            <div className="cc-style-lab__head">
              <div>
                <h3>Style Lab</h3>
                <p>Same sample card for every comparison: 1977 · Rank #1 · Spades. Placeholder artwork only.</p>
              </div>
              <span>Style planning only · Generate real artwork in Card Workbench</span>
            </div>

            <div className="cc-style-lab__compare" aria-label="Compare Mode">
              {COLLECTOR_STYLE_LAB_STYLES.map((style) => (
                <div key={style.id} className="cc-style-lab__option">
                  <CollectorStyleCard
                    styleId={style.id}
                    styleLabel={style.label}
                    card={styleLabSampleCard}
                    branding="Retroverse"
                  />
                  <p>{style.notes}</p>
                </div>
              ))}
            </div>

            <div className="cc-style-lab__systems">
              <section>
                <h4>Suit Experiments</h4>
                <div className="cc-suit-grid">
                  {COLLECTOR_SUIT_EXPERIMENTS.map((experiment) => (
                    <CollectorSuitTile key={experiment.id} experiment={experiment} />
                  ))}
                </div>
              </section>
              <section>
                <h4>Color Systems</h4>
                <div className="cc-color-grid">
                  {COLLECTOR_COLOR_SYSTEMS.map((system) => (
                    <div key={system.id} className={`cc-color-system cc-color-system--${system.id}`}>
                      <span />
                      <strong>{system.label}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="cc-style-lab__branding" aria-label="Branding Experiments">
              <h4>Branding Experiments</h4>
              <div className="cc-brand-grid">
                {COLLECTOR_BRANDING_EXPERIMENTS.map((brand) => (
                  <div key={brand.id} className="cc-brand-option">
                    <span>{brand.label}</span>
                    <CollectorStyleCard
                      styleId="retroverse-signature"
                      styleLabel="Retroverse Signature"
                      card={styleLabSampleCard}
                      branding={brand.text}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="cc-style-lab__questions">
              <h4>Design Questions</h4>
              <ol>
                <li>What instantly makes a card feel Retroverse?</li>
                <li>Does the deck need a logo?</li>
                <li>Is “Press Play for the Past” enough branding?</li>
                <li>Which layout feels like a cultural artifact instead of a trading card?</li>
                <li>Which style could realistically support all 56 cards in a deck?</li>
              </ol>
            </section>
          </section>

          {collectorWorkbenchOpen ? (
            <section ref={collectorWorkbenchRef} className="cc-card-workbench" aria-label="Collector Card Workbench">
              <div className="cc-card-workbench__head">
                <div>
                  <span className="cc-card-workbench__target-label">TARGET CARD</span>
                  <h3>Card Workbench</h3>
                  <p>
                    {collectorCardContent.year} · {COLLECTOR_CARD_SUIT_LABELS[collectorCardPresentation.suit]} · #
                    {collectorCardPresentation.rank} · {collectorCardContent.song} · {collectorCardContent.artist}
                  </p>
                </div>
                <span>Target Card Mode · One-card artwork generation</span>
              </div>

              <div className="cc-card-workbench__grid">
                <aside className="cc-card-workbench__panel">
                  <h4>Card Metadata</h4>
                  <dl className="cc-card-workbench__meta">
                    <dt>Year</dt>
                    <dd>{collectorCardContent.year}</dd>
                    <dt>Suit</dt>
                    <dd>{COLLECTOR_CARD_SUIT_LABELS[collectorCardPresentation.suit]}</dd>
                    <dt>Rank</dt>
                    <dd>{collectorCardPresentation.rank}</dd>
                    <dt>Song</dt>
                    <dd>{collectorCardContent.song}</dd>
                    <dt>Artist</dt>
                    <dd>{collectorCardContent.artist}</dd>
                    <dt>RVTR</dt>
                    <dd>{collectorCardContent.rvtr || "Needs Review"}</dd>
                    <dt>Peak</dt>
                    <dd>{collectorCardContent.peak ?? ""}</dd>
                    <dt>Weeks</dt>
                    <dd>{collectorCardContent.weeks ?? ""}</dd>
                  </dl>
                  <label className="cc-creator__field">
                    <span>Editable short fact</span>
                    <textarea
                      value={collectorCardContent.fact}
                      onChange={(e) => setCollectorCardContent({ ...collectorCardContent, fact: e.target.value })}
                      rows={4}
                    />
                  </label>
                </aside>

                <section className="cc-card-workbench__preview-panel">
                  <h4>Front Preview</h4>
                  <CollectorWorkbenchPreview />
                  <div className="cc-card-workbench__controls">
                    <label>
                      <span>Style</span>
                      <select
                        value={collectorWorkbenchStyle}
                        onChange={(e) => setCollectorWorkbenchStyle(e.target.value as CollectorStyleId)}
                      >
                        {COLLECTOR_STYLE_LAB_STYLES.map((style) => (
                          <option key={style.id} value={style.id}>
                            {style.label.replace(/^[A-E]\.\s*/, "")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Branding</span>
                      <select
                        value={collectorWorkbenchBranding}
                        onChange={(e) => setCollectorWorkbenchBranding(e.target.value as CollectorBrandingId)}
                      >
                        {COLLECTOR_BRANDING_EXPERIMENTS.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.text || "No branding"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Title size</span>
                      <select value={collectorTitleSize} onChange={(e) => setCollectorTitleSize(e.target.value as CollectorTitleSize)}>
                        <option value="standard">Standard</option>
                        <option value="large">Large</option>
                        <option value="poster">Poster</option>
                      </select>
                    </label>
                    <label>
                      <span>Fact placement</span>
                      <select
                        value={collectorFactPlacement}
                        onChange={(e) => setCollectorFactPlacement(e.target.value as CollectorFactPlacement)}
                      >
                        <option value="bottom">Bottom</option>
                        <option value="caption">Caption</option>
                        <option value="side">Side</option>
                      </select>
                    </label>
                    <label>
                      <span>Suit placement</span>
                      <select
                        value={collectorSuitPlacement}
                        onChange={(e) => setCollectorSuitPlacement(e.target.value as CollectorSuitPlacement)}
                      >
                        <option value="upper-right">Upper-right</option>
                        <option value="badge">Badge</option>
                        <option value="sidebar">Sidebar</option>
                      </select>
                    </label>
                    <label>
                      <span>Card numbering</span>
                      <select
                        value={collectorNumberPlacement}
                        onChange={(e) => setCollectorNumberPlacement(e.target.value as CollectorNumberPlacement)}
                      >
                        <option value="footer">Footer</option>
                        <option value="backstamp">Backstamp</option>
                        <option value="corner">Corner</option>
                      </select>
                    </label>
                    <label>
                      <span>Border style</span>
                      <select
                        value={collectorBorderStyle}
                        onChange={(e) => setCollectorBorderStyle(e.target.value as CollectorBorderStyle)}
                      >
                        <option value="plain">Plain</option>
                        <option value="archive">Archive</option>
                        <option value="bold">Bold</option>
                        <option value="ornate">Ornate</option>
                      </select>
                    </label>
                  </div>
                  <div className="cc-card-workbench__quick-generate">
                    <div>
                      <span>Artwork Status</span>
                      <strong>{COLLECTOR_ARTWORK_STATUS_LABELS[collectorArtworkStatus]}</strong>
                      <small>
                        {collectorTargetConcept
                          ? `Target concept: ${collectorTargetConcept.label.replace(/^Concept [A-D] · /, "")}`
                          : "Select a target concept in Concept Variations first."}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="cc-creator__btn cc-creator__btn--generate"
                      disabled={Boolean(collectorArtworkBusy || !collectorTargetConcept || !collectorCardContent.song)}
                      onClick={() => void runCollectorArtworkAction({ action: "generate" })}
                    >
                      {collectorArtworkBusy === "generate" ? "Generating Test Artwork…" : "Generate Test Artwork"}
                    </button>
                  </div>
                </section>

                <aside className="cc-card-workbench__panel">
                  <div className="cc-card-workbench__concept-head">
                    <div>
                      <h4>Concept Variations</h4>
                      <p>{collectorConceptModel ? `Model: ${collectorConceptModel}` : "Bob curates; Retroverse proposes."}</p>
                    </div>
                    <label>
                      <span>Concept Provider</span>
                      <select
                        value={collectorConceptProvider}
                        onChange={(e) => setCollectorConceptProvider(e.target.value as CollectorConceptProviderId)}
                      >
                        <option value="ollama">Ollama preferred</option>
                        <option value="rule-based">Local rule-based</option>
                        <option disabled>OpenAI (future)</option>
                        <option disabled>RunPod (future)</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="cc-creator__btn cc-creator__btn--generate"
                    disabled={Boolean(collectorConceptBusy || !collectorCardContent.song)}
                    onClick={() => void generateConceptDirections()}
                  >
                    {collectorConceptBusy === "generate-concepts" ? "Generating Concepts…" : "Generate Concepts + Auto-Select Best"}
                  </button>
                  <div className="cc-card-workbench__evaluation-summary">
                    <div>
                      <span>Auto-Selected Target</span>
                      <strong>
                        {collectorSelectedWinner
                          ? `${collectorSelectedWinner.concept.label.replace(/^Concept [A-D] · /, "")} · ${collectorSelectedWinner.total}/25`
                          : "None selected"}
                      </strong>
                    </div>
                    <div>
                      <span>AI Best Score</span>
                      <strong>
                        {collectorBestEvaluation
                          ? `${collectorBestEvaluation.concept.label.replace(/^Concept [A-D] · /, "")} · ${collectorBestEvaluation.total}/25`
                          : "Not scored"}
                      </strong>
                    </div>
                    <div>
                      <span>Average Score</span>
                      <strong>{collectorAverageScore.toFixed(1)}/25</strong>
                    </div>
                    <div>
                      <span>Strongest Signal</span>
                      <strong>{collectorHighestCategory ? `${collectorHighestCategory.label} · ${collectorHighestCategory.average.toFixed(1)}` : ""}</strong>
                    </div>
                    <div>
                      <span>Weakest Signal</span>
                      <strong>{collectorLowestCategory ? `${collectorLowestCategory.label} · ${collectorLowestCategory.average.toFixed(1)}` : ""}</strong>
                    </div>
                  </div>
                  <div className="cc-card-workbench__concepts">
                    {collectorEvaluationRows.map(({ concept, evaluation, total }) => (
                      <div
                        key={concept.id}
                        className={`cc-card-workbench__concept${collectorEvaluation.targetConceptId === concept.id ? " is-favorite" : ""}`}
                      >
                        <header>
                          <span>{concept.label}</span>
                          {collectorEvaluation.targetConceptId === concept.id ? <strong>Target Concept</strong> : null}
                        </header>
                        <textarea
                          value={concept.value}
                          rows={5}
                          onChange={(e) =>
                            setCollectorConcepts((current) =>
                              current.map((item) =>
                                item.id === concept.id ? { ...item, value: e.target.value } : item,
                              ),
                            )
                          }
                        />
                        <div className="cc-card-workbench__auto-score">
                          <strong>AI Score: {total}/25</strong>
                          {evaluation.rank ? <span>Rank #{evaluation.rank}</span> : null}
                          {evaluation.notes.whatWorks ? <p>{evaluation.notes.whatWorks}</p> : null}
                        </div>
                        <div className="cc-card-workbench__concept-actions">
                          <button
                            type="button"
                            className="cc-creator__btn cc-creator__btn--secondary"
                            disabled={Boolean(collectorConceptBusy)}
                            onClick={() => selectCollectorTargetConcept(concept.id)}
                          >
                            Use This Concept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="cc-card-workbench__auto-note">
                    {collectorEvaluationSavedAt
                      ? `Auto-ranking saved ${new Date(collectorEvaluationSavedAt).toLocaleString()}. You can override the target concept if needed.`
                      : "Generate Concepts to auto-score and select the best target concept."}
                  </p>
                </aside>
              </div>

              <section className="cc-concept-generation" aria-label="Concept Generation">
                <div className="cc-concept-generation__head">
                  <div>
                    <h4>Concept Generation</h4>
                    <p>Single selected card only. Uses current concept directions to create local placeholder comparison images.</p>
                  </div>
                  <label>
                    <span>Image Provider</span>
                    <select
                      value={collectorImageProvider}
                      onChange={(e) => setCollectorImageProvider(e.target.value as CollectorImageProviderId)}
                    >
                      <option value="local-placeholder">Local Placeholder</option>
                      <option disabled>Ollama / local workflow (future)</option>
                      <option disabled>RunPod (future)</option>
                      <option disabled>OpenAI Images (future)</option>
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className="cc-creator__btn cc-creator__btn--generate"
                  disabled={Boolean(collectorConceptBusy || !collectorCardContent.song)}
                  onClick={() => void runConceptAction({ action: "generate" })}
                >
                  {collectorConceptBusy === "generate" ? "Generating…" : "Generate 4 Concepts"}
                </button>
                {collectorConceptError ? <p className="cc-deck__error">{collectorConceptError}</p> : null}
                <div className="cc-generated-concepts">
                  {collectorGeneratedConcepts.map((concept) => (
                    <article
                      key={concept.id}
                      className={`cc-generated-concept${collectorBestConceptId === concept.id ? " is-best" : ""}`}
                    >
                      <header>
                        <h5>
                          [{concept.id === "memory-object" ? "A" : concept.id === "environment" ? "B" : concept.id === "cultural-artifact" ? "C" : "D"}] {concept.label}
                        </h5>
                        {collectorBestConceptId === concept.id ? <span>Best Concept</span> : null}
                      </header>
                      <img src={concept.imageUrl} alt={`${concept.label} generated placeholder`} />
                      <label>
                        <span>Generated prompt</span>
                        <textarea value={concept.prompt} readOnly rows={8} />
                      </label>
                      <div className="cc-generated-concept__actions">
                        <button
                          type="button"
                          className="cc-creator__btn cc-creator__btn--secondary"
                          disabled={Boolean(collectorConceptBusy)}
                          onClick={() => void runConceptAction({ action: "generate", regenerateConceptId: concept.id })}
                        >
                          Regenerate
                        </button>
                        <button
                          type="button"
                          className={`cc-creator__btn cc-creator__btn--secondary${collectorFavoriteConceptId === concept.id ? " is-on" : ""}`}
                          disabled={Boolean(collectorConceptBusy)}
                          onClick={() => void runConceptAction({ action: "favorite", conceptId: concept.id })}
                        >
                          Favorite
                        </button>
                        <button
                          type="button"
                          className="cc-creator__btn cc-creator__btn--secondary"
                          disabled={Boolean(collectorConceptBusy)}
                          onClick={() => void runConceptAction({ action: "best", conceptId: concept.id })}
                        >
                          Best Concept
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="cc-card-artwork" aria-label="Art Generation">
                <div className="cc-card-artwork__head">
                  <div>
                    <h4>ART GENERATION</h4>
                    <p>
                      One selected card only. Uses the current target concept, card metadata, style, branding, and fact text.
                    </p>
                  </div>
                  <div className={`cc-card-artwork__status is-${collectorArtworkStatus}`}>
                    Artwork Status: {COLLECTOR_ARTWORK_STATUS_LABELS[collectorArtworkStatus]}
                  </div>
                </div>
                <div className="cc-card-artwork__controls">
                  <label>
                    <span>Provider</span>
                    <select
                      value={collectorArtworkProvider}
                      onChange={(e) => setCollectorArtworkProvider(e.target.value as CollectorArtworkProviderId)}
                    >
                      <option value="chatgpt-images">ChatGPT Images</option>
                      <option disabled>RunPod (placeholder)</option>
                      <option disabled>Ollama (placeholder)</option>
                    </select>
                  </label>
                  <div className="cc-card-artwork__target">
                    <span>Target Concept</span>
                    <strong>{collectorTargetConcept ? collectorTargetConcept.label : "Select a target concept first"}</strong>
                  </div>
                  <button
                    type="button"
                    className="cc-creator__btn cc-creator__btn--generate"
                    disabled={Boolean(collectorArtworkBusy || !collectorTargetConcept || !collectorCardContent.song)}
                    onClick={() => void runCollectorArtworkAction({ action: "generate" })}
                  >
                    {collectorArtworkBusy === "generate" ? "Generating Test Artwork…" : "Generate Test Artwork"}
                  </button>
                </div>
                {collectorArtworkError ? (
                  <ProviderErrorAlert message={collectorArtworkError} detail={providerError} />
                ) : null}
                {collectorArtworkFile?.prompt ? (
                  <details className="cc-card-artwork__prompt">
                    <summary>Generated Artwork Prompt</summary>
                    <textarea value={collectorArtworkFile.prompt} readOnly rows={10} />
                  </details>
                ) : null}
                {collectorArtworkFile?.variations.length ? (
                  <div className="cc-card-artwork__gallery">
                    {collectorArtworkFile.variations.map((variation) => (
                      <article
                        key={variation.id}
                        className={`cc-card-artwork__variation${collectorArtworkFile.favoriteVariationId === variation.id ? " is-favorite" : ""}`}
                      >
                        <img src={variation.imageUrl} alt={`Collector card artwork variation ${variation.index}`} />
                        <header>
                          <strong>Variation {variation.index}</strong>
                          {collectorArtworkFile.favoriteVariationId === variation.id ? <span>Favorite</span> : null}
                        </header>
                        <button
                          type="button"
                          className="cc-creator__btn cc-creator__btn--secondary"
                          disabled={Boolean(collectorArtworkBusy)}
                          onClick={() => void runCollectorArtworkAction({ action: "favorite", favoriteVariationId: variation.id })}
                        >
                          Pick Winner
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="cc-card-artwork__empty">
                    No real artwork generated yet. Select a target concept, then generate four test variations.
                  </p>
                )}
                <div className="cc-card-artwork__footer">
                  <div>
                    <span>Selected Favorite</span>
                    <strong>{collectorFavoriteArtwork ? `Variation ${collectorFavoriteArtwork.index}` : "None"}</strong>
                  </div>
                  <button
                    type="button"
                    className="cc-creator__btn cc-creator__btn--secondary"
                    disabled={Boolean(collectorArtworkBusy || !collectorArtworkFile?.favoriteVariationId)}
                    onClick={() => void runCollectorArtworkAction({ action: "approve" })}
                  >
                    Approve Favorite
                  </button>
                </div>
              </section>
            </section>
          ) : null}

          <div className="cc-creator__deck-years" aria-label="Era deck selector">
            {collectorReviewYears.map((entry) => (
                <button
                  key={entry.year}
                  type="button"
                  className={`cc-creator__deck-year${collectorDeckYear === entry.year ? " is-on" : ""}`}
                  onClick={() => setCollectorDeckYear(entry.year)}
                >
                  <strong>{entry.year}</strong>
                  <span>{COLLECTOR_CARD_SUIT_LABELS[entry.suit]}</span>
                  <small>{entry.lockedAt ? "Locked" : "Live"}</small>
                </button>
            ))}
          </div>

          <div className="cc-creator__review-tables">
            {collectorReviewYears.map((entry) => (
              <section key={entry.year} className="cc-creator__review-year">
                <div className="cc-creator__review-year-head">
                  <div>
                    <h3>
                      {entry.year} · {COLLECTOR_CARD_SUIT_LABELS[entry.suit]}
                    </h3>
                    <p>{entry.lockedAt ? `Locked ${new Date(entry.lockedAt).toLocaleString()}` : "Live ranking"}</p>
                  </div>
                  <div className="cc-creator__review-year-actions">
                    <button
                      type="button"
                      className="cc-creator__btn cc-creator__btn--secondary"
                      disabled={collectorRankingBusy || entry.cards.length < 10}
                      onClick={() => void lockCollectorYear(entry.year)}
                    >
                      Lock Year
                    </button>
                    <button
                      type="button"
                      className="cc-creator__btn cc-creator__btn--secondary"
                      disabled={!entry.cards.length}
                      onClick={() => exportCollectorYearCsv(entry.year)}
                    >
                      Export Year CSV
                    </button>
                  </div>
                </div>
                <div className="cc-creator__review-table-wrap">
                  <table className="cc-creator__review-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Song</th>
                        <th>Artist</th>
                        <th>RVTR</th>
                        <th>Peak</th>
                        <th>Weeks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.cards.map((card) => (
                        <tr
                          key={`${entry.year}-${card.chartPosition}-${card.rvtr || card.song}`}
                          className="cc-creator__review-row"
                          onClick={() => openCollectorWorkbench(card, String(card.chartPosition ?? "1") as CollectorDeckRank)}
                        >
                          <td>{card.chartPosition}</td>
                          <td>{card.song}</td>
                          <td>{card.artist}</td>
                          <td>{card.rvtr || "Needs Review"}</td>
                          <td>{card.peak ?? ""}</td>
                          <td>{card.weeks ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="cc-creator__joker-row" aria-label={`${entry.year} placeholders`}>
                  <span>J Retroverse Pick</span>
                  <span>Q Retroverse Pick</span>
                  <span>K Retroverse Pick</span>
                  <span>
                    {entry.year} Joker
                  </span>
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      {artifact === "pass" ? <section className="cc-creator__event-panel" aria-label="Event details and QR controls">
        <div className="cc-creator__event-head">
          <h2>Event Details</h2>
          <div className="cc-creator__qr-status" aria-live="polite">
            <p className={`cc-creator__qr-badge cc-creator__qr-badge--${qrStatus}`}>
              QR: {QR_STATUS_LABELS[qrStatus]}
            </p>
            {qrPlacementDirty ? <p className="cc-creator__qr-hint">Placement changed — save or export to apply.</p> : null}
          </div>
        </div>
        <div className="cc-creator__field-grid cc-creator__field-grid--event">
          <label className="cc-creator__field">
            <span>Event</span>
            <input value={top.event} onChange={(e) => setTop({ ...top, event: e.target.value })} />
          </label>
          <label className="cc-creator__field">
            <span>Venue</span>
            <input value={top.venue} onChange={(e) => setTop({ ...top, venue: e.target.value })} />
          </label>
          <label className="cc-creator__field">
            <span>Date</span>
            <input value={top.date} onChange={(e) => setTop({ ...top, date: e.target.value })} />
          </label>
          <label className="cc-creator__field">
            <span>Secondary Line</span>
            <input
              value={top.secondaryLine}
              onChange={(e) => setTop({ ...top, secondaryLine: e.target.value })}
            />
          </label>
          <label className="cc-creator__field cc-creator__field--wide">
            <span>QR URL</span>
            <input
              value={top.qrUrl}
              onChange={(e) => {
                const qrUrl = e.target.value;
                setTop({ ...top, qrUrl });
                setBack({ ...back, qrUrl });
              }}
            />
          </label>
          <button
            type="button"
            className="cc-creator__btn cc-creator__btn--secondary"
            disabled={busy || !run?.runId || !qrPlacementDirty}
            onClick={() => void saveQrPlacement()}
          >
            Save QR Area
          </button>
        </div>
        {run?.qrVerification ? (
          <p className="cc-creator__qr-meta">
            Matrix fill: {run.qrVerification.matrixFillPercent.toFixed(1)}% · Physical:{" "}
            {run.qrVerification.physicalWidthIn.toFixed(2)}" × {run.qrVerification.physicalHeightIn.toFixed(2)}"
          </p>
        ) : null}
        {qrWarn ? (
          <div className="cc-creator__qr-warning" role="alert">
            {run?.qrVerification?.printSizeWarning
              ? `QR below recommended print size (${run?.qrVerification?.physicalWidthIn.toFixed(2)}"). `
              : null}
            {run?.qrVerification?.matrixFillWarning
              ? `Matrix fill ${run?.qrVerification?.matrixFillPercent.toFixed(0)}% below 85% target. `
              : null}
            {run?.qrVerification && !run.qrVerification.modulesPresent ? "QR modules missing — export blocked." : null}
            {run?.qrVerification?.modulesPresent && !run?.qrVerification?.decodePass
              ? "Decode test failed — export blocked."
              : null}
          </div>
        ) : null}
        {qrStatus === "not_exported" ? <p className="cc-creator__qr-hint">{QR_EXPORT_REQUIRED_MESSAGE}</p> : null}
        {error ? <ProviderErrorAlert message={error} detail={providerError} /> : null}
      </section> : null}

      {artifact === "pass" && run?.downloads?.exportZipUrl ? (
        <section className="cc-creator__download-panel" aria-label="Print downloads">
          <h2 className="cc-creator__download-title">Print package</h2>
          <div className="cc-creator__download-grid">
            {run.downloads.singlePassZipUrl ? (
              <a className="cc-creator__btn cc-creator__btn--download" href={run.downloads.singlePassZipUrl} download>
                Download Single Pass
              </a>
            ) : null}
            {run.downloads.printFrontPdfUrls?.[0] ? (
              <a className="cc-creator__btn cc-creator__btn--download" href={run.downloads.printFrontPdfUrls[0]} download>
                Download Print Sheet Front
              </a>
            ) : null}
            {run.downloads.printBackPdfUrls?.[0] ? (
              <a className="cc-creator__btn cc-creator__btn--download" href={run.downloads.printBackPdfUrls[0]} download>
                Download Print Sheet Back
              </a>
            ) : null}
            <a className="cc-creator__btn cc-creator__btn--download" href={run.downloads.exportZipUrl} download>
              Download Full Print Package
            </a>
            <button type="button" className="cc-creator__btn cc-creator__btn--secondary" onClick={() => void printScanTest()}>
              Print Scan Test
            </button>
          </div>
        </section>
      ) : null}

      <section className="cc-creator__panels">
        <CollapsiblePanel title="Advanced Settings" open={advancedOpen} onToggle={() => setAdvancedOpen((v) => !v)}>
          <div className="cc-creator__advanced-grid">
            <div className="cc-creator__setup-group">
              <span className="cc-creator__setup-label">Artifact</span>
              <div className="cc-creator__chips">
                {ARTIFACTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`cc-creator__chip${artifact === a.id ? " is-on" : ""}${!a.enabled ? " is-off" : ""}`}
                    disabled={!a.enabled}
                    onClick={() => a.enabled && setArtifact(a.id)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="cc-creator__setup-group">
              <span className="cc-creator__setup-label">Era</span>
              <select
                className="cc-creator__era-select"
                value={eraSlug}
                onChange={(e) => setEraSlug(e.target.value)}
                aria-label="Era"
              >
                {eras.map((era) => (
                  <option key={era.slug} value={era.slug}>
                    {era.years} — {era.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cc-creator__setup-group cc-creator__setup-group--wide">
              <span className="cc-creator__setup-label">Creative Direction</span>
              <div className="cc-creator__direction-grid" role="group" aria-label="Creative Direction">
                {CREATIVE_DIRECTION_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`cc-creator__direction-btn${creativeDirection === id ? " is-on" : ""}`}
                    onClick={() => setCreativeDirection(id)}
                    aria-pressed={creativeDirection === id}
                  >
                    {CREATIVE_DIRECTIONS[id].label}
                  </button>
                ))}
              </div>
            </div>

            {artifact === "pass" ? <div className="cc-creator__setup-group">
              <span className="cc-creator__setup-label">Artifact Type</span>
              <p className="cc-creator__fixed-archetype">{RETROVERSE_COLLECTIBLE_CREDENTIAL_LABEL}</p>
            </div> : null}

            <div className="cc-creator__toggles">
              <label className="cc-creator__toggle">
                <input
                  type="checkbox"
                  checked={avoidEraTropes}
                  onChange={(e) => setAvoidEraTropes(e.target.checked)}
                />
                <span>Avoid Common Era Tropes</span>
              </label>
              <label className="cc-creator__toggle">
                <input
                  type="checkbox"
                  checked={maximizeVariation}
                  onChange={(e) => setMaximizeVariation(e.target.checked)}
                />
                <span>Maximize Variation</span>
              </label>
            </div>

            {artifact === "pass" ? <div className="cc-creator__setup-group cc-creator__setup-group--wide">
              <span className="cc-creator__setup-label">QR Advanced</span>
              <div className="cc-creator__field-grid cc-creator__field-grid--qr-advanced">
                <label className="cc-creator__field">
                  <span>QR Size</span>
                  <input
                    type="number"
                    min={1}
                    max={PASS_HEIGHT}
                    value={qrPlacement.size}
                    onChange={(e) => {
                      const size = Number.parseInt(e.target.value, 10) || 0;
                      setQrPlacement((current) => clampQrPlacement({ ...current, size }));
                    }}
                  />
                </label>
                <label className="cc-creator__field">
                  <span>QR X Position</span>
                  <input
                    type="number"
                    min={0}
                    max={PASS_WIDTH}
                    value={qrPlacement.left}
                    onChange={(e) => {
                      const left = Number.parseInt(e.target.value, 10) || 0;
                      setQrPlacement((current) => clampQrPlacement({ ...current, left }));
                    }}
                  />
                </label>
                <label className="cc-creator__field">
                  <span>QR Y Position</span>
                  <input
                    type="number"
                    min={0}
                    max={PASS_HEIGHT}
                    value={qrPlacement.top}
                    onChange={(e) => {
                      const top = Number.parseInt(e.target.value, 10) || 0;
                      setQrPlacement((current) => clampQrPlacement({ ...current, top }));
                    }}
                  />
                </label>
              </div>
            </div> : null}

            {artifact === "pass" ? <div className="cc-creator__setup-group cc-creator__numbering">
              <span className="cc-creator__setup-label">Pass numbering</span>
              <label className="cc-creator__toggle">
                <input
                  type="checkbox"
                  checked={printSerialNumbers}
                  onChange={(e) => setPrintSerialNumbers(e.target.checked)}
                />
                <span>Print serial numbers</span>
              </label>
              {!printSerialNumbers ? (
                <label className="cc-creator__toggle">
                  <input
                    type="checkbox"
                    checked={collectorEdition}
                    onChange={(e) => setCollectorEdition(e.target.checked)}
                  />
                  <span>Collector Edition</span>
                  <span className="cc-creator__toggle-hint">
                    Hand-number after print — {collectorEdition ? "Pass No. __________" : "No. ______"}
                  </span>
                </label>
              ) : (
                <>
                  <span className="cc-creator__setup-sublabel">Number format</span>
                  <div className="cc-creator__chips">
                    {PASS_NUMBER_FORMAT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`cc-creator__chip${numberFormat === opt.id ? " is-on" : ""}`}
                        onClick={() => setNumberFormat(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {numberFormat === "custom" ? (
                    <label className="cc-creator__field">
                      <span>Custom format</span>
                      <input
                        value={customFormat}
                        onChange={(e) => setCustomFormat(e.target.value)}
                        placeholder="VIP-{NNN}"
                      />
                      <span className="cc-creator__field-hint">
                        Use {"{NNN}"} for padded index — e.g. SN-2026-{"{NNN}"}
                      </span>
                    </label>
                  ) : null}
                  {serialPreview ? (
                    <p className="cc-creator__serial-preview">
                      Preview: <strong>{serialPreview.first}</strong> — <strong>{serialPreview.last}</strong>
                    </p>
                  ) : null}
                </>
              )}

              <span className="cc-creator__setup-sublabel">Quantity</span>
              <div className="cc-creator__chips">
                {PRINT_QUANTITY_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`cc-creator__chip${printQuantity === n ? " is-on" : ""}`}
                    onClick={() => setPrintQuantity(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <label className="cc-creator__field cc-creator__field--inline-qty">
                <span>Custom</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={printQuantity}
                  onChange={(e) => setPrintQuantity(Number.parseInt(e.target.value, 10) || 12)}
                />
              </label>
              {!printSerialNumbers ? (
                <p className="cc-creator__numbering-note">Print sheets use identical backs — hand-number after cut.</p>
              ) : (
                <p className="cc-creator__numbering-note">Each position on the print sheet gets a unique serial.</p>
              )}
            </div> : null}

            <section className="cc-creator__secondary-actions">
              {artifact === "pass" ? <button
                type="button"
                className="cc-creator__btn cc-creator__btn--secondary"
                disabled={busy || !run}
                onClick={() => void regenerateFront()}
              >
                Regenerate Front
              </button> : null}
              {artifact === "pass" ? <button
                type="button"
                className="cc-creator__btn cc-creator__btn--secondary"
                disabled={busy || !run}
                onClick={() => void regenerateBack()}
              >
                Regenerate Back
              </button> : null}
              <button
                type="button"
                className="cc-creator__btn cc-creator__btn--secondary"
                disabled={busy || !eraSlug}
                onClick={() => void viewPrompt()}
              >
                View Prompt
              </button>
            </section>
          </div>

          {qualityScores ? <QualityPanel scores={qualityScores} /> : null}

          {artifact === "pass" ? <div className="cc-creator__advanced-panels">
            <CollapsiblePanel title="Front content" open={frontOpen} onToggle={() => setFrontOpen((v) => !v)}>
              <FieldGrid fields={front} onChange={setFront} />
            </CollapsiblePanel>
            <CollapsiblePanel title="Back content" open={backOpen} onToggle={() => setBackOpen((v) => !v)}>
              <FieldGrid fields={back} onChange={setBack} showQr />
            </CollapsiblePanel>
          </div> : null}
        </CollapsiblePanel>
      </section>

      <PromptInspectorModal
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        front={promptInspector.front}
        back={promptInspector.back}
      />
    </div>
  );
}
