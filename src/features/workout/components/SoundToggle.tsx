import { useI18n } from '../../../i18n/I18nProvider';
export function SoundToggle({ enabled, onChange, unavailable }: { enabled: boolean; onChange: (enabled: boolean) => void; unavailable?: boolean }) {
  const { t } = useI18n();
  return <div>
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-stone-300">
      <input type="checkbox" checked={enabled} onChange={event => onChange(event.target.checked)} className="h-5 w-5 accent-lime-300" />
      {t('sounds')}
    </label>
    {unavailable && enabled && <p className="text-xs text-amber-200" role="status">{t('audioUnavailable')}</p>}
  </div>;
}
