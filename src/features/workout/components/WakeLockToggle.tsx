import { useI18n } from '../../../i18n/I18nProvider';
import { useEffect, useState } from 'react';
import { screenWakeLockAvailability } from '../browser/screenWakeLock';
import type { WakeLockStatus } from '../browser/screenWakeLock';

type Props = { enabled: boolean; onChange: (enabled: boolean) => void; status?: WakeLockStatus };
export function WakeLockToggle({ enabled, onChange, status }: Props) {
  const { t } = useI18n();
  const [availability, setAvailability] = useState<WakeLockStatus>('idle');
  useEffect(() => {
    const detected = screenWakeLockAvailability();
    setAvailability(detected === 'supported' ? 'idle' : detected);
  }, []);
  const current = status ?? availability;
  const message = current === 'insecure' ? t('wakeInsecure')
    : current === 'unsupported' ? t('wakeUnsupported')
    : current === 'failed' ? t('wakeFailed')
    : current === 'released' ? t('wakeReleased') : null;
  return <div className="text-left">
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-stone-300">
      <input type="checkbox" checked={enabled} onChange={event => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-lime-300" />
      {t('keepAwake')}
    </label>
    <p className="ml-8 text-xs leading-relaxed text-stone-400">{t('wakeHint')}</p>
    {enabled && message && <p role="status" className="mt-2 ml-8 text-xs leading-relaxed text-amber-200">{message}</p>}
  </div>;
}
