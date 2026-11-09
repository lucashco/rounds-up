import { monetizationConfig, safeSupportUrl } from './config';

export function SupportLink({ url = monetizationConfig.supportUrl }: { url?: string | null }) {
  const href = safeSupportUrl(url);
  if (!href) return null;
  return <p className="mt-6 text-center">
    <a href={href} target="_blank" rel="noopener noreferrer external" referrerPolicy="no-referrer"
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-lime-300 underline-offset-4 hover:underline">
      Apoie o Rounds Up <span aria-hidden="true">↗</span>
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  </p>;
}
