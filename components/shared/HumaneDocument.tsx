import {
  hasRenderableContent,
  headingTag,
  humanizeKey,
  isImageKey,
  isPlainObject,
  isTechnicalKey,
  isUrlLike,
  pickItemHeadingKey,
  urlLinkLabel,
} from "@/lib/document/humane-document-utils";

import "./humane-document.css";

/**
 * Generic, data-driven renderer that turns arbitrary JSON into a readable
 * document — labeled fields, sections, lists, images, and links. Carries no
 * knowledge of any particular schema or product area. Reusable anywhere in
 * Retroverse that needs to show structured data as a document, not a JSON
 * inspector.
 */

type DocumentProps = {
  value: unknown;
  depth?: number;
};

function PrimitiveValue({ value }: { value: unknown }) {
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (isUrlLike(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="humane-doc__link">
        {urlLinkLabel(value)}
      </a>
    );
  }
  return <>{String(value)}</>;
}

function ImageField({ keyName, value }: { keyName: string; value: string }) {
  return (
    <figure className="humane-doc__image">
      <img src={value} alt={humanizeKey(keyName)} loading="lazy" />
      <figcaption>{humanizeKey(keyName)}</figcaption>
    </figure>
  );
}

function SimpleField({ keyName, value }: { keyName: string; value: unknown }) {
  return (
    <div className="humane-doc__field">
      <p className="humane-doc__label">{humanizeKey(keyName)}</p>
      <p className="humane-doc__value">
        <PrimitiveValue value={value} />
      </p>
    </div>
  );
}

function SectionField({
  keyName,
  value,
  depth,
}: {
  keyName: string;
  value: Record<string, unknown>;
  depth: number;
}) {
  const entries = Object.entries(value).filter(
    ([k, v]) => !isTechnicalKey(k) && hasRenderableContent(v),
  );
  if (entries.length === 0) return null;

  const Heading = headingTag(depth);

  return (
    <section className="humane-doc__section">
      <Heading className="humane-doc__heading">{humanizeKey(keyName)}</Heading>
      <div className="humane-doc__section-body">
        {entries.map(([k, v]) => (
          <FieldRow key={k} keyName={k} value={v} depth={depth + 1} />
        ))}
      </div>
    </section>
  );
}

function ListItemCard({ item, depth }: { item: unknown; depth: number }) {
  if (!isPlainObject(item)) {
    return (
      <li className="humane-doc__card">
        <HumaneDocument value={item} depth={depth} />
      </li>
    );
  }

  const headingKey = pickItemHeadingKey(item);
  const headingValue = headingKey ? String(item[headingKey]) : null;
  const entries = Object.entries(item).filter(
    ([k, v]) => k !== headingKey && !isTechnicalKey(k) && hasRenderableContent(v),
  );

  if (!headingValue && entries.length === 0) return null;

  return (
    <li className="humane-doc__card">
      {headingValue ? <p className="humane-doc__card-title">{headingValue}</p> : null}
      {entries.map(([k, v]) => (
        <FieldRow key={k} keyName={k} value={v} depth={depth + 1} />
      ))}
    </li>
  );
}

function ListField({
  keyName,
  value,
  depth,
}: {
  keyName: string;
  value: unknown[];
  depth: number;
}) {
  const items = value.filter((item) => hasRenderableContent(item));
  if (items.length === 0) return null;

  const allPrimitive = items.every((item) => !isPlainObject(item) && !Array.isArray(item));

  if (allPrimitive) {
    return (
      <div className="humane-doc__field">
        <p className="humane-doc__label">{humanizeKey(keyName)}</p>
        <ul className="humane-doc__list">
          {items.map((item, index) => (
            <li key={index}>
              <PrimitiveValue value={item} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="humane-doc__field humane-doc__field--group">
      <p className="humane-doc__label">{humanizeKey(keyName)}</p>
      <ul className="humane-doc__cards">
        {items.map((item, index) => (
          <ListItemCard key={index} item={item} depth={depth} />
        ))}
      </ul>
    </div>
  );
}

function FieldRow({
  keyName,
  value,
  depth,
}: {
  keyName: string;
  value: unknown;
  depth: number;
}) {
  if (isTechnicalKey(keyName)) return null;
  if (!hasRenderableContent(value)) return null;

  if (isImageKey(keyName) && typeof value === "string") {
    return <ImageField keyName={keyName} value={value} />;
  }

  if (Array.isArray(value)) {
    return <ListField keyName={keyName} value={value} depth={depth} />;
  }

  if (isPlainObject(value)) {
    return <SectionField keyName={keyName} value={value} depth={depth} />;
  }

  return <SimpleField keyName={keyName} value={value} />;
}

export function HumaneDocument({ value, depth = 0 }: DocumentProps) {
  if (Array.isArray(value)) {
    const items = value.filter((item) => hasRenderableContent(item));
    if (items.length === 0) return null;
    return (
      <ul className="humane-doc__cards humane-doc__cards--root">
        {items.map((item, index) => (
          <ListItemCard key={index} item={item} depth={depth} />
        ))}
      </ul>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(
      ([k, v]) => !isTechnicalKey(k) && hasRenderableContent(v),
    );
    if (entries.length === 0) return null;
    return (
      <div className="humane-doc">
        {entries.map(([k, v]) => (
          <FieldRow key={k} keyName={k} value={v} depth={depth} />
        ))}
      </div>
    );
  }

  if (!hasRenderableContent(value)) return null;
  return (
    <p className="humane-doc__value humane-doc__value--root">
      <PrimitiveValue value={value} />
    </p>
  );
}
