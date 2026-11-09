export type AdSenseConfig = Readonly<{ clientId: string; slotId: string }>;
export type MonetizationConfig = Readonly<{
  adsense: AdSenseConfig | null;
  supportUrl: string | null;
}>;

type PublicMonetizationEnvironment = {
  PUBLIC_ADSENSE_CLIENT_ID?: unknown;
  PUBLIC_ADSENSE_SLOT_ID?: unknown;
  PUBLIC_SUPPORT_URL?: unknown;
};
const value = (input: unknown): string => typeof input === 'string' ? input.trim() : '';

/** Only absolute HTTPS links without embedded credentials are allowed. */
export function safeSupportUrl(input: unknown): string | null {
  const raw = value(input);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function readMonetizationConfig(environment: PublicMonetizationEnvironment): MonetizationConfig {
  const clientId = value(environment.PUBLIC_ADSENSE_CLIENT_ID);
  const slotId = value(environment.PUBLIC_ADSENSE_SLOT_ID);
  const adsense = /^ca-pub-\d{16}$/.test(clientId) && /^\d{10}$/.test(slotId)
    ? Object.freeze({ clientId, slotId }) : null;
  return Object.freeze({ adsense, supportUrl: safeSupportUrl(environment.PUBLIC_SUPPORT_URL) });
}

/** Public build-time data only. No defaults, secrets, trackers or third-party requests. */
export const monetizationConfig = readMonetizationConfig({
  PUBLIC_ADSENSE_CLIENT_ID: import.meta.env.PUBLIC_ADSENSE_CLIENT_ID,
  PUBLIC_ADSENSE_SLOT_ID: import.meta.env.PUBLIC_ADSENSE_SLOT_ID,
  PUBLIC_SUPPORT_URL: import.meta.env.PUBLIC_SUPPORT_URL,
});
