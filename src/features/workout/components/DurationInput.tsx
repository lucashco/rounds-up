import { useI18n } from '../../../i18n/I18nProvider';
import { durationInputIssue, durationParts } from '../form/duration';
import { fieldClass } from './presentation';

type Props = {
  id: string; label: string; value: string; onChange: (value: string) => void;
  allowZero?: boolean; invalid?: boolean;
};

export function DurationInput({ id, label, value, onChange, allowZero = true, invalid }: Props) {
  const { t, message: localizeMessage } = useI18n();
  const { minutes, seconds } = durationParts(value);
  const message = durationInputIssue(value, allowZero);
  const description = [message ? `${id}-error` : '', invalid ? 'workout-error' : ''].filter(Boolean).join(' ') || undefined;
  return <fieldset className="min-w-0">
    <legend className="text-sm font-medium text-stone-300">{label}</legend>
    <div className="mt-2 grid grid-cols-2 gap-2">
      <label htmlFor={`${id}-minutes`} className="min-w-0 text-xs text-stone-400">{t('minutes')}
        <input id={`${id}-minutes`} type="number" inputMode="numeric" min={0} step={1} value={minutes}
          aria-label={t('minutesLabel', { label })} className={`${fieldClass} mt-1 tabular-nums`}
          aria-invalid={Boolean(message || invalid) || undefined} aria-describedby={description}
          onChange={event => onChange(`${event.target.value}:${seconds}`)} />
      </label>
      <label htmlFor={id} className="min-w-0 text-xs text-stone-400">{t('seconds')}
        <input id={id} type="number" inputMode="decimal" min={0} max={59} step="any" value={seconds}
          aria-label={t('secondsLabel', { label })} className={`${fieldClass} mt-1 tabular-nums`}
          aria-invalid={Boolean(message || invalid) || undefined} aria-describedby={description}
          onChange={event => onChange(`${minutes}:${event.target.value}`)} />
      </label>
    </div>
    {message && <p id={`${id}-error`} className="mt-2 text-xs text-rose-200">{localizeMessage(message)}</p>}
  </fieldset>;
}
