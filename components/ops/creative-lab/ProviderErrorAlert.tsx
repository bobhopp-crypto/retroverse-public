import type { ProviderErrorDetail } from "@/lib/ops/creative-lab/artwork/provider-error";

type Props = {
  message: string;
  detail?: ProviderErrorDetail | null;
  className?: string;
};

export function ProviderErrorAlert({ message, detail, className }: Props) {
  const rootClass = className ?? "cc-creator__error";

  if (!detail) {
    return (
      <p className={rootClass} role="alert">
        {message}
      </p>
    );
  }

  return (
    <div className={`${rootClass} cc-provider-error`} role="alert">
      <p className="cc-provider-error__headline">{message}</p>
      <dl className="cc-provider-error__grid">
        <div>
          <dt>Provider</dt>
          <dd>{detail.provider}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{detail.model}</dd>
        </div>
        <div>
          <dt>HTTP status</dt>
          <dd>{detail.httpStatus}</dd>
        </div>
        <div>
          <dt>Provider message</dt>
          <dd>{detail.providerMessage}</dd>
        </div>
        {detail.code ? (
          <div>
            <dt>Error code</dt>
            <dd>{detail.code}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function formatProviderErrorInline(detail: ProviderErrorDetail): string {
  const parts = [
    detail.provider,
    detail.model,
    `HTTP ${detail.httpStatus}`,
    detail.providerMessage,
  ];
  if (detail.code) parts.push(detail.code);
  return parts.join(" · ");
}
