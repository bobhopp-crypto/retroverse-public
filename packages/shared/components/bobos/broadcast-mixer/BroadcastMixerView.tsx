"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addAssetToDeck,
  appendSequenceToDeck,
  getBroadcastStatus,
  maybeAutoReturnDeckToLive,
  openMixerCollectionItem,
  pauseDeck,
  playDeck,
  removeDeckEntry,
  reorderDeckEntry,
  setDeckCue,
  setDeckOutput,
  setDeckPlaybackMode,
  setDeckTransportOptions,
  setMixerAutoAdvanceSeconds,
  stepDeck,
  type BroadcastStatus,
} from "@/app/bobos/broadcast/actions";
import { BobosPageHeader } from "@/components/bobos/BobosPageHeader";
import { AUTO_ADVANCE_PRESETS } from "@/lib/bobos/mixer/playback-defaults";
import type { AssetReference, DeckId, MixerOutputId, MixerState } from "@/lib/bobos/mixer/types";
import { PLAYBACK_MODE_LABELS, PLAYBACK_MODES } from "@/lib/bobos/mixer/types";

import { AssetBrowserPanel } from "./AssetBrowserPanel";
import { AudiencePreviewPanel } from "./AudiencePreviewPanel";
import { DeckPanel } from "./DeckPanel";
import "./broadcast-mixer.css";

const POLL_MS = 2000;

type Props = {
  initialStatus: BroadcastStatus;
  initialMixer: MixerState;
};

