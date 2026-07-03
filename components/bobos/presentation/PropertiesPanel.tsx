"use client";

import {
  PRESENTATION_TRANSITIONS,
  PRESENTATION_TRANSITION_LABELS,
  PRESENTATION_TRIGGERS,
  PRESENTATION_TRIGGER_LABELS,
  type Presentation,
  type PresentationItem,
  type PresentationItemLink,
} from "@/lib/bobos/presentation/types";

type Props = {
  item: PresentationItem | null;
  onPatch: (patch: Partial<PresentationItem>) => void;
  presentation: Presentation;
  onMetaPatch: (patch: { title?: string; description?: string; loop?: boolean }) => void;
};

type LinkKind = "none" | PresentationItemLink["kind"];

function patchLink(
  current: PresentationItemLink | null,
  patch: Partial<PresentationItemLink> | { kind: "none" },
): PresentationItemLink | null {
  if ("kind" in patch && patch.kind === "none") return null;
  const base: PresentationItemLink = current ?? { kind: "artist", id: "", label: "" };
  return { ...base, ...(patch as Partial<PresentationItemLink>) };
}

export function PropertiesPanel({ item, onPatch, presentation, onMetaPatch }: Props) {
  if (!item) {
    return (
      <section className="pst-properties" aria-label="Presentation properties">
        <h2 className="pst-panel-title">Presentation</h2>
        <label className="pst-field">
          <span className="pst-field__label">Title</span>
          <input
            className="pst-field__input"
            value={presentation.title}
            onChange={(event) => onMetaPatch({ title: event.target.value })}
          />
        </label>
        <label className="pst-field">
          <span className="pst-field__label">Description</span>
          <textarea
            className="pst-field__input pst-field__input--area"
            rows={3}
            value={presentation.description}
            onChange={(event) => onMetaPatch({ description: event.target.value })}
          />
        </label>
        <label className="pst-field pst-field--row">
          <input
            type="checkbox"
            checked={presentation.queue.loop}
            onChange={(event) => onMetaPatch({ loop: event.target.checked })}
          />
          <span className="pst-field__label">Loop queue when it reaches the end</span>
        </label>
        <p className="pst-properties__hint">Select a queue item to edit its properties.</p>
      </section>
    );
  }

  const linkKind: LinkKind = item.link?.kind ?? "none";

  return (
    <section className="pst-properties" aria-label="Item properties">
      <h2 className="pst-panel-title">Properties</h2>

      <label className="pst-field">
        <span className="pst-field__label">Title</span>
        <input
          className="pst-field__input"
          value={item.title}
          onChange={(event) => onPatch({ title: event.target.value })}
        />
      </label>

      <label className="pst-field">
        <span className="pst-field__label">Subtitle</span>
        <input
          className="pst-field__input"
          value={item.subtitle}
          onChange={(event) => onPatch({ subtitle: event.target.value })}
        />
      </label>

      <label className="pst-field">
        <span className="pst-field__label">On-Screen Copy</span>
        <textarea
          className="pst-field__input pst-field__input--area"
          rows={3}
          value={item.body}
          onChange={(event) => onPatch({ body: event.target.value })}
        />
      </label>

      <div className="pst-field-grid">
        <label className="pst-field">
          <span className="pst-field__label">Duration (sec, 0 = hold)</span>
          <input
            className="pst-field__input"
            type="number"
            min={0}
            value={item.durationSeconds}
            onChange={(event) =>
              onPatch({ durationSeconds: Math.max(0, Number(event.target.value) || 0) })
            }
          />
        </label>

        <label className="pst-field">
          <span className="pst-field__label">Transition</span>
          <select
            className="pst-field__input"
            value={item.transition}
            onChange={(event) =>
              onPatch({ transition: event.target.value as PresentationItem["transition"] })
            }
          >
            {PRESENTATION_TRANSITIONS.map((transition) => (
              <option key={transition} value={transition}>
                {PRESENTATION_TRANSITION_LABELS[transition]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="pst-field">
        <span className="pst-field__label">Trigger</span>
        <select
          className="pst-field__input"
          value={item.trigger}
          onChange={(event) =>
            onPatch({ trigger: event.target.value as PresentationItem["trigger"] })
          }
        >
          {PRESENTATION_TRIGGERS.map((trigger) => (
            <option key={trigger} value={trigger}>
              {PRESENTATION_TRIGGER_LABELS[trigger]}
            </option>
          ))}
        </select>
      </label>

      {item.type === "countdown" ? (
        <label className="pst-field">
          <span className="pst-field__label">Countdown Target</span>
          <input
            className="pst-field__input"
            type="datetime-local"
            value={item.countdownTarget ? item.countdownTarget.slice(0, 16) : ""}
            onChange={(event) =>
              onPatch({
                countdownTarget: event.target.value
                  ? new Date(event.target.value).toISOString()
                  : null,
              })
            }
          />
        </label>
      ) : null}

      <fieldset className="pst-link">
        <legend className="pst-field__label">Linked Object</legend>
        <select
          className="pst-field__input"
          value={linkKind}
          onChange={(event) => {
            const kind = event.target.value as LinkKind;
            onPatch({
              link: kind === "none" ? null : patchLink(item.link, { kind }),
            });
          }}
          aria-label="Link kind"
        >
          <option value="none">None</option>
          <option value="artist">Artist (RVAR)</option>
          <option value="song">Song (RVTR)</option>
          <option value="experience">Experience (future)</option>
        </select>
        {item.link ? (
          <>
            <label className="pst-field">
              <span className="pst-field__label">Canonical ID</span>
              <input
                className="pst-field__input"
                value={item.link.id}
                placeholder={item.link.kind === "song" ? "RVTR…" : "RVAR…"}
                onChange={(event) => onPatch({ link: patchLink(item.link, { id: event.target.value }) })}
              />
            </label>
            <label className="pst-field">
              <span className="pst-field__label">Display Label</span>
              <input
                className="pst-field__input"
                value={item.link.label}
                placeholder="Shown on the big screen"
                onChange={(event) =>
                  onPatch({ link: patchLink(item.link, { label: event.target.value }) })
                }
              />
            </label>
          </>
        ) : null}
      </fieldset>

      <label className="pst-field">
        <span className="pst-field__label">Notes (never shown to audience)</span>
        <textarea
          className="pst-field__input pst-field__input--area"
          rows={3}
          value={item.notes}
          onChange={(event) => onPatch({ notes: event.target.value })}
        />
      </label>
    </section>
  );
}
