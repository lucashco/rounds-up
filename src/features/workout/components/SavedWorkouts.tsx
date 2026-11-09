import { useI18n } from '../../../i18n/I18nProvider';
import { useEffect, useRef } from 'react';
import type { useSavedWorkouts } from '../hooks/useSavedWorkouts';

export function SavedWorkouts({ library, onLoad }: { library: ReturnType<typeof useSavedWorkouts>; onLoad: (name: string) => void }) {
  const { t, locale, message: localizeMessage } = useI18n();
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => { if (library.pending) confirmation.current?.focus(); }, [library.pending]);
  return <section aria-label={t('savedWorkouts')} className="saved-workouts">
    <details>
      <summary className="min-h-11 cursor-pointer content-center font-semibold">{t('savedWorkouts')} <span className="ml-2 text-sm text-stone-400">({new Intl.NumberFormat(locale).format(library.workouts.length)})</span></summary>
      {!library.ready ? <p className="py-3 text-sm text-stone-400">{t('loadingWorkouts')}</p> : library.workouts.length === 0 ? <p className="py-3 text-sm text-stone-400">{t('emptyLibrary')}</p> :
        <ul className="mt-3 space-y-3">{library.workouts.map(workout => <li key={workout.name} className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
          <span className="min-w-0 flex-1 break-words text-sm">{workout.name} <span className="text-xs text-stone-400">· {workout.config.mode}</span></span>
          <button type="button" className="min-h-11 rounded-lg border border-white/15 px-3 text-sm text-lime-300" aria-label={t('loadLabel', { name: workout.name })} onClick={() => onLoad(workout.name)}>{t('load')}</button>
          <button type="button" className="min-h-11 rounded-lg px-3 text-sm text-rose-300" aria-label={t('deleteLabel', { name: workout.name })} onClick={() => library.remove(workout.name)}>{t('delete')}</button>
        </li>)}</ul>}
    </details>
    {library.message && <p role="status" className="mt-3 text-sm text-stone-300">{localizeMessage(library.message)}</p>}
    {library.pending && <div ref={confirmation} tabIndex={-1} role="group" aria-label={t('confirmReplacementLabel')} className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4">
      <p className="text-sm text-amber-200">{localizeMessage(library.pending.message)}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className="min-h-11 rounded-lg bg-lime-300 px-4 text-sm font-semibold text-stone-950" onClick={library.confirm}>{t('confirmReplacement')}</button>
        <button type="button" className="min-h-11 rounded-lg border border-white/15 px-4 text-sm" onClick={library.cancel}>{t('cancel')}</button>
      </div>
    </div>}
  </section>;
}