export function BroadcastMixerView({ initialStatus, initialMixer }: Props) {
  const [status, setStatus] = useState<BroadcastStatus>(initialStatus);
  const [mixer, setMixer] = useState<MixerState>(initialMixer);
  const [activeDeckId, setActiveDeckId] = useState<DeckId>("left");
  const [busyDeck, setBusyDeck] = useState<DeckId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customAdvance, setCustomAdvance] = useState(false);
  const busyRef = useRef(false);

  const activeDeck = mixer[activeDeckId];
  const advanceIsPreset = (AUTO_ADVANCE_PRESETS as readonly number[]).includes(mixer.autoAdvanceSeconds);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (busyRef.current) return;
      try {
        const autoReturned = await maybeAutoReturnDeckToLive();
        const next = autoReturned ?? (await getBroadcastStatus());
        if (!cancelled) setStatus(next);
      } catch {
        // transient — next poll recovers
      }
    }
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const runDeckAction = useCallback(
    async (deckId: DeckId, action: () => Promise<MixerState | { mixer: MixerState; status: BroadcastStatus }>) => {
      busyRef.current = true;
      setBusyDeck(deckId);
      setError(null);
      try {
        const result = await action();
        if ("mixer" in result) {
          setMixer(result.mixer);
          setStatus(result.status);
        } else {
          setMixer(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        busyRef.current = false;
        setBusyDeck(null);
      }
    },
    [],
  );

  const handleAddAsset = useCallback(
    (deckId: DeckId, asset: AssetReference) => {
      void runDeckAction(deckId, () => addAssetToDeck(deckId, asset));
    },
    [runDeckAction],
  );

  const handleDropAsset = useCallback(
    (deckId: DeckId, asset: AssetReference, atIndex?: number) => {
      void runDeckAction(deckId, () => addAssetToDeck(deckId, asset, atIndex));
    },
    [runDeckAction],
  );

  const handleDropSequence = useCallback(
    (deckId: DeckId, collectionId: string, sequenceId: string, atIndex?: number) => {
      void runDeckAction(deckId, () => appendSequenceToDeck(deckId, collectionId, sequenceId, atIndex));
    },
    [runDeckAction],
  );

  /* Space = play/pause active deck · ←/→ = previous/next · L/R = set active deck.
   * Ignored while typing in a field (search box, sequence editor, import form). */
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (event.key.toLowerCase() === "l") {
        setActiveDeckId("left");
        return;
      }
      if (event.key.toLowerCase() === "r") {
        setActiveDeckId("right");
        return;
      }

      const deck = mixer[activeDeckId];
      if (deck.playlist.length === 0) return;

      if (event.key === " ") {
        event.preventDefault();
        const engineOnAir = mixer.liveDeckId === activeDeckId && status.local.onAir;
        const enginePlaying = engineOnAir && status.local.mode === "playing";
        void runDeckAction(activeDeckId, () =>
          enginePlaying ? pauseDeck(activeDeckId) : playDeck(activeDeckId),
        );
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        void runDeckAction(activeDeckId, () => stepDeck(activeDeckId, "next"));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void runDeckAction(activeDeckId, () => stepDeck(activeDeckId, "previous"));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDeckId, mixer, status, runDeckAction]);

  return (
    <div className="bmx-page">
      <BobosPageHeader page="Broadcast Mixer" subtitle="Left Deck · Audience · Right Deck" rvId="RV01-03" />

      {error ? <p className="bmx-error">{error}</p> : null}

      <p className="bmx-shortcuts-hint">
        Space Play/Pause · ←/→ Skip · L/R Select Deck — active deck:{" "}
        <strong>{activeDeckId === "left" ? "Left" : "Right"}</strong>
      </p>

      <div className="bmx-playback-settings" role="group" aria-label="Playback settings">
        <fieldset className="bmx-playback-settings__group">
          <legend className="bmx-playback-settings__label">Playback</legend>
          {PLAYBACK_MODES.map((mode) => (
            <label key={mode} className="bmx-playback-settings__radio">
              <input
                type="radio"
                name="bmx-playback-mode"
                value={mode}
                checked={activeDeck.playbackMode === mode}
                disabled={busyDeck !== null}
                onChange={() => void runDeckAction(activeDeckId, () => setDeckPlaybackMode(activeDeckId, mode))}
              />
              {PLAYBACK_MODE_LABELS[mode]}
            </label>
          ))}
        </fieldset>

        <label className="bmx-playback-settings__advance">
          <span className="bmx-playback-settings__label">Auto Advance</span>
          <select
            className="bmx-select"
            value={customAdvance || !advanceIsPreset ? "custom" : String(mixer.autoAdvanceSeconds)}
            disabled={busyDeck !== null}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "custom") {
                setCustomAdvance(true);
                return;
              }
              setCustomAdvance(false);
              void runDeckAction(activeDeckId, () => setMixerAutoAdvanceSeconds(Number(value)));
            }}
            aria-label="Auto advance duration"
          >
            {AUTO_ADVANCE_PRESETS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds} sec
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {customAdvance || !advanceIsPreset ? (
            <input
              type="number"
              className="bmx-playback-settings__custom"
              min={1}
              max={300}
              value={mixer.autoAdvanceSeconds}
              disabled={busyDeck !== null}
              onChange={(event) => {
                const seconds = Number(event.target.value);
                if (!Number.isFinite(seconds)) return;
                void runDeckAction(activeDeckId, () => setMixerAutoAdvanceSeconds(seconds));
              }}
              aria-label="Custom auto advance seconds"
            />
          ) : null}
        </label>
      </div>

      <div className="bmx-top">
        <DeckPanel
          side="left"
          deck={mixer.left}
          isLive={mixer.liveDeckId === "left"}
          status={status}
          busy={busyDeck === "left"}
          onPlay={() => void runDeckAction("left", () => playDeck("left"))}
          onPause={() => void runDeckAction("left", () => pauseDeck("left"))}
          onNext={() => void runDeckAction("left", () => stepDeck("left", "next"))}
          onPrevious={() => void runDeckAction("left", () => stepDeck("left", "previous"))}
          onOutputChange={(output: MixerOutputId | null) =>
            void runDeckAction("left", () => setDeckOutput("left", output))
          }
          onCue={(index) => void runDeckAction("left", () => setDeckCue("left", index))}
          onRemove={(entryId) => void runDeckAction("left", () => removeDeckEntry("left", entryId))}
          onReorder={(entryId, direction) =>
            void runDeckAction("left", () => reorderDeckEntry("left", entryId, direction))
          }
          onAutoReturnChange={(autoReturnToLive) =>
            void runDeckAction("left", () => setDeckTransportOptions("left", { autoReturnToLive }))
          }
          onDropAsset={(asset, atIndex) => handleDropAsset("left", asset, atIndex)}
          onDropSequence={(collectionId, sequenceId, atIndex) =>
            handleDropSequence("left", collectionId, sequenceId, atIndex)
          }
        />

        <AudiencePreviewPanel status={status} />

        <DeckPanel
          side="right"
          deck={mixer.right}
          isLive={mixer.liveDeckId === "right"}
          status={status}
          busy={busyDeck === "right"}
          onPlay={() => void runDeckAction("right", () => playDeck("right"))}
          onPause={() => void runDeckAction("right", () => pauseDeck("right"))}
          onNext={() => void runDeckAction("right", () => stepDeck("right", "next"))}
          onPrevious={() => void runDeckAction("right", () => stepDeck("right", "previous"))}
          onOutputChange={(output: MixerOutputId | null) =>
            void runDeckAction("right", () => setDeckOutput("right", output))
          }
          onCue={(index) => void runDeckAction("right", () => setDeckCue("right", index))}
          onRemove={(entryId) => void runDeckAction("right", () => removeDeckEntry("right", entryId))}
          onReorder={(entryId, direction) =>
            void runDeckAction("right", () => reorderDeckEntry("right", entryId, direction))
          }
          onAutoReturnChange={(autoReturnToLive) =>
            void runDeckAction("right", () => setDeckTransportOptions("right", { autoReturnToLive }))
          }
          onDropAsset={(asset, atIndex) => handleDropAsset("right", asset, atIndex)}
          onDropSequence={(collectionId, sequenceId, atIndex) =>
            handleDropSequence("right", collectionId, sequenceId, atIndex)
          }
        />
      </div>

      <AssetBrowserPanel
        activeDeckId={activeDeckId}
        onSetActiveDeck={setActiveDeckId}
        onAppendToDeck={handleAddAsset}
        onOpenCollectionItem={(deckId, item, sourceCollectionId) =>
          void runDeckAction(deckId, () => openMixerCollectionItem(deckId, item, sourceCollectionId))
        }
      />
    </div>
  );
}
