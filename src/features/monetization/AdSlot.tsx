import { useI18n } from '../../i18n/I18nProvider';
import { monetizationConfig, readMonetizationConfig } from './config';
import type { AdSenseConfig } from './config';

type Props = { config?: AdSenseConfig | null };

/**
 * Manual 250x250 AdSense placement. No loader/push until a real consent/provider
 * integration is implemented. Never add this component to the workout session.
 */
export function AdSlot({ config = monetizationConfig.adsense }: Props) {
  const { t } = useI18n();
  const adsense = config && readMonetizationConfig({
    PUBLIC_ADSENSE_CLIENT_ID: config.clientId,
    PUBLIC_ADSENSE_SLOT_ID: config.slotId,
  }).adsense;
  if (!adsense) return null;
  return <aside aria-label={t('advertising')} className="mt-6 flex h-[314px] w-full min-w-0 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.025] py-4">
    <p className="mb-3 text-xs leading-4 tracking-widest text-stone-400 uppercase">{t('advertising')}</p>
    <ins className="adsbygoogle block shrink-0" style={{ width: 250, height: 250 }}
      data-ad-client={adsense.clientId} data-ad-slot={adsense.slotId} />
  </aside>;
}
